<script lang="ts">
  import { onMount } from 'svelte';
  import { CaseSensitive, ChevronDown, ChevronUp, X } from '@lucide/svelte';
  import { IconButton } from '../design-system';

  interface Props {
    query: string;
    index: number;
    total: number;
    caseSensitive: boolean;
    status?: string;
    onQuery: (value: string) => void;
    onCase: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onClose: () => void;
  }

  let { query, index, total, caseSensitive, status = '', onQuery, onCase, onPrevious, onNext, onClose }: Props = $props();
  let input = $state<HTMLInputElement | undefined>();
  onMount(() => input?.focus());
</script>

<div class="search-bar" role="search">
  <input
    bind:this={input}
    aria-label="Find in document"
    placeholder="Find in document"
    value={query}
    oninput={(event) => onQuery(event.currentTarget.value)}
  />
  <span aria-live="polite">{status || `${total ? index + 1 : 0} / ${total}`}</span>
  <IconButton icon={CaseSensitive} label="Match case" active={caseSensitive} onclick={onCase} />
  <IconButton icon={ChevronUp} label="Previous match" onclick={onPrevious} disabled={!total} />
  <IconButton icon={ChevronDown} label="Next match" onclick={onNext} disabled={!total} />
  <IconButton icon={X} label="Close search" onclick={onClose} />
</div>
