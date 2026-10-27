"use client";

import { Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { cases, fileUrl } from "@/lib/catalog";
import type { CaseId, Example, LibraryResult } from "@/lib/types";

export function Examples({ example, library }: { example: Example; library: LibraryResult }) {
  const [view, setView] = useState("model");
  const [kind, setKind] = useState<CaseId>("join");
  return <div className="content-view" data-language={library.id}>
    <div className="page-heading"><div><h1>{library.orm}</h1><p>{library.runtime} / SQLite {library.sqlite}</p></div><a className="text-button" href={fileUrl(example.filename)}><Download size={14} />{example.filename.split("/").at(-1)}</a></div>
    <nav className="content-tabs" aria-label="Примеры кода">{[["model", "Модели и связи"], ["connection", "Подключение"], ["crud", "CRUD"], ["queries", "Запросы"]].map(([id, label]) => <button key={id} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}>{label}</button>)}</nav>
    <p className="section-note">{example.note}</p>
    {view === "queries" ? <>
      <div className="segmented query-picker" role="group" aria-label="Запрос в примере">{cases.map(item => <button key={item.id} aria-pressed={kind === item.id} onClick={() => setKind(item.id)}>{item.short}</button>)}</div>
      <p className="query-description">{cases.find(item => item.id === kind)?.description} Параметр start передаётся отдельно.</p>
      <div className="code-columns"><CodeBlock code={example.queries[kind].orm} label="ORM" syntax={example.syntax} /><CodeBlock code={example.queries[kind].sql} label={"Прямой SQL / " + library.driver} syntax="sql" /></div>
    </> : <CodeBlock code={view === "model" ? example.model : view === "connection" ? example.connection : example.crud} label={view === "model" ? "Book и Loan" : view === "connection" ? "SQLite" : "Транзакция и CRUD"} syntax={example.syntax} />}
    {view === "model" && <div className="relation-summary"><span><strong>Book</strong> id, title</span><span className="relation-cardinality">1 <i /> 0..*</span><span><strong>Loan</strong> id, book_id</span><small>loans.book_id → books.id</small></div>}
    <details className="full-source"><summary>Полный файл {example.filename}</summary><CodeBlock code={example.source} label={example.filename} syntax={example.syntax} /></details>
    <div className="artifact-links">{example.docs.map(link => <a href={link.url} target="_blank" rel="noreferrer" key={link.url}><ExternalLink size={12} />{link.title}</a>)}<a href={fileUrl("diagrams/library.drawio")}><Download size={12} />UML для draw.io</a></div>
  </div>;
}
