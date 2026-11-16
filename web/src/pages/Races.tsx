import type { Index } from "../lib/data";
import { shortName } from "../lib/data";
import { dateLong, lapTime } from "../lib/format";
import { href, replace } from "../lib/router";
import { Seg } from "../ui";

export function Races({ index, year: y }: { index: Index; year: number | null }) {
  const years = index.seasons.map((s) => s.year);
  const year = y && years.includes(y) ? y : years[years.length - 1];
  const races = index.races.filter((r) => r.year === year);

  return (
    <div className="wrap section">
      <div className="section-head">
        <div>
          <div className="kicker">Race archive</div>
          <h1 className="display-l" style={{ marginTop: 8 }}>{year} season · {races.length} races</h1>
          <p className="lede">Pick a Grand Prix for its race trace, tyre strategies, sector times and fitted pace model.</p>
        </div>
        <Seg label="Season" value={year} options={years.map((v) => [v, String(v)])} onChange={(v) => replace("races", { y: v })} />
      </div>
      {year === 2021 && (
        <div className="callout" style={{ marginBottom: 24 }}>
          <b>2021 is partial.</b> The source database holds rounds 1–7 of that season; the Styrian Grand Prix cache was incomplete and is excluded.
        </div>
      )}
      <div className="grid g-3">
        {races.map((r) => {
          const person = index.people[r.winner];
          return (
            <a key={r.id} className="ri-card ri-card--link race-card fade-in" href={href(`race/${r.id}`)}>
              <div className="row row--between">
                <span className="rnd">ROUND {String(r.round).padStart(2, "0")} · {r.location?.toUpperCase()}</span>
                <span className="row" style={{ gap: 4 }}>
                  {r.neutralLaps > 0 && <span className="tag tag--sc" title="Laps under safety car, virtual safety car or red flag">SC {r.neutralLaps}</span>}
                  {r.wetShare > 0.1 && <span className="tag tag--wet">WET</span>}
                </span>
              </div>
              <h3>{shortName(r.name)}</h3>
              <div className="caption">{dateLong(r.date)} · {r.laps} laps</div>
              <div className="meta" style={{ borderTop: "1px solid var(--line-subtle)", paddingTop: 12 }}>
                <div>
                  <div className="data-label">Winner</div>
                  <div className="driver" style={{ marginTop: 4 }}>
                    <span className="ri-pill">{person?.seasons[String(r.year)]?.num ?? ""}</span>
                    <b>{r.winner}</b>
                    <span className="mono muted" style={{ fontSize: 12 }}>{r.winnerStrategy}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="data-label">Fastest lap</div>
                  <div className="mono" style={{ marginTop: 4, fontSize: 13 }}>{r.fastest.code} {lapTime(r.fastest.time)}</div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
