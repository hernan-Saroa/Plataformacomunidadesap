import { EstadoCasoIncumplimiento } from '../../entities/caso-incumplimiento.entity';
import { EstadoContrato } from '../../entities/contrato.entity';
import {
  EstadoAudiencia,
  SentidoResolucion,
} from '../../entities/actuacion-sancionatoria.entity';

/**
 * Las reglas del trámite sancionatorio — RF-INC-02 (EFDS-1181).
 *
 * Puras y aparte del servicio porque son las que deciden si una entidad puede
 * sancionar a un contratista: el debido proceso que la historia nombra es
 * exactamente esto, y equivocarlo no falla ruidosamente —deja pasar una
 * decisión tomada sin haber oído a nadie—.
 *
 * **Lo que aquí no hay son términos.** Ninguna fuente del proyecto dice cuántos
 * días corren entre la citación y la audiencia, ni entre la notificación y la
 * firmeza. La historia lo deja anotado como dependencia por validar, así que se
 * registran las fechas y no se cuenta ni un plazo.
 */

/** Cómo se nombra cada sentido cuando hay que decírselo al usuario. */
export const NOMBRE_SENTIDO: Record<SentidoResolucion, string> = {
  DECLARA_INCUMPLIMIENTO: 'declara el incumplimiento',
  DECLARA_CADUCIDAD: 'declara la caducidad del contrato',
  ARCHIVA: 'archiva el caso',
};

/**
 * Por qué no se puede abrir el trámite de este caso, o `null` si se puede.
 *
 * Solo el caso reportado admite apertura: uno ya instruido tiene su resolución
 * de apertura, y uno decidido o archivado terminó.
 */
export function porQueNoSePuedeAbrir(estadoCaso: EstadoCasoIncumplimiento): string | null {
  if (estadoCaso === 'REPORTADO') return null;
  if (estadoCaso === 'EN_TRAMITE') return 'el trámite de este caso ya está abierto';
  return 'el caso ya está resuelto: para volver a instruirlo hay que revocar su decisión';
}

/**
 * Por qué no se puede actuar dentro del trámite —citar, celebrar, decidir—, o
 * `null` si se puede.
 *
 * Todo cuelga de que el trámite esté abierto: citar una audiencia sobre un caso
 * apenas reportado sería convocar al contratista a defenderse de un
 * procedimiento que nadie ha iniciado formalmente.
 */
export function porQueNoSePuedeInstruir(estadoCaso: EstadoCasoIncumplimiento): string | null {
  if (estadoCaso === 'EN_TRAMITE') return null;
  if (estadoCaso === 'REPORTADO') {
    return 'el trámite todavía no está abierto: primero se expide la resolución de apertura';
  }
  return 'el caso ya está resuelto: para volver a actuar hay que revocar su decisión';
}

/**
 * Por qué no se puede decidir el caso todavía, o `null` si se puede.
 *
 * **Exige al menos una audiencia celebrada.** Es criterio del equipo —el flujo
 * detallado quedó por validar— pero se apoya en lo que la historia sí dice: lo
 * que se surte es un «debido proceso sancionatorio», y decidir sin haber oído
 * al contratista no lo es. La única salida sin audiencia es archivar: si la
 * entidad concluye que no hay nada que reprochar, obligarla a celebrar una
 * audiencia para poder cerrarlo dejaría al contratista citado a defenderse de
 * un caso que ya se iba a archivar.
 */
export function porQueNoSePuedeDecidir(
  estadoCaso: EstadoCasoIncumplimiento,
  sentido: SentidoResolucion,
  audienciasCelebradas: number,
): string | null {
  const instruccion = porQueNoSePuedeInstruir(estadoCaso);
  if (instruccion) return instruccion;

  if (sentido !== 'ARCHIVA' && audienciasCelebradas === 0) {
    return 'no se ha celebrado ninguna audiencia: no se sanciona sin haber oído al contratista';
  }

  return null;
}

/**
 * Por qué el contrato no puede declararse caduco ahora, o `null` si puede.
 *
 * La caducidad interrumpe la ejecución, así que exige que haya ejecución que
 * interrumpir. Un contrato ya liquidado no se caduca: lo que quedaría por hacer
 * es exigir las garantías, que es otro camino.
 *
 * Suspendido sí, por lo mismo que admite la terminación anticipada: un contrato
 * en pausa sigue vivo, y obligar a reanudarlo para poder caducarlo dejaría en
 * el expediente una ejecución que nunca se retomó.
 */
export function porQueNoSePuedeCaducar(estado: EstadoContrato): string | null {
  if (estado === 'EJECUCION' || estado === 'SUSPENDIDO') return null;

  if (estado === 'TERMINADO') {
    return 'el contrato ya está terminado: no hay ejecución que interrumpir';
  }
  if (estado === 'LIQUIDADO' || estado === 'CERRADO') {
    return 'el contrato ya está liquidado: la caducidad interrumpe una ejecución que ya terminó';
  }

  return 'el contrato todavía no está en ejecución: falta el acta de inicio (9.1)';
}

/** En qué queda el caso cuando la decisión se expide. */
export function estadoTrasDecidir(sentido: SentidoResolucion): EstadoCasoIncumplimiento {
  return sentido === 'ARCHIVA' ? 'ARCHIVADO' : 'DECIDIDO';
}

/**
 * Si la decisión termina el contrato.
 *
 * Solo la caducidad. Declarar el incumplimiento puede imponer una multa o la
 * cláusula penal y el contrato sigue corriendo: confundir las dos cosas
 * terminaría contratos que la entidad quiere que se sigan ejecutando.
 */
export function terminaElContrato(sentido: SentidoResolucion): boolean {
  return sentido === 'DECLARA_CADUCIDAD';
}

/** Por qué no se puede registrar lo que pasó en esta audiencia. */
export function porQueNoSePuedeCerrarAudiencia(
  estadoAudiencia: EstadoAudiencia,
): string | null {
  if (estadoAudiencia === 'CITADA') return null;
  return `la audiencia ya está ${estadoAudiencia.toLowerCase()}`;
}
