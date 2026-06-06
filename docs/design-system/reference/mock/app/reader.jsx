// reader.jsx — content rendering for the Maakdown redesign prototype.
// Exposes: Diagram, Document, Outline, MetadataPanel on window.MaakRedesign.
const { useState, useRef, useEffect } = React;

/* ----------------------------------------------------------------------- *
 * Find highlighting — wrap query matches in <mark>. Operates on plain text.
 * ----------------------------------------------------------------------- */
function highlightText(text, q) {
  if (!q || !q.query) return text;
  const hay = q.caseSensitive ? text : text.toLowerCase();
  const needle = q.caseSensitive ? q.query : q.query.toLowerCase();
  if (!needle) return text;
  const out = [];
  let i = 0, last = 0, n = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) {
    if (q.wholeWord) {
      const before = i === 0 || /\W/.test(text[i - 1]);
      const after = i + needle.length >= text.length || /\W/.test(text[i + needle.length]);
      if (!before || !after) { i += needle.length; continue; }
    }
    if (i > last) out.push(text.slice(last, i));
    const isCurrent = q.activeKey && q.activeKey === `${q.blockKey}:${n}`;
    out.push(
      React.createElement("mark", {
        key: `m${i}`,
        className: isCurrent ? "find-hit find-hit--active" : "find-hit",
      }, text.slice(i, i + needle.length))
    );
    last = i + needle.length;
    i = last;
    n++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : text;
}

/* ----------------------------------------------------------------------- *
 * Diagram — clean SVG flow diagram (Mermaid placeholder). Scales perfectly.
 * ----------------------------------------------------------------------- */
function Diagram({ diagram, onZoom }) {
  const NODE_W = 168, NODE_H = 52, GAP_X = 74, GAP_Y = 70, PAD = 14;
  const cols = Math.max(...diagram.nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...diagram.nodes.map((n) => n.row)) + 1;
  const W = PAD * 2 + cols * NODE_W + (cols - 1) * GAP_X;
  const H = PAD * 2 + rows * NODE_H + (rows - 1) * GAP_Y;
  const pos = {};
  diagram.nodes.forEach((n) => {
    pos[n.id] = {
      x: PAD + n.col * (NODE_W + GAP_X),
      y: PAD + n.row * (NODE_H + GAP_Y),
      cx: PAD + n.col * (NODE_W + GAP_X) + NODE_W / 2,
      cy: PAD + n.row * (NODE_H + GAP_Y) + NODE_H / 2,
    };
  });

  const svg = (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: "block" }} role="img" aria-label={diagram.title}>
      <defs>
        <marker id="mk-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" />
        </marker>
      </defs>
      {diagram.edges.map(([a, b], i) => {
        const s = pos[a], t = pos[b];
        let x1, y1, x2, y2;
        if (s.cy === t.cy) { x1 = s.x + NODE_W; y1 = s.cy; x2 = t.x; y2 = t.cy; }
        else { x1 = s.cx; y1 = s.y + NODE_H; x2 = t.cx; y2 = t.y; }
        const mx = (x1 + x2) / 2;
        const d = s.cy === t.cy ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
        return <path key={i} d={d} fill="none" stroke="var(--muted)" strokeWidth="1.5" markerEnd="url(#mk-arrow)" opacity="0.75" />;
      })}
      {diagram.nodes.map((n) => (
        <g key={n.id}>
          <rect x={pos[n.id].x} y={pos[n.id].y} width={NODE_W} height={NODE_H} rx="6"
            fill="var(--surface-bg)" stroke="var(--border)" strokeWidth="1.5" />
          <text x={pos[n.id].cx} y={pos[n.id].cy} textAnchor="middle" dominantBaseline="central"
            fontFamily="var(--font-sans)" fontSize="13" fontWeight="500" fill="var(--text)">{n.label}</text>
        </g>
      ))}
    </svg>
  );

  return (
    <figure style={{ margin: "0 0 20px" }}>
      <div
        onClick={() => onZoom(diagram)}
        title="Open diagram"
        style={{
          position: "relative", cursor: "zoom-in", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)", background: "var(--metadata-bg)", padding: "18px 16px",
          overflowX: "auto",
        }}
      >
        {svg}
        <span style={{
          position: "absolute", top: 10, right: 10, display: "inline-flex", alignItems: "center", gap: 5,
          height: 24, padding: "0 9px", borderRadius: "var(--radius-pill)", fontSize: 11, fontWeight: 600,
          color: "var(--muted)", background: "var(--surface-bg)", border: "1px solid var(--border)",
        }}>
          <i data-lucide="maximize-2" style={{ width: 13, height: 13 }}></i> zoom
        </span>
      </div>
      <figcaption style={{ marginTop: 7, fontSize: 12, color: "var(--muted)" }}>{diagram.title}</figcaption>
    </figure>
  );
}

/* ----------------------------------------------------------------------- *
 * Code block with copy (P9).
 * ----------------------------------------------------------------------- */
function CodeView({ language, code, query, blockKey }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ margin: "0 0 18px", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 10px 6px 12px", background: "var(--code-bg)", borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--code-fg)", opacity: 0.6, letterSpacing: "0.04em" }}>{language}</span>
        <button type="button" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5, height: 24, padding: "0 8px",
            border: "1px solid rgba(255,255,255,0.14)", borderRadius: "var(--radius-sm)", cursor: "pointer",
            background: "transparent", color: "var(--code-fg)", opacity: 0.85, fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
          }}>
          <i data-lucide={copied ? "check" : "copy"} style={{ width: 13, height: 13 }}></i>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "12px 14px", background: "var(--code-bg)", color: "var(--code-fg)", overflowX: "auto" }}>
        <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.6 }}>{highlightText(code, query && { ...query, blockKey })}</code>
      </pre>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Callout (typed, left-ruled).
 * ----------------------------------------------------------------------- */
const CALLOUT = {
  note: { icon: "info", accent: "--accent-note", label: "Note" },
  tip: { icon: "lightbulb", accent: "--accent-tip", label: "Tip" },
  important: { icon: "message-square-warning", accent: "--accent-important", label: "Important" },
  warning: { icon: "triangle-alert", accent: "--accent-warning", label: "Warning" },
  caution: { icon: "octagon-alert", accent: "--accent-caution", label: "Caution" },
};
function CalloutView({ type, title, children }) {
  const c = CALLOUT[type] || CALLOUT.note;
  return (
    <div style={{
      margin: "0 0 18px", padding: "12px 14px 12px 16px", borderRadius: "var(--radius-md)",
      borderLeft: `var(--border-accent) solid var(${c.accent})`,
      background: `color-mix(in srgb, var(${c.accent}) 9%, var(--surface-bg))`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, color: `var(${c.accent})`, fontWeight: 600, fontSize: 13.5 }}>
        <i data-lucide={c.icon} style={{ width: 16, height: 16 }}></i>
        {title || c.label}
      </div>
      <div style={{ fontSize: "0.94em", color: "var(--text)" }}>{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Document — renders a note's blocks with live typography settings.
 * ----------------------------------------------------------------------- */
const MEASURE = { narrow: 620, standard: 760, wide: 960 };
const LEADING = { compact: 1.45, normal: 1.65, relaxed: 1.85 };

function Document({ doc, typo, query, onOpenNote, onZoomDiagram }) {
  const renderSpans = (spans, blockKey) =>
    spans.map((s, i) => {
      if (s.link) return <Wikilink key={i} resolved={!s.unresolved} onOpen={s.unresolved ? undefined : () => onOpenNote(s.link)}>{s.link}</Wikilink>;
      if (s.code) return <code key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.86em", background: "var(--callout-bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px" }}>{s.code}</code>;
      if (s.em) return <em key={i}>{highlightText(s.t, query && { ...query, blockKey })}</em>;
      return <React.Fragment key={i}>{highlightText(s.t, query && { ...query, blockKey })}</React.Fragment>;
    });
  const Wikilink = window.MaakdownDesignSystem_bbc01a.Wikilink;

  const fontFamily = typo.font === "serif"
    ? 'Georgia, "Iowan Old Style", "Times New Roman", serif'
    : "var(--font-sans)";

  return (
    <article id="reader-article" style={{
      maxWidth: MEASURE[typo.measure], margin: "0 auto",
      fontFamily, fontSize: typo.size, lineHeight: LEADING[typo.leading],
      color: "var(--text)", paddingBottom: 80,
    }}>
      {doc.blocks.map((b, i) => {
        const key = b.id || `b${i}`;
        switch (b.type) {
          case "h1": return <h1 key={i} id={b.id} style={{ fontSize: "2em", fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.15, margin: "0 0 18px", scrollMarginTop: 24 }}>{highlightText(b.text, query && { ...query, blockKey: key })}</h1>;
          case "h2": return <h2 key={i} id={b.id} style={{ fontSize: "1.45em", fontWeight: 600, lineHeight: 1.25, margin: "34px 0 12px", scrollMarginTop: 24 }}>{highlightText(b.text, query && { ...query, blockKey: key })}</h2>;
          case "h3": return <h3 key={i} id={b.id} style={{ fontSize: "1.12em", fontWeight: 600, margin: "24px 0 8px", scrollMarginTop: 24 }}>{highlightText(b.text, query && { ...query, blockKey: key })}</h3>;
          case "p": return <p key={i} style={{ margin: "0 0 15px" }}>{renderSpans(b.spans, key)}</p>;
          case "callout": return <CalloutView key={i} type={b.calloutType} title={b.title}>{highlightText(b.text, query && { ...query, blockKey: key })}</CalloutView>;
          case "code": return <CodeView key={i} language={b.language} code={b.code} query={query} blockKey={key} />;
          case "mermaid": return <Diagram key={i} diagram={b} onZoom={onZoomDiagram} />;
          case "quote": return <blockquote key={i} style={{ margin: "0 0 18px", padding: "2px 0 2px 18px", borderLeft: "4px solid var(--callout-rule)", color: "var(--muted)", fontStyle: "italic" }}>{highlightText(b.text, query && { ...query, blockKey: key })}</blockquote>;
          case "table": return (
            <div key={i} style={{ margin: "0 0 18px", overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.9em" }}>
                <thead><tr>{b.head.map((h, j) => <th key={j} style={{ textAlign: "left", padding: "8px 12px", background: "var(--panel-bg)", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>{h}</th>)}</tr></thead>
                <tbody>{b.rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} style={{ padding: "8px 12px", borderTop: ri ? "1px solid var(--border)" : "none", fontFamily: ci === 0 ? "var(--font-mono)" : "inherit", fontSize: ci === 0 ? "0.9em" : "1em" }}>{highlightText(c, query && { ...query, blockKey: key })}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
          case "tasklist": return (
            <ul key={i} style={{ listStyle: "none", margin: "0 0 18px", padding: 0 }}>
              {b.items.map((it, j) => (
                <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 9, margin: "0 0 7px", color: it.done ? "var(--muted)" : "var(--text)" }}>
                  <span style={{ flex: "none", marginTop: 2, width: 16, height: 16, borderRadius: 4, border: "1.5px solid var(--border)", background: it.done ? "var(--accent-tip)" : "var(--surface-bg)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    {it.done && <i data-lucide="check" style={{ width: 12, height: 12, color: "#fff" }}></i>}
                  </span>
                  <span style={{ textDecoration: it.done ? "line-through" : "none" }}>{highlightText(it.text, query && { ...query, blockKey: key })}</span>
                </li>
              ))}
            </ul>
          );
          case "footnote": return (
            <div key={i} style={{ marginTop: 28, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", gap: 8, fontSize: "0.86em", color: "var(--muted)" }}>
              <span style={{ fontWeight: 600 }}>1.</span><span>{b.text}</span>
            </div>
          );
          default: return null;
        }
      })}
    </article>
  );
}

window.MaakRedesign = Object.assign(window.MaakRedesign || {}, { Diagram, Document });
