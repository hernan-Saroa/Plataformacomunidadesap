/**
 * Wrapper que usa la API Node.js de Vite para ejecutar build --watch,
 * permitiendo pasar opciones de chokidar (watch.ignored) que el CLI de Vite
 * no acepta como argumento porque parsea --watch como boolean.
 *
 * Uso: node vite-watch-runner.mjs <appCwd> <buildRootToIgnore>
 */
import { build } from 'vite';
import path from 'node:path';

const [, , appCwd, buildRoot] = process.argv;

if (!appCwd) {
  console.error('[vite-watch-runner] Error: se requiere <appCwd> como primer argumento');
  process.exit(1);
}

let watcher;

try {
  // build() con watch retorna un RollupWatcher (proceso vivo)
  watcher = await build({
    root: appCwd,
    build: {
      emptyOutDir: false,
      watch: {
        // Excluir la carpeta build/ del watcher de chokidar para evitar
        // el bucle infinito donde el output de un MFE trigerea el rebuild de otros
        ignored: buildRoot
          ? [
              buildRoot,
              path.join(buildRoot, '**'),
              // Patrón glob también por compatibilidad con chokidar
              `${buildRoot.replace(/\\/g, '/')}/**`,
            ]
          : [],
      },
    },
  });
} catch (err) {
  console.error('[vite-watch-runner] Error al iniciar el watch:', err.message ?? err);
  process.exit(1);
}

// Manejar señales de apagado para cerrar el watcher limpiamente
function shutdown() {
  if (watcher && typeof watcher.close === 'function') {
    watcher.close().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
