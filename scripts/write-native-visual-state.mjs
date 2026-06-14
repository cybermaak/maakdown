#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [theme, destination] = process.argv.slice(2);
if (!['light', 'dark'].includes(theme) || !destination) {
  console.error('usage: write-native-visual-state.mjs <light|dark> <state.json>');
  process.exit(2);
}

const state = {
  version: 1,
  config: {
    theme,
    highlighterEngine: 'highlightjs',
    frontmatterDisplay: 'panel',
    readerTheme: 'editorial',
    readerFont: 'sans',
    readerFontSize: 15,
    readerLineHeight: 'comfortable',
    readerMeasure: 'standard',
    focusMode: false,
    outlineVisible: true,
    outlineWidth: 280,
    metadataWidth: 260
  },
  session: {
    tabs: [],
    recents: []
  }
};

const output = resolve(destination);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

