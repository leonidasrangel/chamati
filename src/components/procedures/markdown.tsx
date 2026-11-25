import { Fragment } from "react";

/**
 * Renderizador Markdown mínimo e seguro (gera elementos React, sem innerHTML).
 * Suporta: # títulos, listas (-, *, 1.), tarefas (- [ ] / - [x]), > citação,
 * ``` blocos de código ```, ---, `código`, **negrito** e *itálico*.
 */
export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) buf.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key++}>
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = inline(heading[2]);
      blocks.push(level === 1 ? <h1 key={key++}>{content}</h1> : level === 2 ? <h2 key={key++}>{content}</h2> : <h3 key={key++}>{content}</h3>);
      i++;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push(<hr key={key++} />);
      i++;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push(<blockquote key={key++}>{inline(buf.join(" "))}</blockquote>);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""));
      const isTask = items.every((it) => /^\[( |x|X)\]\s/.test(it));
      blocks.push(
        <ul key={key++} className={isTask ? "!list-none !pl-0" : undefined}>
          {items.map((it, n) => {
            const task = /^\[( |x|X)\]\s(.*)$/.exec(it);
            if (task)
              return (
                <li key={n} className="flex items-start gap-2">
                  <input type="checkbox" checked={task[1] !== " "} readOnly disabled className="mt-1.5 accent-blue-600" />
                  <span>{inline(task[2])}</span>
                </li>
              );
            return <li key={n}>{inline(it)}</li>;
          })}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push(
        <ol key={key++}>
          {items.map((it, n) => (
            <li key={n}>{inline(it)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|\s*[-*]\s|\s*\d+[.)]\s|\s*>)/.test(lines[i])) buf.push(lines[i++]);
    blocks.push(
      <p key={key++}>
        {buf.map((b, n) => (
          <Fragment key={n}>
            {n > 0 && <br />}
            {inline(b)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className="prose-kb">{blocks}</div>;
}

function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) out.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
