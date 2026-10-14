import { BadRequestException } from '@nestjs/common';
import { join, relative, resolve, sep } from 'path';

const uploadsRoot = () => resolve(process.cwd(), 'uploads');

/** Referencias HTTP locales conocidas; no convierte UUID de Carpeta Digital ni URLs de auth. */
export function rundUploadRelativePath(reference: unknown): string | null {
  if (typeof reference !== 'string') return null;
  const match = reference.split(/[?#]/)[0].match(/^\/(?:services\/)?(?:(?:rund|pta)\/api\/v1\/)?uploads\/(.+)$/);
  if (!match || /%(?:2f|5c)/i.test(match[1])) return null;
  let decoded: string;
  try { decoded = decodeURIComponent(match[1]); } catch { return null; }
  // Rechazar recorridos, drives Windows, separadores alternativos y escapes anidados.
  if (/[\\:\x00-\x1f\x7f]/.test(decoded) || /%(?:2e|2f|5c)/i.test(decoded)) return null;
  if (decoded.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return decoded;
}

export function localRundUploadPath(reference: unknown, root = uploadsRoot()): string | null {
  const file = rundUploadRelativePath(reference);
  if (!file) return null;
  const base = resolve(root);
  const target = resolve(base, file);
  return target.startsWith(base + sep) ? target : null;
}

/** Usa la ubicación real de Multer, incluso si los campos del multipart llegan tras el archivo. */
export function rundUploadUrlForFile(filePath: string, root = uploadsRoot()): string {
  const base = resolve(root);
  const target = resolve(filePath);
  if (!target.startsWith(base + sep)) throw new BadRequestException('Ruta de soporte RUND no permitida.');
  const file = relative(base, target).split(sep).join('/');
  if (!/^carpeta-digital\/[^/]+\/RUND\/.+$/i.test(file) && !/^rund-documentos\/.+$/i.test(file)) {
    throw new BadRequestException('El archivo no pertenece al almacenamiento RUND.');
  }
  const url = '/rund/api/v1/uploads/' + file.split('/').map(encodeURIComponent).join('/');
  if (rundUploadRelativePath(url) !== file) throw new BadRequestException('Nombre de archivo RUND no permitido.');
  return url;
}

export function rundLegacyUploadDirectory(folder: string, root = uploadsRoot()): string {
  if (!folder || folder === '.' || folder === '..' || /[\/\\:\x00-\x1f\x7f]/.test(folder)) {
    throw new BadRequestException('Directorio de soporte RUND no permitido.');
  }
  return join(resolve(root), 'carpeta-digital', folder, 'RUND');
}

/** El enlace de contenido de un documento versionado no es su ruta de disco. */
export function rundSupportLocalPath(support: any, root = uploadsRoot()): string | null {
  if (support.documento_perfil_id) {
    const storage = support.almacenamiento_ruta;
    if (typeof storage !== 'string' || !storage) return null;
    if (support.proveedor_almacenamiento === 'LOCAL') {
      return localRundUploadPath('/uploads/' + storage, root);
    }
    if (support.proveedor_almacenamiento === 'LEGACY_LOCAL') {
      return localRundUploadPath(storage, root)
        || (!storage.startsWith('/') && !/^[a-z][a-z0-9+.-]*:/i.test(storage)
          ? localRundUploadPath('/uploads/' + storage, root) : null);
    }
    // OPENKM se comprueba mediante su proveedor, nunca mediante fs.existsSync.
    return null;
  }
  return localRundUploadPath(support.documento_carpeta_id, root);
}
