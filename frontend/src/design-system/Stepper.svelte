<script lang="ts">
  import { Minus, Plus } from '@lucide/svelte';
  import IconButton from './IconButton.svelte';

  interface Props {
    value: number;
    min: number;
    max: number;
    step?: number;
    label: string;
    format?: (value: number) => string;
    onchange: (value: number) => void;
  }

  let { value, min, max, step = 1, label, format = (next) => String(next), onchange }: Props = $props();
  const clamp = (next: number) => Math.max(min, Math.min(max, next));
</script>

<div class="ds-stepper" role="group" aria-label={label}>
  <IconButton icon={Minus} label={`Decrease ${label}`} size="sm" disabled={value <= min} onclick={() => onchange(clamp(value - step))} />
  <span>{format(value)}</span>
  <IconButton icon={Plus} label={`Increase ${label}`} size="sm" disabled={value >= max} onclick={() => onchange(clamp(value + step))} />
</div>
