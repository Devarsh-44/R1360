import type { Index } from "../lib/data";
import { median, num } from "../lib/format";
import { REPO_BACKEND, REPO_FRONTEND } from "../ui";

export function Method({ index }: { index: Index }) {
  const { qa, totals, races } = index;
  const fitted = races.filter((r) => r.model);
  const byQ = (q: string) => fitted.filter((r) => r.model!.quality === q).length;
  const holdout = median(fitted.filter((r) => r.model!.maeHoldout != null).map((r) => r.model!.maeHoldout!));
  const r2 = median(fitted.filter((r) => r.model!.r2 != null).map((r) => r.model!.r2!));

  return (
    <div className="wrap section">
      <div className="kicker">Method</div>
      <h1 className="display-l" style={{ marginTop: 8, maxWidth: 900 }}>How every number on this site is made</h1>
      <p className="lede" style={{ marginTop: 16 }}>
        RI360 is a two-part project: a Python backend that collects and models Formula 1 timing data, and this site, which turns its output into something you can read
        and interrogate. Nothing here is mocked; every chart is computed from {num(totals.laps)} real race laps.
      </p>

      <div className="grid g-4" style={{ marginTop: 40 }}>
        <div className="ri-card"><div className="ri-stat__label">Raw rows</div><div className="ri-stat__value">{num(qa.rawRows)}</div><div className="ri-stat__foot">lap_model_dataset.csv</div></div>
        <div className="ri-card"><div className="ri-stat__label">Duplicates removed</div><div className="ri-stat__value">{num(qa.duplicateRows)}</div><div className="ri-stat__foot"><span className="ri-delta ri-delta--loss">{((qa.duplicateRows / qa.rawRows) * 100).toFixed(1)}%</span> of the export</div></div>
        <div className="ri-card"><div className="ri-stat__label">Laps cross-checked</div><div className="ri-stat__value">{num(qa.lapsCrossChecked)}</div><div className="ri-stat__foot"><span className="ri-delta ri-delta--gain">{(qa.lapTimeAgreement * 100).toFixed(2)}%</span> exact match</div></div>
        <div className="ri-card"><div className="ri-stat__label">Model error, held out</div><div className="ri-stat__value">{holdout.toFixed(2)}s</div><div className="ri-stat__foot">median per lap, {fitted.length} races</div></div>
      </div>

      <div className="grid g-2" style={{ marginTop: 48, alignItems: "start" }}>
        <section className="prose">
          <h2 className="headline">1 · Collect</h2>
          <p>
            The backend's <code>data_pipeline/fetch_f1_data.py</code> uses the open-source <a href="https://github.com/theOehrly/Fast-F1" target="_blank" rel="noreferrer">FastF1</a> library to download race sessions from the
            Formula 1 live-timing archive and store races, drivers, laps and weather in SQL (SQLite locally, Postgres in production). A FastAPI service exposes them, plus a strategy
            endpoint, at <code>/races</code>, <code>/races/&#123;id&#125;/laps</code>, <code>/telemetry/fastest-lap</code> and <code>/strategy/simulate</code>.
          </p>
          <p>
            The live-timing archive now requires an F1TV login, so races from 2024 on come from <a href="https://openf1.org" target="_blank" rel="noreferrer">OpenF1</a>, which
            publishes the same timing feed (laps, sectors, stints, positions, race-control messages, weather) for free. A scheduled job downloads each race the day after it is run and
            rebuilds this site. On 2023 races present in both sources, OpenF1 and FastF1 agree on every lap's tyre, stint and pit stop and on 98% of lap times to the millisecond;
            the rest are lap 1, which the two sources time from a slightly different start.
          </p>
          <p>
            Coverage: {totals.races} races from {index.seasons[0].year} to {index.seasons[index.seasons.length - 1].year} (
            {index.seasons.map((s) => `${s.year}: ${s.races.length}`).join(", ")}).
            {qa.knownGaps && qa.knownGaps.races.length > 0 ? ` Not included: ${qa.knownGaps.races.length} races (${qa.knownGaps.reason}).` : ""}
          </p>

          <h2 className="headline" style={{ marginTop: 32 }}>2 · Clean</h2>
          <p>
            Profiling the exported lap table found every lap of most 2022 races, and some of 2023, stored twice ({num(qa.duplicatesByYear["2022"] ?? 0)} and {num(qa.duplicatesByYear["2023"] ?? 0)} rows). The duplicates had
            also doubled the <code>lap_in_stint</code> feature the original Random Forest trained on. RI360 de-duplicates on race, driver and lap, rebuilds stint age, fills {num(qa.missingTyreLife)} missing tyre ages from it, and keeps
            {" "}{num(qa.unknownCompoundRows)} laps with an unknown compound out of tyre analysis.
          </p>
          <p>
            Each remaining 2019–2023 lap is then joined to the raw FastF1 timing cache for sector times and the session clock, and its lap time compared: {(qa.lapTimeAgreement * 100).toFixed(2)}% of{" "}
            {num(qa.lapsCrossChecked)} agree to the millisecond. Safety-car, virtual safety-car and red-flag periods come from the track-status feed (from race-control messages for OpenF1
            races), mapped to laps using the leader's clock.
          </p>
          <p>
            A <b>clean lap</b> is a green-flag, dry-tyre lap that is not lap one, an in-lap or an out-lap, and is within 7% of the driver's median. Pace figures and the model use clean laps only.
          </p>
        </section>

        <section className="prose">
          <h2 className="headline">3 · Model</h2>
          <p>For every race, ordinary least squares fits one equation to all clean laps:</p>
          <p className="mono" style={{ background: "var(--surface-sunken)", padding: "12px 16px", borderRadius: 6, fontSize: 13, overflowX: "auto", whiteSpace: "nowrap" }}>
            lap = driver + fuel × laps_left + compound + deg[compound] × tyre_age
          </p>
          <p>
            Driver terms soak up car and driver pace, so fuel and degradation are measured within each driver's laps. Each fit is scored on a random 20% of laps held out from training: the median
            error is {holdout.toFixed(2)}s per lap, and the model explains {Math.round(r2 * 100)}% of lap-to-lap variation within a driver.
          </p>
          <p>
            Fits are graded. <b>Per-compound</b> ({byQ("per-compound")} races): each tyre gets its own wear rate. <b>Pooled</b> ({byQ("pooled")}): one shared rate, because separate rates came out negative.
            <b> Weak</b> ({byQ("weak")}): wear could not be separated from fuel burn and track evolution. <b>Mixed</b> ({byQ("mixed")}): wet-to-dry races. {totals.races - fitted.length} wet races have no fit.
          </p>
          <p>
            Pit-stop cost is measured, not assumed: in-lap plus out-lap minus two typical laps, median over green-flag stops. The backend's simulator used a fixed 22s; measured values run from about 18s at Spa to 30s at Singapore.
          </p>

          <h2 className="headline" style={{ marginTop: 32 }}>4 · Ship</h2>
          <p>
            <code>data_pipeline/build_site_data.py</code> writes the result as a 4.6 MB bundle of static JSON: one index and one file per race. This site is React and TypeScript with hand-built SVG charts
            (d3 scales only), styled entirely from the RI360 design system's tokens, in a light “paper” and dark “pit wall” theme. The strategy lab evaluates the fitted equation in the browser and
            searches every one- and two-stop plan exhaustively.
          </p>
          <h2 className="headline" style={{ marginTop: 32 }}>Limits</h2>
          <p>
            The model knows nothing about traffic, dirty air, safety-car timing or tyre warm-up, and treats wear as linear. It is a clear way to compare plans, not a race predictor.
            Starting positions are the official grid after penalties, from the Jolpica F1 database; a pit-lane start counts as starting last.
          </p>
        </section>
      </div>

      <div className="row" style={{ marginTop: 48 }}>
        <a className="ri-btn ri-btn--primary" href={REPO_BACKEND} target="_blank" rel="noreferrer">Backend source ↗</a>
        <a className="ri-btn ri-btn--secondary" href={REPO_FRONTEND} target="_blank" rel="noreferrer">Website source ↗</a>
      </div>
    </div>
  );
}
