<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    title?: string;
    onclick?: (event: MouseEvent) => void;
  }

  let {
    children,
    variant = 'secondary',
    size = 'md',
    disabled = false,
    title,
    onclick
  }: Props = $props();
</script>

<button class={`ds-button ${variant} ${size}`} type="button" {disabled} {title} {onclick}>
  {@render children()}
</button>
