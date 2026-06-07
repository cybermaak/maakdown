import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { build } from 'vite';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function resolveContained(root, relativePath) {
  const filePath = resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    throw new Error('Path rejected');
  }
  return filePath;
}

async function serveFile(response, filePath) {
  const content = await readFile(filePath);
  response.statusCode = 200;
  response.setHeader('Content-Type', contentTypes[extname(filePath)] ?? 'application/octet-stream');
  response.end(content);
}

export async function startFixtureApp({ frontendRoot, repoRoot, outputDir, port, mode = 'benchmark' }) {
  await build({
    root: frontendRoot,
    mode,
    build: { outDir: outputDir, emptyOutDir: true },
    logLevel: 'error'
  });

  const fixtureRoot = resolve(repoRoot, 'fixtures');
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? `127.0.0.1:${port}`}`);
      const fixturePrefix = '/__maakdown_fixture/';
      if (requestUrl.pathname.startsWith(fixturePrefix)) {
        const relativePath = decodeURIComponent(requestUrl.pathname.slice(fixturePrefix.length));
        await serveFile(response, resolveContained(fixtureRoot, relativePath));
        return;
      }

      const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || 'index.html';
      const filePath = resolveContained(outputDir, relativePath);
      const fileStat = await stat(filePath);
      await serveFile(response, fileStat.isDirectory() ? resolve(filePath, 'index.html') : filePath);
    } catch {
      response.statusCode = 404;
      response.end('Not found');
    }
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, '127.0.0.1', resolveListen);
  });

  return {
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    })
  };
}
