<script lang="ts">
  interface Props {
    value: string;
    hash?: boolean;
  }

  let { value, hash = true }: Props = $props();
</script>

<span class="ds-tag">{hash ? '#' : ''}{value}</span>
