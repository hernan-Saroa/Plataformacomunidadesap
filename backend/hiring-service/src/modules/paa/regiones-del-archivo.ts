import type { HallazgoPaa } from '../../entities/paa.entity';
import { normalizar } from './estructura-paa';
import type { RegionLeida } from './lector-paa';

/** Lo que se necesita de una región ya registrada para reconocerla en un archivo. */
export interface RegionRegistrada {
  id: string;
  documentoId: string;
  nombre: string;
  prefijoLinea: string;
  unidadContratacion: string;
  activa: boolean;
}

export interface UbicacionDelArchivo {
  /** El documento al que pertenece el archivo; null si todas sus regiones son nuevas. */
  documentoId: string | null;
  /** Las regiones del archivo que todavía no existen: se crean al cargarlo. */
  nuevas: RegionLeida[];
  errores: HallazgoPaa[];
}

/**
 * Dice de qué documento es un archivo a partir de las regiones que trae.
 *
 * Nadie elige el documento ni crea las regiones: un prefijo ya conocido dice
 * de qué territorio es el archivo, y uno nuevo es una región nueva. Lo que no
 * se puede decidir sin adivinar es un error: un archivo con líneas de dos
 * documentos, una región conocida con otra unidad, o un prefijo nuevo con la
 * unidad de una región que ya existe —casi siempre un prefijo mal escrito—.
 */
export function ubicarArchivo(
  leidas: RegionLeida[],
  registradas: RegionRegistrada[],
  nombresDocumento: Map<string, string>,
): UbicacionDelArchivo {
  const errores: HallazgoPaa[] = [];
  const porPrefijo = new Map(registradas.map((r) => [normalizar(r.prefijoLinea), r]));
  const porUnidad = new Map(registradas.map((r) => [normalizar(r.unidadContratacion), r]));

  const conocidas = leidas.filter((l) => porPrefijo.has(normalizar(l.prefijo)));
  const nuevas = leidas.filter((l) => !porPrefijo.has(normalizar(l.prefijo)));

  const documentos = [...new Set(conocidas.map((l) => porPrefijo.get(normalizar(l.prefijo))!.documentoId))];
  if (documentos.length > 1) {
    const de = documentos
      .map((id) => {
        const prefijos = conocidas
          .filter((l) => porPrefijo.get(normalizar(l.prefijo))!.documentoId === id)
          .map((l) => l.prefijo)
          .join(', ');
        return `${prefijos} (PAA de ${nombresDocumento.get(id) ?? '—'})`;
      })
      .join(' y ');
    errores.push(
      hallazgo(null, `El archivo trae líneas de ${de}. Cada territorio carga su propio Excel: separa las líneas y carga cada archivo por su lado.`),
    );
  }

  for (const leida of conocidas) {
    const region = porPrefijo.get(normalizar(leida.prefijo))!;
    if (normalizar(leida.unidadContratacion) !== normalizar(region.unidadContratacion)) {
      errores.push(
        hallazgo(
          leida.fila,
          `Las líneas ${leida.prefijo} son de ${region.nombre}, cuya unidad es «${region.unidadContratacion}», y el archivo dice «${leida.unidadContratacion}». Si la unidad cambió de nombre, corrígela en Regiones y vuelve a cargar.`,
          leida.unidadContratacion,
          'Unidad de contratación (referencia)',
        ),
      );
    }
    if (!region.activa) {
      errores.push(
        hallazgo(leida.fila, `${region.nombre} (${leida.prefijo}) está inactiva: actívala en Regiones o quita sus líneas del archivo.`, leida.prefijo),
      );
    }
  }

  for (const leida of nuevas) {
    const unidad = normalizar(leida.unidadContratacion);
    const registrada = porUnidad.get(unidad);
    const otraNueva = nuevas.find((n) => n !== leida && normalizar(n.unidadContratacion) === unidad);
    if (registrada) {
      errores.push(
        hallazgo(
          leida.fila,
          `«${leida.prefijo}» no es el prefijo de ninguna región, y su unidad «${leida.unidadContratacion}» es la de ${registrada.nombre} (${registrada.prefijoLinea}). ¿Está mal escrito el prefijo?`,
          leida.prefijo,
        ),
      );
    } else if (otraNueva && otraNueva.fila < leida.fila) {
      errores.push(
        hallazgo(
          leida.fila,
          `«${leida.prefijo}» y «${otraNueva.prefijo}» tienen la misma unidad, «${leida.unidadContratacion}». Una región es un prefijo con su unidad: uno de los dos está mal escrito.`,
          leida.prefijo,
        ),
      );
    }
  }

  return { documentoId: documentos.length === 1 ? documentos[0] : null, nuevas, errores };
}

/** «Territorial Meta», «Sede Central y Chocó», «A, B y C». */
export function nombreDeDocumento(regiones: { unidadContratacion: string }[]): string {
  const nombres = regiones.map((r) => r.unidadContratacion.trim());
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0] ?? '';
}

function hallazgo(fila: number | null, mensaje: string, valor: string | null = null, columna = 'Descripción'): HallazgoPaa {
  return { fila, columna: fila === null ? null : columna, valor, mensaje };
}
