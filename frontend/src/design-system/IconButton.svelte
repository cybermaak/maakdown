<script lang="ts">
  import type { Component } from 'svelte';

  interface Props {
    icon: Component;
    label: string;
    active?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
    onclick?: (event: MouseEvent) => void;
  }

  let { icon: Icon, label, active = false, disabled = false, size = 'md', onclick }: Props = $props();
</script>

<button
  class={`ds-icon-button ${size}`}
  class:active
  type="button"
  aria-label={label}
  title={label}
  aria-pressed={active}
  {disabled}
  {onclick}
>
  <Icon size={size === 'sm' ? 15 : 17} strokeWidth={2} aria-hidden="true" />
</button>
