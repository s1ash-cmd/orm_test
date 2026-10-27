"use client";

import { Check, Download, Menu, Moon, RefreshCw, Sun, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Results } from "./Results";
import { Examples } from "./Examples";
import { Reproduce } from "./Reproduce";
import { Method } from "./Method";
import { RunDetail } from "./RunDetail";
import { cases, fileUrl, libraries, sections } from "@/lib/catalog";
import type { CaseId, Dataset, LibraryId, LibraryResult, Metric, Section } from "@/lib/types";

export default function Dashboard({ data }: { data: Dataset }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>("results");
  const [enabled, setEnabled] = useState<LibraryId[]>(libraries.map(item => item.id));
  const [activeLibrary, setActiveLibrary] = useState<LibraryId>("python");
  const [selectedCase, setSelectedCase] = useState<CaseId | "all">("all");
  const [metric, setMetric] = useState<Metric>("median");
  const [relative, setRelative] = useState(false);
  const [shared, setShared] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [selected, setSelected] = useState<{ library: LibraryResult; kind: CaseId } | null>(null);
  const [pending, startTransition] = useTransition();
  const filters = useRef<HTMLDialogElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const value = localStorage.getItem("orm-test-theme") === "light" ? "light" : "dark";
      setTheme(value); document.documentElement.dataset.theme = value;
    } catch {}
    function location() {
      const [next, language] = window.location.hash.slice(1).split("/");
      if (sections.some(item => item.id === next)) setSection(next as Section);
      if (libraries.some(item => item.id === language)) setActiveLibrary(language as LibraryId);
    }
    location();
    window.addEventListener("hashchange", location);
    window.addEventListener("popstate", location);
    return () => { window.removeEventListener("hashchange", location); window.removeEventListener("popstate", location); };
  }, []);
  const shown = data.libraries.filter(library => enabled.includes(library.id));
  const example = data.examples.find(item => item.id === activeLibrary)!;
  const library = data.libraries.find(item => item.id === activeLibrary)!;
  function navigate(next: Section, id = activeLibrary) {
    setSection(next);
    window.history.pushState(null, "", "#" + next + (next === "code" || next === "repeat" ? "/" + id : ""));
    feed.current?.scrollTo(0, 0);
    filters.current?.close();
  }
  function chooseLibrary(id: LibraryId) {
    if (section === "results") setEnabled(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id]);
    else {
      setActiveLibrary(id);
      window.history.replaceState(null, "", "#" + section + "/" + id);
    }
  }
  function changeTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); document.documentElement.dataset.theme = next;
    try { localStorage.setItem("orm-test-theme", next); } catch {}
  }
  function refresh() { startTransition(() => router.refresh()); }
  function exportCSV() {
    const header = ["language", "orm", "sqlite", "case", "orm_median_us", "orm_p95_us", "sql_median_us", "sql_p95_us", "median_ratio", "p95_ratio", "samples_per_variant"];
    const values = shown.flatMap(item => item.results.filter(row => selectedCase === "all" || selectedCase === row.case).map(row => [
      item.language, item.orm, item.sqlite, row.case, row.orm.median, row.orm.p95, row.sql.median, row.sql.p95, row.orm.median / row.sql.median, row.orm.p95 / row.sql.p95, row.orm.count,
    ]));
    const csv = "\uFEFF" + [header, ...values].map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "orm_test_results.csv"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function sidebar(mobile = false) {
    return <div className="sidebar-body">
      <div className="side-heading"><h2>{section === "method" ? "Окружение" : "Библиотеки"}</h2>{section === "results" && <span>{enabled.length} / 4</span>}{mobile && <button className="icon-button" aria-label="Закрыть фильтры" onClick={() => filters.current?.close()}><X size={19} /></button>}</div>
      {section !== "method" && <section className="library-filter">
        {section === "results" && <div className="section-head"><span>Показать на графиках</span><button onClick={() => setEnabled(libraries.map(item => item.id))}>Все</button><button onClick={() => setEnabled([])}>Сбросить</button></div>}
        {data.libraries.map(item => {
          const checked = section === "results" ? enabled.includes(item.id) : activeLibrary === item.id;
          return <button key={item.id} className="library-row" data-language={item.id} aria-pressed={checked} onClick={() => chooseLibrary(item.id)}>
            <span className={"selection " + (checked ? "checked" : "")}>{checked && <Check size={10} />}</span>
            <span className="library-name">{item.orm.replace(/\s+\d.*$/, "")}<small>{item.language}</small></span>
          </button>;
        })}
      </section>}
      {section === "results" && <section className="case-filter"><h3>Запрос</h3>{([{ id: "all", name: "Все запросы" }, ...cases] as { id: CaseId | "all"; name: string }[]).map(item => <button key={item.id} className="case-row" aria-pressed={selectedCase === item.id} onClick={() => setSelectedCase(item.id)}><span className={"radio " + (selectedCase === item.id ? "checked" : "")} />{item.name}</button>)}</section>}
      <section className="side-environment"><h3>Тестовая машина</h3><strong>{data.machine}</strong><span>{data.os}{data.architecture && " / " + data.architecture.toUpperCase()}</span><span>SQLite / локальный файл</span><span>{new Date(data.measuredAt).toLocaleDateString("ru-RU", { timeZone: "UTC" })}</span></section>
      <section className="side-protocol"><h3>Один запуск</h3><dl><div><dt>Книги</dt><dd>10 000</dd></div><div><dt>Выдачи</dt><dd>20 000</dd></div><div><dt>Прогрев</dt><dd>{data.warmups} / вариант</dd></div><div><dt>Замеры</dt><dd>{data.rounds} × {data.perRound}</dd></div></dl></section>
      <div className="side-bottom"><p>Сравниваем ORM и SQL внутри языка. Версии SQLite у драйверов различаются.</p>{section !== "method" && <button className="text-button" onClick={() => navigate("method")}>Условия измерений</button>}<a href={fileUrl("benchmark/summary.csv")} className="text-button"><Download size={12} />Исходный CSV</a></div>
    </div>;
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">К содержимому</a>
    <header className="app-header">
      <a href="#results" className="wordmark" aria-label="orm_test, результаты" onClick={event => { event.preventDefault(); navigate("results"); }}>orm<span>_test</span></a>
      <nav className="main-nav" aria-label="Разделы приложения">{sections.map(item => <button key={item.id} aria-current={section === item.id ? "page" : undefined} onClick={() => navigate(item.id)}>{item.label}</button>)}</nav>
      <div className="header-actions">
        <button className="icon-button" onClick={refresh} disabled={pending} aria-label="Обновить результаты" title="Перечитать JSON"><RefreshCw size={16} className={pending ? "spin" : ""} /></button>
        <button className="icon-button" onClick={exportCSV} disabled={!shown.length} aria-label="Экспорт CSV" title="Выгрузить выбранные результаты"><Download size={16} /></button>
        <button className="icon-button" onClick={changeTheme} aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        <button className="icon-button mobile-only" aria-label="Открыть фильтры" onClick={() => filters.current?.showModal()}><Menu size={18} /></button>
      </div>
    </header>
    <div className="workspace">
      <main id="main-content" className="main-column" tabIndex={-1}>
        <div className="main-feed" ref={feed}>
          {section === "results" && <Results libraries={shown} metric={metric} setMetric={setMetric} selectedCase={selectedCase} relative={relative} setRelative={setRelative} shared={shared} setShared={setShared} onSelect={(item, kind) => setSelected({ library: item, kind })} onReset={() => setEnabled(libraries.map(item => item.id))} />}
          {section === "code" && <Examples key={activeLibrary} example={example} library={library} />}
          {section === "repeat" && <Reproduce data={data} selected={activeLibrary} onResults={() => { refresh(); navigate("results"); }} />}
          {section === "method" && <Method data={data} />}
        </div>
        <footer className="app-footer"><div><i /><span>Сохранённый запуск</span><span>{data.totalSamples.toLocaleString("ru-RU")} замеров</span></div><div><span>Время в мкс</span><a href="/api/results" target="_blank" rel="noreferrer">JSON</a></div></footer>
      </main>
      <aside className="sidebar">{sidebar()}</aside>
    </div>
    <dialog className="filter-dialog" ref={filters} aria-label="Фильтры результатов">{sidebar(true)}</dialog>
    <RunDetail selected={selected} onClose={() => setSelected(null)} />
  </div>;
}
