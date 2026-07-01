<script lang="ts">
  import { onMount } from 'svelte';
  import type { AppConfig } from '../stores/configStore';
  import { SegmentedControl } from '../design-system';
  import {
    isDefaultMarkdownHandler,
    isWindowsPlatform,
    markdownHandlerSupported,
    setDefaultMarkdownHandler
  } from '@ipc';

  interface Props {
    config: AppConfig;
    onChange: (config: AppConfig) => void;
    onClose: () => void;
    onAbout?: () => void;
  }
  let { config, onChange, onClose, onAbout }: Props = $props();
  const update = (patch: Partial<AppConfig>) => onChange({ ...config, ...patch });

  // File association: hidden unless the platform supports querying/setting the
  // default Markdown opener (currently macOS in the desktop runtime).
  let handlerSupported = $state(false);
  let isDefault = $state(false);
  let handlerError = $state('');
  const windowsAssociation = isWindowsPlatform();

  onMount(() => {
    let mounted = true;
    const refreshDefault = async () => {
      if (!handlerSupported) return;
      const next = await isDefaultMarkdownHandler();
      if (mounted) isDefault = next;
    };
    void markdownHandlerSupported().then(async (supported) => {
      if (!mounted) return;
      handlerSupported = supported;
      if (supported) await refreshDefault();
    }).catch(() => {
      if (mounted) handlerSupported = false;
    });
    const onWindowFocus = () => {
      if (windowsAssociation) void refreshDefault();
    };
    window.addEventListener('focus', onWindowFocus);
    return () => {
      mounted = false;
      window.removeEventListener('focus', onWindowFocus);
    };
  });

  async function makeDefault() {
    handlerError = '';
    try {
      // The OS call is silent; this click is the user's explicit consent.
      await setDefaultMarkdownHandler();
      if (windowsAssociation) return;
      isDefault = await isDefaultMarkdownHandler();
      if (!isDefault) handlerError = 'The system did not accept the change.';
    } catch (error) {
      handlerError = error instanceof Error ? error.message : String(error);
    }
  }
</script>

<div class="reader-settings" role="dialog" aria-label="Settings">
  <div class="settings-heading"><strong>Settings</strong><button onclick={onClose}>Done</button></div>
  <SegmentedControl
    label="Typeface"
    options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }]}
    value={config.readerFont}
    onchange={(value: AppConfig['readerFont']) => update({ readerFont: value })}
  />
  <label for="font-size">Text size <span>{config.readerFontSize}px</span></label>
  <input id="font-size" type="range" min="13" max="22" value={config.readerFontSize} oninput={(event) => update({ readerFontSize: Number(event.currentTarget.value) })} />
  <SegmentedControl
    label="Line height"
    options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Normal' }, { value: 'relaxed', label: 'Relaxed' }]}
    value={config.readerLineHeight}
    onchange={(value: AppConfig['readerLineHeight']) => update({ readerLineHeight: value })}
  />
  <SegmentedControl
    label="Measure"
    options={[{ value: 'narrow', label: 'Narrow' }, { value: 'standard', label: 'Standard' }, { value: 'wide', label: 'Wide' }]}
    value={config.readerMeasure}
    onchange={(value: AppConfig['readerMeasure']) => update({ readerMeasure: value })}
  />
  <SegmentedControl
    label="Reader theme"
    options={[{ value: 'editorial', label: 'Editorial' }, { value: 'high-contrast', label: 'Contrast' }]}
    value={config.readerTheme}
    onchange={(value: AppConfig['readerTheme']) => update({ readerTheme: value })}
  />
  <SegmentedControl
    label="Code highlighting"
    options={[
      { value: 'highlightjs', label: 'Highlight.js' },
      { value: 'shiki-js-regex', label: 'Shiki' }
    ]}
    value={config.highlighterEngine}
    onchange={(value: AppConfig['highlighterEngine']) => update({ highlighterEngine: value })}
  />
  <div class="settings-toggle-group" aria-label="Reader source orientation">
    <label class="settings-check">
      <input type="checkbox" checked={config.documentLineNumbers} onchange={(event) => update({ documentLineNumbers: event.currentTarget.checked })} />
      <span>Document line numbers</span>
    </label>
    <label class="settings-check">
      <input type="checkbox" checked={config.codeLineNumbers} onchange={(event) => update({ codeLineNumbers: event.currentTarget.checked })} />
      <span>Code line numbers</span>
    </label>
    <label class="settings-check">
      <input type="checkbox" checked={config.codeWrap} onchange={(event) => update({ codeWrap: event.currentTarget.checked })} />
      <span>Wrap code by default</span>
    </label>
    <label class="settings-check">
      <input type="checkbox" checked={config.printMetadata} onchange={(event) => update({ printMetadata: event.currentTarget.checked })} />
      <span>Include metadata when printing</span>
    </label>
  </div>
  {#if handlerSupported}
    <div class="settings-association">
      <span class="settings-association-label">File association</span>
      {#if isDefault}
        <span class="settings-association-status">Maakdown opens Markdown files by default.</span>
      {:else}
        <button type="button" class="settings-association-button" onclick={() => void makeDefault()}>
          {windowsAssociation ? 'Choose default app...' : 'Set as default for Markdown'}
        </button>
      {/if}
      {#if handlerError}<span class="settings-association-error" role="alert">{handlerError}</span>{/if}
    </div>
  {/if}
  {#if onAbout}
    <button type="button" class="settings-about-link" onclick={onAbout}>About Maakdown</button>
  {/if}
</div>
