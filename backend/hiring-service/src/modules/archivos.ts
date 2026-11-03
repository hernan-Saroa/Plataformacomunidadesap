import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { createHash, randomBytes } from 'crypto';
import { createReadStream } from 'fs';
import { extname } from 'path';

/**
 * Carga de archivos al expediente.
 *
 * El destino y el cálculo del hash son los mismos para toda la etapa que sea:
 * el expediente es uno solo y sus documentos se guardan igual. Lo que cambia
 * entre actividades son los formatos que admite cada una, así que eso entra por
 * parámetro.
 */
export const STORAGE_PATH = process.env.HIRING_STORAGE_PATH || './uploads';

/** Documentos ofimáticos: lo que se firma y se radica. */
export const MIME_DOCUMENTOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * Imágenes, para las evidencias que son una captura de pantalla.
 *
 * No sirven como documento firmado, pero cuando la prueba de un hecho es lo que
 * muestra otra plataforma —una publicación en SECOP II, por ejemplo— exigir PDF
 * obligaría al usuario a convertir el pantallazo antes de subirlo.
 */
export const MIME_IMAGENES = ['image/png', 'image/jpeg'];

/**
 * Un .zip con todos los documentos de una oferta, en una sola carga (EFDS-1155).
 *
 * La plataforma no lo abre ni muestra su contenido: quien revisa la oferta lo
 * descarga completo. Windows lo envía como `x-zip-compressed`, y algunos
 * navegadores como `octet-stream`; ese último se admite solo con extensión .zip.
 */
export const MIME_ZIP = ['application/zip', 'application/x-zip-compressed', 'application/x-zip'];

/**
 * Peso máximo de un adjunto (EFDS-1155).
 *
 * Subió de 25 a 50 MB: las ofertas de obra traen PDF y Excel más pesados. Es
 * el mismo para todo el expediente; la pantalla lo repite en `PiezasPanel`.
 */
export const MAX_BYTES_ADJUNTO = 50 * 1024 * 1024;

const EXTENSIONES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

/** Integridad probatoria: el expediente es prueba ante entes de control. */
export function sha256Archivo(ruta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(ruta)
      .on('data', (c) => hash.update(c))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

/**
 * Cómo se lee el nombre original del archivo.
 *
 * Multer lo decodifica como latin1 si no se le dice otra cosa, y los
 * navegadores lo mandan en UTF-8: «Resolución de apertura.pdf» quedaba
 * guardado como «ResoluciÃ³n de apertura.pdf», y así salía en el expediente,
 * en la lista de chequeo y en cada panel que nombra un soporte.
 */
export const NOMBRE_EN_UTF8 = 'utf8';

/**
 * Opciones de multer para un adjunto del expediente.
 *
 * El nombre en disco es aleatorio: el original lo elige el usuario y podría
 * colisionar o traer separadores de ruta.
 */
export function opcionesDeCarga(mimePermitidos: string[], mensajeFormato: string) {
  return {
    defParamCharset: NOMBRE_EN_UTF8,
    storage: diskStorage({
      destination: STORAGE_PATH,
      filename: (_req: any, file: any, cb: any) => {
        const extension = extname(file.originalname) || EXTENSIONES[file.mimetype] || '';
        cb(null, `${randomBytes(16).toString('hex')}${extension}`);
      },
    }),
    limits: { fileSize: MAX_BYTES_ADJUNTO },
    fileFilter: (_req: any, file: any, cb: any) =>
      mimePermitidos.includes(file.mimetype) || esZipSinTipo(file, mimePermitidos)
        ? cb(null, true)
        : cb(new BadRequestException(mensajeFormato), false),
  };
}

/** Un .zip que el navegador mandó sin tipo, donde la actividad admite .zip. */
function esZipSinTipo(file: any, mimePermitidos: string[]) {
  return (
    mimePermitidos.includes('application/zip') &&
    file.mimetype === 'application/octet-stream' &&
    extname(file.originalname ?? '').toLowerCase() === '.zip'
  );
}
