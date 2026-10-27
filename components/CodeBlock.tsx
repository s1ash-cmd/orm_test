"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const tokenPattern = /(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60[^\x60]*\x60|\b(?:using|public|class|new|var|const|let|await|async|return|if|else|with|from|import|def|as|func|type|struct|int|string|number|true|false|null|None|True|False|SELECT|FROM|WHERE|JOIN|ON|ORDER|BY|LIMIT|INSERT|INTO|UPDATE|DELETE|SET|VALUES)\b|@\w+|\b\d+(?:\.\d+)?\b)/g;

function highlight(line: string) {
  return line.split(tokenPattern).map((part, index) => {
    if (!part) return null;
    const first = part[0];
    const kind = part.startsWith("//") || first === "#" ? "comment"
      : first === '"' || first === "'" || first.charCodeAt(0) === 96 ? "string"
      : first === "@" ? "decorator"
      : /^\d/.test(part) ? "number"
      : /^(?:using|public|class|new|var|const|let|await|async|return|if|else|with|from|import|def|as|func|type|struct|int|string|number|true|false|null|None|True|False|SELECT|FROM|WHERE|JOIN|ON|ORDER|BY|LIMIT|INSERT|INTO|UPDATE|DELETE|SET|VALUES)$/.test(part) ? "keyword" : "";
    return kind ? <span className={"token-" + kind} key={index}>{part}</span> : part;
  });
}

export function CodeBlock({ code, label, syntax, numbered = true }: { code: string; label: string; syntax?: string; numbered?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true); setFailed(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch { setFailed(true); }
  }
  return <div className="code-block">
    <div className="code-header"><span>{label}</span><span className="code-syntax">{syntax}</span>
      <button className="copy-button" onClick={copy} aria-label={"Копировать " + label}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
        <span aria-live="polite">{copied ? "Скопировано" : failed ? "Выделите код" : "Копировать"}</span>
      </button>
    </div>
    <pre><code>{code.split("\n").map((line, index) => <span className="code-line" key={index}>
      {numbered && <span className="line-number" aria-hidden="true">{index + 1}</span>}
      <span>{highlight(line) || " "}</span>
    </span>)}</code></pre>
  </div>;
}
