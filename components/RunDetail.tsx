"use client";

import { Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cases, fileUrl, formatNumber } from "@/lib/catalog";
import { relativeTime } from "@/lib/metrics";
import type { CaseId, LibraryResult } from "@/lib/types";

interface Samples { orm: number[]; sql: number[] }

function SamplePlot({ samples }: { samples: Samples }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(540);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(250, entries[0].contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const height = 210, left = 38, right = 12, top = 12, bottom = 30;
  const values = [...samples.orm, ...samples.sql];
  const minimum = Math.floor(Math.log10(Math.max(.01, Math.min(...values))));
  const maximum = Math.ceil(Math.log10(Math.max(...values))) || 1;
  const x = (index: number) => left + index / (samples.orm.length - 1) * (width - left - right);
  const y = (value: number) => height - bottom - (Math.log10(Math.max(.01, value)) - minimum) / Math.max(1, maximum - minimum) * (height - top - bottom);
  const points = (data: number[]) => data.map((value, i) => x(i).toFixed(2) + "," + y(value).toFixed(2)).join(" ");
  const ticks = Array.from({ length: maximum - minimum + 1 }, (_, i) => 10 ** (minimum + i));
  return <div className="sample-plot" ref={ref}>
    <svg width="100%" height={height} viewBox={"0 0 " + width + " " + height} role="img" aria-label="Все 2100 измерений ORM и прямого SQL. Логарифмическая шкала времени.">
      {ticks.map(tick => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="gridline" /><text x={left - 8} y={y(tick) + 4} textAnchor="end" className="axis-text">{tick}</text></g>)}
      {[0, 700, 1400, 2099].map(index => <text key={index} x={x(index)} y={height - 8} textAnchor={index === 2099 ? "end" : "middle"} className="axis-text">{index + 1}</text>)}
      <polyline points={points(samples.sql)} className="sample-sql" />
      <polyline points={points(samples.orm)} className="sample-orm" />
    </svg>
  </div>;
}

export function RunDetail({ selected, onClose }: { selected: { library: LibraryResult; kind: CaseId } | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [samples, setSamples] = useState<Samples | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setSamples(null); setFailed(false);
    fetch("/api/samples?library=" + selected.library.id + "&case=" + selected.kind, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Загрузка"); return response.json(); })
      .then((data: Samples) => { if (!controller.signal.aborted) setSamples(data); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [selected, attempt]);
  const result = selected?.library.results.find(item => item.case === selected.kind);
  return <dialog ref={dialog} className="detail-dialog" data-language={selected?.library.id} onClose={onClose} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="detail-title">
    {selected && result && <div className="detail-inner">
      <div className="detail-top"><span>{selected.library.language}</span><span>{selected.library.orm}</span><button className="icon-button" aria-label="Закрыть измерения" onClick={onClose}><X size={19} /></button></div>
      <div className="detail-body">
        <h2 id="detail-title">{cases.find(item => item.id === selected.kind)?.name}</h2>
        <p className="detail-meta">SQLite {selected.library.sqlite} / {selected.library.driver}</p>
        <table className="detail-table"><thead><tr><th>Время, мкс</th><th>ORM</th><th>SQL</th></tr></thead><tbody>
          {([["median", "Медиана"], ["p95", "p95"], ["min", "Минимум"], ["max", "Максимум"]] as const).map(([key, label]) => <tr key={key}><th>{label}</th><td className="orm-value">{formatNumber(result.orm[key], 3)}</td><td>{formatNumber(result.sql[key], 3)}</td></tr>)}
        </tbody></table>
        <div className="detail-ratio"><span>Медиана ORM / SQL</span><strong>{formatNumber(relativeTime(result.orm.median, result.sql.median) ?? 0, 2)}×</strong></div>
        <div className="detail-chart-heading"><h3>Все измерения</h3><span>Мкс, логарифмическая шкала</span></div>
        {samples ? <SamplePlot samples={samples} /> : failed ? <div className="inline-empty"><p>Не удалось загрузить замеры.</p><button className="text-button" onClick={() => setAttempt(attempt + 1)}>Повторить</button></div> : <div className="inline-empty" role="status">Загрузка замеров…</div>}
        <div className="chart-legend"><span><i className="orm-dot" />ORM</span><span><i className="sql-dot" />SQL</span><span className="legend-hint">{result.orm.count} замеров на вариант</span></div>
        <p className="detail-note">По горизонтали — номер измерения внутри каждой серии. Прогрев в эти данные не входит.</p>
        <div className="detail-facts"><span>По ключу и списку: полные объекты</span><span>JOIN: плоская проекция</span><span>Соединения открыты заранее</span></div>
        <div className="artifact-links"><a href={fileUrl("benchmark/" + selected.library.id + ".json")}><Download size={13} />Исходный JSON</a><a href={fileUrl("benchmark/summary.csv")}><Download size={13} />Сводка CSV</a></div>
      </div>
    </div>}
  </dialog>;
}
