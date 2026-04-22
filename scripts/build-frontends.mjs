import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { remoteApps, repoRoot, shellApp } from './mfe.config.mjs';

const viteCli = path.resolve(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const nodeBinDir = path.dirname(process.execPath);

if (!existsSync(viteCli)) {
  console.error('[build:frontends] No se encontró Vite en node_modules. Ejecuta npm install en la raíz.');
  process.exit(1);
}

const parallelism = Math.max(
  1,
  Number.parseInt(process.env.FRONTEND_BUILD_PARALLELISM || '2', 10) || 2,
);

function runAppBuild(app) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [viteCli, 'build'], {
      cwd: path.join(repoRoot, 'apps', app.appDir),
      env: {
        ...process.env,
        PATH: process.env.PATH?.includes(nodeBinDir)
          ? process.env.PATH
          : `${nodeBinDir}:${process.env.PATH || ''}`,
      },
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${app.workspace} falló con ${signal || `código ${code}`}`));
    });
  });
}

if (process.env.FRONTEND_CLEAN_BUILD === 'true') {
  rmSync(path.resolve(repoRoot, 'build'), { recursive: true, force: true });
}

const apps = [...remoteApps, shellApp];
let nextIndex = 0;

async function worker() {
  while (nextIndex < apps.length) {
    const app = apps[nextIndex];
    nextIndex += 1;
    console.log(`[build:frontends] Building ${app.workspace}...`);
    await runAppBuild(app);
  }
}

try {
  console.log(`[build:frontends] Paralelismo: ${Math.min(parallelism, apps.length)}`);
  await Promise.all(
    Array.from({ length: Math.min(parallelism, apps.length) }, () => worker()),
  );
} catch (error) {
  console.error(`[build:frontends] ${error.message}`);
  process.exit(1);
}
