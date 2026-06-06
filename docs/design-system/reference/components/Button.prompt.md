Flat, quiet chrome button for toolbars, dialogs, and empty states — the default control in Maakdown.

```jsx
<Button variant="primary" onClick={openVault}>Open</Button>
<Button variant="secondary" size="sm">Theme: system</Button>
<Button variant="ghost" iconLeft={<i data-lucide="search" />}>Search</Button>
```

Variants: `primary` (solid ink), `secondary` (hairline border — the workhorse), `ghost` (transparent, hover fill — used in chrome), `danger`. Sizes: `sm` / `md` / `lg`. Pass Lucide `<i data-lucide="…">` nodes via `iconLeft`/`iconRight` and call `lucide.createIcons()` after mount.
