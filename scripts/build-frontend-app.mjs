import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getBuildOutDir, getFrontendApp, repoRoot } from './mfe.config.mjs';

const appDir = process.argv[2];

if (!appDir) {
  console.error('[build:frontend-app] Debes indicar el appDir, por ejemplo: shell o mfe-auditoria.');
  process.exit(1);
}

const app = getFrontendApp(appDir);

if (!app) {
  console.error(`[build:frontend-app] App desconocida: ${appDir}`);
  process.exit(1);
}

const viteCli = path.resolve(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const nodeBinDir = path.dirname(process.execPath);

if (!existsSync(viteCli)) {
  console.error('[build:frontend-app] No se encontró Vite en node_modules. Ejecuta npm install en la raíz.');
  process.exit(1);
}

rmSync(getBuildOutDir(appDir), { recursive: true, force: true });

const result = spawnSync(process.execPath, [viteCli, 'build'], {
  cwd: path.join(repoRoot, 'apps', appDir),
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
