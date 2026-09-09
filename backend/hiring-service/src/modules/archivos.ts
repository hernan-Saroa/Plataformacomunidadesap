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

const EXTENSIONES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
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
 * Opciones de multer para un adjunto del expediente.
 *
 * El nombre en disco es aleatorio: el original lo elige el usuario y podría
 * colisionar o traer separadores de ruta.
 */
export function opcionesDeCarga(mimePermitidos: string[], mensajeFormato: string) {
  return {
    storage: diskStorage({
      destination: STORAGE_PATH,
      filename: (_req: any, file: any, cb: any) => {
        const extension = extname(file.originalname) || EXTENSIONES[file.mimetype] || '';
        cb(null, `${randomBytes(16).toString('hex')}${extension}`);
      },
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) =>
      mimePermitidos.includes(file.mimetype)
        ? cb(null, true)
        : cb(new BadRequestException(mensajeFormato), false),
  };
}
