import { apiClient } from './apiClient';
import { getApiGatewayBaseUrl } from '../../../config/environment';

/**
 * EFDS-1309 — Cliente de la legalización (Etapa 9) en travel-expenses-service.
 * Rutas bajo /viaticos/api/v1/legalizaciones (el gateway quita /viaticos/api/v1).
 */
const BASE = '/viaticos/api/v1/legalizaciones';

export type SemaforoLegalizacion = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | 'ENVIADA';

export interface ResumenLegalizacion {
  legalizacionId: string;
  solicitudId: string;
  consecutivoUnico: string;
  estadoSolicitud: string;
  comisionadoNombre: string;
  destino: string;
  fechaInicio: string;
  fechaFin: string;
  modalidadPago: string;
  plazoDiasHabiles: number;
  fechaLimite: string;
  diasHabilesRestantes: number;
  calendarioIncompleto: boolean;
  fechaEnvio: string | null;
  semaforo: SemaforoLegalizacion;
  obligatoriosPendientes?: number;
  checklistCompleto?: boolean;
}

export interface SoporteCargado {
  id: string;
  nombreArchivoOriginal: string;
  tamanoBytes: number;
  creadoEn: string;
}

export interface ItemChecklistLegalizacion {
  tipoDocumentoSoporteId: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipoRequisito: 'OBLIGATORIO' | 'OPCIONAL';
  condicion: string | null;
  soportes: SoporteCargado[];
  cumplido: boolean;
}

export interface DetalleLegalizacion extends ResumenLegalizacion {
  puedeEditar: boolean;
  checklist: {
    items: ItemChecklistLegalizacion[];
    sinConfiguracion: boolean;
    obligatoriosPendientes: number;
    completo: boolean;
  };
}

class LegalizacionService {
  listarMias(): Promise<ResumenLegalizacion[]> {
    return apiClient.get<ResumenLegalizacion[]>(`${BASE}/mis`);
  }

  detalle(solicitudId: string): Promise<DetalleLegalizacion> {
    return apiClient.get<DetalleLegalizacion>(`${BASE}/${solicitudId}`);
  }

  subirSoporte(solicitudId: string, tipoDocumentoSoporteId: string, archivo: File): Promise<SoporteCargado> {
    const form = new FormData();
    form.append('tipoDocumentoSoporteId', tipoDocumentoSoporteId);
    form.append('archivo', archivo);
    return apiClient.upload<SoporteCargado>(`${BASE}/${solicitudId}/soportes`, form);
  }

  eliminarSoporte(solicitudId: string, soporteId: string): Promise<{ eliminado: boolean }> {
    return apiClient.delete(`${BASE}/${solicitudId}/soportes/${soporteId}`);
  }

  enviar(solicitudId: string): Promise<{ legalizacionId: string; fechaEnvio: string; totalSoportes: number }> {
    return apiClient.post(`${BASE}/${solicitudId}/enviar`, {});
  }

  /**
   * El soporte se pide con Accept: application/pdf: es lo que le indica al
   * gateway que la respuesta es binaria y no debe tratarla como JSON.
   */
  async abrirSoporte(solicitudId: string, soporteId: string): Promise<string> {
    const res = await fetch(`${getApiGatewayBaseUrl()}${BASE}/${solicitudId}/soportes/${soporteId}/archivo`, {
      credentials: 'include',
      headers: { Accept: 'application/pdf' },
    });
    if (!res.ok) throw new Error(`No fue posible abrir el soporte (${res.status}).`);
    return URL.createObjectURL(await res.blob());
  }
}

export const legalizacionService = new LegalizacionService();
