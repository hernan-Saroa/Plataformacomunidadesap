import { open } from 'fs/promises';

/**
 * Revisión de un .zip antes de aceptarlo en el expediente (BUG-004 de QA, 14/11).
 *
 * La plataforma no descomprime la oferta: se guarda tal cual y quien la revisa
 * la descarga. Lo que sí se mira es el índice del .zip —el directorio central,
 * al final del archivo—, que basta para saber si está completo, si viene
 * cifrado y qué nombres trae, sin leer los 200 MB. Se hace a mano y no con una
 * librería porque es leer tres estructuras fijas del formato.
 */

/** Lo que no debe venir dentro de una oferta: programas y guiones que se ejecutan al abrirlos. */
export const EXTENSIONES_PROHIBIDAS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.msi', '.pif', '.cpl', '.dll', '.sys',
  '.js', '.jse', '.vbs', '.vbe', '.wsf', '.wsh', '.ps1', '.psm1', '.hta', '.jar', '.lnk', '.reg',
];

const FIRMA_FIN = 0x06054b50;
const FIRMA_FIN_ZIP64 = 0x06064b50;
const FIRMA_LOCALIZADOR_ZIP64 = 0x07064b50;
const FIRMA_CENTRAL = 0x02014b50;
/** El fin del directorio mide 22 bytes y puede llevar un comentario de hasta 64 KB. */
const COLA = 22 + 0xffff;
/** Un índice más grande que esto no es el de una oferta: es un archivo armado para colgar al servidor. */
const MAX_INDICE = 64 * 1024 * 1024;

export interface RevisionZip {
  /** Qué está mal, dicho para quien cargó la oferta; `null` si se acepta. */
  problema: string | null;
  archivos: number;
}

const mal = (problema: string, archivos = 0): RevisionZip => ({ problema, archivos });

export async function revisarZip(ruta: string): Promise<RevisionZip> {
  const archivo = await open(ruta, 'r');
  try {
    const { size } = await archivo.stat();
    if (size < 22) return mal('El .zip está vacío o incompleto: vuelve a generarlo y cárgalo de nuevo');

    const largoCola = Math.min(size, COLA);
    const cola = Buffer.alloc(largoCola);
    await archivo.read(cola, 0, largoCola, size - largoCola);

    let fin = -1;
    for (let i = largoCola - 22; i >= 0; i--) {
      if (cola.readUInt32LE(i) === FIRMA_FIN) {
        fin = i;
        break;
      }
    }
    if (fin < 0) {
      return mal('El archivo no es un .zip válido o llegó cortado: vuelve a generarlo y cárgalo de nuevo');
    }

    let entradas = cola.readUInt16LE(fin + 10);
    let largoIndice = cola.readUInt32LE(fin + 12);
    let inicioIndice = cola.readUInt32LE(fin + 16);

    // Zip64: los campos del fin normal quedan en 0xFFFF… y los de verdad están
    // en un registro aparte que señala el localizador justo antes.
    if (entradas === 0xffff || largoIndice === 0xffffffff || inicioIndice === 0xffffffff) {
      const loc = fin - 20;
      if (loc < 0 || cola.readUInt32LE(loc) !== FIRMA_LOCALIZADOR_ZIP64) {
        return mal('El .zip está dañado: no se encontró su índice');
      }
      const posFin64 = Number(cola.readBigUInt64LE(loc + 8));
      const fin64 = Buffer.alloc(56);
      await archivo.read(fin64, 0, 56, posFin64);
      if (fin64.readUInt32LE(0) !== FIRMA_FIN_ZIP64) return mal('El .zip está dañado: no se encontró su índice');
      entradas = Number(fin64.readBigUInt64LE(32));
      largoIndice = Number(fin64.readBigUInt64LE(40));
      inicioIndice = Number(fin64.readBigUInt64LE(48));
    }

    if (entradas === 0) return mal('El .zip no trae ningún documento');
    if (inicioIndice + largoIndice > size || largoIndice > MAX_INDICE) {
      return mal('El .zip está dañado o llegó incompleto: vuelve a generarlo y cárgalo de nuevo');
    }

    const indice = Buffer.alloc(largoIndice);
    await archivo.read(indice, 0, largoIndice, inicioIndice);

    let p = 0;
    for (let n = 0; n < entradas; n++) {
      if (p + 46 > indice.length || indice.readUInt32LE(p) !== FIRMA_CENTRAL) {
        return mal('El .zip está dañado: su índice no coincide con lo que contiene', n);
      }
      const banderas = indice.readUInt16LE(p + 8);
      const largoNombre = indice.readUInt16LE(p + 28);
      const largoExtra = indice.readUInt16LE(p + 30);
      const largoComentario = indice.readUInt16LE(p + 32);
      const nombre = indice.toString('utf8', p + 46, p + 46 + largoNombre);

      // El bit 0 dice que la entrada va cifrada: nadie podría abrirla sin la clave.
      if (banderas & 0x1) {
        return mal(`El .zip viene protegido con contraseña («${nombre}»): cárgalo sin clave para que se pueda revisar`, n);
      }
      const minus = nombre.toLowerCase();
      const prohibida = EXTENSIONES_PROHIBIDAS.find((ext) => minus.endsWith(ext));
      if (prohibida) {
        return mal(`El .zip trae un archivo ejecutable («${nombre}»), que no se admite en una oferta: quítalo y vuelve a cargarlo`, n);
      }
      p += 46 + largoNombre + largoExtra + largoComentario;
    }

    return { problema: null, archivos: entradas };
  } finally {
    await archivo.close();
  }
}
