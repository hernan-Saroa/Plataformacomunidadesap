import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, readdir, readFile, rm, stat, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';

import { HiringAccess } from '../../auth/hiring-access';
import {
  MAX_BYTES_ADJUNTO,
  MAX_BYTES_OFERTA,
  MIME_DOCUMENTOS,
  MIME_ZIP,
  STORAGE_PATH,
} from '../archivos';
import { revisarZip } from './zip';

/**
 * Cargas por partes (BUG-004 de QA, 14/11).
 *
 * Una oferta de 200 MB subida en una sola petición se quedaba colgada cuando
 * la red o un proxy cortaban a medio camino, y no había nada que reintentar
 * salvo empezar de cero. Aquí el archivo llega en partes de 5 MB: cada una es
 * una petición corta que cabe en cualquier proxy, se reintenta sola si falla y
 * permite decirle al usuario cuánto falta.
 *
 * El estado vive en disco, junto a las partes —`cargas/<id>/meta.json`—, y no
 * en la base: una carga dura minutos y se descarta al usarse o a las 24 horas.
 *
 * El flujo es: `iniciar` → `recibirParte` por cada parte → `completar`, que
 * une, calcula el hash y revisa el .zip → la actividad la `toma` al registrar
 * lo que acompaña, y se `consume` cuando eso quedó guardado.
 */

/** El tamaño de cada parte. Lo fija el servidor, no el navegador. */
export const TAMANO_PARTE = 5 * 1024 * 1024;

/** Cuánto se guarda una carga sin usar antes de borrarla. */
export const VIDA_CARGA_MS = 24 * 60 * 60 * 1000;

/** Qué admite cada actividad. La que no aparece admite lo del resto del expediente. */
const POR_NUMERAL: Record<string, { maxBytes: number; tipos: string[]; formatos: string }> = {
  '6.1': {
    maxBytes: MAX_BYTES_OFERTA,
    tipos: [...MIME_DOCUMENTOS, ...MIME_ZIP],
    formatos: 'PDF, Word, Excel o un .zip con todos sus documentos',
  },
};
const POR_DEFECTO = { maxBytes: MAX_BYTES_ADJUNTO, tipos: MIME_DOCUMENTOS, formatos: 'PDF, Word o Excel' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MetaCarga {
  id: string;
  procesoId: string;
  numeral: string;
  usuarioId: string;
  nombre: string;
  tipo: string;
  tamano: number;
  partes: number;
  creadaAt: string;
  /** Cuando ya se unió: el archivo final en el almacenamiento, con su hash. */
  completa?: {
    filename: string;
    hash: string;
    archivos: number | null;
  };
}

/** Lo que una actividad recibe de una carga completa: lo mismo que le daría multer. */
export interface CargaTomada {
  archivo: { filename: string; originalname: string; mimetype: string; size: number };
  hash: string;
}

export function carpetaDeCargas(): string {
  return join(STORAGE_PATH, 'cargas');
}

/** La carpeta de una carga. Valida el id porque se usa para armar una ruta. */
export function carpetaDeCarga(id: string): string {
  if (!UUID.test(id)) throw new BadRequestException('La carga no existe');
  return join(carpetaDeCargas(), id);
}

/** El tamaño que debe tener la parte `n` de una carga. */
export function tamanoDeParte(meta: Pick<MetaCarga, 'tamano' | 'partes'>, n: number): number {
  return n < meta.partes - 1 ? TAMANO_PARTE : meta.tamano - TAMANO_PARTE * (meta.partes - 1);
}

/** Un .zip que el navegador mandó sin tipo se reconoce por la extensión. */
function tipoReal(tipo: string | undefined, nombre: string): string {
  const limpio = (tipo ?? '').split(';')[0].trim().toLowerCase();
  if ((!limpio || limpio === 'application/octet-stream') && extname(nombre).toLowerCase() === '.zip') {
    return 'application/zip';
  }
  return limpio;
}

const MB = (bytes: number) => Math.round(bytes / (1024 * 1024));

@Injectable()
export class CargasService {
  private readonly logger = new Logger(CargasService.name);

  async iniciar(
    procesoId: string,
    numeral: string,
    datos: { nombre: string; tipo?: string; tamano: number },
    acceso: HiringAccess,
  ) {
    const reglas = POR_NUMERAL[numeral] ?? POR_DEFECTO;
    const nombre = datos.nombre.trim();
    const tipo = tipoReal(datos.tipo, nombre);

    if (!reglas.tipos.includes(tipo)) {
      throw new BadRequestException(`Este soporte se carga en ${reglas.formatos}`);
    }
    if (!Number.isInteger(datos.tamano) || datos.tamano <= 0) {
      throw new BadRequestException('El archivo está vacío');
    }
    if (datos.tamano > reglas.maxBytes) {
      throw new BadRequestException(
        `El archivo pesa ${MB(datos.tamano)} MB y el máximo son ${MB(reglas.maxBytes)} MB`,
      );
    }

    const meta: MetaCarga = {
      id: randomUUID(),
      procesoId,
      numeral,
      usuarioId: acceso.userId,
      nombre,
      tipo,
      tamano: datos.tamano,
      partes: Math.ceil(datos.tamano / TAMANO_PARTE),
      creadaAt: new Date().toISOString(),
    };
    await mkdir(carpetaDeCarga(meta.id), { recursive: true });
    await this.guardarMeta(meta);

    return { id: meta.id, partes: meta.partes, tamanoParte: TAMANO_PARTE };
  }

  /**
   * Comprueba la parte que multer ya dejó en la carpeta de la carga.
   *
   * Si no tiene el tamaño que le toca se borra: una parte corta es una
   * petición cortada, y el navegador la vuelve a mandar. Mandar la misma parte
   * dos veces la reemplaza, así que reintentar nunca duplica.
   */
  async recibirParte(
    procesoId: string,
    numeral: string,
    id: string,
    n: number,
    parte: { path: string; size: number } | undefined,
    acceso: HiringAccess,
  ) {
    if (!parte) throw new BadRequestException('No llegó la parte del archivo');
    try {
      const meta = await this.leerMeta(id, procesoId, numeral, acceso);
      if (meta.completa) throw new ConflictException('La carga ya se completó');
      if (!Number.isInteger(n) || n < 0 || n >= meta.partes) {
        throw new BadRequestException(`La carga tiene ${meta.partes} partes: la ${n + 1} no existe`);
      }
      const esperado = tamanoDeParte(meta, n);
      if (parte.size !== esperado) {
        throw new BadRequestException('La parte llegó incompleta: se vuelve a enviar');
      }
      return { parte: n, recibida: true };
    } catch (err) {
      await unlink(parte.path).catch(() => undefined);
      throw err;
    }
  }

  /**
   * Une las partes, calcula el hash y, si es un .zip, revisa su índice.
   *
   * El archivo final queda en el almacenamiento con un nombre aleatorio, igual
   * que los que sube multer: la actividad lo registra como cualquier adjunto.
   */
  async completar(procesoId: string, numeral: string, id: string, acceso: HiringAccess) {
    const meta = await this.leerMeta(id, procesoId, numeral, acceso);
    if (meta.completa) {
      return { id, nombre: meta.nombre, tamano: meta.tamano, archivos: meta.completa.archivos };
    }

    const carpeta = carpetaDeCarga(id);
    const faltan: number[] = [];
    for (let n = 0; n < meta.partes; n++) {
      const info = await stat(join(carpeta, `parte-${n}`)).catch(() => null);
      if (!info || info.size !== tamanoDeParte(meta, n)) faltan.push(n + 1);
    }
    if (faltan.length) {
      throw new ConflictException(
        `Faltan ${faltan.length} de ${meta.partes} partes del archivo: vuelve a intentar la carga`,
      );
    }

    const extension = extname(meta.nombre) || (meta.tipo === 'application/zip' ? '.zip' : '');
    const filename = `${randomBytes(16).toString('hex')}${extension}`;
    const destino = join(STORAGE_PATH, filename);
    const hash = await this.unir(carpeta, meta.partes, destino);

    let archivos: number | null = null;
    if (MIME_ZIP.includes(meta.tipo)) {
      const revision = await revisarZip(destino);
      if (revision.problema) {
        await unlink(destino).catch(() => undefined);
        await rm(carpeta, { recursive: true, force: true });
        throw new BadRequestException(revision.problema);
      }
      archivos = revision.archivos;
    }

    // Las partes ya no hacen falta: queda solo la ficha, que apunta al final.
    for (let n = 0; n < meta.partes; n++) {
      await unlink(join(carpeta, `parte-${n}`)).catch(() => undefined);
    }
    meta.completa = { filename, hash, archivos };
    await this.guardarMeta(meta);

    return { id, nombre: meta.nombre, tamano: meta.tamano, archivos };
  }

  /**
   * Lo que la actividad registra: el archivo final como si lo hubiera subido multer.
   *
   * No borra la carga: si lo que la acompaña falla —un NIT repetido, por
   * ejemplo—, el usuario corrige y vuelve a registrar sin subir otra vez los
   * 200 MB. Se borra con `consumir`, cuando la actividad ya guardó.
   */
  async tomar(procesoId: string, numeral: string, id: string, acceso: HiringAccess): Promise<CargaTomada> {
    const meta = await this.leerMeta(id, procesoId, numeral, acceso);
    if (!meta.completa) {
      throw new ConflictException('El archivo todavía no terminó de subir');
    }
    return {
      archivo: {
        filename: meta.completa.filename,
        originalname: meta.nombre,
        mimetype: meta.tipo,
        size: meta.tamano,
      },
      hash: meta.completa.hash,
    };
  }

  /** La actividad ya registró el archivo: la ficha sobra y el archivo es del expediente. */
  async consumir(id: string) {
    await rm(carpetaDeCarga(id), { recursive: true, force: true });
  }

  /** El usuario la canceló: se borra todo, también el archivo final si ya se unió. */
  async cancelar(procesoId: string, numeral: string, id: string, acceso: HiringAccess) {
    const meta = await this.leerMeta(id, procesoId, numeral, acceso);
    await this.descartar(meta);
    return { cancelada: true };
  }

  /** Cada hora se borran las cargas de más de un día que nadie usó, con su archivo. */
  @Cron('15 * * * *', { name: 'limpiar-cargas', timeZone: 'America/Bogota' })
  async limpiarVencidas(ahora = Date.now()) {
    const ids = await readdir(carpetaDeCargas()).catch(() => [] as string[]);
    let borradas = 0;
    for (const id of ids) {
      if (!UUID.test(id)) continue;
      const meta = await this.metaSinValidar(id);
      const creada = meta ? Date.parse(meta.creadaAt) : (await stat(join(carpetaDeCargas(), id)).catch(() => null))?.mtimeMs;
      if (creada === undefined || ahora - creada < VIDA_CARGA_MS) continue;
      if (meta) await this.descartar(meta);
      else await rm(join(carpetaDeCargas(), id), { recursive: true, force: true });
      borradas++;
    }
    if (borradas) this.logger.log(`Cargas sin usar borradas: ${borradas}`);
    return borradas;
  }

  // ----------------------------------------------------------- auxiliares --

  private async descartar(meta: MetaCarga) {
    if (meta.completa) await unlink(join(STORAGE_PATH, meta.completa.filename)).catch(() => undefined);
    await rm(carpetaDeCarga(meta.id), { recursive: true, force: true });
  }

  /** Une las partes en orden, en flujo, y devuelve el SHA-256 del resultado. */
  private async unir(carpeta: string, partes: number, destino: string): Promise<string> {
    const hash = createHash('sha256');
    const salida = createWriteStream(destino);
    try {
      for (let n = 0; n < partes; n++) {
        await new Promise<void>((resolve, reject) => {
          const entrada = createReadStream(join(carpeta, `parte-${n}`));
          entrada.on('data', (trozo) => {
            hash.update(trozo);
            if (!salida.write(trozo)) {
              entrada.pause();
              salida.once('drain', () => entrada.resume());
            }
          });
          entrada.on('end', () => resolve());
          entrada.on('error', reject);
        });
      }
      await new Promise<void>((resolve, reject) => {
        salida.end((err?: Error | null) => (err ? reject(err) : resolve()));
      });
    } catch (err) {
      salida.destroy();
      await unlink(destino).catch(() => undefined);
      throw err;
    }
    return hash.digest('hex');
  }

  private async leerMeta(id: string, procesoId: string, numeral: string, acceso: HiringAccess) {
    const meta = await this.metaSinValidar(id);
    if (!meta || meta.procesoId !== procesoId || meta.numeral !== numeral) {
      throw new NotFoundException('La carga no existe o ya venció: vuelve a seleccionar el archivo');
    }
    // Una carga es de quien la empezó: el id viaja por la red y no es un permiso.
    if (meta.usuarioId !== acceso.userId) {
      throw new ForbiddenException('Esta carga la empezó otra persona');
    }
    return meta;
  }

  private async metaSinValidar(id: string): Promise<MetaCarga | null> {
    try {
      return JSON.parse(await readFile(join(carpetaDeCarga(id), 'meta.json'), 'utf8')) as MetaCarga;
    } catch {
      return null;
    }
  }

  private guardarMeta(meta: MetaCarga) {
    return writeFile(join(carpetaDeCarga(meta.id), 'meta.json'), JSON.stringify(meta), 'utf8');
  }
}
