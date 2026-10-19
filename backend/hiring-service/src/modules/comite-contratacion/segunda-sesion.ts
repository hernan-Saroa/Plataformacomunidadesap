import { DecisionComite, SumisionComite } from '../../entities/comite-contratacion.entity';
import { EstadoActividad } from '../../entities/proceso-actividad.entity';

/**
 * Las reglas puras de la segunda sesión del Comité (migración 113), aparte del
 * servicio para poder fijarlas sin base de datos y para que la apertura y las
 * alertas las lean sin importar el módulo del comité.
 */

/** Pliego definitivo y segunda sesión del Comité, entre la 5.6 y la 5.7. */
export const NUMERAL_SEGUNDA_SESION = '5.6.1';

/** La actividad en la que se transcribe cada sumisión al comité. */
export function numeralDeLaSumision(sumision: SumisionComite): string {
  return sumision === 2 ? NUMERAL_SEGUNDA_SESION : '3.7';
}

/**
 * Si la apertura puede darse por el lado de la segunda sesión, y si no, por qué.
 *
 * Donde la 5.6.1 no aplica no exige nada: es la regla de toda la matriz para lo
 * que la modalidad no recorre. Donde aplica, manda la última sesión: una
 * aprobación vieja seguida de una observación ya no avala nada.
 *
 * `sesiones` llega de la más nueva a la más vieja.
 */
export function requisitoDeLaSegundaSesion(
  estadoActividad: EstadoActividad | null,
  sesiones: { decision: DecisionComite }[],
): { cumplido: boolean; motivo: string | null } {
  if (!estadoActividad || estadoActividad === 'NO_APLICA') return { cumplido: true, motivo: null };

  const ultima = sesiones[0];
  if (ultima?.decision === 'APROBADO' || ultima?.decision === 'APROBADO_CON_CONDICIONES') {
    return { cumplido: true, motivo: null };
  }
  if (ultima?.decision === 'RECHAZADO') {
    return { cumplido: false, motivo: 'El comité rechazó el pliego definitivo: el proceso no se abre' };
  }
  if (ultima?.decision === 'OBSERVADO') {
    return {
      cumplido: false,
      motivo: 'El comité observó el pliego definitivo: hay que ajustarlo y volver a llevarlo (5.6.1)',
    };
  }
  return {
    cumplido: false,
    motivo:
      estadoActividad === 'APROBADO'
        ? 'Falta registrar lo que decidió el comité en la segunda sesión (5.6.1)'
        : 'El pliego definitivo todavía no pasa por el abogado revisor, la directora y el comité (5.6.1)',
  };
}

/**
 * Si se puede registrar la segunda sesión, y si no, por qué.
 *
 * Solo con el pliego definitivo aprobado por la cadena —el comité ve lo que el
 * revisor y la directora ya avalaron— y sin una sesión que ya lo haya aprobado
 * o rechazado: después de eso lo que sigue es la apertura o nada.
 */
export function motivoParaNoRegistrarLaSesion(
  estadoActividad: EstadoActividad,
  ultima: DecisionComite | null,
): string | null {
  if (estadoActividad === 'NO_APLICA') return 'Esta modalidad no tiene segunda sesión del comité';
  if (ultima === 'APROBADO' || ultima === 'APROBADO_CON_CONDICIONES') {
    return 'El comité ya aprobó el pliego definitivo: lo que sigue es la apertura';
  }
  if (ultima === 'RECHAZADO' || estadoActividad === 'NEGADO') {
    return 'El comité rechazó el proceso: la contratación terminó ahí';
  }
  if (estadoActividad !== 'APROBADO') {
    return 'Primero el pliego definitivo tiene que aprobarlo el abogado revisor y después la directora';
  }
  return null;
}

/**
 * En qué queda la 5.6.1 tras la sesión.
 *
 * Aprobar la deja como está —ya aprobada por la cadena—. Observar la devuelve a
 * quien la trabajó: ajusta lo que el comité pidió y la cadena empieza otra vez,
 * porque el comité verá una versión distinta de la que avalaron el revisor y la
 * directora. Rechazar la niega y con ella el proceso, como en la 3.7.
 */
export function estadoTrasLaSegundaSesion(decision: DecisionComite): EstadoActividad {
  if (decision === 'OBSERVADO') return 'DEVUELTO';
  if (decision === 'RECHAZADO') return 'NEGADO';
  return 'APROBADO';
}

/**
 * Hasta cuándo puede llegar el acta de una sesión: la fecha de la sesión más el
 * plazo, en días calendario. En AAAA-MM-DD.
 */
export function limiteDelActa(fechaSesion: string, plazoDias: number): string {
  const [anio, mes, dia] = fechaSesion.slice(0, 10).split('-').map(Number);
  const limite = new Date(Date.UTC(anio, mes - 1, dia + plazoDias));
  return limite.toISOString().slice(0, 10);
}

/**
 * Cuáles documentos del proceso tienen versión definitiva nueva.
 *
 * Los que se cargaron después de publicar el proyecto de pliego: lo de antes es
 * lo que vio el mercado y lo que vio el primer comité. Sin publicación no hay
 * proyecto contra el cual comparar, y se dice que ninguno cambió.
 */
export function cambiaronTrasElProyecto(
  cargadoEl: Date | string | null,
  publicadoEl: Date | string | null,
): boolean {
  if (!cargadoEl || !publicadoEl) return false;
  return new Date(cargadoEl).getTime() > new Date(publicadoEl).getTime();
}
