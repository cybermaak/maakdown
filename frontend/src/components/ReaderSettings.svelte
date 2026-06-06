<script lang="ts">
  import type { AppConfig } from '../stores/configStore';
  import { SegmentedControl } from '../design-system';

  interface Props {
    config: AppConfig;
    onChange: (config: AppConfig) => void;
    onClose: () => void;
  }
  let { config, onChange, onClose }: Props = $props();
  const update = (patch: Partial<AppConfig>) => onChange({ ...config, ...patch });
</script>

<div class="reader-settings" role="dialog" aria-label="Reader appearance">
  <div class="settings-heading"><strong>Reader appearance</strong><button onclick={onClose}>Done</button></div>
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
</div>
