import type { OfertaMatrizResult } from './parsers/matriz-oferta.parser';

/**
 * Qué pasará con cada oferta de la MATRIZ_OFERTA del Excel en el periodo destino.
 *
 * - `por_crear`: la oferta (CETAP + programa + periodo) todavía no existe y se creará.
 * - `ya_existente`: ya existe en ese periodo; la carga no la toca («sin cambios»).
 * - `rechazada`: no se puede cargar (el programa no existe ni en el catálogo ni en la
 *   hoja PROGRAMAS). Es distinto de «ya existente»: aquí SÍ falta algo por corregir.
 */
export type EstadoOferta = 'por_crear' | 'ya_existente' | 'rechazada';

export interface OfertaDetalle {
  codigo_cetap: string;
  nombre_cetap: string;
  codigo_programa: string;
  nombre_programa: string;
  estado: EstadoOferta;
  motivo?: string;
}

export interface ResumenOfertas {
  por_crear: number;
  ya_existentes: number;
  rechazadas: number;
  detalle: OfertaDetalle[];
}

export const RESUMEN_OFERTAS_VACIO = (): ResumenOfertas => ({
  por_crear: 0,
  ya_existentes: 0,
  rechazadas: 0,
  detalle: [],
});

/** Marca de un programa que viene en la hoja PROGRAMAS y aún no está en la base. */
export const PROGRAMA_NUEVO = 'NEW_PROG';

export interface ContextoOfertas {
  /** CETAP ya existentes (código en minúsculas -> id). Los que falten se crearán con la carga. */
  cetapIdPorCodigo: Map<string, string>;
  /** Programas conocidos (código en minúsculas -> id, o PROGRAMA_NUEVO si solo está en el Excel). */
  programaIdPorCodigo: Map<string, string>;
  /** Nombre del programa por código en minúsculas, para el detalle. */
  nombreProgramaPorCodigo: Map<string, string>;
  /**
   * Ofertas ya registradas en el periodo destino, como `${idCetap}::${idPrograma}`.
   * `null` cuando el periodo todavía no existe: entonces ninguna existe.
   */
  ofertasExistentes: Set<string> | null;
}

/** Clasifica cada oferta del Excel. Función pura: no toca la base. */
export function clasificarOfertas(
  matrizOferta: OfertaMatrizResult[],
  ctx: ContextoOfertas,
): ResumenOfertas {
  const resumen = RESUMEN_OFERTAS_VACIO();

  for (const m of matrizOferta) {
    const codigoCetap = String(m.codigo_cetap ?? '').trim();
    const cetapId = ctx.cetapIdPorCodigo.get(codigoCetap.toLowerCase());

    for (const progCode of m.programas_ofertados) {
      const claveProg = progCode.toLowerCase().trim();
      const progId = ctx.programaIdPorCodigo.get(claveProg);
      const base = {
        codigo_cetap: codigoCetap,
        nombre_cetap: m.nombre_cetap ?? '',
        codigo_programa: progCode.trim(),
        nombre_programa: ctx.nombreProgramaPorCodigo.get(claveProg) ?? '',
      };

      if (!progId) {
        resumen.rechazadas++;
        resumen.detalle.push({
          ...base,
          estado: 'rechazada',
          motivo: `El programa ${progCode.trim()} no existe en el catálogo ni en la hoja PROGRAMAS.`,
        });
        continue;
      }

      // CETAP nuevo (se creará con la carga), programa nuevo o periodo sin ofertas: todo es nuevo.
      const existe =
        !!cetapId &&
        progId !== PROGRAMA_NUEVO &&
        !!ctx.ofertasExistentes &&
        ctx.ofertasExistentes.has(`${cetapId}::${progId}`);

      if (existe) {
        resumen.ya_existentes++;
        resumen.detalle.push({ ...base, estado: 'ya_existente' });
      } else {
        resumen.por_crear++;
        resumen.detalle.push({ ...base, estado: 'por_crear' });
      }
    }
  }
  return resumen;
}
