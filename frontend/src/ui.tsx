import { useEffect, useState, type ReactNode } from "react";
import type { Compound, RaceDriver, Stint } from "./lib/data";
import { COMPOUND_NAME } from "./lib/data";
import { signed } from "./lib/format";
import { Wordmark } from "./Wordmark";

export const REPO = "https://github.com/Devarsh-44/R1360";
export const REPO_BACKEND = `${REPO}/tree/main/backend`;
export const REPO_FRONTEND = `${REPO}/tree/main/frontend`;

const NAV: [string, string][] = [
  ["", "Overview"],
  ["races", "Races"],
  ["lab", "Strategy lab"],
  ["seasons", "Seasons"],
  ["method", "Method"],
];

type Theme = "paper" | "pit";

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = document.documentElement.dataset.theme;
    if (t === "pit" || t === "dark") return "pit";
    if (t === "paper" || t === "light") return "paper";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "pit" : "paper";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("ri360-theme", theme);
    } catch {
      /* private mode */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "paper" ? "pit" : "paper"))];
}

export function Header({ section }: { section: string }) {
  const [theme, toggle] = useTheme();
  return (
    <header className="site-header">
      <div className="wrap">
        <a className="brand" href="#/" aria-label="RI360 home">
          <Wordmark height={30} />
        </a>
        <nav className="nav" aria-label="Main">
          {NAV.map(([path, label]) => (
            <a key={path} href={`#/${path}`} aria-current={section === path ? "page" : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <span className="spacer" />
        <button className="icon-btn" onClick={toggle} aria-label={theme === "paper" ? "Switch to pit-wall dark theme" : "Switch to paper light theme"} title={theme === "paper" ? "Pit wall (dark)" : "Paper (light)"}>
          {theme === "paper" ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
              <path d="M16 12.5A7 7 0 0 1 7.5 4a7 7 0 1 0 8.5 8.5Z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
              <circle cx="10" cy="10" r="3.5" />
              <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6 16 16M4 16l1.4-1.4M14.6 5.4 16 4" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

export function Footer({ generated }: { generated?: string }) {
  return (
    <footer className="site-footer">
      <div className="wrap cols">
        <div>
          <Wordmark height={26} />
          <p className="caption" style={{ marginTop: 12, maxWidth: 260 }}>
            RaceIntel360: race intelligence, read like a pit wall and told like a magazine. A data and design project by Devarsh.
          </p>
        </div>
        <div>
          <div className="data-label">Explore</div>
          <div style={{ marginTop: 8 }}>
            {NAV.map(([p, l]) => (
              <a key={p} href={`#/${p}`}>{l}</a>
            ))}
          </div>
        </div>
        <div>
          <div className="data-label">Code</div>
          <div style={{ marginTop: 8 }}>
            <a href={REPO_BACKEND} target="_blank" rel="noreferrer">Backend and data pipeline ↗</a>
            <a href={REPO_FRONTEND} target="_blank" rel="noreferrer">Website source ↗</a>
            <a href="#/method">How the numbers are made</a>
          </div>
        </div>
        <div>
          <div className="data-label">Data</div>
          <p className="caption" style={{ marginTop: 8 }}>
            Timing data from the FastF1 library (2019–2023) and OpenF1 (2024 on), updated after every race.
            {generated ? ` Bundle built ${generated}.` : ""} Not affiliated with Formula 1.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function StatTile({ label, value, foot }: { label: ReactNode; value: ReactNode; foot?: ReactNode }) {
  return (
    <div className="ri-card">
      <div className="ri-stat__label">{label}</div>
      <div className="ri-stat__value">{value}</div>
      {foot && <div className="ri-stat__foot">{foot}</div>}
    </div>
  );
}

/** Delta chip: negative = gain (faster), positive = loss. */
export function Delta({ v, digits = 3, unit = "", best }: { v: number | null; digits?: number; unit?: string; best?: boolean }) {
  if (best) return <span className="ri-delta ri-delta--best">Best</span>;
  if (v == null) return <span className="ri-delta ri-delta--flat">–</span>;
  const r = Number(v.toFixed(digits));
  const kind = r === 0 ? "flat" : r < 0 ? "gain" : "loss";
  return <span className={`ri-delta ri-delta--${kind}`}>{signed(v, digits, unit)}</span>;
}

export function Tyre({ c }: { c: Compound }) {
  return (
    <span className="tyre" data-c={c} title={COMPOUND_NAME[c]} aria-label={COMPOUND_NAME[c]}>
      {c}
    </span>
  );
}

export function StintBar({ stints, total }: { stints: Stint[]; total: number }) {
  return (
    <div className="stintbar" role="img" aria-label={stints.map((s) => `${COMPOUND_NAME[s.c]} laps ${s.from}–${s.to}`).join(", ")}>
      {stints.map((s, i) => (
        <span key={i} className={`fill-${s.c}`} style={{ flex: `${(s.to - s.from + 1) / total} 0 0` }} title={`${COMPOUND_NAME[s.c]} · laps ${s.from}–${s.to}`}>
          {s.to - s.from >= 3 ? s.c : ""}
        </span>
      ))}
    </div>
  );
}

export function DriverTag({ d }: { d: Pick<RaceDriver, "num" | "code"> }) {
  return (
    <span className="driver">
      <span className="ri-pill">{d.num}</span>
      <b>{d.code}</b>
    </span>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ri-seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={String(v)} aria-pressed={v === value} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string | number>({ value, options, onChange, label, hideLabel }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string; hideLabel?: boolean }) {
  return (
    <label className="field">
      <span className={hideLabel ? "sr-only" : "label"}>{label}</span>
      <select
        className="select"
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find(([v]) => String(v) === raw);
          if (match) onChange(match[0]);
        }}
      >
        {options.map(([v, l]) => (
          <option key={String(v)} value={String(v)}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Loading() {
  return (
    <div className="wrap section" aria-busy="true">
      <div className="loader" />
      <span className="sr-only">Loading data…</span>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="wrap section">
      <div className="callout callout--warn">
        <b>Data could not be loaded.</b> {message}
      </div>
    </div>
  );
}
