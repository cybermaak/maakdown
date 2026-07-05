<script lang="ts">
  import type { Component } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    icon: Component;
    label: string;
    subtitle: string;
    path?: string;
    hint?: string;
    active?: boolean;
  }

  let { icon: Icon, label, subtitle, path, hint, active = false, class: className = '', ...rest }: Props = $props();
</script>

<button
  class={`ds-command-item ${className}`.trim()}
  class:active
  aria-current={active ? 'true' : undefined}
  type="button"
  {...rest}
>
  <Icon size={15} aria-hidden="true" />
  <span class="ds-command-item-copy">
    <span class="ds-command-item-title">{label}</span>
    <small>{subtitle}</small>
  </span>
  {#if path}<span class="ds-command-item-path">{path}</span>{/if}
  {#if hint}<kbd>{hint}</kbd>{/if}
</button>
