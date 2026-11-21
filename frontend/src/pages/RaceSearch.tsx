import { useId, useMemo, useRef, useState } from "react";
import type { Index, RaceSummary } from "../lib/data";
import { shortName } from "../lib/data";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Search every season's races by Grand Prix, circuit, country, winner, year or round ("r5", "round 5"). */
export function RaceSearch({ index, onPick }: { index: Index; onPick: (race: RaceSummary) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  // one searchable string per race, built once
  const hay = useMemo(
    () =>
      index.races.map((r) =>
        fold(
          [r.name, r.location, r.country, r.winner, index.people[r.winner]?.name, r.year, `r${r.round}`, `round ${r.round}`]
            .filter(Boolean)
            .join(" "),
        ),
      ),
    [index],
  );

  const results = useMemo(() => {
    const terms = fold(q).trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    const out: RaceSummary[] = [];
    // newest season first, then by round
    for (let i = index.races.length - 1; i >= 0 && out.length < 8; i--) {
      if (terms.every((t) => hay[i].includes(t))) out.push(index.races[i]);
    }
    return out.sort((a, b) => b.year - a.year || a.round - b.round);
  }, [q, hay, index]);

  const pick = (r: RaceSummary) => {
    onPick(r);
    setQ(shortName(r.name) + " " + r.year);
    setOpen(false);
    input.current?.blur();
  };

  const showList = open && q.trim() !== "";

  return (
    <div className="race-search">
      <svg className="race-search__icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        ref={input}
        className="input race-search__input"
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[hi] ? `${listId}-${results[hi].id}` : undefined}
        aria-label="Search races"
        placeholder="Search a race, circuit, winner or year"
        autoComplete="off"
        spellCheck={false}
        value={q}
        onChange={(e) => { setQ(e.target.value); setHi(0); setOpen(true); }}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
          // phones: the keyboard takes the bottom half, so lift the box to just under the header to leave room for results
          if (window.matchMedia?.("(pointer: coarse)").matches) {
            const el = e.target;
            setTimeout(() => {
              const header = document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 64;
              const top = el.getBoundingClientRect().top + window.scrollY - header - 12;
              if (Math.abs(top - window.scrollY) > 8) window.scrollTo({ top, behavior: "smooth" });
            }, 280);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && results[hi]) { e.preventDefault(); pick(results[hi]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
      />
      {showList && (
        <ul className="race-search__list" id={listId} role="listbox" aria-label="Matching races">
          {results.length === 0 && <li className="race-search__empty">No race matches “{q.trim()}”</li>}
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`${listId}-${r.id}`}
              role="option"
              aria-selected={i === hi}
              className="race-search__opt"
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(r); }}
            >
              <span className="race-search__name">{shortName(r.name)}</span>
              <span className="race-search__meta">{r.year} · R{String(r.round).padStart(2, "0")} · {r.winner}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
