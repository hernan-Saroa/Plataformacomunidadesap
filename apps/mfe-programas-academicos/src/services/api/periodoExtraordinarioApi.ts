import { apiClient } from './apiClient';

export const PERMISO_ACTIVAR_EXTRAORDINARIO = 'pta.periodos.activar_extraordinario';

export function activarPeriodoExtraordinario(id: string, motivo: string): Promise<unknown> {
  return apiClient.post(`/pta/api/v1/periodos-academicos/${encodeURIComponent(id)}/activar-extraordinario`,
    { motivo }, { skipErrorToast: true, retries: 0 });
}
