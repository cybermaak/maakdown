#!/usr/bin/env node
import { resolve } from 'node:path';

const scenarios = [
  {
    slug: 'reader-smoke',
    fixtures: ['fixtures/native-rendering-smoke.md']
  },
  {
    slug: 'table-tools',
    fixtures: ['fixtures/table-tools.md']
  },
  {
    slug: 'mermaid-cases',
    fixtures: ['fixtures/mermaid-cases.md']
  },
  {
    slug: 'technical-document',
    fixtures: ['fixtures/uat-technical-document.md']
  },
  {
    slug: 'workspace-tabs',
    fixtures: [
      'fixtures/native-rendering-smoke.md',
      'fixtures/table-tools.md',
      'fixtures/mermaid-cases.md'
    ]
  }
];

const [firstArg] = process.argv.slice(2);

if (firstArg === '--count') {
  console.log(scenarios.length * 2);
  process.exit(0);
}

const repoRoot = resolve(firstArg ?? process.cwd());

for (const scenario of scenarios) {
  const fixtures = scenario.fixtures.map((fixture) => resolve(repoRoot, fixture));
  console.log([scenario.slug, ...fixtures].join('\t'));
}
