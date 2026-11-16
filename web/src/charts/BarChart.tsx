import { scaleLinear } from "d3-scale";
import { useState } from "react";
import { useWidth } from "./useWidth";

export interface Bar {
  id: string;
  label: string;
  value: number;
  focus?: boolean;
  note?: string;
  href?: string;
}

/** Horizontal bars, sorted by the caller. Labels left, values at bar end. */
export function BarChart({ bars, format, ariaLabel, rowH = 26, labelW }: { bars: Bar[]; format: (v: number) => string; ariaLabel: string; rowH?: number; labelW?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const left = labelW ?? (width < 520 ? 104 : 150);
  const right = 64;
  const height = bars.length * rowH + 4;
  const max = Math.max(...bars.map((b) => b.value), 0);
  const x = scaleLinear().domain([0, max || 1]).range([left, width - right]);

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {bars.map((b, i) => {
          const y = i * rowH + 2;
          const w = Math.max(2, x(b.value) - left);
          const body = (
            <g onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)} style={{ cursor: b.href ? "pointer" : undefined }}>
              <rect className="bar-hit" x={0} y={y} width={width} height={rowH} />
              <text className="tick" x={left - 8} y={y + rowH / 2} dy="0.32em" textAnchor="end" style={{ fill: hover === b.id ? "var(--text-primary)" : undefined }}>
                {b.label}
              </text>
              <rect className={b.focus ? "bar bar--focus" : "bar"} x={left} y={y + 5} width={w} height={rowH - 10} rx={3} opacity={hover && hover !== b.id ? 0.55 : 1} />
              <text className="direct-label" x={left + w + 6} y={y + rowH / 2} dy="0.32em">
                {format(b.value)}
              </text>
              <title>{`${b.label}: ${format(b.value)}${b.note ? ` · ${b.note}` : ""}`}</title>
            </g>
          );
          return b.href ? (
            <a key={b.id} href={b.href}>
              {body}
            </a>
          ) : (
            <g key={b.id}>{body}</g>
          );
        })}
      </svg>
    </div>
  );
}
