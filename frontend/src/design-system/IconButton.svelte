<script lang="ts">
  import type { Component } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    icon: Component;
    label: string;
    active?: boolean;
    size?: 'xs' | 'sm' | 'md';
  }

  let { icon: Icon, label, active = false, size = 'md', class: className = '', ...rest }: Props = $props();
</script>

<button
  class={`ds-icon-button ${size} ${className}`.trim()}
  class:active
  type="button"
  aria-label={label}
  title={label}
  aria-pressed={active}
  {...rest}
>
  <Icon size={size === 'xs' ? 13 : size === 'sm' ? 15 : 17} strokeWidth={2} aria-hidden="true" />
</button>
