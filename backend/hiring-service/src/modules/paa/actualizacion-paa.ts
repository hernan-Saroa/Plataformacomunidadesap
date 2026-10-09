import type { CampoAplicado } from '../../entities/paa.entity';
import type { EstadoActividad } from '../../entities/proceso-actividad.entity';
import { CAMPOS_CONTROLADOS } from './estructura-paa';

/** Estados de la 3.1 en que el área todavía puede cambiarla. */
const ESTUDIO_EDITABLE: readonly EstadoActividad[] = ['BORRADOR', 'DEVUELTO'];

export const MOTIVO_EDITADO_A_MANO = 'Se había corregido a mano: se conserva lo del usuario.';
export const MOTIVO_ESTUDIO_CERRADO =
  'El estudio previo ya se envió a revisión o está aprobado: el cambio se incorpora devolviéndolo.';

export interface EstadoActual {
  /** Lo que el PAA había puesto la última vez (`procesos.paa_origen`). */
  origenAnterior: Record<string, unknown> | null;
  /** Lo que el PAA pone ahora. */
  origenNuevo: Record<string, string | number | null>;
  /** Lo que tiene hoy el proceso. */
  proceso: { objeto: string; modalidad: string | null; valorEstimado: number | null };
  /** Los datos de la 3.1 y su estado. */
  estudio: Record<string, unknown>;
  estadoEstudio: EstadoActividad | null;
}

export interface PlanDeActualizacion {
  /** Cada campo controlado que el PAA cambió, se haya aplicado o no. */
  campos: CampoAplicado[];
  /** Lo que se escribe en el proceso. */
  proceso: { objeto?: string; modalidad?: string; valorEstimado?: number };
  /** Lo que se escribe en la 3.1, encima de lo que tiene. */
  estudio: Record<string, unknown>;
  /** El `paa_origen` que queda después. */
  origen: Record<string, unknown>;
}

/**
 * Qué le hace a un proceso una versión nueva del PAA en la que cambió su línea.
 *
 * Solo toca lo que controla el PAA (`CAMPOS_CONTROLADOS`), y de eso solo lo que
 * sigue valiendo lo que el PAA había puesto: si el área lo corrigió en la 3.1,
 * es suyo y se respeta. Tampoco toca nada si la 3.1 ya salió de las manos del
 * área: cambiarle el objeto a un estudio que el abogado está revisando sería
 * cambiarle lo que firma. En esos casos el campo se lista como no aplicado,
 * con el motivo, y la revisión lo muestra.
 *
 * Lo no aplicado porque la 3.1 estaba cerrada conserva su origen anterior: así,
 * si el abogado la devuelve, el valor de la 3.1 sigue coincidiendo con lo que
 * el PAA había puesto y la siguiente versión lo puede actualizar.
 */
export function planDeActualizacion(actual: EstadoActual): PlanDeActualizacion {
  const editable = actual.estadoEstudio !== null && ESTUDIO_EDITABLE.includes(actual.estadoEstudio);
  const campos: CampoAplicado[] = [];
  const proceso: PlanDeActualizacion['proceso'] = {};
  const estudio: Record<string, unknown> = {};
  const origen: Record<string, unknown> = { ...(actual.origenAnterior ?? {}) };

  for (const c of CAMPOS_CONTROLADOS) {
    const antes = actual.origenAnterior?.[c.campo] ?? null;
    const despues = actual.origenNuevo[c.campo] ?? null;
    if (iguales(antes, despues)) continue;

    const valorActual =
      c.destino === 'proceso'
        ? actual.proceso[c.campo as keyof EstadoActual['proceso']]
        : actual.estudio[c.campo];

    let motivo: string | undefined;
    if (!editable) motivo = MOTIVO_ESTUDIO_CERRADO;
    else if (!iguales(valorActual, antes)) motivo = MOTIVO_EDITADO_A_MANO;

    campos.push({ campo: c.campo, etiqueta: c.etiqueta, antes, despues, aplicado: !motivo, ...(motivo && { motivo }) });

    if (motivo === MOTIVO_ESTUDIO_CERRADO) continue;
    origen[c.campo] = despues;
    if (motivo) continue;

    if (c.destino === 'proceso') (proceso as Record<string, unknown>)[c.campo] = despues;
    else estudio[c.campo] = despues;
  }

  return { campos, proceso, estudio, origen };
}

/** Si dos valores son el mismo dato, aunque uno llegue como texto y el otro como número. */
export function iguales(a: unknown, b: unknown): boolean {
  const vacio = (v: unknown) => v === null || v === undefined || v === '';
  if (vacio(a) || vacio(b)) return vacio(a) && vacio(b);
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
  return String(a).trim() === String(b).trim();
}
