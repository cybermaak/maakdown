Fenced code block on Maakdown's dark code surface, with an optional language label and copy button.

```jsx
<CodeBlock language="ts">{`export const x = 1;`}</CodeBlock>
<CodeBlock language="bash" html={highlightedHtml} />
```

Pass plain text as children, or pre-highlighted markup via `html`. Set `copyable={false}` to hide the copy affordance.
