// App.jsx — Maakdown redesign prototype: state, shortcuts, find, focus mode.
(function () {
  const { useState, useRef, useEffect, useCallback } = React;
  const K = window.MaakRedesign;
  const VAULT = window.MAAKDOWN_VAULT;
  const RECENTS = window.MAAKDOWN_RECENTS;

  // ---- find occurrence counting (mirrors reader highlightText) ----
  function searchableStrings(b) {
    switch (b.type) {
      case "h1": case "h2": case "h3": case "quote": case "callout": return [b.text];
      case "p": return b.spans.map((s) => s.t || s.code || "");
      case "code": return [b.code];
      case "table": return b.rows.flat();
      case "tasklist": return b.items.map((it) => it.text);
      default: return [];
    }
  }
  function occCount(text, q) {
    if (!q.query) return 0;
    const hay = q.caseSensitive ? text : text.toLowerCase();
    const needle = q.caseSensitive ? q.query : q.query.toLowerCase();
    if (!needle) return 0;
    let i = 0, n = 0;
    while ((i = hay.indexOf(needle, i)) !== -1) {
      let ok = true;
      if (q.wholeWord) {
        const before = i === 0 || /\W/.test(text[i - 1]);
        const after = i + needle.length >= text.length || /\W/.test(text[i + needle.length]);
        ok = before && after;
      }
      if (ok) n++;
      i += needle.length;
    }
    return n;
  }
  function computeMatches(doc, q) {
    const out = [];
    if (!doc || !q.query) return out;
    doc.blocks.forEach((b, i) => {
      const key = b.id || `b${i}`;
      let c = 0;
      searchableStrings(b).forEach((s) => (c += occCount(s, q)));
      for (let j = 0; j < c; j++) out.push(key);
    });
    return out;
  }

  function App() {
    const [tabs, setTabs] = useState([{ key: "t0", name: "Architecture Overview" }]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [closedStack, setClosedStack] = useState([]);
    const [theme, setTheme] = useState("light");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [metaOpen, setMetaOpen] = useState(true);
    const [focus, setFocus] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [typoOpen, setTypoOpen] = useState(false);
    const [zoomDiagram, setZoomDiagram] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [typo, setTypo] = useState({ font: "sans", size: 16, leading: "normal", measure: "standard" });
    const [find, setFind] = useState({ open: false, query: "", caseSensitive: false, wholeWord: false });
    const [current, setCurrent] = useState(0);

    const scrollRef = useRef(null);
    const posRef = useRef({});

    const tab = tabs[activeIdx];
    const doc = tab ? VAULT[tab.name] : null;
    const headings = doc ? doc.blocks.filter((b) => ["h1", "h2", "h3"].includes(b.type)).map((b) => ({ id: b.id, text: b.text, depth: Number(b.type[1]) })) : [];

    const matches = doc && find.query ? computeMatches(doc, find) : [];
    const activeKey = matches.length ? matches[Math.min(current, matches.length - 1)] : null;
    const queryObj = { query: find.query, caseSensitive: find.caseSensitive, wholeWord: find.wholeWord, activeKey };

    // theme
    useEffect(() => {
      const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
    }, [theme]);

    // re-render lucide icons
    useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

    // open a note (reuse existing tab by name)
    const openNote = useCallback((name) => {
      if (!VAULT[name]) return;
      setTabs((ts) => {
        const ex = ts.findIndex((t) => t.name === name);
        if (ex !== -1) { setActiveIdx(ex); return ts; }
        const nt = { key: "t" + Date.now(), name };
        setActiveIdx(ts.length);
        return [...ts, nt];
      });
    }, []);

    const closeTab = useCallback((i) => {
      setTabs((ts) => {
        if (ts.length === 0) return ts;
        const closed = ts[i];
        setClosedStack((s) => [...s, closed.name]);
        const next = ts.filter((_, j) => j !== i);
        setActiveIdx((cur) => (i < cur ? cur - 1 : Math.min(cur, next.length - 1)));
        return next;
      });
    }, []);

    const reopenClosed = useCallback(() => {
      setClosedStack((s) => { if (!s.length) return s; openNote(s[s.length - 1]); return s.slice(0, -1); });
    }, [openNote]);

    // scroll helpers (avoid scrollIntoView)
    function scrollToEl(el) {
      const sc = scrollRef.current; if (!sc || !el) return;
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 20;
      sc.scrollTo({ top, behavior: "smooth" });
    }
    const navigate = useCallback((id) => { setActiveId(id); const el = document.getElementById(id); scrollToEl(el); }, []);

    // scroll-spy + save reading position
    useEffect(() => {
      const sc = scrollRef.current; if (!sc) return;
      function onScroll() {
        if (tab) posRef.current[tab.key] = sc.scrollTop;
        let cur = null;
        for (const h of headings) {
          const el = document.getElementById(h.id); if (!el) continue;
          const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top;
          if (top <= 40) cur = h.id; else break;
        }
        setActiveId(cur);
      }
      sc.addEventListener("scroll", onScroll, { passive: true });
      return () => sc.removeEventListener("scroll", onScroll);
    }, [tab, headings.length]);

    // restore reading position on tab change
    useEffect(() => {
      const sc = scrollRef.current; if (!sc) return;
      sc.scrollTop = posRef.current[tab ? tab.key : ""] || 0;
    }, [activeIdx]);

    // find: scroll to active match
    useEffect(() => {
      if (!find.open || !activeKey) return;
      const el = scrollRef.current && scrollRef.current.querySelector(".find-hit--active");
      if (el) scrollToEl(el);
    }, [current, find.query, find.open, find.caseSensitive, find.wholeWord, activeIdx]);
    useEffect(() => { setCurrent(0); }, [find.query, find.caseSensitive, find.wholeWord, activeIdx]);

    const nextMatch = () => matches.length && setCurrent((c) => (c + 1) % matches.length);
    const prevMatch = () => matches.length && setCurrent((c) => (c - 1 + matches.length) % matches.length);

    const cycleTheme = () => setTheme((t) => ["light", "dark", "system"][(["light", "dark", "system"].indexOf(t) + 1) % 3]);
    const openFind = () => setFind((f) => ({ ...f, open: true }));

    // command palette commands
    const commands = [
      { id: "open-file", label: "Open file…", icon: "folder-open", kbd: "⌘O" },
      { id: "close-tab", label: "Close tab", icon: "x", kbd: "⌘W" },
      { id: "reopen-tab", label: "Reopen closed tab", icon: "rotate-ccw", kbd: "⌘⇧T" },
      { id: "find", label: "Find in document", icon: "text-search", kbd: "⌘F" },
      { id: "toggle-theme", label: "Toggle theme", icon: theme === "dark" ? "moon" : "sun" },
      { id: "reading-display", label: "Reading display…", icon: "type" },
      { id: "focus", label: "Toggle focus mode", icon: "maximize", kbd: "F" },
      { id: "toggle-outline", label: "Toggle outline", icon: "panel-left" },
      { id: "toggle-metadata", label: "Toggle metadata", icon: "panel-right" },
    ];
    function runCommand(c) {
      setPaletteOpen(false);
      switch (c.id) {
        case "select-tab": setActiveIdx(c.arg); break;
        case "open-recent": openNote(c.arg); break;
        case "goto-heading": navigate(c.arg); break;
        case "open-file": { const n = RECENTS.find((r) => !r.missing && !tabs.some((t) => t.name === r.name)); openNote(n ? n.name : "Architecture Overview"); break; }
        case "close-tab": closeTab(activeIdx); break;
        case "reopen-tab": reopenClosed(); break;
        case "find": openFind(); break;
        case "toggle-theme": cycleTheme(); break;
        case "reading-display": setTypoOpen(true); break;
        case "focus": setFocus((v) => !v); break;
        case "toggle-outline": setSidebarOpen((v) => !v); break;
        case "toggle-metadata": setMetaOpen((v) => !v); break;
        default: break;
      }
    }

    // global keyboard
    useEffect(() => {
      function onKey(e) {
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); }
        else if (mod && e.key.toLowerCase() === "f") { e.preventDefault(); openFind(); }
        else if (mod && e.key.toLowerCase() === "o") { e.preventDefault(); runCommand({ id: "open-file" }); }
        else if (mod && e.shiftKey && e.key.toLowerCase() === "t") { e.preventDefault(); reopenClosed(); }
        else if (mod && e.key.toLowerCase() === "w") { e.preventDefault(); if (tabs.length) closeTab(activeIdx); }
        else if (mod && e.key === "Tab") { e.preventDefault(); setActiveIdx((i) => (i + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length); }
        else if (e.key === "Escape") { if (focus) setFocus(false); else if (find.open) setFind((f) => ({ ...f, open: false })); }
        else if (!mod && e.key.toLowerCase() === "f" && !find.open && !paletteOpen && document.activeElement === document.body) { setFocus((v) => !v); }
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [tabs.length, activeIdx, focus, find.open, paletteOpen, reopenClosed, closeTab]);

    const { Outline, MetadataPanel, TabStrip, Toolbar, CommandPalette, FindBar, TypographyPopover, MermaidDialog, EmptyState, Document } = K;

    return (
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--app-bg)", color: "var(--text)", fontFamily: "var(--font-sans)" }}>
        {sidebarOpen && !focus && <Outline headings={headings} activeId={activeId} onNavigate={navigate} />}
        <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
          {!focus && (
            <Toolbar doc={doc} theme={theme} sidebarOpen={sidebarOpen} metaOpen={metaOpen} typoOpen={typoOpen}
              onToggleSidebar={() => setSidebarOpen((v) => !v)} onToggleMeta={() => setMetaOpen((v) => !v)}
              onCycleTheme={cycleTheme} onOpenPalette={() => setPaletteOpen(true)} onOpenFind={openFind}
              onTypography={() => setTypoOpen((v) => !v)} onFocus={() => setFocus(true)} />
          )}
          {!focus && tabs.length > 0 && (
            <TabStrip tabs={tabs.map((t) => ({ ...t, title: VAULT[t.name] ? VAULT[t.name].frontmatter.title : t.name, path: VAULT[t.name] ? VAULT[t.name].path : t.name, watching: true, missing: !VAULT[t.name] }))}
              activeIdx={activeIdx} onSelect={setActiveIdx} onClose={closeTab} onNew={() => runCommand({ id: "open-file" })} />
          )}

          {tabs.length === 0 || !doc ? (
            <EmptyState recents={RECENTS} onOpen={() => openNote("Architecture Overview")} onOpenRecent={openNote} />
          ) : (
            <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: metaOpen && !focus ? "minmax(0,1fr) var(--metadata-width)" : "minmax(0,1fr)", overflow: "hidden", position: "relative" }}>
              <div ref={scrollRef} id="doc-scroll" style={{ minWidth: 0, overflow: "auto", background: "var(--surface-bg)", padding: focus ? "48px 24px 0" : "30px 48px 0", position: "relative" }}>
                <Document doc={doc} typo={typo} query={find.open ? queryObj : { query: "" }} onOpenNote={openNote} onZoomDiagram={setZoomDiagram} />
              </div>
              {metaOpen && !focus && <MetadataPanel frontmatter={doc.frontmatter} path={doc.path} />}
              <FindBar open={find.open} query={find} count={matches.length} current={current}
                onChange={(p) => setFind((f) => ({ ...f, ...p }))} onPrev={prevMatch} onNext={nextMatch}
                onClose={() => setFind((f) => ({ ...f, open: false }))} />
            </div>
          )}

          {focus && (
            <button type="button" onClick={() => setFocus(false)} title="Exit focus (esc)"
              style={{ position: "absolute", top: 16, right: 18, zIndex: 25, display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", background: "var(--surface-bg)", color: "var(--muted)", cursor: "pointer", fontSize: 12.5, fontWeight: 500, boxShadow: "var(--shadow-sm)" }}>
              <i data-lucide="minimize" style={{ width: 14, height: 14 }}></i> Exit focus
            </button>
          )}
          {focus && (
            <button type="button" onClick={openFind} title="Find (⌘F)"
              style={{ position: "absolute", top: 16, right: 138, zIndex: 25, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", background: "var(--surface-bg)", color: "var(--muted)", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
              <i data-lucide="text-search" style={{ width: 15, height: 15 }}></i>
            </button>
          )}
          <TypographyPopover open={typoOpen} typo={typo} onChange={(p) => setTypo((t) => ({ ...t, ...p }))} onClose={() => setTypoOpen(false)} />
        </section>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands}
          tabs={tabs.map((t) => ({ title: VAULT[t.name] ? VAULT[t.name].frontmatter.title : t.name, path: VAULT[t.name] ? VAULT[t.name].path : t.name }))}
          recents={RECENTS} headings={headings} onRun={runCommand} />
        <MermaidDialog diagram={zoomDiagram} onClose={() => setZoomDiagram(null)} />
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
