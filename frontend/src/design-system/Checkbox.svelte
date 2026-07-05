<script lang="ts">
  import type { HTMLLabelAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLLabelAttributes, 'onchange'> {
    checked: boolean;
    label?: string;
    count?: number;
    disabled?: boolean;
    onchange: (checked: boolean) => void;
  }

  let { checked, label, count, disabled = false, onchange, ...rest }: Props = $props();
</script>

<label class="ds-checkbox" class:checked class:disabled title={label} {...rest}>
  <input
    type="checkbox"
    {checked}
    {disabled}
    aria-label={label}
    onchange={(event) => onchange(event.currentTarget.checked)}
  />
  <span class="ds-checkbox-box" aria-hidden="true"></span>
  {#if label}<span class="ds-checkbox-label">{label}</span>{/if}
  {#if count !== undefined}<small>{count}</small>{/if}
</label>
