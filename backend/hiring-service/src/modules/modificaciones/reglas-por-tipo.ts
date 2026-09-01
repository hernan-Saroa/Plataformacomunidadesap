import { EstadoContrato } from '../../entities/contrato.entity';
import {
  CausalTerminacion,
  TipoModificacion,
} from '../../entities/modificacion-contrato.entity';

/**
 * Los tipos que tienen trámite en la plataforma: los siete de la matriz.
 *
 * El orden es el del panel, y no es alfabético: primero lo que alarga o
 * aumenta el contrato, después lo que cambia de partes o lo precisa, y al final
 * lo que lo detiene y lo termina.
 */
export const TIPOS_CON_TRAMITE: TipoModificacion[] = [
  'ADICION',
  'PRORROGA',
  'CESION',
  'ACLARATORIO',
  'SUSPENSION',
  'REANUDACION',
  'TERMINACION_ANTICIPADA',
];

/** Cómo se nombra cada causal de terminación cuando hay que decírsela al usuario. */
export const NOMBRE_CAUSAL: Record<CausalTerminacion, string> = {
  MUTUO_ACUERDO: 'por mutuo acuerdo',
  UNILATERAL: 'por decisión unilateral motivada',
};

/** Cómo se nombra cada tipo cuando hay que decírselo al usuario. */
export const NOMBRE_TIPO: Record<TipoModificacion, string> = {
  ADICION: 'la adición',
  PRORROGA: 'la prórroga',
  CESION: 'la cesión',
  ACLARATORIO: 'el aclaratorio',
  SUSPENSION: 'la suspensión',
  REANUDACION: 'la reanudación',
  TERMINACION_ANTICIPADA: 'la terminación anticipada',
};

/** Lo que el contrato tiene que ser para admitir cada tipo. */
export interface SituacionDelContrato {
  estado: EstadoContrato;
  /** Si hay una suspensión aprobada y todavía sin levantar. */
  suspendido: boolean;
}

/**
 * Por qué no se puede tramitar este tipo ahora, o `null` si se puede.
 *
 * Devuelve el motivo y no un booleano porque la pantalla tiene que poder
 * explicarlo: el gestor que ve «reanudar» apagado necesita saber que el
 * contrato no está suspendido, no quedarse mirando un botón gris.
 *
 * Función pura: es la regla que decide si un contrato puede pausarse, cederse o
 * alargarse, y equivocarla no falla ruidosamente.
 */
export function porQueNoAdmiteTipo(
  situacion: SituacionDelContrato,
  tipo: TipoModificacion,
): string | null {
  if (!TIPOS_CON_TRAMITE.includes(tipo)) {
    return `${NOMBRE_TIPO[tipo]} todavía no tiene trámite en la plataforma`;
  }

  const { estado, suspendido } = situacion;

  if (estado === 'LIQUIDADO' || estado === 'CERRADO') {
    return 'el contrato ya está liquidado: modificarlo cambiaría algo que las partes dieron por terminado';
  }

  // Un contrato terminado no se modifica: lo que queda por hacer es liquidar lo
  // que alcanzó a ejecutarse. Si la terminación no debió darse, se revoca.
  if (estado === 'TERMINADO') {
    return 'el contrato está terminado anticipadamente: ya no hay ejecución que modificar';
  }

  if (estado !== 'EJECUCION' && estado !== 'SUSPENDIDO') {
    return 'el contrato todavía no está en ejecución: falta el acta de inicio (9.1)';
  }

  // De un contrato suspendido solo se sale reanudándolo o terminándolo.
  // Adicionarlo o cederlo mientras está en pausa daría por vivo lo que está
  // detenido; terminarlo, en cambio, es el desenlace típico de una suspensión
  // cuya causa no se supera, y obligar a reanudar un día para terminar al
  // siguiente dejaría en el expediente una ejecución que nunca se retomó.
  if (suspendido && tipo !== 'REANUDACION' && tipo !== 'TERMINACION_ANTICIPADA') {
    return 'el contrato está suspendido: primero hay que reanudarlo';
  }

  if (!suspendido && tipo === 'REANUDACION') {
    return 'el contrato no está suspendido: no hay nada que reanudar';
  }

  return null;
}

/**
 * Días entre dos fechas, contados en calendario.
 *
 * En calendario y no en hábiles a propósito: la suspensión detiene el contrato
 * todos los días, festivos incluidos, y devolver solo los hábiles le regalaría
 * a la entidad los fines de semana en que tampoco se ejecutó.
 */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.UTC(
    Number(desde.slice(0, 4)),
    Number(desde.slice(5, 7)) - 1,
    Number(desde.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(hasta.slice(0, 4)),
    Number(hasta.slice(5, 7)) - 1,
    Number(hasta.slice(8, 10)),
  );
  return Math.round((b - a) / 86_400_000);
}

/**
 * Cuántos días le devuelve al plazo la reanudación de una suspensión.
 *
 * **Criterio del equipo, sin confirmar.** Ninguna fuente lo dice; se toma que
 * los días efectivamente suspendidos se le devuelven al plazo, que es lo que
 * hace que suspender signifique algo: si el plazo siguiera corriendo durante la
 * pausa, el contratista pagaría con su término una detención que no causó.
 *
 * Se cuenta con la fecha real de reanudación y no con la prevista: la prevista
 * es una intención y la suspensión puede levantarse antes o después.
 */
export function diasSuspendidos(suspensionDesde: string, reanudadaEl: string): number {
  const dias = diasEntre(suspensionDesde, reanudadaEl);
  // Reanudar el mismo día no suspendió nada, y una fecha anterior es un error
  // de digitación que no puede acortar el plazo.
  return dias > 0 ? dias : 0;
}

export interface CambioDePlazo {
  antes: number | null;
  despues: number | null;
}

/**
 * El plazo después de sumarle días, cuando el contrato tiene plazo fijado.
 *
 * Si el contrato no lo tiene —`plazo_dias` es nulo— la modificación se registra
 * igual y no inventa uno: prorrogar «treinta días» un contrato sin plazo daría
 * un plazo de treinta días que nadie pactó.
 */
export function plazoConMasDias(plazoActual: number | null, dias: number): CambioDePlazo {
  if (plazoActual === null) return { antes: null, despues: null };
  return { antes: plazoActual, despues: plazoActual + dias };
}
