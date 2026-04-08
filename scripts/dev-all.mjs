import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const viteCli = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const nodeBinDir = path.dirname(process.execPath);

const apps = [
  { name: 'shell', cwd: path.join(repoRoot, 'apps', 'shell'), kind: 'host' },
  { name: 'estructura-org', cwd: path.join(repoRoot, 'apps', 'mfe-estructura-org'), kind: 'remote', port: 3101 },
  { name: 'gestion-profesoral', cwd: path.join(repoRoot, 'apps', 'mfe-gestion-profesoral'), kind: 'remote', port: 3102 },
  { name: 'programas-academicos', cwd: path.join(repoRoot, 'apps', 'mfe-programas-academicos'), kind: 'remote', port: 3103 },
  { name: 'gestion-personas', cwd: path.join(repoRoot, 'apps', 'mfe-gestion-personas'), kind: 'remote', port: 3104 },
  { name: 'auditoria', cwd: path.join(repoRoot, 'apps', 'mfe-auditoria'), kind: 'remote', port: 3105 },
  { name: 'reportes', cwd: path.join(repoRoot, 'apps', 'mfe-reportes'), kind: 'remote', port: 3106 },
  { name: 'registro-academico', cwd: path.join(repoRoot, 'apps', 'mfe-registro-academico'), kind: 'remote', port: 3107 },
  { name: 'certificados-laborales', cwd: path.join(repoRoot, 'apps', 'mfe-certificados-laborales'), kind: 'remote', port: 3108 },
  { name: 'firma-electronica', cwd: path.join(repoRoot, 'apps', 'mfe-firma-electronica'), kind: 'remote', port: 3109 },
  { name: 'control-interno', cwd: path.join(repoRoot, 'apps', 'mfe-control-interno'), kind: 'remote', port: 3110 },
  { name: 'control-disciplinario', cwd: path.join(repoRoot, 'apps', 'mfe-control-disciplinario'), kind: 'remote', port: 3111 },
  { name: 'gestion-legal', cwd: path.join(repoRoot, 'apps', 'mfe-gestion-legal'), kind: 'remote', port: 3112 },
];

const children = new Set();
let shuttingDown = false;

if (!process.version.startsWith('v22.')) {
  console.error(`[dev:all] Node incompatible: ${process.version}. Usa Node 22.`);
  process.exit(1);
}

if (!existsSync(viteCli)) {
  console.error('[dev:all] No se encontró Vite en node_modules. Ejecuta npm install en la raíz.');
  process.exit(1);
}

const env = {
  ...process.env,
  PATH: process.env.PATH?.includes(nodeBinDir)
    ? process.env.PATH
    : `${nodeBinDir}:${process.env.PATH || ''}`,
};

console.log(`[dev:all] Usando Node ${process.version}`);

function shutdown(signal = 'SIGTERM') {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
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
      console.error(`\n[dev:all] ${child.appName} terminó con código ${code}. Cerrando los demás procesos.`);
      shutdown();
      process.exit(code ?? 1);
    }

    if (signal) {
      console.error(`\n[dev:all] ${child.appName} terminó por señal ${signal}. Cerrando los demás procesos.`);
      shutdown();
      process.exit(1);
    }
  });
}

const hostApp = apps.find((app) => app.kind === 'host');
const remoteApps = apps.filter((app) => app.kind === 'remote');

for (const app of remoteApps) {
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

  runManagedProcess(app.name, 'watch', app.cwd, ['build', '--watch', '--emptyOutDir', 'false']);
  runManagedProcess(app.name, 'preview', app.cwd, ['preview', '--port', String(app.port), '--strictPort']);
}

if (hostApp) {
  runManagedProcess(hostApp.name, 'dev', hostApp.cwd, []);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
