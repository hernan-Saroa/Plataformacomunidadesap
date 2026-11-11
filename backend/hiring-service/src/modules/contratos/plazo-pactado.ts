/**
 * El plazo del contrato como se pactó en la 8.1 (sesión de QA del 04/11, EFDS-1162).
 *
 * Antes solo se aceptaba un número de días. La minuta lo escribe de dos formas:
 * un número con su unidad («seis meses») o una fecha cierta («hasta el 31 de
 * diciembre de 2026»). Se guarda tal cual se pactó, y en días cuando se puede
 * saber: de entrada si se pactó en días, y si no, cuando el acta de inicio fija
 * el primer día. Prórrogas, liquidación y estadísticas siguen contando en
 * `plazo_dias`, como antes.
 */

export const UNIDADES_PLAZO = ['DIAS', 'MESES', 'ANIOS'] as const;
export type UnidadPlazo = (typeof UNIDADES_PLAZO)[number];

export interface PlazoPactado {
  unidad: UnidadPlazo | null;
  cantidad: number | null;
  fechaFin: string | null;
}

/** Lo que se guarda en el contrato, o el mensaje de por qué no se puede. */
export function leerPlazoPactado(datos: {
  plazoDias?: number | null;
  plazoUnidad?: UnidadPlazo | null;
  plazoCantidad?: number | null;
  plazoFechaFin?: string | null;
}): { plazo: PlazoPactado & { dias: number | null } } | { error: string } {
  const { plazoUnidad, plazoCantidad, plazoFechaFin, plazoDias } = datos;
  const conUnidad = !!plazoUnidad || (plazoCantidad !== undefined && plazoCantidad !== null);

  if (conUnidad && plazoFechaFin) {
    return { error: 'Indica el plazo de una sola forma: un número con su unidad, o una fecha cierta' };
  }

  if (plazoFechaFin) {
    return { plazo: { unidad: null, cantidad: null, fechaFin: plazoFechaFin, dias: null } };
  }

  if (conUnidad) {
    if (!plazoUnidad || !plazoCantidad) {
      return { error: 'El plazo necesita el número y la unidad: días, meses o años' };
    }
    return {
      plazo: {
        unidad: plazoUnidad,
        cantidad: plazoCantidad,
        fechaFin: null,
        dias: plazoUnidad === 'DIAS' ? plazoCantidad : null,
      },
    };
  }

  // La forma de antes: solo días.
  if (plazoDias) return { plazo: { unidad: 'DIAS', cantidad: plazoDias, fechaFin: null, dias: plazoDias } };
  return { plazo: { unidad: null, cantidad: null, fechaFin: null, dias: null } };
}

const deFecha = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const aFecha = (d: Date) => d.toISOString().slice(0, 10);

/**
 * El último día del plazo pactado, contado desde el primer día de ejecución.
 *
 * El día de inicio cuenta: seis meses desde el 15 de marzo terminan el 14 de
 * septiembre. Si el mes de llegada no tiene ese día, vence el último del mes.
 */
export function ultimoDiaDelPlazo(inicio: string, plazo: PlazoPactado): string | null {
  if (plazo.fechaFin) return plazo.fechaFin;
  if (!plazo.unidad || !plazo.cantidad) return null;

  const d = deFecha(inicio);
  if (plazo.unidad === 'DIAS') {
    d.setUTCDate(d.getUTCDate() + plazo.cantidad - 1);
    return aFecha(d);
  }

  const meses = plazo.unidad === 'MESES' ? plazo.cantidad : plazo.cantidad * 12;
  const dia = d.getUTCDate();
  const destino = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1));
  const ultimoDelMes = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  // Si el mes de llegada no tiene ese día (31 de enero más un mes), el plazo
  // vence el último día de ese mes; si lo tiene, el día anterior.
  if (dia > ultimoDelMes) {
    destino.setUTCDate(ultimoDelMes);
  } else {
    destino.setUTCDate(dia - 1);
  }
  return aFecha(destino);
}

/** Los días del plazo, con el de inicio incluido; nulo si no se puede saber o no tiene sentido. */
export function diasDelPlazo(inicio: string, plazo: PlazoPactado): number | null {
  const fin = ultimoDiaDelPlazo(inicio, plazo);
  if (!fin) return null;
  const dias = Math.round((deFecha(fin).getTime() - deFecha(inicio).getTime()) / 86_400_000) + 1;
  return dias > 0 ? dias : null;
}

/** Cómo se lee el plazo en la pantalla y en el expediente. */
export function plazoEnPalabras(plazo: PlazoPactado & { dias?: number | null }): string | null {
  if (plazo.fechaFin) return `hasta el ${plazo.fechaFin}`;
  if (plazo.unidad && plazo.cantidad) {
    const nombres: Record<UnidadPlazo, [string, string]> = {
      DIAS: ['día', 'días'],
      MESES: ['mes', 'meses'],
      ANIOS: ['año', 'años'],
    };
    const [uno, varios] = nombres[plazo.unidad];
    return `${plazo.cantidad} ${plazo.cantidad === 1 ? uno : varios}`;
  }
  return plazo.dias ? `${plazo.dias} días` : null;
}

/**
 * Al fijarse el primer día de ejecución, el plazo pactado en meses, años o
 * fecha cierta pasa a días: desde ahí lo cuentan las prórrogas, la liquidación
 * y las estadísticas. Si ya estaba en días, no se toca.
 */
export function fijarPlazoEnDias(
  contrato: {
    plazoDias: number | null;
    plazoUnidad: UnidadPlazo | null;
    plazoCantidad: number | null;
    plazoFechaFin: string | null;
  },
  inicio: string,
): void {
  if (contrato.plazoDias !== null) return;
  contrato.plazoDias = diasDelPlazo(inicio, {
    unidad: contrato.plazoUnidad,
    cantidad: contrato.plazoCantidad,
    fechaFin: contrato.plazoFechaFin,
  });
}
