<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    children: Snippet;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
  }

  let {
    children,
    variant = 'secondary',
    size = 'md',
    class: className = '',
    ...rest
  }: Props = $props();
</script>

<button class={`ds-button ${variant} ${size} ${className}`.trim()} type="button" {...rest}>
  {@render children()}
</button>
