<script lang="ts">
  import { FolderOpen, Moon, Search, Settings, Sun } from '@lucide/svelte';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Callout from './Callout.svelte';
  import CodeBlockChrome from './CodeBlockChrome.svelte';
  import IconButton from './IconButton.svelte';
  import Popover from './Popover.svelte';
  import SegmentedControl from './SegmentedControl.svelte';
  import StatusIndicator from './StatusIndicator.svelte';
  import Tab from './Tab.svelte';
  import Tag from './Tag.svelte';
  import TocItem from './TocItem.svelte';
  import Toolbar from './Toolbar.svelte';
  import Wikilink from './Wikilink.svelte';
  import appIconLight from '../assets/app-icon-light.png';

  let theme = $state<'system' | 'light' | 'dark'>('system');
  let activeTab = $state('guide');
  let popoverOpen = $state(true);
</script>

<main class="gallery">
  <header>
    <img src={appIconLight} class="brand-mark" aria-hidden="true" alt="Maakdown Icon" />
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

  <section>
    <h2>Workspace</h2>
    <Toolbar label="Gallery tools">
      <IconButton icon={FolderOpen} label="Open document" />
      <IconButton icon={Search} label="Find in document" />
    </Toolbar>
    <div class="gallery-tabs" role="tablist" aria-label="Example documents">
      <Tab id="guide" label="design-guide.md" active={activeTab === 'guide'} changed onactivate={() => (activeTab = 'guide')} onclose={() => {}} />
      <Tab id="notes" label="notes.md" active={activeTab === 'notes'} onactivate={() => (activeTab = 'notes')} onclose={() => {}} />
    </div>
    <div class="gallery-toc">
      <TocItem id="overview" label="Overview" active onclick={() => {}} />
      <TocItem id="tokens" label="Tokens" depth={2} onclick={() => {}} />
    </div>
  </section>

  <section>
    <h2>Reader</h2>
    <div class="gallery-stack">
      <Callout type="tip" title="Keyboard">
        Open a document with the native file command.
      </Callout>
      <div>
        <Wikilink onopen={() => {}}>Rendering model</Wikilink>
        <span> </span>
        <Wikilink resolved={false}>Missing note</Wikilink>
      </div>
      <CodeBlockChrome language="typescript" oncopy={() => {}}>
        <pre><code><span class="hljs-keyword">const</span> theme = <span class="hljs-string">'editorial'</span>;</code></pre>
      </CodeBlockChrome>
    </div>
  </section>

  <section>
    <h2>Floating</h2>
    <Button onclick={() => (popoverOpen = !popoverOpen)}>Toggle popover</Button>
    <div class="gallery-popover-anchor">
      <Popover open={popoverOpen} label="Reader appearance">
        <strong>Reader appearance</strong>
        <p>Typography and measure controls.</p>
      </Popover>
    </div>
  </section>
</main>
