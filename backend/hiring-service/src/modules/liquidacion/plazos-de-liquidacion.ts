import { MomentoDelPlazo } from '../../entities/acta-liquidacion.entity';

/**
 * Los plazos legales de la liquidación (Ley 1150 de 2007, artículo 11).
 *
 * Constantes y no parámetros administrables, a diferencia de los umbrales o de
 * los plazos de publicidad: estos no los fija la entidad, los fija la ley. Un
 * parámetro invitaría a moverlos, y moverlos no está en manos de la ESAP.
 */
export const MESES_BILATERAL = 4;
export const MESES_UNILATERAL = 2;

/** Hasta cuándo puede liquidarse de cada forma. */
export interface VentanaLiquidacion {
  /** La terminación del contrato: desde ahí corre todo. */
  fechaTerminacion: string;
  /** Último día del acuerdo entre las partes. */
  bilateralHasta: string;
  /** Último día de la potestad unilateral de la entidad. */
  unilateralHasta: string;
}

/**
 * Suma meses calendario a una fecha `YYYY-MM-DD`.
 *
 * Calendario y no días: la ley habla de meses, y cuatro meses desde el 31 de
 * enero terminan el 31 de mayo, no 120 días después.
 *
 * El desbordamiento se recorta al último día del mes destino —31 de agosto más
 * seis meses es el 28 o 29 de febrero, no el 2 o 3 de marzo—: correr el
 * vencimiento hacia el mes siguiente le daría al contrato días que la ley no le
 * dio.
 */
export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);

  const totalMeses = (anio * 12 + (mes - 1)) + meses;
  const anioDestino = Math.floor(totalMeses / 12);
  const mesDestino = (totalMeses % 12) + 1;

  // Día 0 del mes siguiente = último día del mes destino.
  const ultimoDia = new Date(Date.UTC(anioDestino, mesDestino, 0)).getUTCDate();
  const diaDestino = Math.min(dia, ultimoDia);

  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${anioDestino}-${dosDigitos(mesDestino)}-${dosDigitos(diaDestino)}`;
}

/**
 * La ventana de liquidación de un contrato que terminó en esa fecha.
 *
 * Función pura porque es la regla que decide qué liquidación es legalmente
 * posible, y equivocarla no falla: deja liquidar unilateralmente antes de que
 * la potestad exista, que es un vicio del acto.
 */
export function ventanaDeLiquidacion(fechaTerminacion: string): VentanaLiquidacion {
  return {
    fechaTerminacion,
    bilateralHasta: sumarMeses(fechaTerminacion, MESES_BILATERAL),
    unilateralHasta: sumarMeses(fechaTerminacion, MESES_BILATERAL + MESES_UNILATERAL),
  };
}

/**
 * En qué momento del plazo está el contrato en una fecha dada.
 *
 * El último día cuenta: `hoy <= bilateralHasta` y no `<`. Recortar un día un
 * término legal es exactamente el error que estas funciones existen para
 * evitar.
 */
export function momentoDelPlazo(hoy: string, ventana: VentanaLiquidacion): MomentoDelPlazo {
  if (hoy <= ventana.bilateralHasta) return 'BILATERAL';
  if (hoy <= ventana.unilateralHasta) return 'UNILATERAL';
  return 'VENCIDO';
}

/** Cuántos días quedan hasta el fin de la ventana en curso. Negativo si venció. */
export function diasRestantes(hoy: string, hasta: string): number {
  const dia = 86_400_000;
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / dia);
}

/**
 * La alerta de plazos que pide RF-SIS-03.
 *
 * Se calcula aquí y no en la pantalla porque es la misma cuenta que decide si
 * la unilateral está habilitada: dos implementaciones terminarían diciendo
 * cosas distintas sobre el mismo contrato.
 */
export function alertaDelPlazo(
  hoy: string,
  ventana: VentanaLiquidacion,
): { momento: MomentoDelPlazo; dias: number; mensaje: string } {
  const momento = momentoDelPlazo(hoy, ventana);

  if (momento === 'BILATERAL') {
    const dias = diasRestantes(hoy, ventana.bilateralHasta);
    return {
      momento,
      dias,
      mensaje:
        dias === 0
          ? 'Hoy vence el plazo para liquidar de común acuerdo'
          : `Quedan ${dias} días para liquidar de común acuerdo (hasta el ${ventana.bilateralHasta})`,
    };
  }

  if (momento === 'UNILATERAL') {
    const dias = diasRestantes(hoy, ventana.unilateralHasta);
    return {
      momento,
      dias,
      mensaje:
        dias === 0
          ? 'Hoy vence el plazo para liquidar unilateralmente'
          : `Venció el plazo del acuerdo; quedan ${dias} días para liquidar unilateralmente (hasta el ${ventana.unilateralHasta})`,
    };
  }

  return {
    momento,
    dias: diasRestantes(hoy, ventana.unilateralHasta),
    mensaje: `El plazo para liquidar venció el ${ventana.unilateralHasta}; la liquidación queda en manos del juez`,
  };
}
