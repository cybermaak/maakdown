Small rounded tag chip for frontmatter tags in the metadata panel.

```jsx
<Tag>docs</Tag>
<Tag hash={false}>draft</Tag>
<Tag removable onRemove={() => drop(t)}>spec</Tag>
```

Defaults to a leading `#`. Set `hash={false}` for plain labels; `removable` adds an inline dismiss.
