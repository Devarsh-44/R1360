import { useMemo, useState, type MouseEvent } from "react";
import type { Index, RaceSummary } from "../lib/data";
import { shortName } from "../lib/data";
import { href, openStory } from "../lib/router";

const SEEN_KEY = "ri360-stories-seen";

/** Stories this viewer has opened, kept on this device only (a convenience, never required). */
function readSeen(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as number[]);
  } catch {
    return new Set();
  }
}

export function markSeen(id: number) {
  try {
    const s = readSeen();
    s.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
  } catch {
    /* private mode: nothing to remember */
  }
}

export function Stories({ index }: { index: Index }) {
  const [seen, setSeen] = useState(readSeen);
  const byYear = useMemo(() => {
    const m = new Map<number, RaceSummary[]>();
    for (const r of index.races) m.set(r.year, [...(m.get(r.year) ?? []), r]);
    return [...m.entries()].sort((a, b) => b[0] - a[0]).map(([y, rs]) => [y, [...rs].sort((a, b) => b.round - a.round)] as const);
  }, [index.races]);
  const latest = byYear[0]?.[1][0];

  const open = (e: MouseEvent<HTMLAnchorElement>, id: number) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    markSeen(id);
    setSeen(readSeen());
    openStory(id);
  };

  return (
    <div className="wrap">
      <div className="section stories-page">
        <div className="kicker">Race stories</div>
        <h1 className="display-l" style={{ marginTop: 8 }}>Stories</h1>
        <p className="lede" style={{ marginTop: 12 }}>Every race in six cards: the winner, the biggest climb, the strategy call, the fastest car and the conditions. Tap one to play.</p>

        {latest && (
          <a className="story-latest" href={href(`race/${latest.id}/story`)} onClick={(e) => open(e, latest.id)}>
            <span className="kicker">Latest · Round {latest.round} · {latest.year}</span>
            <span className="story-latest-title">{shortName(latest.name)}</span>
            <span className="story-latest-meta">
              <span className="ri-pill">{latest.winner}</span> won{latest.wetShare > 0.1 ? " in the wet" : latest.neutralLaps ? ` with ${latest.neutralLaps} laps neutralised` : ""}
            </span>
            <span className="story-latest-play" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 14 14"><path d="M3 1.8v10.4L12 7z" fill="currentColor" /></svg>
            </span>
            {!seen.has(latest.id) && <span className="story-new">New</span>}
          </a>
        )}

        {byYear.map(([year, races]) => (
          <section key={year} className="stories-season" aria-labelledby={`stories-${year}`}>
            <h2 id={`stories-${year}`} className="title">{year} <span className="caption">{races.length} races</span></h2>
            <div className="stories-row">
              {races.map((r) => (
                <a key={r.id} className={`story-chip${seen.has(r.id) ? " is-seen" : ""}`} href={href(`race/${r.id}/story`)} onClick={(e) => open(e, r.id)} aria-label={`${r.year} ${r.name} story, won by ${r.winner}${seen.has(r.id) ? ", watched" : ""}`}>
                  <span className="story-ring"><span>{r.winner}</span></span>
                  <span className="story-chip-name">{shortName(r.name)}</span>
                  <span className="story-chip-round">R{r.round}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
