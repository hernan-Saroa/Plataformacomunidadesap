import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getBuildOutDir,
  remoteApps,
  repoRoot,
  shellApp,
} from './mfe.config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viteCli = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const nodeBinDir = path.dirname(process.execPath);
const allApps = [
  {
    name: shellApp.appDir,
    cwd: path.join(repoRoot, 'apps', shellApp.appDir),
    kind: 'host',
  },
  ...remoteApps.map((app) => ({
    name: app.appDir,
    cwd: path.join(repoRoot, 'apps', app.appDir),
    kind: 'remote',
    port: app.devPort,
  })),
];

const children = new Set();
const staticServers = new Set();
let shuttingDown = false;

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

if (options.listApps) {
  console.log('Apps disponibles para `npm run dev:all -- --apps=...`:');
  for (const app of allApps) {
    console.log(`- ${app.name}${app.kind === 'host' ? ' (shell)' : ` (remote:${app.port})`}`);
  }
  process.exit(0);
}

const selectedApps = selectApps(options.apps);
const hostApp = selectedApps.find((app) => app.kind === 'host');
const remoteAppProcesses = selectedApps.filter((app) => app.kind === 'remote');

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);

if (Number.isNaN(nodeMajor) || nodeMajor < 22) {
  console.error(`[dev:all] Node incompatible: ${process.version}. Usa Node 22 o superior.`);
  process.exit(1);
}

if (!existsSync(viteCli)) {
  console.error(
    '[dev:all] No se encontró Vite en node_modules. Ejecuta npm install en la raíz.',
  );
  process.exit(1);
}

const env = {
  ...process.env,
  PATH: process.env.PATH?.includes(nodeBinDir)
    ? process.env.PATH
    : `${nodeBinDir}${path.delimiter}${process.env.PATH || ''}`,
};

console.log(`[dev:all] Usando Node ${process.version}`);
console.log(
  `[dev:all] Apps seleccionadas: ${selectedApps.map((app) => app.name).join(', ')}`,
);
console.log(
  '[dev:all] Modo liviano: remotos servidos con servidor estático embebido en vez de `vite preview`.',
);

function parseArgs(args) {
  const parsed = {
    apps: process.env.DEV_ALL_APPS || '',
    forceInitialBuild: process.env.DEV_ALL_FORCE_INITIAL_BUILD === '1',
    help: false,
    listApps: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    if (arg === '--list-apps') {
      parsed.listApps = true;
      continue;
    }

    if (arg.startsWith('--apps=')) {
      parsed.apps = arg.slice('--apps='.length);
      continue;
    }

    if (arg === '--force-initial-build') {
      parsed.forceInitialBuild = true;
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`
Uso:
  npm run dev:all
  npm run dev:all -- --apps=shell,mfe-control-interno,mfe-control-disciplinario
  npm run dev:all -- --list-apps
  npm run dev:all -- --force-initial-build

Opciones:
  --apps=lista     Lista separada por comas de apps a iniciar.
                   Si no se envía, inicia shell + todos los remotos.
                   También se puede definir con DEV_ALL_APPS.
  --force-initial-build
                   Obliga build inicial bloqueante de los remotos aunque exista cache previa.
  --list-apps      Muestra los nombres válidos para --apps.
  --help           Muestra esta ayuda.
`);
}

function selectApps(appsOption) {
  if (!appsOption || appsOption === 'all') {
    return allApps;
  }

  const requested = new Set(
    appsOption
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  const selected = allApps.filter((app) => requested.has(app.name));
  const missing = [...requested].filter(
    (appName) => !allApps.some((app) => app.name === appName),
  );

  if (missing.length > 0) {
    console.error(
      `[dev:all] Apps desconocidas: ${missing.join(', ')}. Usa --list-apps para ver las válidas.`,
    );
    process.exit(1);
  }

  if (selected.length === 0) {
    console.error('[dev:all] No hay apps seleccionadas.');
    process.exit(1);
  }

  return selected;
}

function shutdown(signal = 'SIGTERM') {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const server of staticServers) {
    server.close();
  }

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }

  if (children.size === 0) {
    process.exit(0);
  }
}

function runManagedProcess(appName, role, cwd, args) {
  const child = spawn(process.execPath, [viteCli, ...args], {
    cwd,
    env,
    stdio: 'inherit',
  });

  child.appName = `${appName}:${role}`;
  children.add(child);

  child.on('exit', (code, signal) => {
    children.delete(child);

    if (shuttingDown) {
      if (children.size === 0) {
        process.exit(code ?? 0);
      }
      return;
    }

    if (code !== 0) {
      console.error(
        `\n[dev:all] ${child.appName} terminó con código ${code}. Cerrando los demás procesos.`,
      );
      shutdown();
      process.exit(code ?? 1);
    }

    if (signal) {
      console.error(
        `\n[dev:all] ${child.appName} terminó por señal ${signal}. Cerrando los demás procesos.`,
      );
      shutdown();
      process.exit(1);
    }
  });
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.ico':
      return 'image/x-icon';
    case '.map':
      return 'application/json; charset=utf-8';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ttf':
      return 'font/ttf';
    default:
      return 'application/octet-stream';
  }
}

function sendNotFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not found');
}

function serveStaticFile(rootDir, requestPath, res) {
  const decodedPath = decodeURIComponent(requestPath);
  const safePath = path.normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '');
  let filePath = path.resolve(rootDir, `.${path.sep}${safePath}`);

  if (!filePath.startsWith(rootDir)) {
    sendNotFound(res);
    return;
  }

  if (!existsSync(filePath)) {
    sendNotFound(res);
    return;
  }

  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    if (!existsSync(filePath)) {
      sendNotFound(res);
      return;
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', getContentType(filePath));
  res.setHeader('Cache-Control', 'no-store');
  createReadStream(filePath).pipe(res);
}

function startStaticPreviewServer(app) {
  const rootDir = path.resolve(repoRoot, 'build');
  const appBase = `/remotes/${app.name}/`;

  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${app.port}`);
    const pathname = url.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (pathname === '/') {
      res.statusCode = 302;
      res.setHeader('Location', appBase);
      res.end();
      return;
    }

    if (!pathname.startsWith(appBase)) {
      sendNotFound(res);
      return;
    }

    serveStaticFile(rootDir, pathname, res);
  });

  server.on('error', (error) => {
    console.error(
      `[dev:all] No se pudo iniciar el servidor estático de ${app.name} en el puerto ${app.port}:`,
      error,
    );
    shutdown();
    process.exit(1);
  });

  server.listen(app.port, () => {
    console.log(
      `[dev:all] ${app.name}:static sirviendo ${getBuildOutDir(app.name)} en http://localhost:${app.port}${appBase}`,
    );
  });

  staticServers.add(server);
}

function getRemoteEntryFile(app) {
  return path.join(getBuildOutDir(app.name), 'assets', 'remoteEntry.js');
}

for (const app of remoteAppProcesses) {
  const remoteEntryFile = getRemoteEntryFile(app);
  const hasWarmCache = existsSync(remoteEntryFile);

  if (options.forceInitialBuild || !hasWarmCache) {
    console.log(`[dev:all] Build inicial de ${app.name}...`);

    const result = spawnSync(process.execPath, [viteCli, 'build'], {
      cwd: app.cwd,
      env,
      stdio: 'inherit',
    });

    if (result.error || result.status !== 0) {
      if (result.error) {
        console.error(`\n[dev:all] Falló el build inicial de ${app.name}:`, result.error);
      }
      process.exit(result.status ?? 1);
    }
  } else {
    console.log(
      `[dev:all] ${app.name}: usando build previa en cache (${remoteEntryFile}) y recompilando en segundo plano.`,
    );
  }

  startStaticPreviewServer(app);
  runManagedProcess(app.name, 'watch', app.cwd, [
    'build',
    '--watch',
    '--emptyOutDir',
    'false',
  ]);
}

if (hostApp) {
  runManagedProcess(hostApp.name, 'dev', hostApp.cwd, []);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
