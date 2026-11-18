import { useMemo } from "react";
import { BarChart } from "../charts/BarChart";
import { Legend, LineChart } from "../charts/LineChart";
import { useRace, type Index, type Race } from "../lib/data";
import { median, num } from "../lib/format";
import { href } from "../lib/router";
import { REPO_BACKEND } from "../ui";

const FEATURED = { race: 89, a: "VER", b: "HAM" }; // 2021 French GP

export function Home({ index }: { index: Index }) {
  const { totals, races, seasons, qa } = index;
  const span = `${seasons[0].year}–${seasons[seasons.length - 1].year}`;
  const pitStops = races.reduce((a, r) => a + r.pitStops, 0);
  const neutral = races.reduce((a, r) => a + r.neutralLaps, 0);

  const pitByCircuit = useMemo(() => {
    const by = new Map<string, number[]>();
    for (const r of races) {
      if (r.wetShare > 0.1 || !r.location) continue; // wet races distort stop timing
      by.set(r.location, [...(by.get(r.location) ?? []), r.pitLoss]);
    }
    return [...by.entries()].map(([loc, v]) => ({ loc, v: median(v), n: v.length })).sort((a, b) => b.v - a.v);
  }, [races]);

  const deg = useMemo(() => {
    const vals: Record<"S" | "M" | "H", number[]> = { S: [], M: [], H: [] };
    for (const r of races) if (r.model?.quality === "per-compound") for (const c of ["S", "M", "H"] as const) if (r.model.deg[c] != null) vals[c].push(r.model.deg[c]!);
    return (["S", "M", "H"] as const).map((c) => ({ c, v: median(vals[c]), n: vals[c].length }));
  }, [races]);

  const dom = useMemo(() => {
    const s = seasons[seasons.length - 1];
    const d = s.drivers[0];
    const laps = races.filter((r) => r.year === s.year).reduce((a, r) => a + r.laps, 0);
    const rivals = s.drivers.filter((x) => x.code !== d.code && x.pacePct != null).map((x) => x.pacePct! - (d.pacePct ?? 0));
    return { year: s.year, d, races: s.races.length, laps, name: index.people[d.code]?.name ?? d.code, next: Math.min(...rivals) };
  }, [seasons, races, index.people]);

  const dupPct = (qa.duplicateRows / qa.rawRows) * 100;
  const top = pitByCircuit[0];
  const low = pitByCircuit[pitByCircuit.length - 1];
  const bars = [...pitByCircuit.slice(0, 5), ...pitByCircuit.slice(-5)];

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="kicker">F1 race intelligence · {span}</div>
            <h1 className="display-xl">
              {num(totals.laps)} laps.
              <br />
              <em>One pit wall.</em>
            </h1>
            <p className="lede">
              RI360 turns {seasons.length} seasons of Formula 1 timing data into race traces, tyre-degradation models and a strategy simulator you can
              argue with. Every number on this site is computed from the raw lap table, checked against the original timing feed.
            </p>
            <div className="row">
              <a className="ri-btn ri-btn--primary" href="#/races">Explore {totals.races} races</a>
              <a className="ri-btn ri-btn--secondary" href="#/lab">Open strategy lab</a>
            </div>
          </div>
          <FeaturedTrace />
        </div>
      </section>

      <section className="wrap section">
        <div className="ticker">
          <Tick label="Laps analysed" v={num(totals.laps)} />
          <Tick label="Grands Prix" v={String(totals.races)} />
          <Tick label="Pit stops logged" v={num(pitStops)} />
          <Tick label="Laps under SC / VSC" v={num(neutral)} />
          <Tick label="Race models fitted" v={String(totals.modelled)} />
          <Tick label="Timing match" v={`${(qa.lapTimeAgreement * 100).toFixed(1)}%`} />
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <div>
            <div className="kicker">Findings</div>
            <h2 className="display-l" style={{ marginTop: 8 }}>What the laps say</h2>
          </div>
          <a className="ri-btn ri-btn--editorial" href="#/method">How it's measured</a>
        </div>
        <div className="story-grid">
          <article className="ri-card story">
            <div className="kicker">Pit lane · {pitByCircuit.length} circuits</div>
            <h3 className="ri-story__title">{top.loc} charges {Math.round(top.v)}s a stop. {low.loc} barely {Math.round(low.v)}.</h3>
            <p className="ri-story__lede muted">
              Median time lost to a green-flag stop (in-lap plus out-lap, minus two normal laps), by circuit. The spread decides whether an extra stop can ever pay.
            </p>
            <BarChart
              bars={bars.map((b) => ({ id: b.loc, label: b.loc, value: b.v, focus: b === top, note: `${b.n} race${b.n > 1 ? "s" : ""}` }))}
              format={(v) => `${v.toFixed(1)}s`}
              ariaLabel={`Pit-stop time loss by circuit: highest ${top.loc} at ${top.v.toFixed(1)} seconds, lowest ${low.loc} at ${low.v.toFixed(1)} seconds`}
            />
            <div className="spacer-v" />
            <p className="ri-story__meta">Five highest and five lowest of {pitByCircuit.length} dry-race circuits · Source: FastF1 and OpenF1 timing</p>
          </article>

          <article className="ri-card story">
            <div className="kicker">Tyres · {deg.reduce((a, d) => a + d.n, 0)} stint fits</div>
            <h3 className="ri-story__title">A soft costs {(deg[0].v / deg[2].v).toFixed(1)}× more per lap than a hard</h3>
            <p className="ri-story__lede muted">
              Degradation the race models isolate once fuel burn and driver pace are taken out: seconds added to every lap for each lap of tyre age.
            </p>
            <div className="grid g-3" style={{ marginTop: 24, gap: 12, gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
              {deg.map((d) => (
                <div key={d.c}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="tyre" data-c={d.c}>{d.c}</span>
                    <span className="data-label">{d.c === "S" ? "Soft" : d.c === "M" ? "Medium" : "Hard"}</span>
                  </div>
                  <div className="mono" style={{ font: "600 26px/30px var(--font-data)", marginTop: 8 }}>{d.v.toFixed(3)}</div>
                  <div className="caption">s per lap of age · {d.n} races</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <div className="data-label" style={{ marginBottom: 6 }}>Time lost to wear over a 25-lap stint</div>
              <BarChart
                labelW={72}
                bars={deg.map((d) => ({ id: d.c, label: d.c === "S" ? "Soft" : d.c === "M" ? "Medium" : "Hard", value: (d.v * 25 * 26) / 2, focus: d.c === "S" }))}
                format={(v) => `${v.toFixed(1)}s`}
                ariaLabel="Cumulative time lost to tyre wear over 25 laps, by compound"
              />
            </div>
            <div className="spacer-v" />
            <p className="ri-story__meta">Medians across races where each compound has 40+ clean laps · per-race OLS fit · stint loss = rate × (1 + 2 + … + 25)</p>
          </article>

          <article className="ri-card story">
            <div className="kicker">{dom.year} season</div>
            <div className="ri-bigstat" style={{ marginTop: 8 }}>{dom.d.wins}/{dom.races}</div>
            <h3 className="title" style={{ marginTop: 8 }}>wins for {dom.name}, leading {num(dom.d.led)} of {num(dom.laps)} racing laps.</h3>
            <p className="muted" style={{ marginTop: 12 }}>
              His median clean-air pace was the season's benchmark; the next best driver averaged {dom.next.toFixed(2)}% slower per lap.
            </p>
            <div className="spacer-v" />
            <a className="link" style={{ marginTop: 16, fontWeight: 600 }} href={href("seasons", { y: dom.year })}>See the {dom.year} season grid →</a>
          </article>

          <article className="ri-card story">
            <div className="kicker">Data quality</div>
            <div className="ri-bigstat" style={{ marginTop: 8 }}>{dupPct.toFixed(1)}%</div>
            <h3 className="title" style={{ marginTop: 8 }}>of the exported lap table was the same lap twice.</h3>
            <p className="muted" style={{ marginTop: 12 }}>
              {num(qa.duplicateRows)} duplicated rows in the 2022–23 export also inflated the stint-age feature the original model trained on. RI360 drops them, rebuilds
              the feature, then cross-checks {num(qa.lapsCrossChecked)} lap times against the raw timing feed: {(qa.lapTimeAgreement * 100).toFixed(2)}% match to the millisecond.
            </p>
            <div className="spacer-v" />
            <a className="link" style={{ marginTop: 16, fontWeight: 600 }} href="#/method">Read the method →</a>
          </article>
        </div>
      </section>

      <section className="band">
        <div className="wrap section">
          <div className="kicker">The build</div>
          <h2 className="display-l" style={{ marginTop: 8, maxWidth: 820 }}>From timing feed to pit wall in four steps</h2>
          <div className="pipeline" style={{ marginTop: 32 }}>
            {[
              ["01", "Collect", "FastF1 pulls every race session's timing, tyre and weather feeds into a local cache. A FastAPI service loads them into SQL."],
              ["02", "Clean", `Duplicates dropped, stint ages rebuilt, every lap cross-checked against raw timing. Safety-car laps flagged from the track-status feed.`],
              ["03", "Model", "For each race, least squares separates driver pace, fuel burn, compound offset and tyre degradation, and is scored on held-out laps."],
              ["04", "Ship", "A Python build writes a 4.6 MB static JSON bundle. This React site renders every chart from it, in the browser, with no server."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="step">{n}</div>
                <div className="title" style={{ marginTop: 8 }}>{t}</div>
                <p className="muted" style={{ marginTop: 8, fontSize: 14, lineHeight: "20px" }}>{d}</p>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 32 }}>
            <a className="ri-btn ri-btn--primary" href="#/method">Method and model</a>
            <a className="ri-btn ri-btn--secondary" style={{ color: "inherit", borderColor: "currentColor" }} href={REPO_BACKEND} target="_blank" rel="noreferrer">View the code ↗</a>
          </div>
        </div>
      </section>

      <section className="wrap section" style={{ paddingTop: 64 }}>
        <div className="grid g-3">
          <Entry href="#/races" k="Races" t="Every Grand Prix, lap by lap" d={`Race traces, tyre strategies, sector times and the fitted pace model for ${totals.races} races.`} />
          <Entry href="#/lab" k="Strategy lab" t="Re-run the race on other tyres" d="Build a plan stint by stint, see the predicted race time and the optimal one- and two-stop." />
          <Entry href="#/seasons" k="Seasons" t={`${seasons.length} years on one grid`} d={`Results and clean-air pace for every driver, every round, ${span}.`} />
        </div>
      </section>
    </>
  );
}

function Tick({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="data-label">{label}</div>
      <div className="v">{v}</div>
    </div>
  );
}

function Entry({ href: h, k, t, d }: { href: string; k: string; t: string; d: string }) {
  return (
    <a className="ri-card ri-card--link" href={h}>
      <div className="kicker">{k}</div>
      <div className="headline" style={{ marginTop: 8 }}>{t}</div>
      <p className="muted" style={{ marginTop: 8 }}>{d}</p>
      <div style={{ marginTop: 16, fontWeight: 600 }}>Open →</div>
    </a>
  );
}

function FeaturedTrace() {
  const { data: race } = useRace(FEATURED.race);
  if (!race) return <div className="ri-card"><div className="loader" style={{ height: 360 }} /></div>;
  return <FeaturedCard race={race} />;
}

function FeaturedCard({ race }: { race: Race }) {
  const a = race.drivers.find((d) => d.code === FEATURED.a)!;
  const b = race.drivers.find((d) => d.code === FEATURED.b)!;
  const gap = a.n.map((n, i) => {
    const j = b.n.indexOf(n);
    const ga = a.g?.[i];
    const gb = j >= 0 ? b.g?.[j] : null;
    return { x: n, y: ga != null && gb != null ? Number((ga - gb).toFixed(2)) : null };
  });
  // deficit straight after the second stop, then the lap the gap turns positive
  const after = gap.filter((p) => p.x > a.pits[1] && p.y != null);
  const worst = after.reduce((m, p) => (p.y! < m.y! ? p : m), after[0]);
  const pass = gap.find((p) => p.x > worst.x && (p.y ?? -1) > 0);
  return (
    <article className="ri-card fade-in">
      <div className="kicker">{race.location} {race.year} · Race trace</div>
      <h2 className="ri-story__title">The two-stop that caught Hamilton</h2>
      <p className="ri-story__lede muted" style={{ fontSize: 14, lineHeight: "20px" }}>
        Verstappen boxed a second time on lap {a.pits[1]} and rejoined {Math.abs(worst.y ?? 0).toFixed(1)}s behind. Fresh mediums against {race.laps - b.pits[0]}-lap-old hards closed it, and he passed on lap {pass?.x}.
      </p>
      <div style={{ marginTop: 16 }}>
        <Legend items={[{ kind: "focus", label: `${a.code} gap to ${b.code}` }]} />
      </div>
      <LineChart
        height={220}
        series={[{ id: "gap", label: a.code, kind: "focus", points: gap, marks: a.pits }]}
        yFormat={(v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(0)}s`}
        zeroLine
        directLabels={false}
        xLabel="Lap"
        ariaLabel={`Gap between Verstappen and Hamilton at the ${race.year} ${race.name}: Verstappen fell ${Math.abs(worst.y ?? 0).toFixed(1)} seconds behind after his second stop and passed on lap ${pass?.x}`}
        tipTitle={(x) => `Lap ${x}`}
        yTicks={4}
      />
      <div className="row row--between" style={{ marginTop: 12 }}>
        <span className="caption">Above zero: VER ahead · dots: VER pit stops · Source: FastF1</span>
        <a className="link" style={{ fontWeight: 600, fontSize: 14 }} href={href(`race/${race.id}`, { a: a.code, b: b.code })}>Open the race →</a>
      </div>
    </article>
  );
}
