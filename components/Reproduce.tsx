"use client";

import { useState } from "react";
import { CodeBlock } from "./CodeBlock";
import type { Dataset, LibraryId } from "@/lib/types";

export function Reproduce({ data, selected, onResults }: { data: Dataset; selected: LibraryId; onResults: () => void }) {
  const [windows, setWindows] = useState(false);
  const python = windows ? ".venv\\Scripts\\python.exe" : ".venv/bin/python";
  const setup = [
    windows ? "py -3 -m venv .venv" : "python3 -m venv .venv",
    python + " -m pip install -r projects/python/requirements.txt",
    python + " projects/python/main.py demo",
  ].join("\n");
  return <div className="content-view repeat-view">
    <div className="page-heading"><div><h1>Повторить тест</h1><p>Из корня репозитория. Для общего прогона нужны все четыре проекта.</p></div><div className="segmented" role="group" aria-label="Операционная система"><button aria-pressed={!windows} onClick={() => setWindows(false)}>macOS / Linux</button><button aria-pressed={windows} onClick={() => setWindows(true)}>Windows</button></div></div>
    <div className="runtime-list">{data.libraries.map(library => <span key={library.id}>{library.runtime}</span>)}</div>
    <section className="step"><div className="step-heading"><span>1</span><h2>Python и окружение</h2></div><CodeBlock label="Установка и demo" code={setup} syntax={windows ? "powershell" : "sh"} numbered={false} /></section>
    <section className="step"><div className="step-heading"><span>2</span><h2>Собрать остальные проекты</h2></div>
      <div className="build-projects">{data.examples.filter(example => example.id !== "python").map(example => <details key={example.id + selected} open={example.id === selected || selected === "python"}>
        <summary><strong>{data.libraries.find(library => library.id === example.id)?.orm}</strong><span>{example.files.length} файла</span></summary>
        <CodeBlock label={example.id} code={windows && example.id === "go" ? example.commands.replace("benchmark/go-demo .", "benchmark/go-demo.exe .") : example.commands} syntax="sh" numbered={false} />
      </details>)}</div>
      <p className="section-note">Для TypeScript используйте одну версию Node при npm ci и запуске: better-sqlite3 — нативный модуль. Для Go нужен C-компилятор.</p>
      <details className="plain-details"><summary>Go на Apple Silicon с Intel-версией компилятора</summary><CodeBlock label="Из projects/go" code={'GOARCH=arm64 CGO_ENABLED=1 \\\nCC="/usr/bin/arch -arm64 /usr/bin/clang" \\\ngo build -o ../../benchmark/go-demo .'} syntax="sh" numbered={false} /></details>
    </section>
    <section className="step"><div className="step-heading"><span>3</span><h2>Запустить измерения</h2></div><CodeBlock label="Из корня" code={python + " benchmark/run.py" + (windows ? " --go-binary benchmark/go-demo.exe" : "")} syntax="sh" numbered={false} /><p className="section-note">Пересоздаёт benchmark/library.db и обновляет четыре JSON, summary.csv и environment.json. Проекты запускаются последовательно.</p>
      <details className="plain-details"><summary>Указать другой Node или Go-бинарник</summary><CodeBlock label="Дополнительные параметры" code={python + " benchmark/run.py \\\n  --node /path/to/node \\\n  --go-binary /path/to/go-demo"} syntax="sh" numbered={false} /></details>
    </section>
    <section className="step"><div className="step-heading"><span>4</span><h2>Открыть результаты</h2></div><CodeBlock label="Next.js" code={"npm ci\nnpm run dev"} syntax="sh" numbered={false} /><p className="section-note">localhost:3011. Кнопка обновления перечитывает файлы из benchmark.</p><button className="text-button" onClick={onResults}>К результатам</button></section>
  </div>;
}
