"use client";

import { ArrowDown, ArrowUp, ChartNoAxesCombined, Table2 } from "lucide-react";
import { useState } from "react";
import { BarChart } from "./BarChart";
import { cases, formatNumber } from "@/lib/catalog";
import { niceMaximum, relativeTime } from "@/lib/metrics";
import type { CaseId, LibraryResult, Metric } from "@/lib/types";

export function Results({ libraries, metric, setMetric, selectedCase, relative, setRelative, shared, setShared, onSelect, onReset }: {
  libraries: LibraryResult[]; metric: Metric; setMetric: (value: Metric) => void;
  selectedCase: CaseId | "all"; relative: boolean; setRelative: (value: boolean) => void;
  shared: boolean; setShared: (value: boolean) => void;
  onSelect: (library: LibraryResult, kind: CaseId) => void; onReset: () => void;
}) {
  const [view, setView] = useState<"charts" | "table">("charts");
  const [sort, setSort] = useState<"default" | "orm" | "sql" | "ratio">("default");
  const [direction, setDirection] = useState(1);
  const rows = libraries.flatMap(library => library.results.filter(row => selectedCase === "all" || row.case === selectedCase).map(row => ({ library, ...row })));
  const maximum = niceMaximum(Math.max(.1, ...rows.flatMap(row => relative ? [relativeTime(row.orm[metric], row.sql[metric]) ?? 0, 1] : [row.orm[metric], row.sql[metric]])) * 1.18);
  const sorted = [...rows].sort((a, b) => {
    if (sort === "default") return 0;
    const value = (row: typeof a) => sort === "ratio" ? relativeTime(row.orm[metric], row.sql[metric]) ?? 0 : row[sort][metric];
    return (value(a) - value(b)) * direction;
  });
  function sortBy(key: typeof sort) { if (key === sort) setDirection(-direction); else { setSort(key); setDirection(1); } }
  return <div className="results-view">
    <div className="page-heading"><div><h1>ORM и прямой SQL</h1><p>Каждая пара — один язык и один драйвер. Меньше — быстрее.</p></div>
      <div className="view-switch" role="group" aria-label="Представление результатов">
        <button aria-pressed={view === "charts"} onClick={() => setView("charts")}><ChartNoAxesCombined size={15} />Графики</button>
        <button aria-pressed={view === "table"} onClick={() => setView("table")}><Table2 size={15} />Таблица</button>
      </div>
    </div>
    <div className="results-toolbar">
      <div className="segmented" role="group" aria-label="Статистика">
        <button aria-pressed={metric === "median"} onClick={() => setMetric("median")}>Медиана</button>
        <button aria-pressed={metric === "p95"} onClick={() => setMetric("p95")}>p95</button>
      </div>
      {view === "charts" && <><div className="segmented" role="group" aria-label="Единицы графика">
        <button aria-pressed={!relative} onClick={() => setRelative(false)}>Время, мкс</button>
        <button aria-pressed={relative} onClick={() => setRelative(true)}>ORM / SQL</button>
      </div><label className="native-check"><input type="checkbox" checked={shared} onChange={event => setShared(event.target.checked)} />Единая шкала</label></>}
      <span className="result-count">{rows.length} пар запросов</span>
    </div>
    {!rows.length ? <div className="empty-state"><h2>Нет выбранных библиотек</h2><p>Включите библиотеку в фильтрах или верните все результаты.</p><button className="text-button" onClick={onReset}>Показать все</button></div>
      : view === "charts" ? <>
        <div className="charts-grid">{libraries.map(library => <BarChart key={library.id} library={library} metric={metric} selectedCase={selectedCase} relative={relative} sharedMax={shared ? maximum : undefined} onSelect={onSelect} />)}</div>
        <p className="chart-note">{shared ? "Единая шкала включена." : "У каждой библиотеки своя шкала."} {relative ? "1× — время прямого SQL." : "Значения в микросекундах."} Нажмите на пару столбцов, чтобы открыть исходные замеры.</p>
      </> : <div className="table-scroll"><table className="results-table">
        <thead><tr><th>Библиотека / запрос</th>{([["orm", "ORM, мкс"], ["sql", "SQL, мкс"], ["ratio", "ORM / SQL"]] as const).map(([key, label]) => <th key={key} aria-sort={sort === key ? direction === 1 ? "ascending" : "descending" : "none"}><button onClick={() => sortBy(key)}>{label}{sort === key ? direction === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}</button></th>)}<th>Замеры</th></tr></thead>
        <tbody>{sorted.map(row => <tr key={row.library.id + row.case} tabIndex={0} role="button" aria-label={row.library.orm + ", " + row.case + ", открыть измерения"} onClick={() => onSelect(row.library, row.case)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row.library, row.case); } }}>
          <td><strong>{row.library.orm}</strong><small>{row.library.language} / {cases.find(item => item.id === row.case)?.name}</small></td>
          <td className="orm-value">{formatNumber(row.orm[metric], 3)}</td><td>{formatNumber(row.sql[metric], 3)}</td>
          <td>{formatNumber(relativeTime(row.orm[metric], row.sql[metric]) ?? 0, 2)}×</td><td>{row.orm.count.toLocaleString("ru-RU")} / вариант</td>
        </tr>)}</tbody>
      </table><p className="chart-note">{metric === "median" ? "Медиана" : "p95"} каждого варианта. Коэффициент — отношение ORM к SQL внутри одного языка.</p></div>}
  </div>;
}
