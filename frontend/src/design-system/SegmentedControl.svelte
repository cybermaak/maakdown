<script lang="ts" generics="T extends string">
  export interface SegmentOption<T> {
    value: T;
    label: string;
  }

  interface Props<T> {
    value: T;
    label: string;
    options: SegmentOption<T>[];
    onchange: (value: T) => void;
  }

  let { value, label, options, onchange }: Props<T> = $props();
</script>

<div class="ds-segmented" role="group" aria-label={label}>
  {#each options as option}
    <button
      type="button"
      class:active={option.value === value}
      aria-pressed={option.value === value}
      onclick={() => onchange(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
