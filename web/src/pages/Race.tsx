import { useMemo, useState } from "react";
import { BarChart } from "../charts/BarChart";
import { Legend, LineChart, type Band, type Series } from "../charts/LineChart";
import { StrategyChart } from "../charts/StrategyChart";
import type { Compound, Index, Race as RaceT, RaceDriver } from "../lib/data";
import { COMPOUND_NAME, compoundAt, shortName, useRace } from "../lib/data";
import { dateLong, lapTime, median, secs, signed, stopsLabel } from "../lib/format";
import { predictLap } from "../lib/model";
import { href, replace } from "../lib/router";
import { Delta, DriverTag, ErrorNote, Loading, Seg, StintBar } from "../ui";

export function RacePage({ id, a, b, index }: { id: number; a: string | null; b: string | null; index: Index }) {
  const { data, error } = useRace(id);
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;
  return <RaceView race={data} a={a} b={b} index={index} />;
}

const NEUTRAL_LABEL = { SC: "SC", VSC: "VSC", RED: "RED" } as const;

function RaceView({ race, a: qa, b: qb, index }: { race: RaceT; a: string | null; b: string | null; index: Index }) {
  const codes = race.drivers.map((d) => d.code);
  const a = qa && codes.includes(qa) ? qa : race.drivers[0].code;
  const b = qb && codes.includes(qb) && qb !== a ? qb : race.drivers.find((d) => d.code !== a)!.code;
  const A = race.drivers.find((d) => d.code === a)!;
  const B = race.drivers.find((d) => d.code === b)!;
  const set = (na: string, nb: string) => replace(`race/${race.id}`, { a: na, b: nb });
  const pick = (code: string) => {
    if (code === a) return;
    if (code === b) set(b, a);
    else set(code, a);
  };

  const bands: Band[] = race.neutral.map((n) => ({ from: n.from, to: n.to, label: NEUTRAL_LABEL[n.type] }));
  const winner = race.drivers[0];
  const fastestDriver = race.drivers.find((d) => d.code === race.fastest.code);
  const year = index.races.filter((r) => r.year === race.year);
  const pos = year.findIndex((r) => r.id === race.id);
  const prev = year[pos - 1];
  const next = year[pos + 1];

  return (
    <>
      <section className="race-hero">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb">
            <a href={href("races", { y: race.year })}>{race.year} season</a>
            <span>/</span>
            <span>Round {race.round}</span>
            <span className="spacer" />
            {prev && <a href={href(`race/${prev.id}`)}>← {shortName(prev.name)}</a>}
            {next && <a href={href(`race/${next.id}`)}>{shortName(next.name)} →</a>}
          </nav>
          <div className="kicker" style={{ marginTop: 24 }}>{race.location} · {race.country} · Race analysis</div>
          <h1 className="display-l" style={{ marginTop: 8 }}>{race.year} {race.name}</h1>
          <p className="lede" style={{ marginTop: 16 }}>{narrative(race)}</p>
          <div className="facts">
            <Fact k="Date" v={dateLong(race.date)} />
            <Fact k="Laps" v={String(race.laps)} />
            <Fact k="Winner" v={`${winner.code} · ${winner.team}`} />
            <Fact k="Fastest lap" v={`${race.fastest.code} ${lapTime(race.fastest.time)} (L${race.fastest.lap})`} />
            <Fact k="Pit loss" v={`${race.pitLoss.toFixed(1)}s`} />
            {race.weather && <Fact k="Air / track" v={`${race.weather.air}° / ${race.weather.track}°C${race.weather.rain ? " · rain" : ""}`} />}
            <Fact k="Neutralised" v={race.neutral.length ? race.neutral.map((n) => `${n.type} L${n.from}${n.to > n.from ? `–${n.to}` : ""}`).join(", ") : "None"} />
          </div>
        </div>
      </section>

      <div className="wrap section stack">
        <div className="ri-card">
          <div className="row row--between">
            <div>
              <div className="title">Compare two drivers</div>
              <div className="caption">Click a code, or a row in the strategy chart. Red is the focus driver, petrol the comparison.</div>
            </div>
            <button className="ri-btn ri-btn--secondary ri-btn--sm" onClick={() => set(b, a)}>Swap</button>
          </div>
          <div className="chips" style={{ marginTop: 16 }}>
            {race.drivers.map((d) => (
              <button key={d.code} className="chip" aria-pressed={d.code === a || d.code === b} onClick={() => pick(d.code)} title={`${d.name}, ${d.team}`}>
                <i style={{ background: d.code === a ? "var(--race-red)" : d.code === b ? "var(--petrol)" : "var(--series-muted)" }} />
                P{d.pos} {d.code}
              </button>
            ))}
          </div>
        </div>

        <RaceTrace race={race} A={A} B={B} bands={bands} />

        <div className="grid g-2">
          <LapTimes race={race} A={A} B={B} bands={bands} />
          <Positions race={race} A={A} B={B} bands={bands} />
        </div>

        <div className="ri-card">
          <div className="card-head">
            <div>
              <div className="title">Tyre strategies</div>
              <div className="caption">Finishing order, top to bottom. Letters mark the compound; shaded columns are neutralised laps.</div>
            </div>
            <div className="legend">
              {(["S", "M", "H", "I", "W"] as Compound[])
                .filter((c) => race.drivers.some((d) => d.stints.some((s) => s.c === c)))
                .map((c) => (
                  <span key={c}><i className={`sq fill-${c}`} />{COMPOUND_NAME[c]}</span>
                ))}
            </div>
          </div>
          <StrategyChart race={race} focus={[a, b]} onPick={pick} />
        </div>

        <Classification race={race} a={a} b={b} onPick={pick} fastest={fastestDriver?.code} />

        <div className="grid g-2">
          <Sectors race={race} A={A} B={B} />
          <ModelCard race={race} driver={A} />
        </div>
      </div>
    </>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="data-label">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

function narrative(r: RaceT): string {
  const w = r.drivers[0];
  const p2 = r.drivers[1];
  const stops = w.stints.length - 1;
  const comps = w.stints.map((s) => COMPOUND_NAME[s.c].toLowerCase()).join("–");
  const parts = [`${w.name} won on a ${stopsLabel(stops)} ${comps} strategy, ${w.grid === 1 ? "leading from lap one" : `from P${w.grid} after lap one`}`];
  const gapP2 = p2.g && w.g ? (w.g[w.g.length - 1] ?? 0) - (p2.g[p2.g.length - 1] ?? 0) : null;
  if (gapP2 != null && p2.laps === w.laps && gapP2 > 0) parts[0] += `, ${gapP2.toFixed(1)}s clear of ${p2.code}`;
  parts[0] += ".";
  if (r.neutral.length) {
    const sc = r.neutral.reduce((a, n) => a + n.to - n.from + 1, 0);
    parts.push(`${sc} lap${sc > 1 ? "s" : ""} ran under ${[...new Set(r.neutral.map((n) => n.type === "RED" ? "red flag" : n.type))].join(" and ")}.`);
  }
  if (r.wetShare > 0.1) parts.push(`${Math.round(r.wetShare * 100)}% of laps were on intermediate or wet tyres.`);
  const fastest = r.drivers.find((d) => d.code === r.fastest.code);
  if (fastest && fastest.code !== w.code) parts.push(`${fastest.code} set the fastest lap, ${lapTime(r.fastest.time)} on lap ${r.fastest.lap}.`);
  return parts.join(" ");
}

function RaceTrace({ race, A, B, bands }: { race: RaceT; A: RaceDriver; B: RaceDriver; bands: Band[] }) {
  const series: Series[] = race.drivers
    .filter((d) => d.g)
    .map((d) => ({
      id: d.code,
      label: d.code,
      kind: d.code === A.code ? "focus" : d.code === B.code ? "compare" : "muted",
      points: d.n.map((n, i) => ({ x: n, y: d.g![i] })),
      marks: d.pits,
    }));
  // keep the y-range readable: clip lapped back-markers
  const vals = series.filter((s) => s.kind !== "muted").flatMap((s) => s.points.map((p) => p.y ?? 0));
  const lo = Math.min(-5, ...vals, median(race.drivers.slice(0, 10).map((d) => (d.g ? d.g[d.g.length - 1] ?? 0 : 0))) - 10);
  const hi = Math.max(5, ...vals);
  const clipped = series.map((s) => ({ ...s, points: s.points.map((p) => ({ x: p.x, y: p.y == null || p.y < lo - 2 ? null : p.y })) }));
  return (
    <div className="ri-card">
      <div className="card-head">
        <div>
          <div className="title">Race trace</div>
          <div className="caption" style={{ maxWidth: "64ch" }}>
            Time gained or lost against the winner's average race pace. Up is ahead; a drop is a pit stop or a slow lap. Dots mark stops.
          </div>
        </div>
        <Legend items={[{ kind: "focus", label: A.code }, { kind: "compare", label: B.code }, { kind: "muted", label: "Field" }, ...(bands.length ? [{ kind: "sc" as const, label: "SC / VSC" }] : [])]} />
      </div>
      <LineChart
        height={360}
        series={clipped}
        bands={bands}
        yDomain={[lo, hi + 2]}
        yFormat={(v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(0)}s`}
        xLabel="Lap"
        zeroLine
        ariaLabel={`Race trace for ${A.code} and ${B.code} against the winner's average pace`}
      />
    </div>
  );
}

function lapSeries(d: RaceDriver, kind: "focus" | "compare"): Series {
  const clean = d.t.filter((t, i) => t != null && d.n[i] > 1 && !d.pits.includes(d.n[i]) && !d.pits.includes(d.n[i] - 1)) as number[];
  const med = median(clean);
  return {
    id: d.code,
    label: d.code,
    kind,
    points: d.n.map((n, i) => ({ x: n, y: n > 1 && !d.pits.includes(n) && !d.pits.includes(n - 1) && d.t[i] != null && d.t[i]! < med * 1.05 ? d.t[i] : null })),
  };
}

function LapTimes({ race, A, B, bands }: { race: RaceT; A: RaceDriver; B: RaceDriver; bands: Band[] }) {
  const sa = lapSeries(A, "focus");
  const sb = lapSeries(B, "compare");
  const diff = A.pace != null && B.pace != null ? A.pace - B.pace : null;
  return (
    <div className="ri-card">
      <div className="card-head">
        <div>
          <div className="title">Lap times</div>
          <div className="caption">Pit, out and safety-car laps are left as gaps so the pace trend reads.</div>
        </div>
        <Legend items={[{ kind: "focus", label: A.code }, { kind: "compare", label: B.code }, { kind: "best", label: "Fastest" }]} />
      </div>
      <LineChart
        height={280}
        series={[sb, sa]}
        bands={bands}
        best={[A, B].some((d) => d.code === race.fastest.code) ? { x: race.fastest.lap, y: race.fastest.time, label: `Fastest lap ${lapTime(race.fastest.time)}` } : undefined}
        yFormat={(v) => lapTime(v, 1)}
        xLabel="Lap"
        ariaLabel={`Lap times of ${A.code} and ${B.code}`}
      />
      <div className="ri-stat__foot" style={{ marginTop: 12 }}>
        Median clean-lap pace {A.code} {lapTime(A.pace)} · {B.code} {lapTime(B.pace)} <Delta v={diff} /> {diff != null && <span>{A.code} {diff < 0 ? "faster" : "slower"} per lap</span>}
      </div>
    </div>
  );
}

function Positions({ race, A, B, bands }: { race: RaceT; A: RaceDriver; B: RaceDriver; bands: Band[] }) {
  const series: Series[] = race.drivers.map((d) => ({
    id: d.code,
    label: d.code,
    kind: d.code === A.code ? "focus" : d.code === B.code ? "compare" : "muted",
    points: d.n.map((n, i) => ({ x: n, y: d.p[i] })),
  }));
  return (
    <div className="ri-card">
      <div className="card-head">
        <div>
          <div className="title">Running order</div>
          <div className="caption">Track position at the end of each lap.</div>
        </div>
        <Legend items={[{ kind: "focus", label: A.code }, { kind: "compare", label: B.code }]} />
      </div>
      <LineChart height={280} series={series} bands={bands} invertY yDomain={[1, race.drivers.length]} yFormat={(v) => `P${v}`} xLabel="Lap" ariaLabel={`Positions of ${A.code} and ${B.code} by lap`} yTicks={5} />
    </div>
  );
}

type SortKey = "pos" | "best" | "pace" | "gained";

function Classification({ race, a, b, onPick, fastest }: { race: RaceT; a: string; b: string; onPick: (c: string) => void; fastest?: string }) {
  const [sort, setSort] = useState<SortKey>("pos");
  const bestPace = Math.min(...race.drivers.map((d) => d.pace ?? Infinity));
  const rows = useMemo(() => {
    const r = [...race.drivers];
    const key: Record<SortKey, (d: RaceDriver) => number> = {
      pos: (d) => d.pos,
      best: (d) => d.best ?? Infinity,
      pace: (d) => d.pace ?? Infinity,
      gained: (d) => d.pos - d.grid,
    };
    return r.sort((x, y) => key[sort](x) - key[sort](y));
  }, [race, sort]);
  const th = (k: SortKey, label: string, num = true) => (
    <th className={num ? "num" : undefined} aria-sort={sort === k ? "ascending" : undefined}>
      <button onClick={() => setSort(k)}>{label}{sort === k ? " ↓" : ""}</button>
    </th>
  );
  return (
    <div className="ri-card ri-card--flush">
      <div className="row row--between" style={{ padding: "20px 24px 12px" }}>
        <div>
          <div className="title">Classification and pace</div>
          <div className="caption">Pace is the median of clean, green-flag laps; Δ is against the quickest driver on that measure.</div>
        </div>
        <Seg label="Sort by" value={sort} onChange={setSort} options={[["pos", "Result"], ["pace", "Pace"], ["best", "Best lap"], ["gained", "Places gained"]]} />
      </div>
      <div className="table-scroll">
        <table className="ri-table">
          <thead>
            <tr>
              {th("pos", "Pos")}
              <th>Driver</th>
              <th>Team</th>
              {th("gained", "From L1")}
              <th>Strategy</th>
              {th("best", "Best lap")}
              {th("pace", "Pace")}
              <th className="num">Δ pace</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const gained = d.grid - d.pos;
              return (
                <tr key={d.code} className={`clickable ${d.code === a || d.code === b ? "is-focus" : ""}`} onClick={() => onPick(d.code)}>
                  <td className="num">{d.pos}</td>
                  <td>
                    <span style={{ color: d.code === a ? "var(--race-red)" : d.code === b ? "var(--petrol)" : undefined }}>
                      <DriverTag d={d} />
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-ui)" }}>{d.team}</td>
                  <td className="num">
                    P{d.grid} {gained !== 0 && <span className="muted">({gained > 0 ? "+" : "−"}{Math.abs(gained)})</span>}
                  </td>
                  <td style={{ minWidth: 180 }}>
                    <StintBar stints={d.stints} total={race.laps} />
                  </td>
                  <td className="num">
                    {d.code === fastest ? <span className="ri-delta ri-delta--best">{lapTime(d.best)}</span> : lapTime(d.best)}
                  </td>
                  <td className="num">{lapTime(d.pace)}</td>
                  <td className="num">{d.pace == null ? "–" : <Delta v={d.pace - bestPace} best={d.pace === bestPace} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="caption" style={{ padding: "12px 24px 20px" }}>
        “From L1” is the running position after lap one; the source table has no starting grid. {race.drivers.filter((d) => d.laps < race.laps).length} drivers did not complete the full distance.
      </p>
    </div>
  );
}

function Sectors({ race, A, B }: { race: RaceT; A: RaceDriver; B: RaceDriver }) {
  const best = (d: RaceDriver, k: "s1" | "s2" | "s3") => Math.min(...(d[k].filter((v) => v != null) as number[]));
  const rows = (["s1", "s2", "s3"] as const).map((k) => ({ k, a: best(A, k), b: best(B, k), field: race.bestSectors[k] }));
  const ideal = (d: "a" | "b") => rows.reduce((s, r) => s + r[d], 0);
  return (
    <div className="ri-card">
      <div className="title">Best sectors</div>
      <div className="caption">Each driver's quickest time in each sector. The sum is their theoretical best lap.</div>
      <div className="table-scroll" style={{ marginTop: 16 }}>
        <table className="ri-table">
          <thead>
            <tr>
              <th>Sector</th>
              <th className="num" style={{ color: "var(--race-red)" }}>{A.code}</th>
              <th className="num" style={{ color: "var(--petrol)" }}>{B.code}</th>
              <th className="num">Δ</th>
              <th className="num">Field best</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k}>
                <td>{r.k.toUpperCase()}</td>
                <td className="num">{secs(r.a)}</td>
                <td className="num">{secs(r.b)}</td>
                <td className="num"><Delta v={r.a - r.b} /></td>
                <td className="num muted">{secs(r.field)}</td>
              </tr>
            ))}
            <tr>
              <td><b>Ideal lap</b></td>
              <td className="num"><b>{lapTime(ideal("a"))}</b></td>
              <td className="num"><b>{lapTime(ideal("b"))}</b></td>
              <td className="num"><Delta v={ideal("a") - ideal("b")} /></td>
              <td className="num muted">{lapTime((race.bestSectors.s1 ?? 0) + (race.bestSectors.s2 ?? 0) + (race.bestSectors.s3 ?? 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="caption" style={{ marginTop: 12 }}>
        Actual best laps: {A.code} {lapTime(A.best)} (lap {A.bestLap}), {B.code} {lapTime(B.best)} (lap {B.bestLap}). Field best uses clean laps only.
      </p>
    </div>
  );
}

const QUALITY: Record<string, string> = {
  "per-compound": "Separate degradation rate per compound.",
  pooled: "One degradation rate shared by all compounds; the per-compound fit was not identifiable.",
  weak: "Tyre wear could not be separated from fuel burn and track evolution in this race. Treat strategy results as rough.",
  mixed: "A wet-to-dry race: track evolution dominates, so the dry-tyre fit is indicative only.",
};

function ModelCard({ race, driver }: { race: RaceT; driver: RaceDriver }) {
  const m = race.model;
  if (!m) {
    return (
      <div className="ri-card">
        <div className="title">Pace model</div>
        <p className="muted" style={{ marginTop: 8 }}>Not fitted: fewer than 200 clean dry-tyre laps in this race (mostly wet running).</p>
      </div>
    );
  }
  const base = m.base[driver.code];
  const pts = driver.n.map((n, i) => {
    const st = compoundAt(driver, n);
    const pred = st && base != null && m.deg[st.c] != null ? predictLap(m, base, race.laps, n, st.c, n - st.from + st.age) : null;
    const clean = n > 1 && !driver.pits.includes(n) && !driver.pits.includes(n - 1) && !race.neutral.some((b) => n >= b.from && n <= b.to);
    return { n, pred, act: clean ? driver.t[i] : null };
  });
  const both = pts.filter((p) => p.pred != null && p.act != null && Math.abs(p.act - p.pred) < 4);
  const mae = both.length ? both.reduce((s, p) => s + Math.abs(p.act! - p.pred!), 0) / both.length : null;
  const comps = (["S", "M", "H"] as Compound[]).filter((c) => m.deg[c] != null);
  return (
    <div className="ri-card">
      <div className="row row--between">
        <div className="title">Pace model</div>
        <span className={`tag ${m.quality === "per-compound" ? "tag--wet" : "tag--sc"}`}>{m.quality.toUpperCase()}</span>
      </div>
      <p className="caption">{QUALITY[m.quality]} Fitted on {m.n} clean laps; error on held-out laps {secs(m.maeHoldout)}.</p>
      {base != null && (
        <>
          <div className="legend" style={{ marginTop: 16 }}>
            <span><i className="k-focus" />{driver.code} actual (clean laps)</span>
            <span><i className="k-third" />Model prediction</span>
          </div>
          <LineChart
            height={200}
            directLabels={false}
            series={[
              { id: "pred", label: "Model", kind: "third", points: pts.map((p) => ({ x: p.n, y: p.pred })) },
              { id: "act", label: driver.code, kind: "focus", points: pts.map((p) => ({ x: p.n, y: p.act != null && p.pred != null && Math.abs(p.act - p.pred) < 4 ? p.act : null })) },
            ]}
            yFormat={(v) => lapTime(v, 1)}
            xLabel="Lap"
            ariaLabel={`Model prediction against ${driver.code}'s actual lap times, mean error ${secs(mae)}`}
          />
        </>
      )}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, marginTop: 16 }}>
        <MiniStat k="Fuel effect" v={`${m.fuel.toFixed(3)}s`} sub="per lap of fuel" />
        {mae != null && <MiniStat k={`${driver.code} error`} v={secs(mae)} sub="mean, this race" />}
        <MiniStat k="Variance explained" v={m.r2 != null ? `${Math.round(m.r2 * 100)}%` : "–"} sub="within-driver" />
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="data-label" style={{ marginBottom: 6 }}>Degradation, s per lap of tyre age</div>
        <BarChart rowH={24} labelW={72} bars={comps.map((c) => ({ id: c, label: COMPOUND_NAME[c], value: m.deg[c]!, focus: c === "S" }))} format={(v) => signed(v, 3, "s").replace("+", "")} ariaLabel="Degradation per compound" />
      </div>
      <a className="ri-btn ri-btn--primary" style={{ marginTop: 16 }} href={href("lab", { race: race.id, driver: driver.code })}>
        Simulate strategies for {driver.code}
      </a>
    </div>
  );
}

function MiniStat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
      <div className="data-label">{k}</div>
      <div className="mono" style={{ font: "600 18px/24px var(--font-data)", marginTop: 4 }}>{v}</div>
      <div className="caption">{sub}</div>
    </div>
  );
}
