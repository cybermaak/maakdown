<script lang="ts">
  interface Props {
    label: string;
    tone?: 'success' | 'warning' | 'danger' | 'neutral';
  }

  let { label, tone = 'neutral' }: Props = $props();
</script>

<span class={`ds-status ${tone}`}>
  <span aria-hidden="true"></span>
  {label}
</span>
