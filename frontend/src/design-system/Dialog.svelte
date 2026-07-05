<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import { X } from '@lucide/svelte';
  import IconButton from './IconButton.svelte';

  interface Props {
    open: boolean;
    title: string;
    children: Snippet;
    onclose: () => void;
    size?: 'md' | 'lg';
    panelClass?: string;
    bodyClass?: string;
    actions?: Snippet;
    showClose?: boolean;
  }

  let { open, title, children, onclose, size = 'md', panelClass = '', bodyClass = '', actions, showClose = true }: Props = $props();
  let dialog = $state<HTMLElement | undefined>();

  $effect(() => {
    if (!open) return;
    const returnFocus = document.activeElement as HTMLElement | null;
    void tick().then(() => dialog?.focus());
    return () => queueMicrotask(() => returnFocus?.focus());
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onclose();
      return;
    }
    if (event.key !== 'Tab' || !dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
</script>

{#if open}
  <div class="ds-dialog-backdrop" role="presentation" onclick={onclose}>
    <div
      bind:this={dialog}
      class={`ds-dialog ${size} ${panelClass}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
      onclick={(event) => event.stopPropagation()}
      onkeydown={handleKeydown}
    >
      <header>
        <strong>{title}</strong>
        {#if actions || showClose}
          <div class="ds-dialog-actions">
            {#if actions}
              {@render actions()}
            {/if}
            {#if showClose}
              <IconButton icon={X} label="Close" size="sm" onclick={onclose} />
            {/if}
          </div>
        {/if}
      </header>
      <div class={`ds-dialog-body ${bodyClass}`.trim()}>{@render children()}</div>
    </div>
  </div>
{/if}
