<script lang="ts">
  import { onMount } from 'svelte';
  import { Dialog } from '../design-system';
  import { appVersion, openExternal } from '@ipc';
  import { appConfig } from '../stores/configStore';
  import { resolveTheme } from '../core/theme/readerTheme';
  import appIconLight from '../assets/app-icon-light.png';
  import appIconDark from '../assets/app-icon-dark.png';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();
  let appIcon = $derived(resolveTheme($appConfig.theme) === 'dark' ? appIconDark : appIconLight);
  const repoUrl = 'https://github.com/cybermaak/maakdown';
  let version = $state('');

  onMount(() => {
    void appVersion()
      .then((value) => (version = value))
      .catch(() => (version = ''));
  });
</script>

<Dialog {open} title="About Maakdown" onclose={onClose}>
  <div class="about-dialog">
    <img src={appIcon} class="about-icon" alt="" />
    <div class="about-name">
      <strong>Maakdown</strong>
      {#if version}<span class="about-version">{version}</span>{/if}
    </div>
    <p class="about-tagline">A fast, local Markdown reader.</p>
    <p class="about-license">MIT License · © 2026 Mohammed Kamel</p>
    <button type="button" class="about-link" onclick={() => void openExternal(repoUrl)}>
      github.com/cybermaak/maakdown
    </button>
  </div>
</Dialog>
