Typed, left-ruled callout block — Maakdown's core in-document annotation (mirrors Obsidian `> [!note]` syntax). Uses Lucide icons; call `lucide.createIcons()` after mount.

```jsx
<Callout type="tip" title="Keyboard">Press ⌘O to open a vault.</Callout>
<Callout type="warning">Local images outside the trusted root are blocked.</Callout>
```

Types: `note` · `tip` · `important` · `warning` · `caution`. Omit `title` to use the default label. Body is optional (title-only callouts are valid).
