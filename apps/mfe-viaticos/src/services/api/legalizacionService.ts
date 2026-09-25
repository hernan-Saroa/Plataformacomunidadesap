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
  // EFDS-1310
  devuelta?: boolean;
  devueltaEn?: string | null;
  observacionDevolucion?: string | null;
  numeroDevoluciones?: number;
  revisionAprobadaEn?: string | null;
  cerradaEn?: string | null;
  numeroRegistroSiif?: string | null;
  fechaRegistroSiif?: string | null;
  valorPagado?: string | number | null;
  valorLegalizado?: string | number | null;
  valorReintegro?: string | number | null;
}

export interface SoporteCargado {
  id: string;
  nombreArchivoOriginal: string;
  tamanoBytes: number;
  creadoEn: string;
  revision?: 'APROBADO' | 'RECHAZADO' | null;
  observacionRevision?: string | null;
}

export type FiltroBandejaRevision = 'POR_REVISAR' | 'DEVUELTAS' | 'CERRADAS';

export interface ItemBandejaRevision {
  legalizacionId: string;
  solicitudId: string;
  consecutivoUnico: string;
  estadoSolicitud: string;
  comisionadoNombre: string;
  destino: string;
  fechaInicio: string;
  fechaFin: string;
  valorPagado: number | null;
  fechaEnvio: string | null;
  fechaLimite: string;
  enviadaFueraDePlazo: boolean | null;
  numeroDevoluciones: number;
  devueltaEn: string | null;
  revisionAprobadaEn: string | null;
  siifExportadoEn: string | null;
  cerradaEn: string | null;
  numeroRegistroSiif: string | null;
  valorReintegro: number | null;
  soportes: number;
  sinRevisar: number;
  rechazados: number;
}

export interface EntradaHistorialRevision {
  id: string;
  accion: string;
  observacion: string | null;
  detalle: Record<string, unknown> | null;
  usuarioId: string;
  soporteId: string | null;
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

export interface DetalleRevision extends DetalleLegalizacion {
  numeroObligacion: string | null;
  codigoRp: string | null;
  fechaPago: string | null;
  diasComision: string | null;
  siifExportadoEn: string | null;
  enRevision: boolean;
  puedeRevisar: boolean;
  puedeAprobar: boolean;
  puedeRegistrarSiif: boolean;
  historialRevision: EntradaHistorialRevision[];
}

export interface RegistroSiifPayload {
  numeroRegistroSiif: string;
  fechaRegistroSiif: string;
  valorLegalizado: number;
  diasReales?: number | null;
  observaciones?: string;
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

  // --- EFDS-1310: revisión del analista ---

  bandejaRevision(filtro: FiltroBandejaRevision): Promise<ItemBandejaRevision[]> {
    return apiClient.get<ItemBandejaRevision[]>(`${BASE}/revision/bandeja?filtro=${filtro}`);
  }

  detalleRevision(solicitudId: string): Promise<DetalleRevision> {
    return apiClient.get<DetalleRevision>(`${BASE}/revision/${solicitudId}`);
  }

  revisarSoporte(solicitudId: string, soporteId: string, decision: 'APROBADO' | 'RECHAZADO', observacion?: string) {
    return apiClient.patch(`${BASE}/revision/${solicitudId}/soportes/${soporteId}`, { decision, observacion });
  }

  devolver(solicitudId: string, observacion: string) {
    return apiClient.post(`${BASE}/revision/${solicitudId}/devolver`, { observacion });
  }

  aprobarRevision(solicitudId: string) {
    return apiClient.post(`${BASE}/revision/${solicitudId}/aprobar`, {});
  }

  /** Descarga el CSV para SIIF y devuelve el nombre sugerido y un object URL. */
  async exportarSiif(solicitudId: string): Promise<{ nombre: string; url: string }> {
    const res = await fetch(`${getApiGatewayBaseUrl()}${BASE}/revision/${solicitudId}/siif-export`, {
      credentials: 'include',
      headers: { Accept: 'text/csv' },
    });
    if (!res.ok) {
      let msg = `No fue posible exportar a SIIF (${res.status}).`;
      try {
        msg = (await res.json())?.message || msg;
      } catch {
        /* respuesta sin JSON */
      }
      throw new Error(msg);
    }
    const disp = res.headers.get('content-disposition') || '';
    const nombre = /filename="?([^";]+)"?/.exec(disp)?.[1] || 'SIIF_LEGALIZACION.csv';
    return { nombre, url: URL.createObjectURL(await res.blob()) };
  }

  registrarSiif(solicitudId: string, payload: RegistroSiifPayload) {
    return apiClient.post<{ estadoSolicitud: string; valorReintegro: number; numeroRegistroSiif: string }>(
      `${BASE}/revision/${solicitudId}/registrar-siif`,
      payload,
    );
  }
}

export const legalizacionService = new LegalizacionService();
