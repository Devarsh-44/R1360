import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Index, RaceSummary } from "../lib/data";
import { shortName } from "../lib/data";
import { href } from "../lib/router";
import { RaceCard } from "./Races";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Cover-flow deck of race cards. One float, `pos`, eases toward `target`; every card's 3D transform
 * is derived from its distance to `pos`, written straight to the DOM each frame (no React render per
 * frame). Wheel, drag/swipe, arrow keys, ticks and search all just move `target`.
 */
export function RaceDeck({ index, races, focus }: { index: Index; races: RaceSummary[]; focus: { id: number; n: number } | null }) {
  const n = races.length;
  const startAt = Math.max(0, races.findIndex((r) => r.id === focus?.id));
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const s = useRef({ pos: 0, target: startAt, spread: 0, raf: 0, last: 0, wheelT: 0, dragged: false, pulse: -1 });
  const [active, setActive] = useState(0);
  const [found, setFound] = useState(-1);
  const activeRef = useRef(0);

  const layout = () => {
    const st = s.current;
    const w = cards.current[0]?.offsetWidth ?? 320;
    for (let i = 0; i < n; i++) {
      const el = cards.current[i];
      if (!el) continue;
      const d = i - st.pos;
      const a = Math.abs(d);
      const sg = Math.sign(d);
      if (a > 7.5) { el.style.visibility = "hidden"; continue; }
      el.style.visibility = "";
      const near = Math.min(a, 1);
      // first neighbour steps well clear of the centre card, the rest stack tightly behind it
      const x = sg * (near * 0.6 + Math.max(0, Math.min(a, 7) - 1) * 0.13) * w * st.spread;
      const rot = -sg * near * 38 * st.spread;
      const z = -(near * 110 + Math.max(0, a - 1) * 55);
      const scale = 1 - near * 0.04;
      el.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(1)}px) translateZ(${z.toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      el.style.zIndex = String(1000 - Math.round(a * 10));
      el.style.opacity = String(clamp(6.5 - a, 0, 1));
      el.style.setProperty("--shade", (Math.min(a, 3) * 0.06).toFixed(3));
    }
    const nowActive = clamp(Math.round(st.pos), 0, n - 1);
    if (nowActive !== activeRef.current) { activeRef.current = nowActive; setActive(nowActive); }
  };

  const tick = (t: number) => {
    const st = s.current;
    const dt = st.last ? Math.min((t - st.last) / 1000, 0.1) : 1 / 60;
    st.last = t;
    const diff = st.target - st.pos;
    // exponential ease, but cap the speed so long jumps visibly travel through the season
    const step = diff * (1 - Math.exp(-dt * 7));
    const cap = 28 * dt;
    st.pos += clamp(step, -cap, cap);
    st.spread += (1 - st.spread) * (1 - Math.exp(-dt * 6));
    const settled = Math.abs(st.target - st.pos) < 0.001 && 1 - st.spread < 0.001;
    if (settled) { st.pos = st.target; st.spread = 1; }
    layout();
    if (st.pulse >= 0 && Math.abs(st.pos - st.pulse) < 0.02 && Number.isInteger(st.target)) {
      setFound(st.pulse);
      st.pulse = -1;
    }
    st.raf = settled ? 0 : requestAnimationFrame(tick);
  };

  const kick = () => {
    const st = s.current;
    if (reduced()) { st.pos = st.target; st.spread = 1; layout(); if (st.pulse >= 0) { setFound(st.pulse); st.pulse = -1; } return; }
    if (!st.raf) { st.last = 0; st.raf = requestAnimationFrame(tick); }
  };

  const go = (i: number, pulse = false) => {
    const st = s.current;
    st.target = clamp(Math.round(i), 0, n - 1);
    if (pulse) { st.pulse = st.target; setFound(-1); }
    kick();
  };

  // first paint: cards fan out from the middle; then glide to the searched race, if any
  useLayoutEffect(() => {
    layout();
    kick();
    return () => { cancelAnimationFrame(s.current.raf); s.current.raf = 0; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a search pick (same season, or arriving here after a season switch)
  useEffect(() => {
    if (!focus) return;
    const i = races.findIndex((r) => r.id === focus.id);
    if (i < 0) return;
    go(i, true);
    stage.current?.closest(".race-deck")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.id, focus?.n]);

  // keep the front race in the URL (no history entry), so Back from a race returns to the same card
  useEffect(() => {
    const r = races[active];
    if (!r || !s.current.spread) return;
    const t = setTimeout(() => {
      if (window.location.hash.startsWith("#/races")) history.replaceState(null, "", href("races", { y: r.year, r: r.id }));
    }, 250);
    return () => clearTimeout(t);
  }, [active, races]);

  useEffect(() => {
    if (found < 0) return;
    const t = setTimeout(() => setFound(-1), 1600);
    return () => clearTimeout(t);
  }, [found]);

  // wheel / trackpad: scroll moves through the deck; at either end the page scrolls as usual
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const st = s.current;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = horizontal ? e.deltaX : e.deltaY;
      if (!horizontal && ((delta > 0 && st.target >= n - 1) || (delta < 0 && st.target <= 0))) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 3 : e.deltaMode === 2 ? 1 : 110;
      st.target = clamp(st.target + delta / unit, 0, n - 1);
      kick();
      clearTimeout(st.wheelT);
      st.wheelT = window.setTimeout(() => go(st.target), 130);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  // drag / swipe
  const drag = useRef<{ x: number; y: number; t0: number; from: number; id: number; lastX: number; lastT: number; v: number; on: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    s.current.dragged = false;
    drag.current = { x: e.clientX, y: e.clientY, t0: s.current.target, from: e.clientX, id: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, v: 0, on: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.on) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(e.clientY - d.y) > Math.abs(dx)) { drag.current = null; return; } // vertical: let the page scroll
      d.on = true;
      s.current.dragged = true;
      stage.current?.setPointerCapture(e.pointerId);
    }
    const w = (cards.current[0]?.offsetWidth ?? 320) * 0.6;
    const dt = Math.max(e.timeStamp - d.lastT, 1);
    d.v = (e.clientX - d.lastX) / dt; // px per ms
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    s.current.target = clamp(d.t0 - dx / w, -0.4, n - 0.6);
    kick();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.on) return;
    stage.current?.releasePointerCapture(e.pointerId);
    const w = (cards.current[0]?.offsetWidth ?? 320) * 0.6;
    go(s.current.target - (d.v * 180) / w); // flick carries on a little
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, PageDown: 5, PageUp: -5 };
    if (e.key in map) { e.preventDefault(); go(s.current.target + map[e.key]); }
    else if (e.key === "Home") { e.preventDefault(); go(0); }
    else if (e.key === "End") { e.preventDefault(); go(n - 1); }
  };

  const cur = races[active];

  return (
    <section className="race-deck" aria-roledescription="carousel" aria-label="Races this season">
      <div
        ref={stage}
        className="race-deck__stage"
        tabIndex={0}
        aria-label="Race cards. Use the arrow keys to move between races."
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {races.map((r, i) => (
          <div
            key={r.id}
            ref={(el) => { cards.current[i] = el; }}
            className={`race-deck__slot${i === active ? " is-active" : ""}${i === found ? " is-found" : ""}`}
            aria-hidden={i !== active}
            onClickCapture={(e) => {
              // a drag never opens a race; a side card comes to the front instead of opening
              if (s.current.dragged || i !== active) { e.preventDefault(); e.stopPropagation(); if (!s.current.dragged) go(i); }
            }}
          >
            <RaceCard index={index} race={r} tabIndex={i === active ? 0 : -1} />
          </div>
        ))}
      </div>

      <div className="race-deck__foot">
        <button className="race-deck__arrow" aria-label="Previous race" disabled={active === 0} onClick={() => go(active - 1)}>‹</button>
        <div className="race-deck__ticks" role="group" aria-label="Jump to round">
          {races.map((r, i) => {
            const dist = Math.abs(i - active);
            return (
              <button
                key={r.id}
                className="race-deck__tick"
                style={{ height: dist === 0 ? 22 : dist === 1 ? 14 : 9 }}
                aria-current={i === active ? "true" : undefined}
                aria-label={`Round ${r.round}: ${shortName(r.name)}`}
                title={`R${r.round} · ${shortName(r.name)}`}
                onClick={() => go(i)}
              />
            );
          })}
        </div>
        <button className="race-deck__arrow" aria-label="Next race" disabled={active === n - 1} onClick={() => go(active + 1)}>›</button>
      </div>
      <div className="race-deck__now caption" aria-live="polite">
        Round {cur?.round} of {n} · <b>{cur && shortName(cur.name)}</b> · tap the front card to open it
      </div>
    </section>
  );
}
