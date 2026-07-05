<script lang="ts">
  interface Props {
    checked: boolean;
    label: string;
    disabled?: boolean;
    onchange: (checked: boolean) => void;
  }

  let { checked, label, disabled = false, onchange }: Props = $props();
</script>

<label class="ds-toggle" class:checked class:disabled>
  <span class="sr-only">{label}</span>
  <input
    type="checkbox"
    role="switch"
    aria-label={label}
    {checked}
    {disabled}
    onchange={(event) => onchange(event.currentTarget.checked)}
  />
  <span class="ds-toggle-track" aria-hidden="true"><span></span></span>
</label>
