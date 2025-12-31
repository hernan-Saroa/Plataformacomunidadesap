// import { ApiClient } from './apiClient';
import { apiClient } from './client';
import { API_MODE, MICROSERVICE_URLS } from '../../config/environment';

// Prefijo del servicio legal a través del gateway
// Nueva estructura: /legal/api/v1/legal/...
const SERVICE_PREFIX = '/legal/api/v1/legal';

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
    // Campos de contacto del demandante
    demandanteDireccion?: string;
    demandanteTelefono?: string;
    demandanteEmail?: string;
    demandanteApoderado?: string;
    // Campos de contacto del demandado
    demandadoDireccion?: string;
    demandadoTelefono?: string;
    demandadoEmail?: string;
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
        // The original getExpedientes method is kept as it correctly uses apiClient and has a defined return type.
        // The provided snippet's getExpedientes was problematic (redefinition, `apiClient`, `this.path`).
        return apiClient.get<Expediente[]>(`${SERVICE_PREFIX}/expedientes`, filtros);
    }

    async getJuzgamientoProcesos(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/juzgamiento`);
    }

    async uploadJuzgamientoDocumento(radicado: string, file: File, tipo: string = 'DOCUMENTO', descripcion?: string): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', tipo);
        if (descripcion) formData.append('descripcion', descripcion);

        return apiClient.upload<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/documentos`, formData);
    }

    async getJuzgamientoDecisiones(radicado: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/decisiones`);
    }

    async createJuzgamientoDecision(radicado: string, data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/decisiones`, data);
    }

    async updateJuzgamientoProceso(radicado: string, data: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}`, data);
    }

    // Renaming getExpedienteById to getExpediente as per instruction, and adapting the signature
    async getExpediente(id: string): Promise<Expediente> {
        return apiClient.get<Expediente>(`${SERVICE_PREFIX}/expedientes/${id}`);
    }

    async crearExpediente(data: Partial<Expediente>): Promise<Expediente> {
        return apiClient.post<Expediente>(`${SERVICE_PREFIX}/expedientes`, data);
    }

    async updateExpediente(id: string, data: Partial<Expediente>): Promise<Expediente> {
        return apiClient.put<Expediente>(`${SERVICE_PREFIX}/expedientes/${id}`, data);
    }

    // Actuaciones
    async getActuaciones(expedienteId: string): Promise<Actuacion[]> {
        return apiClient.get<Actuacion[]>(`${SERVICE_PREFIX}/expedientes/${expedienteId}/actuaciones`);
    }

    async registrarActuacion(expedienteId: string, data: any): Promise<Actuacion> {
        if (data instanceof FormData) {
            return apiClient.upload<Actuacion>(`${SERVICE_PREFIX}/expedientes/${expedienteId}/actuaciones`, data);
        }
        return apiClient.post<Actuacion>(`${SERVICE_PREFIX}/expedientes/${expedienteId}/actuaciones`, data);
    }

    // Abogados
    async getAbogadosDashboard(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/abogados`);
    }

    async getStatsGeneral(): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/stats/general`);
    }

    async createAbogado(data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/abogados`, data);
    }

    // Audiencias
    async getAudiencias(filtros?: { start?: string; end?: string }): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/audiencias`, filtros);
    }

    async getAudienciasDashboard(): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/audiencias/dashboard`);
    }

    async createAudiencia(data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/audiencias`, data);
    }

    // Autos
    async getAutos(radicado: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/autos/expediente/${radicado}`);
    }

    async createAuto(radicado: string, data: any, file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', data.tipo);
        formData.append('numero', data.numero);
        formData.append('fechaAuto', data.fechaAuto);
        formData.append('juzgado', data.juzgado);
        formData.append('resumen', data.resumen);

        return apiClient.upload<any>(`${SERVICE_PREFIX}/autos/${radicado}`, formData);
    }

    async updateAutoEstado(id: string, estado: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/autos/${id}/estado`, { estado });
    }

    async deleteAuto(id: string): Promise<any> {
        return apiClient.delete<any>(`${SERVICE_PREFIX}/autos/${id}`);
    }

    getAutosDownloadUrl(radicado: string): string {
        const baseUrl = API_MODE === 'direct' ? MICROSERVICE_URLS.legal : 'http://localhost:3008';
        return `${baseUrl}${SERVICE_PREFIX}${`/autos/expediente/${radicado}/download-zip`}`;
    }

    // Documentos
    async getDocumentos(expedienteId: string): Promise<Documento[]> {
        return apiClient.get<Documento[]>(`${SERVICE_PREFIX}/documentos/expediente/${expedienteId}`);
    }

    async getDocumento(id: string): Promise<Documento> {
        return apiClient.get<Documento>(`${SERVICE_PREFIX}/documentos/${id}`);
    }

    async crearDocumento(data: CreateDocumentoData | FormData): Promise<Documento> {
        if (data instanceof FormData) {
            return apiClient.upload<Documento>(`${SERVICE_PREFIX}/documentos`, data);
        }
        return apiClient.post<Documento>(`${SERVICE_PREFIX}/documentos`, data);
    }

    async actualizarDocumento(id: string, data: Partial<Documento>): Promise<Documento> {
        return apiClient.put<Documento>(`${SERVICE_PREFIX}/documentos/${id}`, data);
    }

    async eliminarDocumento(id: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/documentos/${id}`);
    }

    // ==================== EVIDENCIAS ====================
    async getEvidencias(expedienteId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/evidencias/expediente/${expedienteId}`);
    }

    async createEvidencia(expedienteId: string, formData: FormData): Promise<any> {
        return apiClient.upload<any>(`${SERVICE_PREFIX}/evidencias/${expedienteId}`, formData);
    }

    async updateEvidenciaEstado(id: string, estado: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/evidencias/${id}/estado`, { estado });
    }

    async deleteEvidencia(id: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/evidencias/${id}`);
    }

    // ==================== ACTAS ====================
    async getActas(expedienteId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/actas/expediente/${expedienteId}`);
    }

    async createActa(expedienteId: string, formData: FormData): Promise<any> {
        return apiClient.upload<any>(`${SERVICE_PREFIX}/actas/${expedienteId}`, formData);
    }

    async updateActaEstado(id: string, estado: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/actas/${id}/estado`, { estado });
    }

    async deleteActa(id: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/actas/${id}`);
    }

    async uploadActaFirmada(id: string, formData: FormData): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/actas/${id}/archivo`, formData);
    }

    // ===== CONSULTAS JURÍDICAS (Asesoría Jurídica) =====
    async getConsultasJuridicas(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/consultas-juridicas`);
    }

    async getConsultaJuridica(id: string): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}`);
    }

    async createConsultaJuridica(data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/consultas-juridicas`, data);
    }

    async updateConsultaJuridica(id: string, data: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}`, data);
    }

    async updateConsultaEstado(id: string, estado: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}/estado`, { estado });
    }

    async responderConsulta(id: string, respuestaData: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}/respuesta`, respuestaData);
    }

    async guardarRespuestaConsulta(id: string, respuesta: string, enviar: boolean): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}/gestionar-respuesta`, { respuesta, enviar });
    }

    async getComentariosConsulta(consultaId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/consultas-juridicas/${consultaId}/comentarios`);
    }

    async crearComentarioConsulta(consultaId: string, data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/consultas-juridicas/${consultaId}/comentarios`, data);
    }

    async deleteConsultaJuridica(id: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/consultas-juridicas/${id}`);
    }

    // ===== DOCUMENTOS DE CONSULTAS JURÍDICAS =====
    async getDocumentosConsulta(consultaId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/consultas-juridicas/${consultaId}/documentos`);
    }

    async uploadDocumentoConsulta(consultaId: string, formData: FormData): Promise<any> {
        return apiClient.upload<any>(`${SERVICE_PREFIX}/consultas-juridicas/${consultaId}/documentos`, formData);
    }

    async deleteDocumentoConsulta(documentoId: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/consultas-juridicas/documentos/${documentoId}`);
    }

    getDocumentosConsultaDownloadUrl(consultaId: string): string {
        const baseUrl = API_MODE === 'direct' ? MICROSERVICE_URLS.legal : 'http://localhost:3008';
        return `${baseUrl}${`${SERVICE_PREFIX}/consultas-juridicas/${consultaId}/documentos/download-zip`}`;
    }

    // --- CONTROL DE TÉRMINOS E INFORMES ---

    async getTerminosListado(responsableId?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (responsableId) params.append('responsableId', responsableId);

        // Endpoint: /legal-management/api/v1/legal/terminos/listado
        return apiClient.get(`${SERVICE_PREFIX}/terminos/listado?${params.toString()}`);
    }

    async getTerminosCalendario(start: string, end: string, responsableId?: string): Promise<any[]> {
        const params = new URLSearchParams({ start, end });
        if (responsableId) params.append('responsableId', responsableId);

        return apiClient.get(`${SERVICE_PREFIX}/terminos/calendario?${params.toString()}`);
    }

    async createTerminoManual(data: any): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/terminos/manual`, data);
    }

    async sincronizarTerminos(): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/terminos/sincronizar`, {});
    }

    async getTerminoDetalle(id: string): Promise<any> {
        return apiClient.get(`${SERVICE_PREFIX}/terminos/${id}`);
    }

    // ============================================
    // ÓRGANOS DE CONTROL
    // ============================================

    // Catálogo de organismos
    async getOrganismosControl(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/requerimientos-oc/organismos`);
    }

    // Requerimientos OC
    async getRequerimientosOC(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/requerimientos-oc`);
    }

    async getRequerimientoOC(id: string): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/requerimientos-oc/${id}`);
    }

    async createRequerimientoOC(data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/requerimientos-oc`, data);
    }

    async updateRequerimientoOC(id: string, data: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/requerimientos-oc/${id}`, data);
    }

    async cambiarEstadoRequerimientoOC(id: string, estado: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/requerimientos-oc/${id}/estado`, { estado });
    }

    async deleteRequerimientoOC(id: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/requerimientos-oc/${id}`);
    }

    // Solicitudes de Insumos (Delegación)
    async getSolicitudesInsumo(requerimientoId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/requerimientos-oc/${requerimientoId}/insumos`);
    }

    async createSolicitudInsumo(requerimientoId: string, data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/requerimientos-oc/${requerimientoId}/insumos`, data);
    }

    async responderSolicitudInsumo(insumoId: string, data: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/requerimientos-oc/insumos/${insumoId}/responder`, data);
    }

    // --- TAREAS DE EXPEDIENTE ---

    async getTareasByExpediente(expedienteId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/expedientes/${expedienteId}/tareas`);
    }

    async createTarea(expedienteId: string, data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/expedientes/${expedienteId}/tareas`, data);
    }

    async updateTarea(tareaId: string, data: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/expedientes/tareas/${tareaId}`, data);
    }

    async deleteTarea(tareaId: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/expedientes/tareas/${tareaId}`);
    }

    // --- NOTAS DE EXPEDIENTE ---

    async getNotasByExpediente(expedienteId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/expedientes/${expedienteId}/notas`);
    }

    async createNota(expedienteId: string, data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/expedientes/${expedienteId}/notas`, data);
    }

    async updateNota(notaId: string, data: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/expedientes/notas/${notaId}`, data);
    }

    async deleteNota(notaId: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/expedientes/notas/${notaId}`);
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
        return apiClient.get<ComentarioOC[]>(`${SERVICE_PREFIX}/requerimientos-oc/${requerimientoId}/comentarios`);
    }

    async createComentario(requerimientoId: string, data: { contenido: string; tipo?: string; autorNombre?: string }): Promise<ComentarioOC> {
        return apiClient.post<ComentarioOC>(`${SERVICE_PREFIX}/requerimientos-oc/${requerimientoId}/comentarios`, data);
    }

    async deleteComentario(comentarioId: string): Promise<void> {
        await apiClient.delete(`${SERVICE_PREFIX}/requerimientos-oc/comentarios/${comentarioId}`);
    }

    // Documentos
    async getDocumentosByRequerimiento(requerimientoId: string): Promise<DocumentoOC[]> {
        return apiClient.get<DocumentoOC[]>(`${SERVICE_PREFIX}/requerimientos-oc/${requerimientoId}/documentos`);
    }

    async createDocumento(requerimientoId: string, data: { nombre: string; tipoDocumento?: string; descripcion?: string; archivo?: File; subidoPor?: string }): Promise<DocumentoOC> {
        const formData = new FormData();
        formData.append('nombre', data.nombre);
        formData.append('tipoDocumento', data.tipoDocumento || 'otro');
        if (data.descripcion) formData.append('descripcion', data.descripcion);
        if (data.subidoPor) formData.append('subidoPor', data.subidoPor);
        if (data.archivo) formData.append('archivo', data.archivo);

        return apiClient.upload<DocumentoOC>(`${SERVICE_PREFIX}/requerimientos-oc/${requerimientoId}/documentos`, formData);
    }

    async deleteDocumento(documentoId: string): Promise<void> {
        await apiClient.delete(`${SERVICE_PREFIX}/requerimientos-oc/documentos/${documentoId}`);
    }
}

// ==================== Riesgos API ====================

export interface RiesgoAPI {
    id: string;
    codigo: string;
    nombre: string;
    descripcion: string;
    proceso: string;
    tipoRiesgo: 'GESTION' | 'CORRUPCION' | 'SEGURIDAD_DIGITAL' | 'FISCAL';
    etapa: 'IDENTIFICADO' | 'ANALIZADO' | 'VALORADO' | 'TRATAMIENTO' | 'MONITOREO' | 'CERRADO' | 'MATERIALIZADO';
    probabilidadInherente: number;
    impactoInherente: number;
    zonaInherente: 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO';
    probabilidadResidual: number;
    impactoResidual: number;
    zonaResidual: 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO';
    causas: string[];
    consecuencias: string[];
    controlesExistentes: { id: string; descripcion: string; efectividad: number; }[];
    planTratamiento: { accion: string; responsable: string; fechaLimite: Date; estado: string; avance: number; }[];
    responsable: string;
    estado: 'ACTIVO' | 'ARCHIVADO' | 'CERRADO';
    createdAt: string;
    updatedAt: string;
}

export interface CreateRiesgoData {
    nombre: string;
    descripcion: string;
    proceso: string;
    tipoRiesgo: 'GESTION' | 'CORRUPCION' | 'SEGURIDAD_DIGITAL' | 'FISCAL';
    probabilidadInherente: number;
    impactoInherente: number;
    causas?: string[];
    consecuencias?: string[];
    responsable: string;
}

class RiesgosService {
    async getAll(): Promise<RiesgoAPI[]> {
        return apiClient.get<RiesgoAPI[]>(`${SERVICE_PREFIX}/riesgos`);
    }

    async getById(id: string): Promise<RiesgoAPI> {
        return apiClient.get<RiesgoAPI>(`${SERVICE_PREFIX}/riesgos/${id}`);
    }

    async create(data: CreateRiesgoData): Promise<RiesgoAPI> {
        return apiClient.post<RiesgoAPI>(`${SERVICE_PREFIX}/riesgos`, data);
    }

    async update(id: string, data: Partial<CreateRiesgoData>): Promise<RiesgoAPI> {
        return apiClient.patch<RiesgoAPI>(`${SERVICE_PREFIX}/riesgos/${id}`, data);
    }

    async delete(id: string): Promise<void> {
        await apiClient.delete(`${SERVICE_PREFIX}/riesgos/${id}`);
    }

    async cambiarEtapa(id: string, etapa: string): Promise<RiesgoAPI> {
        return apiClient.patch<RiesgoAPI>(`${SERVICE_PREFIX}/riesgos/${id}/etapa`, { etapa });
    }

    async archivar(id: string): Promise<RiesgoAPI> {
        return apiClient.patch<RiesgoAPI>(`${SERVICE_PREFIX}/riesgos/${id}/archivar`, {});
    }

    async getEstadisticas(): Promise<{
        total: number;
        porZona: Record<string, number>;
        porTipo: Record<string, number>;
        porEtapa: Record<string, number>;
    }> {
        return apiClient.get(`${SERVICE_PREFIX}/riesgos/estadisticas`);
    }
}

export const legalService = new LegalService();
export const ocService = new OCService();
export const riesgosService = new RiesgosService();
