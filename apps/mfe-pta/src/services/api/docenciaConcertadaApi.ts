import { apiClient } from '../../../../shell/src/services/api';

export type RegimenDocencia = 'actual' | 'programacion';

export interface DocenciaAprobada {
  /** Asignaturas ya aprobadas en la concertación, tal como entrarán al PTA (origen 'programacion'). */
  asignaturas: any[];
  horas: number;
  /** PTA del docente en ese periodo, si ya existe (para no crear otro). */
  ptaVigente: { id: string; estado: string } | null;
}

/**
 * Docencia ya aprobada del usuario autenticado en el periodo. Para el formulario de un PTA NUEVO: la
 * decisión se aplica al guardar, pero el docente la ve desde el principio. Un error devuelve vacío.
 */
export async function getDocenciaAprobada(periodo: string): Promise<DocenciaAprobada> {
  try {
    const raw = await apiClient.get<any>(
      '/pta/api/v1/contrato-programacion/v1/docencia/aprobada',
      { periodo },
      { cache: 'no-store', skipErrorToast: true, retries: 0 },
    );
    const data = raw?.data ?? raw;
    return {
      asignaturas: Array.isArray(data?.asignaturas) ? data.asignaturas : [],
      horas: Number(data?.horas || 0),
      ptaVigente: data?.ptaVigente ?? null,
    };
  } catch {
    return { asignaturas: [], horas: 0, ptaVigente: null };
  }
}

/** El PTA decide el régimen por periodo o por id; un error nunca habilita edición manual. */
export async function getRegimenDocencia(consulta: { ptaId: string } | { periodo: string }): Promise<RegimenDocencia> {
  const raw = await apiClient.get<any>(
    '/pta/api/v1/contrato-programacion/v1/docencia/regimen',
    consulta,
    { cache: 'no-store', skipErrorToast: true, retries: 0 },
  );
  const data = raw?.data ?? raw;
  if (raw?.success === false || (data?.regimen !== 'actual' && data?.regimen !== 'programacion')) {
    throw new Error('El PTA no devolvió un régimen de docencia válido.');
  }
  return data.regimen;
}
