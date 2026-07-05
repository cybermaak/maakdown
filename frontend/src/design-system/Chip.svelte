<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import { X } from '@lucide/svelte';

  interface Props {
    children: Snippet;
    icon?: Component;
    removable?: boolean;
    label?: string;
    onremove?: () => void;
  }

  let { children, icon: Icon, removable = false, label = 'Remove', onremove }: Props = $props();
</script>

<span class="ds-chip" class:removable={removable}>
  {#if Icon}<Icon size={13} aria-hidden="true" />{/if}
  <span>{@render children()}</span>
  {#if removable}
    <button type="button" aria-label={label} onclick={(event) => { event.stopPropagation(); onremove?.(); }}>
      <X size={12} aria-hidden="true" />
    </button>
  {/if}
</span>
