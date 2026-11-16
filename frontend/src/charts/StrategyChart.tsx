import { scaleLinear } from "d3-scale";
import { useState } from "react";
import type { Race } from "../lib/data";
import { COMPOUND_NAME } from "../lib/data";
import { useWidth } from "./useWidth";

/** Every driver's tyre stints as one row of bars, in finishing order. */
export function StrategyChart({ race, focus, onPick }: { race: Race; focus: string[]; onPick?: (code: string) => void }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<{ x: number; y: number; text: string[] } | null>(null);
  const narrow = width < 520;
  const left = narrow ? 52 : 76;
  const rowH = 20;
  const top = 8;
  const height = top + race.drivers.length * rowH + 28;
  const x = scaleLinear().domain([0.5, race.laps + 0.5]).range([left, width - 8]);

  return (
    <div className="chart strategy-chart" ref={ref}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Tyre strategies of all ${race.drivers.length} drivers across ${race.laps} laps`} onMouseLeave={() => setTip(null)}>
        {race.neutral.map((b, i) => (
          <rect key={i} className="band-sc" x={x(b.from - 0.5)} y={top} width={x(b.to + 0.5) - x(b.from - 0.5)} height={race.drivers.length * rowH} />
        ))}
        {race.drivers.map((d, i) => {
          const yy = top + i * rowH;
          const isFocus = focus.includes(d.code);
          return (
            <g key={d.code} className="r" onClick={() => onPick?.(d.code)} style={{ cursor: onPick ? "pointer" : undefined }}>
              <rect className="row-hover" x={0} y={yy} width={width} height={rowH} />
              <text className="row-sub" x={4} y={yy + rowH / 2} dy="0.32em">{d.pos}</text>
              <text className="row-label" x={narrow ? 22 : 26} y={yy + rowH / 2} dy="0.32em" style={{ fontWeight: isFocus ? 700 : 500, fill: isFocus ? "var(--race-red)" : undefined }}>
                {d.code}
              </text>
              {d.stints.map((s, j) => {
                const x0 = x(s.from - 0.5) + (j ? 1 : 0);
                const x1 = x(s.to + 0.5) - 1;
                const w = Math.max(1, x1 - x0);
                return (
                  <g
                    key={j}
                    onMouseMove={(e) => {
                      const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setTip({
                        x: e.clientX - r.left,
                        y: yy,
                        text: [`${d.code} · ${COMPOUND_NAME[s.c]}`, `Laps ${s.from}–${s.to} (${s.to - s.from + 1})`, s.age > 1 ? `Fitted with ${s.age - 1} laps of wear` : "New set"],
                      });
                    }}
                  >
                    <rect className={`fill-${s.c}`} x={x0} y={yy + 3} width={w} height={rowH - 6} rx={3} />
                    {w > 16 && (
                      <text className={`stint-label ink-${s.c}`} x={x0 + w / 2} y={yy + rowH / 2} dy="0.34em" textAnchor="middle">
                        {s.c}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
        <g className="axis">
          {x.ticks(narrow ? 5 : 10).filter(Number.isInteger).map((t) => (
            <text key={t} x={x(t)} y={height - 8} textAnchor="middle">{t}</text>
          ))}
        </g>
      </svg>
      {tip && (
        <div className="tip" style={{ left: Math.max(80, Math.min(width - 80, tip.x)), top: tip.y }}>
          {tip.text.map((t, i) => (i ? <div key={i}>{t}</div> : <b key={i}>{t}</b>))}
        </div>
      )}
    </div>
  );
}
