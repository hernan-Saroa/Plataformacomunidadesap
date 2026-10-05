import { PapelEnProceso } from '../../entities/participacion-proceso.entity';
import { Accion } from '../../auth/alcance';

/** Una actividad de la que responde la persona que ocupa un papel en el proceso. */
export interface RespondeElAsignado {
  papel: PapelEnProceso;
  /** La acción que esa persona hace en el punto; sin nadie en el papel, la hacen los roles con ella. */
  accion: Exclude<Accion, 'ver'>;
  /** Solo mientras la actividad espera decisión: antes la diligencia quien tenga el alcance de editar. */
  soloEnRevision: boolean;
  /**
   * Si el papel se toma de una bandeja. Entonces, mientras nadie lo ocupa,
   * cualquiera con el alcance puede tomarlo; si se asigna, nadie actúa hasta
   * que se asigne.
   */
  seToma: boolean;
}

const DEL_ABOGADO = { papel: 'ABOGADO', accion: 'aprobar', seToma: false } as const;
const DE_LA_FINANCIERA = { papel: 'FINANCIERA', accion: 'editar', seToma: true } as const;

/**
 * Las actividades de las que no responde un rol sino una persona del proceso.
 *
 * Los alcances dicen qué roles *pueden* actuar en cada punto, y eso es lo que
 * la pantalla nombra por defecto. Aquí va la excepción: que el Gestor tenga el
 * alcance de editar la 3.7 no lo pone a transcribir el comité, porque
 * `quienDecide` solo deja al abogado repartido. Si la pantalla no lo supiera,
 * diría «le toca al Gestor» y mandaría a esperar al abogado.
 *
 * Vive en el backend y viaja con cada actividad para que la regla esté una
 * sola vez: los servicios que llaman a `quienDecide` y la pantalla que dice a
 * quién le toca leen lo mismo.
 */
export const RESPONDE_EL_ASIGNADO: Readonly<Record<string, RespondeElAsignado>> = {
  // La revisión del estudio previo, la causal y el comité son del abogado de
  // principio a fin.
  '3.4': { ...DEL_ABOGADO, soloEnRevision: false },
  '3.6': { ...DEL_ABOGADO, soloEnRevision: false },
  '3.7': { ...DEL_ABOGADO, soloEnRevision: false },
  // El CDP lo atiende la Financiera que tomó la solicitud: desde la 096 lo
  // verifica, lo expide y lo adjunta en la 4.2.
  '4.2': { ...DE_LA_FINANCIERA, soloEnRevision: false },
};

/** Quién responde por la actividad, o `null` si responden los roles de su alcance. */
export function respondeElAsignado(numeral: string): RespondeElAsignado | null {
  return RESPONDE_EL_ASIGNADO[numeral] ?? null;
}
