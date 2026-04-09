import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { remoteApps, repoRoot, shellApp } from './mfe.config.mjs';

const viteCli = path.resolve(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const nodeBinDir = path.dirname(process.execPath);

if (!existsSync(viteCli)) {
  console.error('[build:frontends] No se encontró Vite en node_modules. Ejecuta npm install en la raíz.');
  process.exit(1);
}

function runAppBuild(app) {
  const result = spawnSync(process.execPath, [viteCli, 'build'], {
    cwd: path.join(repoRoot, 'apps', app.appDir),
    env: {
      ...process.env,
      PATH: process.env.PATH?.includes(nodeBinDir)
        ? process.env.PATH
        : `${nodeBinDir}:${process.env.PATH || ''}`,
    },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

rmSync(path.resolve(repoRoot, 'build'), { recursive: true, force: true });

for (const app of remoteApps) {
  console.log(`[build:frontends] Building ${app.workspace}...`);
  runAppBuild(app);
}

console.log(`[build:frontends] Building ${shellApp.workspace}...`);
runAppBuild(shellApp);
