import { resolve } from 'node:path';
import { startFixtureApp } from './fixture-app-server.mjs';

const frontendRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(frontendRoot, '..');
const port = 5191;
const server = await startFixtureApp({
  frontendRoot,
  repoRoot,
  outputDir: resolve(repoRoot, 'output', 'performance', 'uat-app'),
  port,
  mode: 'uat'
});

async function shutdown() {
  await server.close();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
console.log(`UAT app listening on http://127.0.0.1:${port}`);
await new Promise(() => {});
