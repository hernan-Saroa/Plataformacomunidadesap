/**
 * Las catorce actividades de la matriz que ninguna historia recogió.
 *
 * No es una lista de conveniencia: es exactamente lo que quedó fuera de las
 * historias 1146-1176 y que, por eso, no tenía forma de cumplirse en el riel.
 * Vive en código y no en la base porque cambiarla no es parametrizar, es
 * decidir que una actividad pasa a tener pantalla propia.
 *
 * Eran once. Al revisar los candados del riel aparecieron tres más con el
 * mismo problema y ninguna diferencia de fondo: la 3.6, la 3.7 y la 8.6
 * tampoco las recogió una historia, también se resuelven fuera de la
 * plataforma y también se quedaban en BORRADOR para siempre. Entran por la
 * misma puerta en vez de estrenar tres pantallas.
 *
 * La 3.6 volvió a salir. Era la excepción de aquellas tres: la matriz no la
 * describe como un trámite que ocurre afuera sino como un «filtro según la
 * modalidad», y RF-EST-04 pide *cuál* causal habilita contratar así. Eso no
 * cabe en una fecha y una nota, y la nota además no se puede filtrar por
 * modalidad ni sustentar después el acto de justificación de la directa.
 */
export const NUMERALES_CON_REGISTRO = [
  // Etapa 3 · lo que acompaña al estudio previo
  '3.2',
  // La 3.3, la 3.4, la 3.5 y la 3.6 salieron de la lista. Eran el caso más
  // claro de lo que el comentario de arriba anticipaba: no es que nadie las
  // recogiera, es que no caben en una fecha y un documento. Radicar es recibir
  // el proceso en la Dirección y ponerle responsable; la 3.4 es la decisión del
  // abogado sobre el estudio previo; la 3.5 es ratificar la modalidad que el
  // área eligió —subir un papel la daba por definida sin que nadie la mirara—;
  // y la 3.6 es elegir la causal del catálogo de esa modalidad, que es lo que
  // el expediente necesita poder nombrar.
  //
  // El comité se queda: sesiona en la Dirección de Contratación y lo que la
  // plataforma recibe de él es el acta.
  '3.7',
  // Etapa 5 · participación previa a la apertura
  '5.9',
  '5.10',
  '5.11',
  // Etapa 6 · cierre de la evaluación y subasta
  '6.7',
  '6.8',
  '6.9',
  '6.10',
  // Etapa 8 · la comunicación con que la Dirección avisa que los requisitos
  // anteriores están cumplidos. Es un oficio que sale, no un estado que se
  // derive: lo que la plataforma puede hacer es guardarlo.
  '8.6',
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
