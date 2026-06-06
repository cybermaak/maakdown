import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const fixtureRoot = resolve(__dirname, '../fixtures');

function fixtureServer(): Plugin {
  return {
    name: 'maakdown-fixture-server',
    configureServer(server) {
      server.middlewares.use('/__maakdown_fixture', async (request, response) => {
        try {
          const relativePath = decodeURIComponent((request.url ?? '/').replace(/^\/+/, ''));
          const filePath = resolve(fixtureRoot, relativePath);
          if (filePath !== fixtureRoot && !filePath.startsWith(`${fixtureRoot}${sep}`)) {
            response.statusCode = 403;
            response.end('Fixture path rejected');
            return;
          }

          const content = await readFile(filePath);
          const contentTypes: Record<string, string> = {
            '.md': 'text/markdown; charset=utf-8',
            '.svg': 'image/svg+xml'
          };
          response.setHeader('Content-Type', contentTypes[extname(filePath)] ?? 'application/octet-stream');
          response.end(content);
        } catch {
          response.statusCode = 404;
          response.end('Fixture not found');
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [svelte(), fixtureServer()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts']
  }
});
