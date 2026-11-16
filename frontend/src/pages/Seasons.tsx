import { scaleLinear } from "d3-scale";
import { useMemo, useState } from "react";
import type { Index } from "../lib/data";
import { shortName } from "../lib/data";
import { href, replace } from "../lib/router";
import { Seg } from "../ui";

type Mode = "pos" | "pace";

export function Seasons({ index, year: y }: { index: Index; year: number | null }) {
  const years = index.seasons.map((s) => s.year);
  const year = y && years.includes(y) ? y : years[years.length - 1];
  const season = index.seasons.find((s) => s.year === year)!;
  const races = season.races.map((id) => index.races.find((r) => r.id === id)!);
  const [mode, setMode] = useState<Mode>("pos");
  const drivers = useMemo(() => season.drivers.filter((d) => d.races >= Math.min(3, races.length)), [season, races.length]);
  const leader = season.drivers[0];
  const totalLaps = races.reduce((a, r) => a + r.laps, 0);

  // sequential, one hue (petrol): dark = better
  const posT = scaleLinear().domain([1, 20]).range([0, 1]).clamp(true);
  const paceT = scaleLinear().domain([0, 3]).range([0, 1]).clamp(true);
  const cell = (t: number) => ({
    background: `color-mix(in srgb, var(--petrol) ${Math.round((1 - t) * 88 + 6)}%, var(--surface-card))`,
    color: t < 0.45 ? "var(--surface-card)" : "var(--text-primary)",
  });

  return (
    <div className="wrap section">
      <div className="section-head">
        <div>
          <div className="kicker">Seasons</div>
          <h1 className="display-l" style={{ marginTop: 8 }}>{year}: {index.people[leader.code]?.name ?? leader.code}, {leader.wins} wins</h1>
          <p className="lede">
            Every driver, every round. Results come from the timing feed; pace is each driver's median clean-lap time as a percentage off the race's quickest.
          </p>
        </div>
        <Seg label="Season" value={year} options={years.map((v) => [v, String(v)])} onChange={(v) => replace("seasons", { y: v })} />
      </div>

      <div className="grid g-4" style={{ marginBottom: 24 }}>
        <div className="ri-card"><div className="ri-stat__label">Races in data</div><div className="ri-stat__value">{races.length}</div></div>
        <div className="ri-card"><div className="ri-stat__label">Laps led · {leader.code}</div><div className="ri-stat__value">{leader.led}</div><div className="ri-stat__foot">of {totalLaps} ({Math.round((leader.led / totalLaps) * 100)}%)</div></div>
        <div className="ri-card"><div className="ri-stat__label">Different winners</div><div className="ri-stat__value">{season.drivers.filter((d) => d.wins > 0).length}</div></div>
        <div className="ri-card"><div className="ri-stat__label">Races with SC / VSC</div><div className="ri-stat__value">{races.filter((r) => r.neutralLaps > 0).length}</div></div>
      </div>

      <div className="ri-card ri-card--flush">
        <div className="row row--between" style={{ padding: "20px 24px 12px" }}>
          <div>
            <div className="title">{mode === "pos" ? "Finishing positions" : "Pace off the quickest, %"}</div>
            <div className="caption">Darker is better. Hover a cell for detail; click a round to open the race.</div>
          </div>
          <Seg label="Colour by" value={mode} onChange={setMode} options={[["pos", "Result"], ["pace", "Pace"]]} />
        </div>
        <div className="table-scroll">
          <table className="ri-table heat">
            <thead>
              <tr>
                <th className="sticky-col">Driver</th>
                <th className="num">W</th>
                <th className="num">Pod</th>
                <th className="num">Avg</th>
                <th className="num">Pace</th>
                {races.map((r) => (
                  <th key={r.id} className="rot" title={r.name}>
                    <a href={href(`race/${r.id}`)} style={{ textDecoration: "none" }}><span>{shortName(r.name).slice(0, 12)}</span></a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.code}>
                  <td className="sticky-col">
                    <span className="driver"><b>{d.code}</b> <span className="muted" style={{ fontFamily: "var(--font-ui)", fontSize: 12 }}>{d.team}</span></span>
                  </td>
                  <td className="num">{d.wins || ""}</td>
                  <td className="num">{d.podiums || ""}</td>
                  <td className="num">{d.avgPos.toFixed(1)}</td>
                  <td className="num">{d.pacePct == null ? "–" : `${d.pacePct.toFixed(2)}%`}</td>
                  {d.byRace.map((c, i) => {
                    if (!c) return <td key={i} className="cell"><div title="Did not race" style={{ color: "var(--text-muted)" }}>·</div></td>;
                    const t = mode === "pos" ? posT(c.pos) : c.pct == null ? 1 : paceT(c.pct);
                    const label = mode === "pos" ? String(c.pos) : c.pct == null ? "–" : c.pct.toFixed(1);
                    return (
                      <td key={i} className="cell">
                        <a href={href(`race/${races[i].id}`, { a: d.code })} style={{ textDecoration: "none" }}>
                          <div style={cell(t)} title={`${d.code} · ${races[i].name}: P${c.pos}${c.pct != null ? `, pace +${c.pct.toFixed(2)}%` : ""}`}>
                            {label}
                          </div>
                        </a>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ padding: "12px 24px 20px", gap: 8 }}>
          <span className="caption">{mode === "pos" ? "P1" : "0%"}</span>
          <span style={{ width: 140, height: 10, borderRadius: 3, background: "linear-gradient(90deg, color-mix(in srgb, var(--petrol) 94%, var(--surface-card)), color-mix(in srgb, var(--petrol) 6%, var(--surface-card)))" }} />
          <span className="caption">{mode === "pos" ? "P20" : "3%+"}</span>
          <span className="caption" style={{ marginLeft: 16 }}>Drivers with at least three starts. Retirements are ranked behind finishers by laps completed. Pace “–” means fewer than eight clean laps.</span>
        </div>
      </div>
    </div>
  );
}
