"use client";

import { useEffect, useRef, useState } from "react";
import { cases, formatNumber } from "@/lib/catalog";
import { niceMaximum, relativeTime } from "@/lib/metrics";
import type { CaseId, LibraryResult, Metric } from "@/lib/types";

export function BarChart({ library, metric, selectedCase, relative, sharedMax, onSelect }: {
  library: LibraryResult; metric: Metric; selectedCase: CaseId | "all"; relative: boolean;
  sharedMax?: number; onSelect: (library: LibraryResult, kind: CaseId) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);
  const [hover, setHover] = useState<CaseId | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(250, Math.floor(entries[0].contentRect.width))));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const rows = library.results.filter(row => selectedCase === "all" || row.case === selectedCase);
  const height = 224, left = 76, right = 58, top = 16, bottom = 30;
  const plotWidth = Math.max(100, width - left - right);
  const values = rows.flatMap(row => relative ? [relativeTime(row.orm[metric], row.sql[metric]) ?? 0, 1] : [row.orm[metric], row.sql[metric]]);
  const maximum = sharedMax ?? niceMaximum(Math.max(...values, .1) * 1.18);
  const x = (value: number) => left + value / maximum * plotWidth;
  const rowHeight = (height - top - bottom) / rows.length;
  const ticks = Array.from({ length: 5 }, (_, i) => maximum * i / 4);
  const focused = library.results.find(row => row.case === hover);
  return <section className="benchmark-chart" data-library={library.id} data-language={library.id}>
    <div className="chart-heading">
      <button onClick={() => onSelect(library, rows[0].case)} className="chart-title"><h2>{library.orm.replace(/\s+\d.*$/, "")}</h2><span>{library.language}</span></button>
      <span className="sqlite-version">SQLite {library.sqlite}</span>
    </div>
    <div className="chart-legend">{relative ? <><span><i className="orm-dot" />ORM / SQL</span><span className="legend-hint">SQL = 1</span></> : <><span><i className="orm-dot" />ORM</span><span><i className="sql-dot" />Прямой SQL</span></>}</div>
    <div className="bar-canvas" ref={ref}>
      <svg width="100%" height={height} viewBox={"0 0 " + width + " " + height} role="img" aria-label={library.orm + ", " + (metric === "median" ? "медиана" : "p95") + (relative ? ", отношение ORM к SQL" : ", микросекунды")}>
        {ticks.map((tick, i) => <g key={i}>
          <line x1={x(tick)} y1={top - 4} x2={x(tick)} y2={height - bottom} className="gridline" />
          <text x={x(tick)} y={height - 10} textAnchor="middle" className="axis-text">{formatNumber(tick, Number.isInteger(tick) ? 0 : 1)}</text>
        </g>)}
        {relative && <line x1={x(1)} y1={top - 4} x2={x(1)} y2={height - bottom} className="reference-line" />}
        {rows.map((row, index) => {
          const y = top + rowHeight * index + rowHeight / 2;
          const a = relative ? relativeTime(row.orm[metric], row.sql[metric]) ?? 0 : row.orm[metric];
          const b = row.sql[metric];
          const label = cases.find(item => item.id === row.case)!;
          return <g key={row.case} className="chart-point" role="button" tabIndex={0}
            aria-label={library.orm + ", " + label.name + ": ORM " + formatNumber(row.orm[metric]) + " мкс, SQL " + formatNumber(b) + " мкс. Открыть измерения."}
            onMouseEnter={() => setHover(row.case)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(row.case)} onBlur={() => setHover(null)}
            onClick={() => onSelect(library, row.case)}
            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(library, row.case); } }}>
            <rect x={0} y={y - 25} width={width} height={50} className="bar-hit" />
            <text x={left - 12} y={y + 4} textAnchor="end" className="category-label">{label.short}</text>
            <rect x={left} y={relative ? y - 8 : y - 15} width={Math.max(1, x(a) - left)} height={relative ? 16 : 12} className="orm-bar" rx={1} />
            <text x={x(a) + 7} y={relative ? y + 4 : y - 5} className="value-label orm-label">{formatNumber(a)}{relative ? "×" : ""}</text>
            {!relative && <><rect x={left} y={y + 2} width={Math.max(1, x(b) - left)} height={12} className="sql-bar" rx={1} />
              <text x={x(b) + 7} y={y + 12} className="value-label sql-label">{formatNumber(b)}</text></>}
          </g>;
        })}
      </svg>
      {focused && <div className="chart-tooltip" role="status">
        <strong>{cases.find(item => item.id === focused.case)?.name}</strong>
        <div><span>ORM</span><b>{formatNumber(focused.orm[metric], 3)} мкс</b></div>
        <div><span>SQL</span><b>{formatNumber(focused.sql[metric], 3)} мкс</b></div>
        <div><span>ORM / SQL</span><b>{formatNumber(relativeTime(focused.orm[metric], focused.sql[metric]) ?? 0, 2)}×</b></div>
        <small>Нажмите, чтобы открыть замеры</small>
      </div>}
    </div>
  </section>;
}
