Inline `[[wikilink]]` cross-reference between vault notes.

```jsx
<Wikilink onOpen={() => openNote("Daily Log")}>Daily Log</Wikilink>
<Wikilink resolved={false}>Missing Note</Wikilink>
```

Resolved links are blue with a dotted underline that thickens on hover; `resolved={false}` renders the unresolved red treatment with a help cursor and no navigation.
