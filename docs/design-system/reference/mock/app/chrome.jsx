// chrome.jsx — app chrome for the Maakdown redesign prototype.
// Exposes Outline, MetadataPanel, Toolbar, TabStrip, CommandPalette, FindBar,
// TypographyPopover, MermaidDialog, EmptyState on window.MaakRedesign.
const RC = { useState: React.useState, useRef: React.useRef, useEffect: React.useEffect };

function Mark({ name, size = 16, style }) {
  return <i data-lucide={name} style={{ width: size, height: size, flex: "none", ...style }}></i>;
}

/* ---- Segmented control ---- */
function Segmented({ value, options, onChange, style }) {
  return (
    <div style={{ display: "inline-flex", padding: 2, gap: 2, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", ...style }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} title={o.title || o.label}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, height: 26, padding: "0 10px",
              border: "1px solid " + (on ? "var(--border)" : "transparent"), borderRadius: "var(--radius-sm)", cursor: "pointer",
              background: on ? "var(--surface-bg)" : "transparent", color: on ? "var(--text)" : "var(--muted)",
              fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: on ? 600 : 500, whiteSpace: "nowrap",
              transition: "background var(--duration-fast) var(--ease-standard)",
            }}>
            {o.icon && <Mark name={o.icon} size={14} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---- Outline (left sidebar): wordmark + document outline w/ scroll-spy ---- */
function Outline({ headings, activeId, onNavigate }) {
  const { TocItem } = window.MaakdownDesignSystem_bbc01a;
  return (
    <aside style={{ width: "var(--sidebar-width)", flex: "none", borderRight: "1px solid var(--border)", background: "var(--panel-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 16px 10px" }}>
        <span style={{ width: 24, height: 24, flex: "none", borderRadius: "var(--radius-md)", background: "var(--text)", color: "var(--surface-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15 }}>M</span>
        <span style={{ fontSize: "var(--text-brand)", fontWeight: 700, letterSpacing: "-0.01em" }}>Maakdown</span>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "4px 10px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", padding: "8px 8px 6px" }}>Outline</div>
        {headings.length === 0
          ? <p style={{ color: "var(--muted)", fontSize: 13, padding: "0 8px" }}>No headings</p>
          : headings.map((h) => <TocItem key={h.id} depth={h.depth} active={h.id === activeId} onClick={() => onNavigate(h.id)}>{h.text}</TocItem>)}
      </div>
    </aside>
  );
}

/* ---- Metadata panel ---- */
function MetadataPanel({ frontmatter, path }) {
  const { Tag, Badge } = window.MaakdownDesignSystem_bbc01a;
  const skip = ["tags", "title"];
  const entries = Object.entries(frontmatter).filter(([k]) => !skip.includes(k));
  return (
    <aside style={{ width: "var(--metadata-width)", flex: "none", borderLeft: "1px solid var(--border)", background: "var(--metadata-bg)", padding: "16px 18px", overflow: "auto" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>Metadata</h2>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{path}</div>
      <dl style={{ margin: 0 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ marginBottom: 13 }}>
            <dt style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)", marginBottom: 4 }}>{k}</dt>
            <dd style={{ margin: 0, fontSize: 13.5, color: "var(--text)" }}>
              {k === "status" ? <Badge tone={v === "published" ? "success" : "warning"}>{String(v)}</Badge> : String(v)}
            </dd>
          </div>
        ))}
        {frontmatter.tags && (
          <div style={{ marginBottom: 13 }}>
            <dt style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)", marginBottom: 7 }}>tags</dt>
            <dd style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>{frontmatter.tags.map((t) => <Tag key={t}>{t}</Tag>)}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}

/* ---- Tab strip (P8) ---- */
function TabStrip({ tabs, activeIdx, onSelect, onClose, onNew }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", height: 38, background: "var(--panel-bg)", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
      {tabs.map((t, i) => {
        const on = i === activeIdx;
        return (
          <div key={t.key} onClick={() => onSelect(i)} title={t.path}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "0 10px 0 13px", maxWidth: 220, minWidth: 130, cursor: "pointer",
              background: on ? "var(--surface-bg)" : "transparent",
              borderRight: "1px solid var(--border)",
              boxShadow: on ? "inset 0 2px 0 var(--text)" : "none",
              color: on ? "var(--text)" : "var(--muted)", position: "relative",
            }}>
            {t.missing
              ? <Mark name="file-x" size={14} style={{ color: "var(--text-error)" }} />
              : <Mark name="file-text" size={14} style={{ opacity: 0.8 }} />}
            <span style={{ flex: 1, fontSize: 13, fontWeight: on ? 600 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
            {t.watching && !t.missing && <span title="Watching for changes" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-tip)", flex: "none" }} />}
            <button type="button" onClick={(e) => { e.stopPropagation(); onClose(i); }} title="Close tab"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, border: 0, borderRadius: 4, background: "transparent", color: "var(--muted)", cursor: "pointer", flex: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--active)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <Mark name="x" size={13} />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={onNew} title="Open file (⌘O)"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, border: 0, borderRight: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", flex: "none" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--active)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <Mark name="plus" size={16} />
      </button>
    </div>
  );
}

/* ---- Toolbar ---- */
function Toolbar({ doc, theme, sidebarOpen, metaOpen, onToggleSidebar, onToggleMeta, onCycleTheme, onOpenPalette, onOpenFind, onTypography, onFocus, typoOpen }) {
  const { IconButton, Button, Badge } = window.MaakdownDesignSystem_bbc01a;
  const themeIcon = theme === "dark" ? "moon" : theme === "light" ? "sun" : "monitor";
  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, height: "var(--toolbar-height)", padding: "0 10px 0 12px", background: "var(--surface-bg)", borderBottom: "1px solid var(--border)", flex: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <IconButton icon="panel-left" label="Toggle outline" active={sidebarOpen} onClick={onToggleSidebar} size="sm" />
        <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 2px" }} />
        {doc && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <Mark name="file-text" size={15} style={{ color: "var(--muted)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.frontmatter.title}</span>
            <Badge tone="success" dot>Watching</Badge>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button type="button" onClick={onOpenPalette} title="Command palette (⌘K)"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 30, padding: "0 8px 0 10px", marginRight: 4, borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--panel-bg)", color: "var(--muted)", cursor: "pointer", fontSize: 12.5 }}>
          <Mark name="search" size={14} /> Search or run…
          <kbd style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, padding: "2px 5px", borderRadius: 4, background: "var(--surface-bg)", border: "1px solid var(--border)" }}>⌘K</kbd>
        </button>
        <IconButton icon="text-search" label="Find in document (⌘F)" onClick={onOpenFind} size="sm" />
        <IconButton icon="type" label="Reading display" active={typoOpen} onClick={onTypography} size="sm" />
        <IconButton icon={themeIcon} label={`Theme: ${theme}`} onClick={onCycleTheme} size="sm" />
        <IconButton icon="panel-right" label="Toggle metadata" active={metaOpen} onClick={onToggleMeta} size="sm" />
        <IconButton icon="maximize" label="Focus mode" onClick={onFocus} size="sm" />
      </div>
    </header>
  );
}

/* ---- Command palette (⌘K) ---- */
function CommandPalette({ open, onClose, commands, tabs, recents, headings, onRun }) {
  const [q, setQ] = RC.useState("");
  const [sel, setSel] = RC.useState(0);
  const inputRef = RC.useRef(null);
  RC.useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 30); } }, [open]);

  if (!open) return null;
  const ql = q.trim().toLowerCase();
  const match = (s) => !ql || s.toLowerCase().includes(ql);
  const groups = [];
  const cmd = commands.filter((c) => match(c.label));
  if (cmd.length) groups.push({ label: "Commands", items: cmd.map((c) => ({ ...c, icon: c.icon, run: () => onRun(c) })) });
  const tb = tabs.map((t, i) => ({ ...t, _i: i })).filter((t) => match(t.title));
  if (tb.length && (ql || true)) groups.push({ label: "Open tabs", items: tb.map((t) => ({ label: t.title, sub: t.path, icon: "file-text", run: () => onRun({ id: "select-tab", arg: t._i }) })) });
  const rc = recents.filter((r) => match(r.name));
  if (rc.length) groups.push({ label: "Recent files", items: rc.map((r) => ({ label: r.name, sub: r.path, icon: r.missing ? "file-x" : "clock", run: () => onRun({ id: "open-recent", arg: r.name }) })) });
  const hd = headings.filter((h) => match(h.text));
  if (hd.length && ql) groups.push({ label: "Headings", items: hd.map((h) => ({ label: h.text, sub: "Jump to heading", icon: "hash", run: () => onRun({ id: "goto-heading", arg: h.id }) })) });

  const flat = [];
  groups.forEach((g) => g.items.forEach((it) => flat.push(it)));
  const clamp = (n) => (flat.length ? (n + flat.length) % flat.length : 0);

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => clamp(s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => clamp(s - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); flat[sel] && flat[sel].run(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }

  let idx = -1;
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "color-mix(in srgb, var(--text) 22%, transparent)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "11vh" }}>
      <div onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}
        style={{ width: "min(620px, 92vw)", maxHeight: "70vh", display: "flex", flexDirection: "column", background: "var(--surface-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-pop)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid var(--border)" }}>
          <Mark name="search" size={17} style={{ color: "var(--muted)" }} />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="Search commands, tabs, recents, headings…"
            style={{ flex: 1, border: 0, outline: "none", background: "transparent", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: 15 }} />
          <kbd style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "var(--panel-bg)", border: "1px solid var(--border)", color: "var(--muted)" }}>esc</kbd>
        </div>
        <div style={{ overflow: "auto", padding: "6px 6px 8px" }}>
          {flat.length === 0 && <div style={{ padding: "22px 14px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No matches</div>}
          {groups.map((g) => (
            <div key={g.label}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)", padding: "9px 12px 5px" }}>{g.label}</div>
              {g.items.map((it) => {
                idx++; const active = idx === sel; const myIdx = idx;
                return (
                  <div key={g.label + it.label} onMouseEnter={() => setSel(myIdx)} onClick={() => it.run()}
                    style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 12px", borderRadius: "var(--radius-md)", cursor: "pointer", background: active ? "var(--active)" : "transparent" }}>
                    <Mark name={it.icon || "chevron-right"} size={16} style={{ color: "var(--muted)" }} />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>
                    {it.sub && <span style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240, fontFamily: it.sub.startsWith("~") ? "var(--font-mono)" : "inherit" }}>{it.sub}</span>}
                    {it.kbd && <kbd style={{ fontSize: 11, fontWeight: 600, padding: "2px 5px", borderRadius: 4, background: "var(--panel-bg)", border: "1px solid var(--border)", color: "var(--muted)" }}>{it.kbd}</kbd>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Find bar (⌘F) ---- */
function FindBar({ open, query, count, current, onChange, onPrev, onNext, onClose }) {
  const ref = RC.useRef(null);
  RC.useEffect(() => { if (open) setTimeout(() => ref.current && ref.current.select(), 30); }, [open]);
  if (!open) return null;
  return (
    <div style={{ position: "absolute", top: 12, right: 18, zIndex: 40, display: "flex", alignItems: "center", gap: 6, padding: 6, background: "var(--surface-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)" }}>
      <input ref={ref} value={query.query} onChange={(e) => onChange({ query: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.shiftKey ? onPrev() : onNext(); } if (e.key === "Escape") onClose(); }}
        placeholder="Find" style={{ width: 170, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", outline: "none", background: "var(--panel-bg)", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: 13, padding: "5px 8px" }} />
      <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 44, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{count ? `${current + 1}/${count}` : "0/0"}</span>
      <div style={{ display: "flex", gap: 2 }}>
        <FindBtn icon="chevron-up" label="Previous (⇧⏎)" onClick={onPrev} disabled={!count} />
        <FindBtn icon="chevron-down" label="Next (⏎)" onClick={onNext} disabled={!count} />
      </div>
      <div style={{ width: 1, height: 20, background: "var(--border)" }} />
      <FindToggle active={query.caseSensitive} label="Match case" onClick={() => onChange({ caseSensitive: !query.caseSensitive })}>Aa</FindToggle>
      <FindToggle active={query.wholeWord} label="Whole word" onClick={() => onChange({ wholeWord: !query.wholeWord })}>“ ”</FindToggle>
      <FindBtn icon="x" label="Close (esc)" onClick={onClose} />
    </div>
  );
}
function FindBtn({ icon, label, onClick, disabled }) {
  return <button type="button" title={label} onClick={onClick} disabled={disabled}
    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: 0, borderRadius: "var(--radius-sm)", background: "transparent", color: "var(--muted)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1 }}
    onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = "var(--active)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
    <Mark name={icon} size={15} /></button>;
}
function FindToggle({ active, label, onClick, children }) {
  return <button type="button" title={label} onClick={onClick}
    style={{ height: 26, minWidth: 28, padding: "0 6px", border: "1px solid " + (active ? "var(--ring)" : "transparent"), borderRadius: "var(--radius-sm)", background: active ? "color-mix(in srgb, var(--link) 12%, transparent)" : "transparent", color: active ? "var(--link)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{children}</button>;
}

/* ---- Typography popover ---- */
function TypographyPopover({ open, typo, onChange, onClose }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
      <div style={{ position: "absolute", top: 52, right: 60, zIndex: 31, width: 268, padding: 16, background: "var(--surface-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-pop)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>Reading display</div>
        <Field label="Typeface">
          <Segmented value={typo.font} onChange={(v) => onChange({ font: v })} options={[{ value: "sans", label: "Sans" }, { value: "serif", label: "Serif" }]} style={{ width: "100%" }} />
        </Field>
        <Field label="Text size">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StepBtn icon="minus" onClick={() => onChange({ size: Math.max(13, typo.size - 1) })} />
            <span style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{typo.size}px</span>
            <StepBtn icon="plus" onClick={() => onChange({ size: Math.min(22, typo.size + 1) })} />
          </div>
        </Field>
        <Field label="Line height">
          <Segmented value={typo.leading} onChange={(v) => onChange({ leading: v })} options={[{ value: "compact", label: "Compact" }, { value: "normal", label: "Normal" }, { value: "relaxed", label: "Relaxed" }]} style={{ width: "100%" }} />
        </Field>
        <Field label="Measure">
          <Segmented value={typo.measure} onChange={(v) => onChange({ measure: v })} options={[{ value: "narrow", label: "Narrow" }, { value: "standard", label: "Standard" }, { value: "wide", label: "Wide" }]} style={{ width: "100%" }} />
        </Field>
      </div>
    </>
  );
}
function Field({ label, children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 7 }}><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{label}</span>{children}</div>;
}
function StepBtn({ icon, onClick }) {
  return <button type="button" onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 28, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-bg)", color: "var(--text)", cursor: "pointer" }}><Mark name={icon} size={14} /></button>;
}

/* ---- Mermaid zoom dialog (P9) ---- */
function MermaidDialog({ diagram, onClose }) {
  const [scale, setScale] = RC.useState(1);
  const [pan, setPan] = RC.useState({ x: 0, y: 0 });
  const drag = RC.useRef(null);
  const { Diagram } = window.MaakRedesign;
  if (!diagram) return null;
  const fit = () => { setScale(1); setPan({ x: 0, y: 0 }); };
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 70, background: "color-mix(in srgb, var(--text) 30%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(940px, 94vw)", height: "min(640px, 86vh)", display: "flex", flexDirection: "column", background: "var(--surface-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-pop)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px 10px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Mark name="git-fork" size={15} style={{ color: "var(--muted)" }} /><span style={{ fontSize: 13.5, fontWeight: 600 }}>{diagram.title}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <FindBtn icon="zoom-out" label="Zoom out" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} />
            <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 42, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{Math.round(scale * 100)}%</span>
            <FindBtn icon="zoom-in" label="Zoom in" onClick={() => setScale((s) => Math.min(3, s + 0.2))} />
            <FindBtn icon="scan" label="Reset" onClick={fit} />
            <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 2px" }} />
            <FindBtn icon="x" label="Close (esc)" onClick={onClose} />
          </div>
        </div>
        <div
          onMouseDown={(e) => { drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }}
          onMouseMove={(e) => { if (drag.current) setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }); }}
          onMouseUp={() => (drag.current = null)} onMouseLeave={() => (drag.current = null)}
          style={{ flex: 1, overflow: "hidden", background: "var(--metadata-bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: drag.current ? "grabbing" : "grab" }}>
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transition: drag.current ? "none" : "transform 120ms var(--ease-standard)", width: 560 }}>
            <Diagram diagram={diagram} onZoom={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Empty state ---- */
function EmptyState({ recents, onOpen, onOpenRecent }) {
  const { Button } = window.MaakdownDesignSystem_bbc01a;
  const [drag, setDrag] = RC.useState(false);
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-bg)", padding: 24 }}>
      <div style={{ width: "min(520px, 100%)", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
          <span style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--text)", color: "var(--surface-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 30 }}>M</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>Maakdown</div>
            <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 3 }}>Open a Markdown file to start reading.</div>
          </div>
        </div>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); onOpen(); }}
          style={{ border: `1.5px dashed ${drag ? "var(--link)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", background: drag ? "color-mix(in srgb, var(--link) 7%, var(--surface-bg))" : "var(--metadata-bg)", padding: "22px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Mark name="file-down" size={22} style={{ color: "var(--muted)" }} />
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Drop a <code style={{ fontFamily: "var(--font-mono)" }}>.md</code> file here</div>
          <Button variant="primary" iconLeft={<Mark name="folder-open" size={15} />} onClick={onOpen}>Open file…</Button>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", padding: "0 4px 8px" }}>Recent</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {recents.map((r) => (
              <button key={r.name} type="button" onClick={() => !r.missing && onOpenRecent(r.name)} disabled={r.missing}
                style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", border: 0, borderRadius: "var(--radius-md)", background: "transparent", cursor: r.missing ? "default" : "pointer", textAlign: "left", width: "100%", opacity: r.missing ? 0.55 : 1 }}
                onMouseEnter={(e) => !r.missing && (e.currentTarget.style.background = "var(--active)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <Mark name={r.missing ? "file-x" : "file-text"} size={16} style={{ color: r.missing ? "var(--text-error)" : "var(--muted)" }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{r.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.path}</span>
                </span>
                {r.missing ? <span style={{ fontSize: 11, color: "var(--text-error)", fontWeight: 600 }}>missing</span> : <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{r.when}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.MaakRedesign = Object.assign(window.MaakRedesign || {}, {
  Outline, MetadataPanel, TabStrip, Toolbar, CommandPalette, FindBar, TypographyPopover, MermaidDialog, EmptyState, Segmented, Mark,
});
