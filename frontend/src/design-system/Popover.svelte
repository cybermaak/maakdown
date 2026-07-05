<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    open: boolean;
    label: string;
    children: Snippet;
    title?: string;
    header?: Snippet;
    footer?: Snippet;
    width?: number | string;
    element?: HTMLElement;
  }

  let { open, label, children, title, header, footer, width, element = $bindable(), class: className = '', ...rest }: Props = $props();
  const widthStyle = $derived(typeof width === 'number' ? `${width}px` : width);
</script>

{#if open}
  <div bind:this={element} class={`ds-popover ${className}`.trim()} style:width={widthStyle} role="dialog" aria-label={label} {...rest}>
    {#if header}
      <div class="ds-popover-header">{@render header()}</div>
    {:else if title}
      <div class="ds-popover-header"><strong>{title}</strong></div>
    {/if}
    <div class="ds-popover-body">{@render children()}</div>
    {#if footer}
      <div class="ds-popover-footer">{@render footer()}</div>
    {/if}
  </div>
{/if}
