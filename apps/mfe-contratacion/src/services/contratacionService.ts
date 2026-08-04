import { apiClient } from './api/apiClient';

export interface HiringStatusResponse {
  status: string;
  module: string;
  message: string;
  timestamp: string;
}

const SERVICE_PREFIX = '/hiring/api/v1';

export const contratacionService = {
  async getStatus(): Promise<HiringStatusResponse> {
    try {
      const data = await apiClient.get<HiringStatusResponse>(`${SERVICE_PREFIX}/status`);
      if (data) {
        return data;
      }
    } catch (e) {
      console.warn('Backend hiring-service offline, utilizando fallback local', e);
    }

    return {
      status: 'OK',
      module: 'hiring-service',
      message: 'Módulo de Contratación (Base Inicial MFE)',
      timestamp: new Date().toISOString(),
    };
  },
};
