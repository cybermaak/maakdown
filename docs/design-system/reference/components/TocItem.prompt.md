One heading row in the table-of-contents sidebar. Indents by `depth`, highlights the `active` section.

```jsx
<TocItem depth={1} active>Overview</TocItem>
<TocItem depth={2} onClick={() => scrollTo("setup")}>Setup</TocItem>
```

Hover and active share the same `--active` fill; active also goes semibold.
