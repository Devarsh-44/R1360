import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import type { Index, Race, Stint } from "./lib/data";
import { COMPOUND_NAME } from "./lib/data";
import { closeStory, href, openStory } from "./lib/router";
import { buildStory, type StoryCard } from "./lib/story";
import { markSeen } from "./pages/Stories";

/** Seconds each card stays up before moving on (paused while held, or with the pause button). */
const CARD_SECONDS = 6.5;

/** A link that opens a race story over the current page. Still a real link: new tab and copy-link work. */
export function StoryLink({ raceId, className, children }: { raceId: number; className?: string; children: ReactNode }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openStory(raceId);
  };
  return (
    <a className={className} href={href(`race/${raceId}/story`)} onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.8v10.4L12 7z" fill="currentColor" /></svg>
      {children}
    </a>
  );
}

const THEME: Record<StoryCard["tone"], "pit" | "paper"> = { inverse: "pit", petrol: "paper", paper: "paper", red: "paper" };

export function RaceStory({ race, index }: { race: Race; index: Index }) {
  const cards = useMemo(() => buildStory(race, index), [race, index]);
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const [paused, setPaused] = useState(false);
  const [side, setSide] = useState<"prev" | "next" | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; t: number; timer: number } | null>(null);
  const last = cards.length - 1;
  const card = cards[Math.min(i, last)];

  const close = useCallback(() => closeStory(race.id), [race.id]);
  const next = useCallback(() => setI((v) => Math.min(v + 1, last)), [last]);
  const prev = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  useEffect(() => markSeen(race.id), [race.id]);

  // modal housekeeping: lock page scroll, move focus in, give it back on close
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (before && document.contains(before)) before.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Tab" && dialog.current) {
        // keep focus inside the story
        const f = [...dialog.current.querySelectorAll<HTMLElement>("button, a[href]")].filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const end = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
        else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, next, prev]);

  // tap left / right, hold to pause, swipe sideways to move, swipe down to close
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    const timer = window.setTimeout(() => setHeld(true), 220);
    press.current = { x: e.clientX, y: e.clientY, t: performance.now(), timer };
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    window.clearTimeout(p.timer);
    setHeld(false);
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) return close();
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? next() : prev();
    if (performance.now() - p.t < 250 && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const box = e.currentTarget.getBoundingClientRect();
      if (e.clientX - box.left < box.width * 0.33) prev();
      else next();
    }
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const over = (e.target as HTMLElement).closest("button, a");
    const box = e.currentTarget.getBoundingClientRect();
    setSide(over ? null : e.clientX - box.left < box.width * 0.33 ? "prev" : "next");
  };
  const onCancel = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    setHeld(false);
  };

  const running = !held && !paused && i < last;
  const bigSize: CSSProperties = { fontSize: `min(132px, ${(170 / Math.max(4, card.big.length)).toFixed(1)}cqi)` };

  return (
    <div className="story-overlay" role="presentation">
      <div
        ref={dialog}
        className={`story-stage tone-${card.tone}`}
        data-theme={THEME[card.tone]}
        role="dialog"
        aria-modal="true"
        aria-label={`${race.year} ${race.name}: race story`}
        tabIndex={-1}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onPointerLeave={() => { onCancel(); setSide(null); }}
        onPointerMove={onMove}
        data-side={side ?? undefined}
      >
        {/* mouse users: a chevron fades in on the half of the card a click will go to */}
        <span className={`story-edge story-edge--prev${side === "prev" && i > 0 ? " is-on" : ""}`} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 22 22"><path d="M14 4l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" fill="none" /></svg>
        </span>
        <span className={`story-edge story-edge--next${side === "next" && i < last ? " is-on" : ""}`} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 22 22"><path d="M8 4l7 7-7 7" stroke="currentColor" strokeWidth="2.4" fill="none" /></svg>
        </span>
        {/* keyboard users: real buttons, hidden until focused, never moving the layout */}
        <button className="story-key story-key--prev" onClick={prev} disabled={i === 0} aria-label="Previous card">‹</button>
        <button className="story-key story-key--next" onClick={next} disabled={i === last} aria-label="Next card">›</button>
        <div className="story-top">
          <div className="story-bars" aria-hidden="true">
            {cards.map((c, n) => (
              <span key={c.id} className={n < i ? "is-done" : n === i ? "is-now" : ""}>
                {n === i && i < last && (
                  <i key={`${c.id}-${i}`} style={{ animationDuration: `${CARD_SECONDS}s`, animationPlayState: running ? "running" : "paused" }} onAnimationEnd={next} />
                )}
              </span>
            ))}
          </div>
          <div className="story-head">
            <span className="story-mark" aria-hidden="true">RI</span>
            <span className="story-title">{race.name.replace(" Grand Prix", " GP")}</span>
            <span className="story-count">{i + 1} of {cards.length}</span>
            <span className="spacer" />
            {i < last && (
              <button className="story-icon" onClick={() => setPaused((v) => !v)} aria-label={paused ? "Play story" : "Pause story"} aria-pressed={paused}>
                {paused ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3v12l10-6z" fill="currentColor" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3h3v12H5zM10 3h3v12h-3z" fill="currentColor" /></svg>
                )}
              </button>
            )}
            <button className="story-icon" onClick={close} aria-label="Close story">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 3.5l11 11M14.5 3.5l-11 11" stroke="currentColor" strokeWidth="1.8" /></svg>
            </button>
          </div>
        </div>

        <article key={card.id} className="story-card" aria-live="polite">
          <div className="kicker">{card.kicker}</div>
          <div className="story-big" style={bigSize}>{card.big}</div>
          <div className="story-sub">{card.sub}</div>
          <p className="story-body">{card.body}</p>
          {card.viz && <Viz viz={card.viz} />}
        </article>

        <div className="story-foot">
          {card.id === "full" ? (
            <a className="story-cta" href={href(`race/${race.id}`)} onClick={(e) => { e.preventDefault(); close(); }}>
              Open the full race
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
            </a>
          ) : (
            <span className="story-hint">Tap for the next card · swipe down to close</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Stints({ stints, total, labels }: { stints: Stint[]; total: number; labels?: boolean }) {
  return (
    <>
      <div className="story-stints" role="img" aria-label={stints.map((s) => `${COMPOUND_NAME[s.c]} laps ${s.from}–${s.to}`).join(", ")}>
        {stints.map((s, n) => (
          <span key={n} className={`fill-${s.c}`} style={{ flex: `${s.to - s.from + 1} 0 0` }}>{s.to - s.from >= 4 ? s.c : ""}</span>
        ))}
      </div>
      {labels && (
        <div className="story-laps" aria-hidden="true">
          {[1, ...stints.slice(0, -1).map((s) => s.to), total].map((l, n, all) => (
            <span key={n} style={{ left: `${(((l - (n === 0 ? 1 : 0)) / total) * 100).toFixed(2)}%`, transform: n === 0 ? "none" : n === all.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}>L{l}</span>
          ))}
        </div>
      )}
    </>
  );
}

function Viz({ viz }: { viz: NonNullable<StoryCard["viz"]> }) {
  if (viz.kind === "stints") return <div className="story-viz"><Stints stints={viz.stints} total={viz.total} labels /></div>;
  if (viz.kind === "move")
    return (
      <div className="story-viz story-move">
        <div><span className="data-label">Grid</span><b>P{viz.from}</b></div>
        <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true"><path d="M2 8h22M18 2l6 6-6 6" stroke="currentColor" strokeWidth="2.2" fill="none" /></svg>
        <div className="is-focus"><span className="data-label">Finish</span><b>P{viz.to}</b></div>
      </div>
    );
  return (
    <div className="story-viz story-rows">
      {viz.rows.map((r) => (
        <div key={r.label} className={r.focus ? "is-focus" : ""}>
          <span className="story-row-label">{r.label}</span>
          {r.stints && viz.total ? (
            <span className="story-row-bar"><Stints stints={r.stints} total={viz.total} /></span>
          ) : (
            <>
              <span className="story-row-bar"><i style={{ width: `${(r.share * 100).toFixed(1)}%` }} /></span>
              <span className="story-row-value">{r.value}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
