<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CircleAlert, CircleHelp, CircleX, Info, Lightbulb } from '@lucide/svelte';

  type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

  interface Props {
    type?: CalloutType;
    title?: string;
    children?: Snippet;
  }

  const labels: Record<CalloutType, string> = {
    note: 'Note',
    tip: 'Tip',
    important: 'Important',
    warning: 'Warning',
    caution: 'Caution'
  };
  const icons = { note: Info, tip: Lightbulb, important: CircleHelp, warning: CircleAlert, caution: CircleX };

  let { type = 'note', title, children }: Props = $props();
  let Icon = $derived(icons[type]);
</script>

<aside class={`ds-callout callout callout-${type}`}>
  <strong class="callout-title"><Icon size={16} aria-hidden="true" />{title ?? labels[type]}</strong>
  {#if children}<div class="ds-callout-body">{@render children()}</div>{/if}
</aside>
