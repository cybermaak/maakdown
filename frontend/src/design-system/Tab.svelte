<script lang="ts">
  import { FileText, X } from '@lucide/svelte';

  interface Props {
    id: string;
    label: string;
    active?: boolean;
    changed?: boolean;
    watching?: boolean;
    tabindex?: number;
    onactivate: () => void;
    onclose: () => void;
    onkeydown?: (event: KeyboardEvent) => void;
  }

  let {
    id,
    label,
    active = false,
    changed = false,
    watching = false,
    tabindex = active ? 0 : -1,
    onactivate,
    onclose,
    onkeydown
  }: Props = $props();

  function close(event: MouseEvent) {
    event.stopPropagation();
    onclose();
  }
</script>

<button
  class="document-tab ds-tab"
  class:active
  type="button"
  role="tab"
  data-tab-id={id}
  aria-selected={active}
  aria-keyshortcuts="Delete"
  {tabindex}
  onclick={onactivate}
  {onkeydown}
>
  <FileText size={14} aria-hidden="true" />
  <span class="tab-title ds-tab-title">{label}</span>
  {#if changed}<i class="tab-dot changed" aria-label="Changed"></i>
  {:else if watching}<i class="tab-dot watching" aria-hidden="true" title="Watching"></i>{/if}
  <!-- The parent tab is the single keyboard target; this affordance is pointer-only. -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <span class="tab-close ds-tab-close" aria-hidden="true" title={`Close ${label}`} onclick={close}>
    <X size={13} aria-hidden="true" />
  </span>
</button>
