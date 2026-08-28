/**
 * Las once actividades de la matriz que ninguna historia recogió.
 *
 * No es una lista de conveniencia: es exactamente lo que quedó fuera de las
 * historias 1146-1176 y que, por eso, no tenía forma de cumplirse en el riel.
 * Vive en código y no en la base porque cambiarla no es parametrizar, es
 * decidir que una actividad pasa a tener pantalla propia.
 */
export const NUMERALES_CON_REGISTRO = [
  // Etapa 3 · lo que acompaña al estudio previo
  '3.2',
  '3.3',
  '3.4',
  '3.5',
  // Etapa 5 · participación previa a la apertura
  '5.9',
  '5.10',
  '5.11',
  // Etapa 6 · cierre de la evaluación y subasta
  '6.7',
  '6.8',
  '6.9',
  '6.10',
] as const;

export type NumeralConRegistro = (typeof NUMERALES_CON_REGISTRO)[number];

/** Si esta actividad se cumple registrando lo que pasó afuera. */
export function admiteRegistro(numeral: string): numeral is NumeralConRegistro {
  return (NUMERALES_CON_REGISTRO as readonly string[]).includes(numeral);
}

export interface DatosDelRegistro {
  fecha: string;
  nota: string;
  tieneSoporte: boolean;
  exigeSoporte: boolean;
  /** Hoy, en formato ISO corto. Se recibe para poder probar sin reloj. */
  hoy: string;
}

/**
 * Qué le falta al registro para poder guardarse, dicho en una frase.
 *
 * Devuelve el motivo y no un booleano porque la pantalla tiene que poder
 * explicar por qué el botón no sirve: un botón apagado sin razón obliga al
 * gestor a adivinar cuál de las tres condiciones incumple.
 */
export function faltaParaRegistrar(datos: DatosDelRegistro): string | null {
  if (!datos.nota || datos.nota.trim().length === 0) {
    return 'La nota de trazabilidad es obligatoria: es lo que explica qué pasó por fuera de la plataforma.';
  }

  if (!datos.fecha) return 'Falta la fecha en que ocurrió la actividad.';

  // La fecha es la del hecho, no la del registro. Puede ser anterior —se
  // transcribe días después— pero no posterior: no se deja constancia de algo
  // que todavía no pasó.
  if (datos.fecha > datos.hoy) {
    return 'La fecha no puede ser posterior a hoy: se registra lo que ya ocurrió.';
  }

  if (datos.exigeSoporte && !datos.tieneSoporte) {
    return 'Esta actividad exige adjuntar el soporte de lo que se hizo.';
  }

  return null;
}
