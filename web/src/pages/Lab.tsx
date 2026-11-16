import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Legend, LineChart, type Series } from "../charts/LineChart";
import type { Index, Race, RaceDriver } from "../lib/data";
import { COMPOUND_NAME, shortName, useRace } from "../lib/data";
import { lapTime, raceTime, signed, stopsLabel } from "../lib/format";
import { modelCompounds, normalisePlan, optimise, planLabel, simulate, type PlanStint } from "../lib/model";
import { href, replace } from "../lib/router";
import { ErrorNote, Loading, Select } from "../ui";

const DEFAULT_RACE = 36; // 2023 Italian GP: clean, well-fitted race

export function Lab({ index, raceId, driver }: { index: Index; raceId: number | null; driver: string | null }) {
  const usable = index.races.filter((r) => r.model && r.model.quality !== "mixed");
  const id = raceId && usable.some((r) => r.id === raceId) ? raceId : DEFAULT_RACE;
  const { data, error } = useRace(id);
  const summary = index.races.find((r) => r.id === id)!;
  const years = [...new Set(usable.map((r) => r.year))];

  return (
    <div className="wrap section">
      <div className="section-head">
        <div>
          <div className="kicker">Strategy lab</div>
          <h1 className="display-l" style={{ marginTop: 8 }}>Re-run the race on other tyres</h1>
          <p className="lede">
            Pick a race and a driver, build a plan stint by stint, and the race's fitted pace model predicts every lap. It also searches every one- and two-stop plan for the fastest.
          </p>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 24, alignItems: "end" }}>
        <Select
          label="Season"
          value={summary.year}
          options={years.map((y) => [y, String(y)])}
          onChange={(y) => {
            const first = usable.find((r) => r.year === y)!;
            replace("lab", { race: first.id });
          }}
        />
        <Select
          label="Race"
          value={id}
          options={usable.filter((r) => r.year === summary.year).map((r) => [r.id, `R${r.round} ${shortName(r.name)}`])}
          onChange={(v) => replace("lab", { race: v })}
        />
        {data && (
          <Select
            label="Driver"
            value={data.drivers.find((d) => d.code === driver && data.model?.base[d.code] != null)?.code ?? data.drivers[0].code}
            options={data.drivers.filter((d) => data.model?.base[d.code] != null).map((d) => [d.code, `P${d.pos} ${d.code} · ${d.team}`])}
            onChange={(v) => replace("lab", { race: id, driver: v })}
          />
        )}
      </div>
      {error && <ErrorNote message={error} />}
      {!data && !error && <Loading />}
      {data && data.model && <LabView key={`${data.id}`} race={data} driverCode={driver} />}
    </div>
  );
}

// gaps to the reference plan: whole seconds when ticks are whole, else one decimal
const gapFormat = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(Number.isInteger(Math.round(v * 1000) / 1000) ? 0 : 1)}s`;

const PLAN_KIND = ["focus", "compare", "third", "muted"] as const;

function LabView({ race, driverCode }: { race: Race; driverCode: string | null }) {
  const m = race.model!;
  const d: RaceDriver = race.drivers.find((x) => x.code === driverCode && m.base[x.code] != null) ?? race.drivers.find((x) => m.base[x.code] != null)!;
  const base = m.base[d.code];
  const comps = modelCompounds(m);
  const [pitLoss, setPitLoss] = useState(race.pitLoss);

  const actual: PlanStint[] | null = d.laps === race.laps && d.stints.every((s) => comps.includes(s.c)) ? normalisePlan(d.stints.map((s, i) => ({ c: s.c, laps: (i < d.stints.length - 1 ? d.stints[i + 1].from - 1 : race.laps) - (i === 0 ? 0 : s.from - 1) })), race.laps) : null;
  // the slider label moves at once; the search and charts follow without blocking the drag
  const loss = useDeferredValue(pitLoss);
  const best1 = useMemo(() => optimise(m, race.laps, 1, loss), [m, race.laps, loss]);
  const best2 = useMemo(() => optimise(m, race.laps, 2, loss), [m, race.laps, loss]);
  const [mine, setMine] = useState<PlanStint[]>(() => normalisePlan(actual ?? best1 ?? [{ c: comps[0], laps: race.laps }], race.laps));
  useEffect(() => setMine(normalisePlan(actual ?? best1 ?? [{ c: comps[0], laps: race.laps }], race.laps)), [d.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const plans = [
    { id: "mine", name: "Your plan", plan: mine },
    actual && { id: "actual", name: `What ${d.code} ran`, plan: actual },
    best1 && { id: "b1", name: "Best one-stop", plan: best1 },
    best2 && { id: "b2", name: "Best two-stop", plan: best2 },
  ].filter(Boolean) as { id: string; name: string; plan: PlanStint[] }[];

  const results = plans.map((p) => ({ ...p, sim: simulate(m, base, race.laps, p.plan, loss) }));
  const fastest = Math.min(...results.map((r) => r.sim.total));
  const ref = results.find((r) => r.sim.total === fastest)!;
  const kinds = new Map(results.map((r, i) => [r.id, PLAN_KIND[i]]));
  // plans that are stint-for-stint the same as an earlier one draw exactly on top of it; say so
  const key = (p: PlanStint[]) => planLabel(p);
  const sameAs = new Map(results.map((r, i) => [r.id, results.slice(0, i).find((q) => key(q.plan) === key(r.plan))?.name ?? null]));
  // lap-time chart: your plan against the best alternative that actually differs from it
  const lapPair = [results[0], results.slice(1).filter((r) => !sameAs.get(r.id) && key(r.plan) !== key(mine)).sort((a, b) => a.sim.total - b.sim.total)[0]].filter(Boolean);

  const deltaSeries: Series[] = results.map((r) => ({
    id: r.id,
    label: r.name,
    kind: kinds.get(r.id)!,
    points: r.sim.cumulative.map((c, i) => ({ x: i + 1, y: Number((c - ref.sim.cumulative[i]).toFixed(2)) })),
  }));
  const lapSeries: Series[] = lapPair.map((r) => ({
    id: r.id,
    label: r.name,
    kind: kinds.get(r.id)!,
    points: r.sim.laps.map((t, i) => ({ x: i + 1, y: r.sim.pits.includes(i + 1) ? null : t })),
  }));

  const used = mine.reduce((a, s) => a + s.laps, 0);
  const update = (i: number, s: Partial<PlanStint>) => setMine((p) => normalisePlan(p.map((x, j) => (j === i ? { ...x, ...s } : x)), race.laps));
  const twoCompound = new Set(mine.map((s) => s.c)).size >= 2;

  return (
    <div className="lab">
      <aside className="ri-card stack">
        <div>
          <div className="title">Your plan for {d.code}</div>
          <div className="caption">{race.laps} laps · the last stint absorbs any laps left over.</div>
        </div>
        <div className="plan">
          {mine.map((s, i) => (
            <div key={i} className="plan-stint">
              <span className="data-label" style={{ whiteSpace: "nowrap" }}>Stint {i + 1}</span>
              <div className="ri-seg" role="group" aria-label={`Stint ${i + 1} compound`}>
                {comps.map((c) => (
                  <button key={c} aria-pressed={s.c === c} onClick={() => update(i, { c })} title={COMPOUND_NAME[c]}>
                    {c}
                  </button>
                ))}
              </div>
              <input
                className="input"
                type="number"
                min={1}
                max={race.laps}
                value={s.laps}
                aria-label={`Stint ${i + 1} laps`}
                onChange={(e) => update(i, { laps: Number(e.target.value) })}
              />
              <span className="caption laps-unit">laps</span>
              <span className="x-slot">
              {mine.length > 1 && (
                <button className="ri-btn ri-btn--ghost ri-btn--sm" aria-label={`Remove stint ${i + 1}`} onClick={() => setMine((p) => normalisePlan(p.filter((_, j) => j !== i), race.laps))}>
                  ✕
                </button>
              )}
              </span>
            </div>
          ))}
          <div className="row">
            <button
              className="ri-btn ri-btn--secondary ri-btn--sm"
              disabled={mine.length >= 4}
              onClick={() =>
                setMine((p) => {
                  const last = p[p.length - 1];
                  const half = Math.floor(last.laps / 2);
                  if (half < 1) return p;
                  return [...p.slice(0, -1), { ...last, laps: last.laps - half }, { c: comps.find((c) => c !== last.c) ?? last.c, laps: half }];
                })
              }
            >
              + Add stop
            </button>
            {best1 && <button className="ri-btn ri-btn--ghost ri-btn--sm" onClick={() => setMine(best1)}>Copy best one-stop</button>}
          </div>
          {used !== race.laps && <div className="caption">Plan covers {used} laps.</div>}
          {!twoCompound && <div className="callout callout--warn">Race rules require two different dry compounds. This plan uses one.</div>}
        </div>
        <div>
          <div className="row row--between">
            <label className="label" htmlFor="pitloss">Pit-stop loss</label>
            <span className="mono">{pitLoss.toFixed(1)}s</span>
          </div>
          <input id="pitloss" type="range" min={14} max={36} step={0.5} value={pitLoss} onChange={(e) => setPitLoss(Number(e.target.value))} />
          <div className="caption">
            Measured for this race: {race.pitLoss.toFixed(1)}s from {race.pitLossSamples} green-flag stops.{" "}
            {pitLoss !== race.pitLoss && <button className="link" style={{ all: "unset", cursor: "pointer", color: "var(--petrol)", textDecoration: "underline" }} onClick={() => setPitLoss(race.pitLoss)}>Reset</button>}
          </div>
        </div>
        {(m.quality === "weak" || m.quality === "pooled") && (
          <div className="callout callout--warn">
            {m.quality === "weak"
              ? "This race's tyre wear could not be separated from fuel burn and track evolution, so plans differ mainly by pit stops. Try a race marked per-compound."
              : "This race uses one degradation rate for every compound, so the model favours the compound with the best base pace."}
          </div>
        )}
      </aside>

      <div className="stack">
        <div className="ri-card ri-card--flush">
          <div style={{ padding: "20px 24px 4px" }}>
            <div className="title">Predicted race time</div>
            <div className="caption">{d.code} in the {race.year} {shortName(race.name)} GP, no traffic or safety cars. Δ is to the fastest plan.</div>
          </div>
          <div style={{ padding: "0 24px 8px" }}>
            {results.map((r) => (
              <div className="result-row" key={r.id}>
                <i className={`sw k-${kinds.get(r.id)}`} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {r.name}
                    {sameAs.get(r.id) && <span className="caption" style={{ fontWeight: 400, marginLeft: 8 }}>same as {sameAs.get(r.id)!.toLowerCase()}</span>}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <div className="stintbar" style={{ width: 160, minWidth: 0 }}>
                      {r.plan.map((s, i) => (
                        <span key={i} className={`fill-${s.c}`} style={{ flex: `${s.laps} 0 0` }} title={`${COMPOUND_NAME[s.c]} ${s.laps} laps`}>{s.laps >= 6 ? s.c : ""}</span>
                      ))}
                    </div>
                    <span className="caption mono">{planLabel(r.plan)} · {stopsLabel(r.sim.stops)}</span>
                  </div>
                </div>
                <span className="mono">{raceTime(r.sim.total)}</span>
                <span className={`ri-delta ${r.sim.total === fastest ? "ri-delta--best" : "ri-delta--loss"}`}>{r.sim.total === fastest ? "Fastest" : signed(r.sim.total - fastest, 1, "s")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ri-card">
          <div className="card-head">
            <div>
              <div className="title">Gap to the fastest plan, lap by lap</div>
              <div className="caption">Below zero means behind {ref.name.toLowerCase()} at that point of the race. Steps are pit stops.</div>
            </div>
            <Legend items={results.map((r) => ({ kind: kinds.get(r.id)!, label: sameAs.get(r.id) ? `${r.name} (under ${sameAs.get(r.id)!.toLowerCase()})` : r.name }))} />
          </div>
          <LineChart
            height={300}
            series={deltaSeries.map((s) => ({ ...s, points: s.points.map((p) => ({ x: p.x, y: p.y == null ? null : -p.y })) }))}
            yFormat={gapFormat}
            zeroLine
            directLabels={false}
            xLabel="Lap"
            ariaLabel={`Cumulative time gap of each plan to ${ref.name}`}
          />
        </div>

        <div className="ri-card">
          <div className="card-head">
            <div>
              <div className="title">Predicted lap times</div>
              <div className="caption">
                {lapPair.length > 1 ? `Your plan against ${lapPair[1].name.toLowerCase()}. ` : ""}Fuel burn makes the car faster each lap; tyre age makes it slower. Pit laps are left out.
              </div>
            </div>
            <Legend items={lapPair.map((r) => ({ kind: kinds.get(r.id)!, label: r.name }))} />
          </div>
          <LineChart height={240} series={lapSeries} yFormat={(v) => lapTime(v, 2)} directLabels={false} xLabel="Lap" ariaLabel="Predicted lap times for your plan and the closest alternative" />
        </div>

        <div className="ri-card">
          <div className="title">The equation behind it</div>
          <p className="mono" style={{ marginTop: 12, fontSize: 13, lineHeight: "22px", overflowX: "auto", whiteSpace: "nowrap" }}>
            lap = {base.toFixed(2)} + {m.fuel.toFixed(3)} × laps_left {comps.map((c) => `+ [${c}] (${(m.offset[c] ?? 0).toFixed(2)} + ${m.deg[c]!.toFixed(3)} × age)`).join(" ")}
          </p>
          <p className="caption" style={{ marginTop: 8 }}>
            {d.code}'s base pace, fuel effect and per-compound terms, fitted by least squares on {m.n} clean laps of this race. Held-out error {m.maeHoldout?.toFixed(3) ?? "–"}s per lap.{" "}
            <a className="link" href={href(`race/${race.id}`, { a: d.code })}>See the race →</a>
          </p>
        </div>
      </div>
    </div>
  );
}

