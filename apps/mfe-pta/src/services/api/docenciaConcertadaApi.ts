import { apiClient } from '../../../../shell/src/services/api';

export type RegimenDocencia = 'actual' | 'programacion';

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
