<script lang="ts">
  interface Props {
    id: string;
    label: string;
    depth?: number;
    active?: boolean;
    onclick: () => void;
  }

  let { id, label, depth = 1, active = false, onclick }: Props = $props();
</script>

<button
  class="ds-toc-item"
  class:active
  type="button"
  data-heading-id={id}
  aria-current={active ? 'location' : undefined}
  style={`--depth: ${depth}`}
  {onclick}
>
  {label}
</button>
