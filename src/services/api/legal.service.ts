import { ApiClient } from './apiClient';
import { API_MODE, MICROSERVICE_URLS } from '../../config/environment';

// Dedicated client for Legal Management Service to ensure direct connection if needed
// or we can reuse the logic if we align endpoints. 
// Given the backend is at /api/legal/expedientes and strictly on port 3008:
const BASE_URL = API_MODE === 'direct' ? MICROSERVICE_URLS.legal : 'http://localhost:3008';
const LEGAL_SERVICE_PREFIX = '/api';

export const legalApiClient = new ApiClient(BASE_URL);

export interface Expediente {
    id: string;
    radicado: string;
    jurisdiccion: string;
    tipoProceso: string;
    demandante: string;
    demandado: string;
    estado: string;
    fechaRadicacion: string;
    cuantia: number;
    abogadoSustanciador?: string;
    fechaPrescripcion?: string;
    riesgoPrescripcion?: boolean;
    terminoProcesalDias?: number;
    ultimaActuacion?: string;
    ubicacionFisica?: string;
    sancionProyectada?: string;
    etapaProcesal?: string;
    medioControl?: string;
    juzgadoConocimiento?: string;
    pretensionDemandante?: string;
    actoAdministrativoDemandado?: string;
    fechaNotificacion?: string;
    fechaAdmision?: string;
    fechaVencimientoTermino?: string;
    tipoIdDemandante?: string;
    numeroIdDemandante?: string;
    tipoIdDemandado?: string;
    numeroIdDemandado?: string;
    documentosInicialesUrls?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Actuacion {
    id: string;
    expedienteId: string;
    fechaActuacion: string;
    descripcion: string;
    tipoActuacion: string;
    createdAt: string;
    updatedAt: string;
}

export class LegalService {
    async getExpedientes(filtros?: { estado?: string; jurisdiccion?: string; search?: string }): Promise<Expediente[]> {
        // The original getExpedientes method is kept as it correctly uses legalApiClient and has a defined return type.
        // The provided snippet's getExpedientes was problematic (redefinition, `apiClient`, `this.path`).
        return legalApiClient.get<Expediente[]>('/api/legal/expedientes', filtros);
    }

    async getJuzgamientoProcesos(): Promise<any[]> {
        return legalApiClient.get<any[]>('/api/legal/juzgamiento');
    }

    async uploadJuzgamientoDocumento(radicado: string, file: File, tipo: string = 'DOCUMENTO', descripcion?: string): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', tipo);
        if (descripcion) formData.append('descripcion', descripcion);

        return legalApiClient.upload<any>(`/api/legal/juzgamiento/${radicado}/documentos`, formData);
    }

    // Renaming getExpedienteById to getExpediente as per instruction, and adapting the signature
    async getExpediente(id: string): Promise<Expediente> {
        return legalApiClient.get<Expediente>(`/api/legal/expedientes/${id}`);
    }

    async crearExpediente(data: Partial<Expediente>): Promise<Expediente> {
        return legalApiClient.post<Expediente>('/api/legal/expedientes', data);
    }

    async updateExpediente(id: string, data: Partial<Expediente>): Promise<Expediente> {
        return legalApiClient.put<Expediente>(`/api/legal/expedientes/${id}`, data);
    }

    // Actuaciones
    async getActuaciones(expedienteId: string): Promise<Actuacion[]> {
        return legalApiClient.get<Actuacion[]>(`/api/legal/expedientes/${expedienteId}/actuaciones`);
    }

    async registrarActuacion(expedienteId: string, data: any): Promise<Actuacion> {
        if (data instanceof FormData) {
            return legalApiClient.upload<Actuacion>(`/api/legal/expedientes/${expedienteId}/actuaciones`, data);
        }
        return legalApiClient.post<Actuacion>(`/api/legal/expedientes/${expedienteId}/actuaciones`, data);
    }

    // Abogados
    async getAbogadosDashboard(): Promise<any[]> {
        return legalApiClient.get<any[]>('/api/legal/abogados');
    }

    async getStatsGeneral(): Promise<any> {
        return legalApiClient.get<any>('/api/legal/stats/general');
    }

    async createAbogado(data: any): Promise<any> {
        return legalApiClient.post<any>('/api/legal/abogados', data);
    }

    // Audiencias
    async getAudiencias(filtros?: { start?: string; end?: string }): Promise<any[]> {
        return legalApiClient.get<any[]>('/api/legal/audiencias', filtros);
    }

    async getAudienciasDashboard(): Promise<any> {
        return legalApiClient.get<any>('/api/legal/audiencias/dashboard');
    }

    async createAudiencia(data: any): Promise<any> {
        return legalApiClient.post<any>('/api/legal/audiencias', data);
    }

    // Autos
    async getAutos(radicado: string): Promise<any[]> {
        return legalApiClient.get<any[]>(`/api/legal/autos/expediente/${radicado}`);
    }

    async createAuto(radicado: string, data: any, file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', data.tipo);
        formData.append('numero', data.numero);
        formData.append('fechaAuto', data.fechaAuto);
        formData.append('juzgado', data.juzgado);
        formData.append('resumen', data.resumen);

        return legalApiClient.upload<any>(`/api/legal/autos/${radicado}`, formData);
    }

    async updateAutoEstado(id: string, estado: string): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/autos/${id}/estado`, { estado });
    }

    async deleteAuto(id: string): Promise<any> {
        return legalApiClient.delete<any>(`/api/legal/autos/${id}`);
    }

    getAutosDownloadUrl(radicado: string): string {
        const baseUrl = API_MODE === 'direct' ? MICROSERVICE_URLS.legal : 'http://localhost:3008';
        return `${baseUrl}/api/legal/autos/download-all/${radicado}`;
    }

    // Documentos
    async getDocumentos(expedienteId: string): Promise<Documento[]> {
        return legalApiClient.get<Documento[]>(`/api/legal/documentos/expediente/${expedienteId}`);
    }

    async getDocumento(id: string): Promise<Documento> {
        return legalApiClient.get<Documento>(`/api/legal/documentos/${id}`);
    }

    async crearDocumento(data: CreateDocumentoData | FormData): Promise<Documento> {
        if (data instanceof FormData) {
            return legalApiClient.upload<Documento>('/api/legal/documentos', data);
        }
        return legalApiClient.post<Documento>('/api/legal/documentos', data);
    }

    async actualizarDocumento(id: string, data: Partial<Documento>): Promise<Documento> {
        return legalApiClient.put<Documento>(`/api/legal/documentos/${id}`, data);
    }

    async eliminarDocumento(id: string): Promise<void> {
        return legalApiClient.delete(`/api/legal/documentos/${id}`);
    }

    // ==================== EVIDENCIAS ====================
    async getEvidencias(expedienteId: string): Promise<any[]> {
        return legalApiClient.get<any[]>(`/api/legal/evidencias/expediente/${expedienteId}`);
    }

    async createEvidencia(expedienteId: string, formData: FormData): Promise<any> {
        return legalApiClient.upload<any>(`/api/legal/evidencias/${expedienteId}`, formData);
    }

    async updateEvidenciaEstado(id: string, estado: string): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/evidencias/${id}/estado`, { estado });
    }

    async deleteEvidencia(id: string): Promise<void> {
        return legalApiClient.delete(`/api/legal/evidencias/${id}`);
    }

    // ==================== ACTAS ====================
    async getActas(expedienteId: string): Promise<any[]> {
        return legalApiClient.get<any[]>(`/api/legal/actas/expediente/${expedienteId}`);
    }

    async createActa(expedienteId: string, formData: FormData): Promise<any> {
        return legalApiClient.upload<any>(`/api/legal/actas/${expedienteId}`, formData);
    }

    async updateActaEstado(id: string, estado: string): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/actas/${id}/estado`, { estado });
    }

    async deleteActa(id: string): Promise<void> {
        return legalApiClient.delete(`/api/legal/actas/${id}`);
    }

    // ===== CONSULTAS JURÍDICAS (Asesoría Jurídica) =====
    async getConsultasJuridicas(): Promise<any[]> {
        return legalApiClient.get<any[]>('/api/legal/consultas-juridicas');
    }

    async getConsultaJuridica(id: string): Promise<any> {
        return legalApiClient.get<any>(`/api/legal/consultas-juridicas/${id}`);
    }

    async createConsultaJuridica(data: any): Promise<any> {
        return legalApiClient.post<any>('/api/legal/consultas-juridicas', data);
    }

    async updateConsultaJuridica(id: string, data: any): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/consultas-juridicas/${id}`, data);
    }

    async updateConsultaEstado(id: string, estado: string): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/consultas-juridicas/${id}/estado`, { estado });
    }

    async responderConsulta(id: string, respuestaData: any): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/consultas-juridicas/${id}/respuesta`, respuestaData);
    }

    async deleteConsultaJuridica(id: string): Promise<void> {
        return legalApiClient.delete(`/api/legal/consultas-juridicas/${id}`);
    }

    // --- CONTROL DE TÉRMINOS E INFORMES ---

    async getTerminosListado(responsableId?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (responsableId) params.append('responsableId', responsableId);

        // Endpoint: /legal-management/api/v1/legal/terminos/listado
        return legalApiClient.get(`${LEGAL_SERVICE_PREFIX}/legal/terminos/listado?${params.toString()}`);
    }

    async getTerminosCalendario(start: string, end: string, responsableId?: string): Promise<any[]> {
        const params = new URLSearchParams({ start, end });
        if (responsableId) params.append('responsableId', responsableId);

        return legalApiClient.get(`${LEGAL_SERVICE_PREFIX}/legal/terminos/calendario?${params.toString()}`);
    }

    async createTerminoManual(data: any): Promise<any> {
        return legalApiClient.post(`${LEGAL_SERVICE_PREFIX}/legal/terminos/manual`, data);
    }

    async sincronizarTerminos(): Promise<any> {
        return legalApiClient.post(`${LEGAL_SERVICE_PREFIX}/legal/terminos/sincronizar`, {});
    }

    async getTerminoDetalle(id: string): Promise<any> {
        return legalApiClient.get(`${LEGAL_SERVICE_PREFIX}/legal/terminos/${id}`);
    }

    // ============================================
    // ÓRGANOS DE CONTROL
    // ============================================

    // Catálogo de organismos
    async getOrganismosControl(): Promise<any[]> {
        return legalApiClient.get<any[]>('/api/legal/requerimientos-oc/organismos');
    }

    // Requerimientos OC
    async getRequerimientosOC(): Promise<any[]> {
        return legalApiClient.get<any[]>('/api/legal/requerimientos-oc');
    }

    async getRequerimientoOC(id: string): Promise<any> {
        return legalApiClient.get<any>(`/api/legal/requerimientos-oc/${id}`);
    }

    async createRequerimientoOC(data: any): Promise<any> {
        return legalApiClient.post<any>('/api/legal/requerimientos-oc', data);
    }

    async updateRequerimientoOC(id: string, data: any): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/requerimientos-oc/${id}`, data);
    }

    async cambiarEstadoRequerimientoOC(id: string, estado: string): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/requerimientos-oc/${id}/estado`, { estado });
    }

    async deleteRequerimientoOC(id: string): Promise<void> {
        return legalApiClient.delete(`/api/legal/requerimientos-oc/${id}`);
    }

    // Solicitudes de Insumos (Delegación)
    async getSolicitudesInsumo(requerimientoId: string): Promise<any[]> {
        return legalApiClient.get<any[]>(`/api/legal/requerimientos-oc/${requerimientoId}/insumos`);
    }

    async createSolicitudInsumo(requerimientoId: string, data: any): Promise<any> {
        return legalApiClient.post<any>(`/api/legal/requerimientos-oc/${requerimientoId}/insumos`, data);
    }

    async responderSolicitudInsumo(insumoId: string, data: any): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/requerimientos-oc/insumos/${insumoId}/responder`, data);
    }

    // --- TAREAS DE EXPEDIENTE ---

    async getTareasByExpediente(expedienteId: string): Promise<any[]> {
        return legalApiClient.get<any[]>(`/api/legal/expedientes/${expedienteId}/tareas`);
    }

    async createTarea(expedienteId: string, data: any): Promise<any> {
        return legalApiClient.post<any>(`/api/legal/expedientes/${expedienteId}/tareas`, data);
    }

    async updateTarea(tareaId: string, data: any): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/expedientes/tareas/${tareaId}`, data);
    }

    async deleteTarea(tareaId: string): Promise<void> {
        return legalApiClient.delete(`/api/legal/expedientes/tareas/${tareaId}`);
    }

    // --- NOTAS DE EXPEDIENTE ---

    async getNotasByExpediente(expedienteId: string): Promise<any[]> {
        return legalApiClient.get<any[]>(`/api/legal/expedientes/${expedienteId}/notas`);
    }

    async createNota(expedienteId: string, data: any): Promise<any> {
        return legalApiClient.post<any>(`/api/legal/expedientes/${expedienteId}/notas`, data);
    }

    async updateNota(notaId: string, data: any): Promise<any> {
        return legalApiClient.patch<any>(`/api/legal/expedientes/notas/${notaId}`, data);
    }

    async deleteNota(notaId: string): Promise<void> {
        return legalApiClient.delete(`/api/legal/expedientes/notas/${notaId}`);
    }
}

// Documento interface for frontend
export interface Documento {
    id: string;
    expedienteId: string;
    nombre: string;
    tipo: string;
    descripcion?: string;
    archivoUrl?: string;
    archivoNombreOriginal?: string;
    archivoTamano?: number;
    archivoMimeType?: string;
    fechaDocumento?: string;
    numeroFolios?: number;
    confidencial?: boolean;
    subidoPor?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateDocumentoData {
    expedienteId: string;
    nombre: string;
    tipo: string;
    descripcion?: string;
    archivoUrl?: string;
    archivoNombreOriginal?: string;
    archivoTamano?: number;
    archivoMimeType?: string;
    fechaDocumento?: string;
    numeroFolios?: number;
    confidencial?: boolean;
    subidoPor?: string;
}

// ==================== OC Comments and Documents API ====================

export interface ComentarioOC {
    id: string;
    requerimientoId: string;
    contenido: string;
    tipo: string;
    autorNombre?: string;
    createdAt: string;
}

export interface DocumentoOC {
    id: string;
    requerimientoId: string;
    nombre: string;
    tipoDocumento: string;
    descripcion?: string;
    archivoUrl?: string;
    subidoPor?: string;
    createdAt: string;
}

class OCService {
    // Comentarios
    async getComentariosByRequerimiento(requerimientoId: string): Promise<ComentarioOC[]> {
        return legalApiClient.get<ComentarioOC[]>(`/api/legal/requerimientos-oc/${requerimientoId}/comentarios`);
    }

    async createComentario(requerimientoId: string, data: { contenido: string; tipo?: string; autorNombre?: string }): Promise<ComentarioOC> {
        return legalApiClient.post<ComentarioOC>(`/api/legal/requerimientos-oc/${requerimientoId}/comentarios`, data);
    }

    async deleteComentario(comentarioId: string): Promise<void> {
        await legalApiClient.delete(`/api/legal/requerimientos-oc/comentarios/${comentarioId}`);
    }

    // Documentos
    async getDocumentosByRequerimiento(requerimientoId: string): Promise<DocumentoOC[]> {
        return legalApiClient.get<DocumentoOC[]>(`/api/legal/requerimientos-oc/${requerimientoId}/documentos`);
    }

    async createDocumento(requerimientoId: string, data: { nombre: string; tipoDocumento?: string; descripcion?: string; archivo?: File; subidoPor?: string }): Promise<DocumentoOC> {
        const formData = new FormData();
        formData.append('nombre', data.nombre);
        formData.append('tipoDocumento', data.tipoDocumento || 'otro');
        if (data.descripcion) formData.append('descripcion', data.descripcion);
        if (data.subidoPor) formData.append('subidoPor', data.subidoPor);
        if (data.archivo) formData.append('archivo', data.archivo);

        return legalApiClient.upload<DocumentoOC>(`/api/legal/requerimientos-oc/${requerimientoId}/documentos`, formData);
    }

    async deleteDocumento(documentoId: string): Promise<void> {
        await legalApiClient.delete(`/api/legal/requerimientos-oc/documentos/${documentoId}`);
    }
}

export const legalService = new LegalService();
export const ocService = new OCService();

