import { useEffect, useMemo, useRef, useState } from "react";
import type { Index } from "./lib/data";
import { num } from "./lib/format";
import { haptic } from "./lib/native";
import { openStory, replace } from "./lib/router";

const KEY = "ri360-onboarded";

/** Has this device seen the first-launch intro? (Kept on the device; if storage fails, we just skip it.) */
export function needsOnboarding(): boolean {
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
}

function markOnboarded() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* private mode: nothing to remember */
  }
}

const LIGHT_MS = 420; // five lights in about two seconds
const HOLD_MS = 450; // plus a short random beat, like a real start

/**
 * First launch, about three seconds: five red lights come on with a number from the archive each,
 * they go out, and one welcome screen offers three ways in. Tap anywhere during the lights to jump ahead.
 */
export function Onboarding({ index, onDone }: { index: Index; onDone: () => void }) {
  const latest = index.races[index.races.length - 1];
  const facts = useMemo(() => {
    const stops = index.races.reduce((a, r) => a + r.pitStops, 0);
    return [`${index.seasons.length} seasons`, `${index.totals.races} Grands Prix`, `${num(stops)} pit stops`, `${num(index.totals.laps)} laps`, "One pit wall"];
  }, [index]);

  const [lit, setLit] = useState(0);
  const [out, setOut] = useState(false);
  const timers = useRef<number[]>([]);
  const welcome = useRef<HTMLDivElement>(null);

  const lightsOut = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setOut(true);
    haptic("step");
  };

  useEffect(() => {
    const t = timers.current;
    for (let n = 1; n <= 5; n++)
      t.push(
        window.setTimeout(() => {
          setLit(n);
          haptic("tap");
        }, n * LIGHT_MS),
      );
    t.push(window.setTimeout(lightsOut, 5 * LIGHT_MS + HOLD_MS + Math.round(Math.random() * 400)));
    return () => t.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (out) welcome.current?.focus();
  }, [out]);

  const go = (to: () => void) => {
    markOnboarded();
    onDone();
    to();
  };

  return (
    <div className={`intro${out ? " is-out" : ""}`} role="dialog" aria-modal="true" aria-label="Welcome to RI360" onClick={() => !out && lightsOut()}>
      <div className="intro-top">
        <span className="intro-mark">RI<span>360</span></span>
        {!out && <button className="intro-skip" onClick={(e) => { e.stopPropagation(); go(() => replace("")); }}>Skip</button>}
      </div>

      <div className="intro-gantry" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`intro-pod${!out && lit >= n ? " is-on" : ""}`}>
            <i />
            <i />
          </span>
        ))}
      </div>

      {!out ? (
        <div className="intro-copy" aria-live="polite">
          <div className="intro-facts">
            {facts.map((f, n) => (
              <span key={f} className={lit > n ? "is-on" : ""}>{f}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="intro-welcome" ref={welcome} tabIndex={-1}>
          <div className="kicker">Welcome to RI360</div>
          {/* the race-start call, word by word, as the lights go out */}
          <h1 aria-label="It's lights out and away we go!">
            {[["It's", "lights", "out"], ["and", "away", "we", "go!"]].map((line, l) => (
              <span key={l} className={`intro-line${l === 0 ? " is-hot" : ""}`} aria-hidden="true">
                {line.map((w, n) => (
                  <span key={n} style={{ animationDelay: `${(l * 3 + n) * 70}ms` }}>
                    {w}{n < line.length - 1 ? " " : ""}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <div className="intro-ways">
            {latest && (
              <button onClick={() => go(() => openStory(latest.id))}>
                <b>Watch the latest race</b>
                <span>{latest.name.replace(" Grand Prix", " GP")} in six cards</span>
              </button>
            )}
            <button onClick={() => go(() => replace("races"))}>
              <b>Dig into any race</b>
              <span>Traces, tyres and pace for {index.totals.races} Grands Prix</span>
            </button>
            <button onClick={() => go(() => replace("lab"))}>
              <b>Play strategist</b>
              <span>Re-run a race with your own pit stops</span>
            </button>
          </div>
          <button className="intro-start" onClick={() => go(() => replace(""))}>Start exploring</button>
        </div>
      )}
    </div>
  );
}
