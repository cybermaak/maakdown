<script lang="ts">
  import { onMount } from 'svelte';
  import { SegmentedControl } from '../design-system';
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

<div class="reader-settings" role="dialog" aria-label="Settings">
  <div class="settings-heading">
    <button onclick={onClose}>Done</button>
  </div>

  <section class="settings-section">
    <h3>Reading display</h3>
    <div class="settings-pair">
      <div class="settings-field">
        <span class="settings-field-label">Typeface</span>
        <SegmentedControl
          label="Typeface"
          options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }]}
          value={config.readerFont}
          onchange={(value: AppConfig['readerFont']) => update({ readerFont: value })}
        />
      </div>
      <div class="settings-field">
        <label class="settings-field-label with-value" for="font-size">Text size <span>{config.readerFontSize}px</span></label>
        <input id="font-size" aria-label="Text size" type="range" min="13" max="22" value={config.readerFontSize} oninput={(event) => update({ readerFontSize: Number(event.currentTarget.value) })} />
      </div>
    </div>
    <div class="settings-pair">
      <label class="settings-field">
        <span class="settings-field-label">Line height</span>
        <span class="settings-select-wrap">
          <select aria-label="Line height" value={config.readerLineHeight} onchange={(event) => update({ readerLineHeight: event.currentTarget.value as AppConfig['readerLineHeight'] })}>
            <option value="compact">Compact</option>
            <option value="comfortable">Normal</option>
            <option value="relaxed">Relaxed</option>
          </select>
        </span>
      </label>
      <label class="settings-field">
        <span class="settings-field-label">Measure</span>
        <span class="settings-select-wrap">
          <select aria-label="Measure" value={config.readerMeasure} onchange={(event) => update({ readerMeasure: event.currentTarget.value as AppConfig['readerMeasure'] })}>
            <option value="narrow">Narrow</option>
            <option value="standard">Standard</option>
            <option value="wide">Wide</option>
          </select>
        </span>
      </label>
    </div>
    <div class="settings-field">
      <span class="settings-field-label">Reader theme</span>
      <SegmentedControl
        label="Reader theme"
        options={[{ value: 'editorial', label: 'Editorial' }, { value: 'high-contrast', label: 'Contrast' }]}
        value={config.readerTheme}
        onchange={(value: AppConfig['readerTheme']) => update({ readerTheme: value })}
      />
    </div>
  </section>

  <section class="settings-section">
    <h3>Document</h3>
    <label class="settings-switch-row">
      <span class="settings-switch-copy">
        <span>Document line numbers</span>
        <small>Show source line starts in the reader gutter.</small>
      </span>
      <input class="settings-switch-input" aria-label="Document line numbers" type="checkbox" checked={config.documentLineNumbers} onchange={(event) => update({ documentLineNumbers: event.currentTarget.checked })} />
      <span class="settings-switch" aria-hidden="true"></span>
    </label>
  </section>

  <section class="settings-section">
    <h3>Code blocks</h3>
    <label class="settings-switch-row">
      <span class="settings-switch-copy">
        <span>Code line numbers</span>
        <small>Show a per-block code gutter.</small>
      </span>
      <input class="settings-switch-input" aria-label="Code line numbers" type="checkbox" checked={config.codeLineNumbers} onchange={(event) => update({ codeLineNumbers: event.currentTarget.checked })} />
      <span class="settings-switch" aria-hidden="true"></span>
    </label>
    <div class="settings-row">
      <span class="settings-switch-copy">
        <span>Long lines</span>
        <small>Long lines wrap unless a block is switched to scroll.</small>
      </span>
      <SegmentedControl
        label="Code long lines"
        options={[{ value: 'wrap', label: 'Wrap' }, { value: 'scroll', label: 'Scroll' }]}
        value={config.codeWrap ? 'wrap' : 'scroll'}
        onchange={(value) => update({ codeWrap: value === 'wrap' })}
      />
    </div>
    <div class="settings-field">
      <span class="settings-field-label">Code highlighting</span>
      <SegmentedControl
        label="Code highlighting"
        options={[
          { value: 'highlightjs', label: 'Highlight.js' },
          { value: 'shiki-js-regex', label: 'Shiki' }
        ]}
        value={config.highlighterEngine}
        onchange={(value: AppConfig['highlighterEngine']) => update({ highlighterEngine: value })}
      />
    </div>
  </section>

  <section class="settings-section">
    <h3>Tables</h3>
    <label class="settings-switch-row">
      <span class="settings-switch-copy">
        <span>Keep tables within text width</span>
        <small>Auto-size columns and wrap cells to the selected measure.</small>
      </span>
      <input class="settings-switch-input" aria-label="Keep tables within text width" type="checkbox" checked={config.tableConstrainToMeasure} onchange={(event) => update({ tableConstrainToMeasure: event.currentTarget.checked })} />
      <span class="settings-switch" aria-hidden="true"></span>
    </label>
    <label class="settings-switch-row">
      <span class="settings-switch-copy">
        <span>Table row numbers</span>
        <small>Show ephemeral row numbers while reading tables.</small>
      </span>
      <input class="settings-switch-input" aria-label="Table row numbers" type="checkbox" checked={config.tableRowNumbers} onchange={(event) => update({ tableRowNumbers: event.currentTarget.checked })} />
      <span class="settings-switch" aria-hidden="true"></span>
    </label>
    <div class="settings-field">
      <span class="settings-field-label">Column sizing</span>
      <SegmentedControl
        label="Table columns"
        options={[{ value: 'balanced', label: 'Balanced' }, { value: 'equal', label: 'Equal' }]}
        value={config.tableColumnSizing}
        onchange={(value: AppConfig['tableColumnSizing']) => update({ tableColumnSizing: value })}
      />
      <p class="settings-field-help">Balanced samples content. Equal gives each column the same width.</p>
    </div>
  </section>

  <section class="settings-section">
    <h3>Printing</h3>
    <label class="settings-switch-row">
      <span class="settings-switch-copy">
        <span>Include metadata when printing</span>
        <small>Print the frontmatter masthead with the document.</small>
      </span>
      <input class="settings-switch-input" aria-label="Include metadata when printing" type="checkbox" checked={config.printMetadata} onchange={(event) => update({ printMetadata: event.currentTarget.checked })} />
      <span class="settings-switch" aria-hidden="true"></span>
    </label>
  </section>
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
