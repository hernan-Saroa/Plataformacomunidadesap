import { join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Raíz del almacenamiento de archivos del servicio de viáticos.
 *
 * Sigue el mismo patrón que el resto de microservicios (legal, disciplinario,
 * certificados, contratación, etc.): la ruta es configurable por variable de
 * entorno y apunta a un disco/volumen dedicado en despliegue (Docker monta
 * `./backend/travel-expenses-service/uploads:/app/uploads`). En desarrollo cae
 * a `process.cwd()/uploads` (la carpeta `uploads/` del propio servicio).
 *
 * Prioridad:
 *   1. TRAVEL_EXPENSES_STORAGE_PATH (ruta interna del contenedor / disco externo)
 *   2. UPLOAD_DIR (genérica)
 *   3. ./uploads (relativo al CWD del proceso)
 */
export const getUploadRootDir = (): string =>
  resolve(
    process.env.TRAVEL_EXPENSES_STORAGE_PATH ||
      process.env.UPLOAD_DIR ||
      join(process.cwd(), 'uploads'),
  );

/** Crea la raíz de uploads si no existe y la retorna. */
export const ensureUploadRootDir = (): string => {
  const dir = getUploadRootDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
};
