import { useEffect, useRef, useState } from "react";
import { refreshData } from "./lib/data";
import { haptic } from "./lib/native";

const TRIGGER = 72; // px of pull (after resistance) that starts a refresh
const MAX = 110;

/**
 * App-only pull-to-refresh: pull down at the top of any page to fetch the latest races.
 * Rendered only inside the app, so the website keeps the browser's own behaviour.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<{ y: number; x: number } | null>(null);
  const armed = useRef(false);
  const pullRef = useRef(0);

  useEffect(() => {
    const blocked = () => busy || document.querySelector(".story-overlay") !== null;
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || blocked() || e.touches.length !== 1) return;
      start.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
      armed.current = false;
    };
    const onMove = (e: TouchEvent) => {
      const s = start.current;
      if (!s) return;
      const dy = e.touches[0].clientY - s.y;
      const dx = Math.abs(e.touches[0].clientX - s.x);
      if (dy <= 0 || dx > dy || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const p = Math.min(MAX, dy * 0.5);
      if (p >= TRIGGER && !armed.current) haptic("tap");
      armed.current = p >= TRIGGER;
      pullRef.current = p;
      setPull(p);
    };
    const onEnd = () => {
      if (!start.current) return;
      start.current = null;
      if (pullRef.current >= TRIGGER) {
        setBusy(true);
        setPull(TRIGGER);
        void refreshData().then(() => {
          haptic("success");
          setBusy(false);
          setPull(0);
        });
      } else setPull(0);
      pullRef.current = 0;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [busy]);

  const shown = pull > 4 || busy;
  return (
    <div className={`ptr${shown ? " is-shown" : ""}${busy ? " is-busy" : ""}${pull >= TRIGGER ? " is-armed" : ""}`} style={{ transform: `translate(-50%, ${pull - 48}px)` }} role="status" aria-live="polite">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style={{ transform: busy ? undefined : `rotate(${pull * 3}deg)` }}>
        <path d="M16 10a6 6 0 1 1-2-4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M14.5 2.5v3.5H11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">{busy ? "Checking for new races" : ""}</span>
    </div>
  );
}
