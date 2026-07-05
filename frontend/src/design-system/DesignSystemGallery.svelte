<script lang="ts">
  import { ArrowUpDown, FolderOpen, ListFilter, Moon, Search, Settings, Sun } from '@lucide/svelte';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Callout from './Callout.svelte';
  import Checkbox from './Checkbox.svelte';
  import Chip from './Chip.svelte';
  import CodeBlockChrome from './CodeBlockChrome.svelte';
  import CommandItem from './CommandItem.svelte';
  import Field from './Field.svelte';
  import IconButton from './IconButton.svelte';
  import Menu from './Menu.svelte';
  import Popover from './Popover.svelte';
  import SegmentedControl from './SegmentedControl.svelte';
  import SettingRow from './SettingRow.svelte';
  import StatusIndicator from './StatusIndicator.svelte';
  import Stepper from './Stepper.svelte';
  import Tab from './Tab.svelte';
  import Tag from './Tag.svelte';
  import Toggle from './Toggle.svelte';
  import TocItem from './TocItem.svelte';
  import Toolbar from './Toolbar.svelte';
  import Wikilink from './Wikilink.svelte';
  import appIconLight from '../assets/app-icon-light.png';

  let theme = $state<'system' | 'light' | 'dark'>('system');
  let activeTab = $state('guide');
  let popoverOpen = $state(true);
  let lineNumbers = $state(true);
  let checklist = $state(true);
  let size = $state(16);
  const menuItems = [
    { label: 'Copy link' },
    { label: 'Open externally' },
    { separator: true },
    { label: 'Remove recent', danger: true }
  ];
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
      <IconButton icon={ListFilter} label="Filter column" size="xs" active />
    </div>
  </section>

  <section>
    <h2>Form Controls</h2>
    <div class="gallery-stack">
      <Field label="Theme">
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
      </Field>
      <Field label="Text size" value={`${size}px`}>
        <Stepper value={size} min={13} max={22} label="Text size" format={(value) => `${value}px`} onchange={(value) => (size = value)} />
      </Field>
      <SettingRow label="Document line numbers" help="Show reader line starts in the gutter.">
        <Toggle label="Document line numbers" checked={lineNumbers} onchange={(checked) => (lineNumbers = checked)} />
      </SettingRow>
      <Checkbox label="stable" count={8} checked={checklist} onchange={(checked) => (checklist = checked)} />
    </div>
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
    <div class="gallery-row">
      <Chip icon={ArrowUpDown} removable label="Clear sort">Score: ascending</Chip>
      <Chip icon={ListFilter} removable label="Remove status filter">Status: stable</Chip>
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
      <Popover open={popoverOpen} label="Reader appearance" title="Reader appearance">
        <div class="ds-popover-section">
          <div class="ds-popover-section-title">Display</div>
          <SettingRow label="Metadata" help="Print frontmatter masthead.">
            <Toggle label="Metadata" checked={lineNumbers} onchange={(checked) => (lineNumbers = checked)} />
          </SettingRow>
        </div>
      </Popover>
    </div>
    <Menu items={menuItems} onselect={() => {}} />
    <div class="gallery-command-sample">
      <CommandItem icon={Search} label="Find in document" subtitle="Command" hint="Cmd F" active onclick={() => {}} />
      <CommandItem icon={FolderOpen} label="Open document" subtitle="Command" hint="Cmd O" onclick={() => {}} />
    </div>
  </section>
</main>
