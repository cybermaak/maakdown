Square icon-only control for the toolbar — theme toggle, metadata panel, search. Uses Lucide; call `lucide.createIcons()` after mount.

```jsx
<IconButton icon="panel-right" label="Toggle metadata" active={open} onClick={toggle} />
<IconButton icon="sun" label="Theme" />
```

Variants: `ghost` (default chrome) and `bordered`. The `active` prop holds the toggled fill. Always pass a `label` — it's the accessible name and tooltip.
