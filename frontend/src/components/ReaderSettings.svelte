<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Field, Popover, SegmentedControl, SettingRow, Toggle } from '../design-system';
  import type { AppConfig } from '../stores/configStore';
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

<Popover open={true} label="Settings" class="reader-settings">
  <div class="settings-heading">
    <Button variant="ghost" size="sm" onclick={onClose}>Done</Button>
  </div>

  <section class="settings-section">
    <h3>Reading display</h3>
    <div class="settings-pair">
      <Field label="Typeface">
        <SegmentedControl
          label="Typeface"
          options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }]}
          value={config.readerFont}
          onchange={(value: AppConfig['readerFont']) => update({ readerFont: value })}
        />
      </Field>
      <Field label="Text size" value={`${config.readerFontSize}px`}>
        <input id="font-size" aria-label="Text size" type="range" min="13" max="22" value={config.readerFontSize} oninput={(event) => update({ readerFontSize: Number(event.currentTarget.value) })} />
      </Field>
    </div>
    <div class="settings-pair">
      <Field label="Line height">
        <span class="settings-select-wrap">
          <select aria-label="Line height" value={config.readerLineHeight} onchange={(event) => update({ readerLineHeight: event.currentTarget.value as AppConfig['readerLineHeight'] })}>
            <option value="compact">Compact</option>
            <option value="comfortable">Normal</option>
            <option value="relaxed">Relaxed</option>
          </select>
        </span>
      </Field>
      <Field label="Measure">
        <span class="settings-select-wrap">
          <select aria-label="Measure" value={config.readerMeasure} onchange={(event) => update({ readerMeasure: event.currentTarget.value as AppConfig['readerMeasure'] })}>
            <option value="narrow">Narrow</option>
            <option value="standard">Standard</option>
            <option value="wide">Wide</option>
          </select>
        </span>
      </Field>
    </div>
    <Field label="Reader theme">
      <SegmentedControl
        label="Reader theme"
        options={[{ value: 'editorial', label: 'Editorial' }, { value: 'high-contrast', label: 'Contrast' }]}
        value={config.readerTheme}
        onchange={(value: AppConfig['readerTheme']) => update({ readerTheme: value })}
      />
    </Field>
  </section>

  <section class="settings-section">
    <h3>Document</h3>
    <SettingRow label="Document line numbers" help="Show source line starts in the reader gutter.">
      <Toggle label="Document line numbers" checked={config.documentLineNumbers} onchange={(checked) => update({ documentLineNumbers: checked })} />
    </SettingRow>
  </section>

  <section class="settings-section">
    <h3>Code blocks</h3>
    <SettingRow label="Code line numbers" help="Show a per-block code gutter.">
      <Toggle label="Code line numbers" checked={config.codeLineNumbers} onchange={(checked) => update({ codeLineNumbers: checked })} />
    </SettingRow>
    <SettingRow label="Long lines" help="Long lines wrap unless a block is switched to scroll.">
      <SegmentedControl
        label="Code long lines"
        options={[{ value: 'wrap', label: 'Wrap' }, { value: 'scroll', label: 'Scroll' }]}
        value={config.codeWrap ? 'wrap' : 'scroll'}
        onchange={(value) => update({ codeWrap: value === 'wrap' })}
      />
    </SettingRow>
  </section>

  <section class="settings-section">
    <h3>Tables</h3>
    <SettingRow label="Keep tables within text width" help="Auto-size columns and wrap cells to the selected measure.">
      <Toggle label="Keep tables within text width" checked={config.tableConstrainToMeasure} onchange={(checked) => update({ tableConstrainToMeasure: checked })} />
    </SettingRow>
    <SettingRow label="Table row numbers" help="Show ephemeral row numbers while reading tables.">
      <Toggle label="Table row numbers" checked={config.tableRowNumbers} onchange={(checked) => update({ tableRowNumbers: checked })} />
    </SettingRow>
    <Field label="Column sizing" help="Balanced samples content. Equal gives each column the same width.">
      <SegmentedControl
        label="Table columns"
        options={[{ value: 'balanced', label: 'Balanced' }, { value: 'equal', label: 'Equal' }]}
        value={config.tableColumnSizing}
        onchange={(value: AppConfig['tableColumnSizing']) => update({ tableColumnSizing: value })}
      />
    </Field>
  </section>

  <section class="settings-section">
    <h3>Printing</h3>
    <SettingRow label="Include metadata when printing" help="Print the frontmatter masthead with the document.">
      <Toggle label="Include metadata when printing" checked={config.printMetadata} onchange={(checked) => update({ printMetadata: checked })} />
    </SettingRow>
  </section>
  {#if handlerSupported}
    <div class="settings-association">
      <span class="settings-association-label">File association</span>
      {#if isDefault}
        <span class="settings-association-status">Maakdown opens Markdown files by default.</span>
      {:else}
        <Button size="sm" onclick={() => void makeDefault()}>
          {windowsAssociation ? 'Choose default app...' : 'Set as default for Markdown'}
        </Button>
      {/if}
      {#if handlerError}<span class="settings-association-error" role="alert">{handlerError}</span>{/if}
    </div>
  {/if}
  {#if onAbout}
    <Button variant="ghost" size="sm" onclick={onAbout}>About Maakdown</Button>
  {/if}
</Popover>
