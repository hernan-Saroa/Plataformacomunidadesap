import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../../config/environment';

export const expedienteConfigService = {
    async recalcularPlazosPorTipoProceso(tipoProceso: string, deltaDias: number): Promise<{ updated: number }> {
        return apiClient.post<{ updated: number }>(API_ENDPOINTS.LEGAL.RECALCULAR_PLAZOS, { tipoProceso, deltaDias });
    },

    async renombrarTipoProceso(nombreAnterior: string, nombreNuevo: string): Promise<{ updated: number }> {
        return apiClient.post<{ updated: number }>(API_ENDPOINTS.LEGAL.RENOMBRAR_TIPO_PROCESO, { nombreAnterior, nombreNuevo });
    },
};
