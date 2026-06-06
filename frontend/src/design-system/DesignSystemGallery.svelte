<script lang="ts">
  import { FolderOpen, Moon, Search, Settings, Sun } from '@lucide/svelte';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import IconButton from './IconButton.svelte';
  import SegmentedControl from './SegmentedControl.svelte';
  import StatusIndicator from './StatusIndicator.svelte';
  import Tag from './Tag.svelte';

  let theme = $state<'system' | 'light' | 'dark'>('system');
</script>

<main class="gallery">
  <header>
    <span class="brand-mark" aria-hidden="true">M</span>
    <div>
      <h1>Maakdown Design System</h1>
      <p>Production controls and semantic states</p>
    </div>
  </header>

  <section>
    <h2>Actions</h2>
    <div class="gallery-row">
      <Button variant="primary">Open document</Button>
      <Button>Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Remove</Button>
      <Button disabled>Disabled</Button>
    </div>
    <div class="gallery-row">
      <IconButton icon={FolderOpen} label="Open document" />
      <IconButton icon={Search} label="Search" active />
      <IconButton icon={Settings} label="Settings" />
    </div>
  </section>

  <section>
    <h2>Theme</h2>
    <SegmentedControl
      value={theme}
      label="Theme"
      options={[
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' }
      ]}
      onchange={(value) => (theme = value)}
    />
    <div class="gallery-row">
      <Sun size={18} />
      <Moon size={18} />
    </div>
  </section>

  <section>
    <h2>Metadata</h2>
    <div class="gallery-row">
      <Badge tone="success" dot>Watching</Badge>
      <Badge tone="info">Draft</Badge>
      <Badge tone="warning">Changed</Badge>
      <Badge tone="danger">Missing</Badge>
    </div>
    <div class="gallery-row">
      <Tag value="architecture" />
      <Tag value="release" />
      <StatusIndicator label="Up to date" tone="success" />
    </div>
  </section>
</main>
