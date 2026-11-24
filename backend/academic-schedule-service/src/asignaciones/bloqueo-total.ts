import type { MotivoRechazo } from './reglas-asignacion.js';

/**
 * EFDS-2449 (reportado por Javier en EFDS-1939) — cuando TODOS los candidatos del grupo están
 * bloqueados, el servidor entrega la alerta ya redactada: que no se puede asignar a nadie, qué
 * hacer y un resumen de los motivos más frecuentes con su conteo. Así es igual en cualquier
 * pantalla que use `GET /asignaciones/candidatos`. El motivo de cada docente sigue en su tarjeta.
 *
 * El conteo es de DOCENTES por categoría (un docente con dos motivos cuenta en las dos), no de
 * motivos: «3 con la vinculación vencida» son 3 personas.
 */
export interface MotivoFrecuente {
  clave: ClaveBloqueo;
  /** Cuántos docentes tienen este motivo. */
  cantidad: number;
  /** «con la vinculación vencida». Va después del número. */
  etiqueta: string;
}

export interface BloqueoTotal {
  /** «Ningún docente del área «X» se puede asignar a este grupo.» */
  titulo: string;
  /** Qué hacer: «Revise la vinculación de los docentes en el RUND o habilite docentes del área.» */
  accion: string;
  /** Motivos más frecuentes, de mayor a menor conteo. */
  motivosFrecuentes: MotivoFrecuente[];
  /** «3 con la vinculación vencida, 1 con cruce de horario.» */
  resumen: string;
}

export type ClaveBloqueo =
  | 'VINCULACION_VENCIDA' | 'VINCULACION_NO_INICIA' | 'GRUPO_SIN_PERIODO'
  | 'CRUCE' | 'TOPE' | 'SITUACION' | 'ESCALAFON' | 'AREA' | 'OTRO';

/** Etiqueta (después del número) y acción sugerida, por categoría. El orden fija el desempate. */
const CATEGORIAS: Record<ClaveBloqueo, { etiqueta: string; accion: string | null }> = {
  VINCULACION_VENCIDA: { etiqueta: 'con la vinculación vencida', accion: 'revise la vinculación de los docentes en el RUND' },
  VINCULACION_NO_INICIA: { etiqueta: 'con la vinculación que empieza después del inicio del grupo', accion: 'revise la vinculación de los docentes en el RUND' },
  GRUPO_SIN_PERIODO: { etiqueta: 'sin poder verificar la vinculación porque el grupo no tiene periodo de clases', accion: 'defina el periodo de clases del grupo (inicio y fin del ciclo)' },
  CRUCE: { etiqueta: 'con cruce de horario', accion: 'cambie el horario del grupo o elija otras franjas' },
  TOPE: { etiqueta: 'sin horas disponibles dentro de su tope', accion: 'libere horas del docente o ajuste el plan' },
  SITUACION: { etiqueta: 'con una situación administrativa que no permite asignar carga', accion: 'revise la situación administrativa de los docentes en el RUND' },
  ESCALAFON: { etiqueta: 'sin el escalafón que exige la maestría (Asociado o Titular)', accion: 'elija docentes Asociados o Titulares' },
  AREA: { etiqueta: 'sin núcleo temático del área', accion: null },
  OTRO: { etiqueta: 'con otro bloqueo', accion: null },
};
const ORDEN = Object.keys(CATEGORIAS) as ClaveBloqueo[];

/** Categoría de un motivo. La pantalla y las pruebas usan la misma. */
export function claveDeMotivo(m: Pick<MotivoRechazo, 'tipo' | 'causa'>): ClaveBloqueo {
  switch (m.tipo) {
    case 'VINCULACION':
      return m.causa === 'AUN_NO_INICIA' ? 'VINCULACION_NO_INICIA' : m.causa === 'GRUPO_SIN_PERIODO' ? 'GRUPO_SIN_PERIODO' : 'VINCULACION_VENCIDA';
    case 'CRUCE': case 'TOPE': case 'SITUACION': case 'ESCALAFON': case 'AREA':
      return m.tipo;
    default:
      return 'OTRO';
  }
}

/**
 * La alerta cuando nadie se puede asignar; `null` si no hay candidatos o si alguno es asignable
 * (en ese caso no hay alerta: la lista ya muestra a quién elegir).
 */
export function bloqueoTotal(
  candidatos: ReadonlyArray<{ asignable: boolean; motivos: ReadonlyArray<Pick<MotivoRechazo, 'tipo' | 'causa'>> }>,
  nombreArea: string,
): BloqueoTotal | null {
  if (!candidatos.length || candidatos.some((c) => c.asignable)) return null;

  const cuenta = new Map<ClaveBloqueo, number>();
  for (const c of candidatos) {
    // Un docente cuenta una vez por categoría, aunque la categoría aparezca dos veces en sus motivos.
    for (const clave of new Set(c.motivos.map(claveDeMotivo))) cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
  }
  const motivosFrecuentes: MotivoFrecuente[] = [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1] || ORDEN.indexOf(a[0]) - ORDEN.indexOf(b[0]))
    .map(([clave, cantidad]) => ({ clave, cantidad, etiqueta: CATEGORIAS[clave].etiqueta }));

  // Acciones distintas, de la categoría más frecuente a la menos, máximo tres; siempre se cierra con habilitar docentes.
  const acciones = [...new Set(motivosFrecuentes.map((m) => CATEGORIAS[m.clave].accion).filter((a): a is string => !!a))].slice(0, 3);
  acciones.push('habilite docentes del área');
  const lista = acciones.length === 1 ? acciones[0] : `${acciones.slice(0, -1).join(', ')} o ${acciones[acciones.length - 1]}`;

  return {
    titulo: `Ningún docente del área «${nombreArea}» se puede asignar a este grupo.`,
    accion: `${lista.charAt(0).toUpperCase()}${lista.slice(1)}.`,
    motivosFrecuentes,
    resumen: `${motivosFrecuentes.map((m) => `${m.cantidad} ${m.etiqueta}`).join(', ')}.`,
  };
}
