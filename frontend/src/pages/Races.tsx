import { useEffect, useState } from "react";
import type { Index, RaceSummary } from "../lib/data";
import { shortName } from "../lib/data";
import { dateLong, lapTime } from "../lib/format";
import { href, replace } from "../lib/router";
import { Seg } from "../ui";
import { RaceDeck } from "./RaceDeck";
import { RaceSearch } from "./RaceSearch";

type View = "deck" | "grid";
const VIEW_KEY = "ri360.racesView";
const readView = (): View => {
  try { return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "deck"; } catch { return "deck"; }
};

export function RaceCard({ index, race: r, tabIndex, className = "" }: { index: Index; race: RaceSummary; tabIndex?: number; className?: string }) {
  const person = index.people[r.winner];
  return (
    <a className={`ri-card ri-card--link race-card ${className}`} href={href(`race/${r.id}`)} tabIndex={tabIndex} data-race={r.id} draggable={false}>
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
}

export function Races({ index, year: y, focus: focusId }: { index: Index; year: number | null; focus: number | null }) {
  const years = index.seasons.map((s) => s.year);
  const year = y && years.includes(y) ? y : years[years.length - 1];
  const races = index.races.filter((r) => r.year === year);
  const [view, setView] = useState<View>(readView);
  // `n` re-triggers the glide when the same race is picked twice
  const [focus, setFocus] = useState<{ id: number; n: number } | null>(focusId != null ? { id: focusId, n: 0 } : null);

  useEffect(() => {
    if (focusId != null) setFocus((f) => (f?.id === focusId ? f : { id: focusId, n: (f?.n ?? 0) + 1 }));
  }, [focusId]);

  const pickView = (v: View) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode: not remembered */ }
  };

  const onPick = (r: RaceSummary) => {
    if (r.year !== year) {
      replace("races", { y: r.year, r: r.id }); // switch season, then the deck glides to it
    } else {
      history.replaceState(null, "", href("races", { y: year, r: r.id }));
      setFocus((f) => ({ id: r.id, n: (f?.n ?? 0) + 1 }));
    }
  };

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

      <div className="races-tools">
        <RaceSearch index={index} onPick={onPick} />
        <Seg label="Layout" value={view} options={[["deck", "Deck"], ["grid", "Grid"]]} onChange={pickView} />
      </div>

      {year === 2021 && (
        <div className="callout" style={{ marginBottom: 24 }}>
          <b>2021 is partial.</b> The source database holds rounds 1–7 of that season; the Styrian Grand Prix cache was incomplete and is excluded.
        </div>
      )}

      {view === "deck" ? (
        <RaceDeck key={year} index={index} races={races} focus={focus} />
      ) : (
        <RaceGrid key={year} index={index} races={races} focus={focus} />
      )}
    </div>
  );
}

function RaceGrid({ index, races, focus }: { index: Index; races: RaceSummary[]; focus: { id: number; n: number } | null }) {
  const [found, setFound] = useState<number | null>(null);
  useEffect(() => {
    if (!focus) return;
    const el = document.querySelector<HTMLElement>(`.race-grid [data-race="${focus.id}"]`);
    if (!el) return;
    const smooth = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
    setFound(focus.id);
    const t = setTimeout(() => setFound(null), 1900);
    return () => clearTimeout(t);
  }, [focus?.id, focus?.n]);

  return (
    <div className="grid g-3 race-grid">
      {races.map((r, i) => (
        // cascade the entry so the grid assembles rather than popping in
        <div key={r.id} className="race-grid__cell fade-in" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
          <RaceCard index={index} race={r} className={found === r.id ? "is-found" : ""} />
        </div>
      ))}
    </div>
  );
}
