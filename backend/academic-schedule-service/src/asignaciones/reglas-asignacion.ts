import { seSolapan, type FranjaComparable } from '../horarios/solapamiento.js';

/**
 * Reglas de BLOQUEO DURO para asignar un docente a un grupo — EFDS-1372.
 *
 * ⚠️ EL ERROR AQUÍ ES ASIMÉTRICO. Un rechazo de más se nota porque alguien se
 * queja; una asignación que debía rechazarse no se nota hasta que hay dos clases
 * a la misma hora. Por eso, ante cualquier duda, se rechaza.
 *
 * Todas las comparaciones son por IDENTIFICADOR, nunca por nombre. Comparar
 * texto normalizado es una carrera que se pierde: hoy la tilde de "Sabático",
 * ayer NORTE DE SANTANDER, mañana otra variante. Un no-match silencioso aquí
 * significa permitir lo que debía rechazarse.
 *
 * Aisladas del servicio para poder probarlas sin base.
 */

/** Categorías de escalafón habilitadas para maestrías (RN-12, Art. 77 par. 2). */
export const ESCALAFON_MAESTRIA = ['asociado', 'titular'] as const;

export interface MotivoRechazo {
  regla: string;
  mensaje: string;
}

export interface DocenteParaAsignar {
  /** Identidad estable: auth.personas.id_person. */
  idDocente: string;
  nombre: string;
  escalafon: string | null;
  horasPta: number;
  vinculacionDesde: string | null;
  /** Nulo = vinculación indefinida, no fecha faltante (RN-10). */
  vinculacionHasta: string | null;
  situacionAsignable: boolean;
  situacionMotivo: string | null;
}

export interface GrupoParaAsignar {
  idGrupo: string;
  /** 'pregrado' | 'especializacion' | 'maestria' | … del catálogo. */
  tipoPrograma: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  franjas: FranjaComparable[];
  /** Horas que consumiría esta asignación. */
  horasRequeridas: number;
}

/** Franja ya ocupada por el docente, de cualquier programa o nivel. */
export interface FranjaOcupada extends FranjaComparable {
  idGrupo: string;
}

const normalizarEscalafon = (v: string | null | undefined) =>
  String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/**
 * RN-12 — para programar en Maestrías el docente debe ser Asociado o Titular.
 *
 * Se compara sobre el escalafón, que es un valor cerrado del RUND. Si llega
 * vacío se rechaza: no se puede afirmar que cumpla.
 */
export function cumpleEscalafonParaMaestria(
  tipoPrograma: string | null,
  escalafon: string | null,
): boolean {
  if (normalizarEscalafon(tipoPrograma) !== 'maestria') return true;
  const e = normalizarEscalafon(escalafon);
  if (!e) return false;
  return (ESCALAFON_MAESTRIA as readonly string[]).includes(e);
}

/**
 * RN-10 — el periodo del grupo debe caber dentro de la vinculación del docente.
 *
 * `vinculacionHasta` nulo significa INDEFINIDA (104 de los 263 docentes), o sea
 * sin límite superior. Tratarlo como fecha faltante rechazaría a casi la mitad
 * de la planta.
 *
 * Un grupo SIN periodo definido no se puede validar: se rechaza, porque no hay
 * forma de afirmar que cae dentro del rango.
 */
export function periodoDentroDeVinculacion(
  grupo: Pick<GrupoParaAsignar, 'fechaInicio' | 'fechaFin'>,
  docente: Pick<DocenteParaAsignar, 'vinculacionDesde' | 'vinculacionHasta'>,
): { cumple: boolean; motivo: string | null } {
  if (!grupo.fechaInicio || !grupo.fechaFin) {
    return {
      cumple: false,
      motivo: 'El grupo no tiene definido su periodo de clases, así que no se puede '
        + 'verificar que caiga dentro de la vinculación del docente',
    };
  }
  if (docente.vinculacionDesde && grupo.fechaInicio < docente.vinculacionDesde) {
    return {
      cumple: false,
      motivo: `El grupo inicia el ${grupo.fechaInicio}, antes de la vinculación del `
        + `docente (${docente.vinculacionDesde})`,
    };
  }
  // Nulo = indefinida: no hay límite que exceder.
  if (docente.vinculacionHasta && grupo.fechaFin > docente.vinculacionHasta) {
    return {
      cumple: false,
      motivo: `El grupo termina el ${grupo.fechaFin}, después del fin de vinculación `
        + `del docente (${docente.vinculacionHasta})`,
    };
  }
  return { cumple: true, motivo: null };
}

/**
 * RN-07 — cruce de franjas TRANSVERSAL, en cualquier programa o nivel.
 *
 * Atraviesa la segregación de RN-08 a propósito: el programador de pregrado no
 * ve qué asignatura de posgrado ocupa la franja, pero sí ve que está ocupada.
 * Por eso el resultado NO revela el grupo ajeno, solo el día y la hora.
 */
export function buscarCruceTransversal(
  franjasDelGrupo: FranjaComparable[],
  franjasOcupadas: FranjaOcupada[],
  idGrupoActual: string,
): FranjaOcupada | null {
  for (const propuesta of franjasDelGrupo) {
    for (const ocupada of franjasOcupadas) {
      // El propio grupo no cuenta: reasignar el mismo docente al mismo grupo no
      // es un cruce consigo mismo.
      if (ocupada.idGrupo === idGrupoActual) continue;
      if (ocupada.diaSemana !== propuesta.diaSemana) continue;
      if (seSolapan(propuesta.horaInicio, propuesta.horaFin, ocupada.horaInicio, ocupada.horaFin)) {
        return ocupada;
      }
    }
  }
  return null;
}

/**
 * Evalúa TODAS las reglas y devuelve los motivos de rechazo.
 *
 * Se devuelven todos y no solo el primero: si un docente falla por escalafón y
 * además por horas, decirlo de a uno obliga a reintentar para descubrir el
 * siguiente. Es bloqueo duro, no advertencia: con un solo motivo no se guarda.
 */
export function evaluarAsignacion(
  docente: DocenteParaAsignar,
  grupo: GrupoParaAsignar,
  franjasOcupadas: FranjaOcupada[],
  horasYaConsumidas: number,
): MotivoRechazo[] {
  const motivos: MotivoRechazo[] = [];

  // Situación administrativa (criterio confirmado). Ya viene evaluada por el
  // clasificador del contrato, que es fail-closed.
  if (!docente.situacionAsignable) {
    motivos.push({
      regla: 'situacion_administrativa',
      mensaje: docente.situacionMotivo
        ?? 'La situación administrativa del docente no permite asignarle carga',
    });
  }

  if (!cumpleEscalafonParaMaestria(grupo.tipoPrograma, docente.escalafon)) {
    motivos.push({
      regla: 'RN-12',
      mensaje: 'Para programar en Maestrías el docente debe ser Asociado o Titular '
        + `(escalafón actual: ${docente.escalafon || 'sin registrar'})`,
    });
  }

  const periodo = periodoDentroDeVinculacion(grupo, docente);
  if (!periodo.cumple) {
    motivos.push({ regla: 'RN-10', mensaje: periodo.motivo! });
  }

  const cruce = buscarCruceTransversal(grupo.franjas, franjasOcupadas, grupo.idGrupo);
  if (cruce) {
    // No se revela qué asignatura ni qué programa ocupa la franja (RN-07/AC-02):
    // es confidencialidad entre decanaturas, no un detalle de presentación.
    motivos.push({
      regla: 'RN-07',
      mensaje: `El docente ya tiene una franja ocupada el ${cruce.diaSemana.toLowerCase()} `
        + `de ${String(cruce.horaInicio).slice(0, 5)} a ${String(cruce.horaFin).slice(0, 5)}`,
    });
  }

  const total = horasYaConsumidas + grupo.horasRequeridas;
  if (docente.horasPta > 0 && total > docente.horasPta) {
    motivos.push({
      regla: 'RN-04/RN-05',
      mensaje: `La asignación supera el tope del docente: ${total} h sobre un máximo de `
        + `${docente.horasPta} h (ya tiene ${horasYaConsumidas} h asignadas)`,
    });
  }

  return motivos;
}
