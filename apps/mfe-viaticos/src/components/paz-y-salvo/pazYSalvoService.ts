import { apiClient } from '../../services/api/apiClient';
import { getApiGatewayBaseUrl } from '../../../config/environment';

const BASE = '/viaticos/api/v1/paz-y-salvos';
export interface Persona { id: string; nombre: string; documento: string }
export interface Pendiente { id: string; codigo: string; estado: string; fechaLimite: string | null }
export interface Documento {
  id: string;
  creado_en: string;
  firmado_en: string | null;
  solicitado_por_id: string;
  contenido: { coordinadoraNombre: string; nombre: string; documento: string };
}
export interface Consulta { pendiente: boolean; comisiones: Pendiente[]; documentos: Documento[] }
export interface Evento { id: number; accion: string; usuario_id: string; creado_en: string }
export const pazYSalvoService = {
  buscar: (q: string) => apiClient.get<Persona[]>(`${BASE}/personas?q=${encodeURIComponent(q)}`),
  consultar: (id: string) => apiClient.get<Consulta>(`${BASE}/personas/${id}`),
  solicitar: (comisionadoId: string) => apiClient.post<Documento>(BASE, { comisionadoId }),
  otp: (id: string) => apiClient.post<{ email: string }>(`${BASE}/${id}/otp`, {}),
  firmar: (id: string, code: string) => apiClient.post<Documento>(`${BASE}/${id}/firmar`, { code }),
  detalle: (id: string) => apiClient.get<Documento & { eventos: Evento[] }>(`${BASE}/${id}`),
  async descargar(id: string) {
    const response = await fetch(`${getApiGatewayBaseUrl()}${BASE}/${id}/archivo`, {
      credentials: 'include', headers: { Accept: 'application/pdf' },
    });
    if (!response.ok) throw new Error('No fue posible descargar el paz y salvo');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `paz-y-salvo-${id}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
