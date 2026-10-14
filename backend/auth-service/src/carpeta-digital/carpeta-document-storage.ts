import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join, resolve, sep } from 'path';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const LOCAL = new RegExp(`^/auth/api/v1/uploads/carpeta-digital/(${UUID})/(${UUID}\\.[a-z0-9]+)$`, 'i');
const EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.csv'];

export function isVersionableLocalUrl(url: string): boolean { return LOCAL.test(String(url || '')); }

export async function readCarpetaOriginal(url: string): Promise<Buffer> {
  const match = String(url || '').match(LOCAL);
  if (!match) throw new ConflictException('Este original requiere el flujo de su propietario.');
  const root = resolve(process.cwd(), 'uploads', 'carpeta-digital');
  const original = resolve(root, match[1], match[2]);
  // realpath evita que un enlace simbólico o un directorio sustituido salga del almacenamiento propio.
  const realRoot = await fs.realpath(root);
  const realFile = await fs.realpath(original);
  if (!realFile.startsWith(realRoot + sep)) throw new ConflictException('Original fuera del almacenamiento autorizado.');
  const stat = await fs.stat(realFile);
  if (!stat.isFile() || stat.size > 10 * 1024 * 1024) throw new ConflictException('El original no es un archivo versionable de hasta 10 MB.');
  return fs.readFile(realFile);
}

export async function storeCarpetaOriginal(personaId: string, file: any) {
  if (!new RegExp(`^${UUID}$`, 'i').test(personaId)) throw new BadRequestException('Persona no válida.');
  const extension = extname(file?.originalname || '').toLowerCase();
  if (typeof file?.originalname !== 'string' || file.originalname.length > 255 || !EXTENSIONS.includes(extension) || !Buffer.isBuffer(file?.buffer) || !file.buffer.length || file.buffer.length > 10 * 1024 * 1024) {
    throw new BadRequestException('Archivo vacío, formato no permitido o tamaño superior a 10 MB.');
  }
  const filename = randomUUID() + extension;
  const root = resolve(process.cwd(), 'uploads', 'carpeta-digital');
  await fs.mkdir(root, { recursive: true });
  const directory = join(root, personaId);
  await fs.mkdir(directory, { recursive: true });
  const realRoot = await fs.realpath(root), realDirectory = await fs.realpath(directory);
  if (!realDirectory.startsWith(realRoot + sep)) throw new ConflictException('Carpeta fuera del almacenamiento autorizado.');
  const storedPath = join(realDirectory, filename);
  const handle = await fs.open(storedPath, 'wx');
  try { await handle.writeFile(file.buffer); await handle.close(); }
  catch (error) {
    await handle.close().catch(() => undefined);
    // open(wx) confirmó que este archivo es nuevo y pertenece a la operación actual.
    await fs.unlink(storedPath).catch(() => undefined);
    throw error;
  }
  return { storedPath, urlArchivo: `/auth/api/v1/uploads/carpeta-digital/${personaId}/${filename}`,
    checksum: createHash('sha256').update(file.buffer).digest('hex'), size: file.buffer.length, extension: extension.slice(1) };
}
