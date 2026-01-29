// import { ApiClient } from './apiClient';
import { apiClient } from './client';
import { API_MODE, MICROSERVICE_URLS, getServiceUrl, buildApiUrl } from '../../config/environment';

// Prefijo del servicio legal en el API Gateway
// Nueva estructura: /{service}/api/v{version}/{path}
// URL: /legal/api/v1/* -> legal-management-service:3008/*
const SERVICE_PREFIX = '/legal/api/v1';

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
    origen?: 'MANUAL' | 'AUDIENCIA' | 'AUTO' | 'ACTA' | 'EVIDENCIA' | 'OFICIO';
    referenciaId?: string;
    metadata?: any;
    usuarioResponsable?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Audiencia {
    id: string;
    titulo: string;
    fechaHoraInicio: string;
    duracionMinutos: number;
    modalidad: 'VIRTUAL' | 'PRESENCIAL';
    ubicacion?: string;
    linkReunion?: string;
    estado: string;
    notasPreparacion?: string;
    abogadoId: string;
    expedienteId: string;
    // Campos opcionales de vista
    radicado?: string;
    nombreInvestigado?: string;
    nombreAbogado?: string;
}

export class LegalService {
    async getExpedientes(filtros?: { estado?: string; jurisdiccion?: string; search?: string }): Promise<Expediente[]> {
        return apiClient.get<Expediente[]>(`${SERVICE_PREFIX}/expedientes`, { params: filtros });
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

    async getJuzgamientoActuaciones(radicado: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/actuaciones`);
    }

    async createJuzgamientoDecision(radicado: string, data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/decisiones`, data);
    }

    // ===== EXCEPCIONES PROCESALES (Juzgamiento) =====
    async getJuzgamientoExcepciones(radicado: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/excepciones`);
    }

    async createJuzgamientoExcepcion(radicado: string, data: {
        tipo: 'NULIDAD' | 'RECUSACION' | 'PRESCRIPCION' | 'IMPEDIMENTO' | 'OTRA';
        descripcion: string;
        fundamento?: string;
        presentadoPor?: string;
    }): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/excepciones`, data);
    }

    async resolverExcepcion(excepcionId: string, data: {
        estado: 'RESUELTA' | 'RECHAZADA';
        resolucion: string;
    }): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/juzgamiento/excepciones/${excepcionId}/resolver`, data);
    }

    async updateJuzgamientoProceso(radicado: string, data: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}`, data);
    }

    async createJuzgamientoActuacion(radicado: string, data: {
        tipoActuacion: string;
        descripcion: string;
        fechaActuacion: string;
        file?: File;
    }): Promise<any> {
        if (data.file) {
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('tipoActuacion', data.tipoActuacion);
            formData.append('descripcion', data.descripcion);
            formData.append('fechaActuacion', data.fechaActuacion);
            return apiClient.upload<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/actuaciones`, formData);
        }
        return apiClient.post<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/actuaciones`, {
            tipoActuacion: data.tipoActuacion,
            descripcion: data.descripcion,
            fechaActuacion: data.fechaActuacion
        });
    }

    // Renaming getExpedienteById to getExpediente as per instruction, and adapting the signature
    async getExpediente(id: string): Promise<Expediente> {
        return apiClient.get<Expediente>(`${SERVICE_PREFIX}/expedientes/${id}`);
    }

    async updateExpediente(id: string, data: Partial<Expediente>): Promise<Expediente> {
        return apiClient.put<Expediente>(`${SERVICE_PREFIX}/expedientes/${id}`, data);
    }

    async createExpediente(data: Partial<Expediente>): Promise<Expediente> {
        return apiClient.post<Expediente>(`${SERVICE_PREFIX}/expedientes`, data);
    }

    async deleteExpediente(id: string): Promise<void> {
        await apiClient.delete(`${SERVICE_PREFIX}/expedientes/${id}`);
    }

    // Alias en español para mantener compatibilidad
    async crearExpediente(data: Partial<Expediente>): Promise<Expediente> {
        return this.createExpediente(data);
    }

    // ==================== CONSULTAS JURÍDICAS ====================
    async getConsultasJuridicas(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/consultas-juridicas`);
    }

    async getConsultaJuridica(id: string): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}`);
    }

    async getDashboardEjecutivo(): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/dashboard/ejecutivo`);
    }

    async createConsultaJuridica(data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/consultas-juridicas`, data);
    }

    async updateConsultaJuridica(id: string, data: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}`, data);
    }

    async getAbogados(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/abogados`);
    }

    // ==================== PROCESOS COACTIVOS ====================
    async getProcesosCoactivos(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/procesos-coactivos`);
    }

    async getProcesoCoactivo(id: string): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/procesos-coactivos/${id}`);
    }

    async getCoactivoAdjuntos(procesoId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/procesos-coactivos/${procesoId}/adjuntos`);
    }

    async uploadCoactivoAdjunto(procesoId: string, file: File, tipo: string = 'DOCUMENTO', descripcion?: string): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', tipo);
        if (descripcion) formData.append('descripcion', descripcion);

        return apiClient.upload<any>(`${SERVICE_PREFIX}/procesos-coactivos/${procesoId}/adjuntos`, formData);
    }

    // ==================== ABOGADOS ====================

    // ==================== ACTUACIONES (HISTORIAL UNIFICADO) ====================
    async getActuaciones(expedienteId: string): Promise<Actuacion[]> {
        return apiClient.get<Actuacion[]>(`${SERVICE_PREFIX}/expedientes/${expedienteId}/actuaciones`);
    }

    async createActuacion(data: {
        expedienteId: string;
        tipoActuacion: string;
        descripcion: string;
        fechaActuacion: string;
        file?: File;
    }): Promise<Actuacion> {
        if (data.file) {
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('tipoActuacion', data.tipoActuacion);
            formData.append('descripcion', data.descripcion);
            formData.append('fechaActuacion', data.fechaActuacion); // Backend espera string ISO o similar
            return apiClient.upload<Actuacion>(`${SERVICE_PREFIX}/expedientes/${data.expedienteId}/actuaciones`, formData);
        }
        return apiClient.post<Actuacion>(`${SERVICE_PREFIX}/expedientes/${data.expedienteId}/actuaciones`, data);
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

    // ==================== AUDIENCIAS ====================
    async getAudiencias(filtros?: { start?: string; end?: string }): Promise<Audiencia[]> {
        return apiClient.get<Audiencia[]>(`${SERVICE_PREFIX}/audiencias`, { params: filtros });
    }

    async getAudienciasDashboard(): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/audiencias/dashboard`);
    }

    async createAudiencia(data: {
        expedienteId: string;
        abogadoId: string;
        titulo: string;
        fechaHoraInicio: string; // ISO string
        duracionMinutos: number;
        modalidad: 'VIRTUAL' | 'PRESENCIAL';
        ubicacion?: string;
        linkReunion?: string;
        notasPreparacion?: string;
    }): Promise<Audiencia> {
        return apiClient.post<Audiencia>(`${SERVICE_PREFIX}/audiencias`, data);
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
        const baseUrl = getServiceUrl('legal');
        const prefix = API_MODE === 'direct' ? '' : '/legal';
        return `${baseUrl}${prefix}/autos/expediente/${radicado}/download-zip`;
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

    getDocumentosDownloadZipUrl(expedienteId: string): string {
        const baseUrl = getServiceUrl('legal');
        const prefix = API_MODE === 'direct' ? '' : '/legal';
        return `${baseUrl}${prefix}/documentos/expediente/${expedienteId}/download-zip`;
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

    // Duplicates removed


    async updateEstadoConsulta(id: string, estado: string, usuario?: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}/estado`, { estado, usuario });
    }

    async responderConsulta(id: string, respuestaData: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}/respuesta`, respuestaData);
    }

    async guardarRespuestaConsulta(id: string, respuesta: string, enviar: boolean, usuario?: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}/gestionar-respuesta`, { respuesta, enviar, usuario });
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

    async getConsultaJuridicaHistorial(id: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/consultas-juridicas/${id}/historial`);
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
        const baseUrl = getServiceUrl('legal');
        // Direct mode: localhost:3008/consultas-juridicas/...
        // Gateway mode: localhost:3000/legal/consultas-juridicas/...
        const prefix = API_MODE === 'direct' ? '' : '/legal';
        return `${baseUrl}${prefix}/consultas-juridicas/${consultaId}/documentos/download-zip`;
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



    async getRiesgosDisponibles(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/planes-mejoramiento/riesgos-disponibles`);
    }

    // ==================== PEI (PLAN DE ACCIÓN) ====================
    async getPeiDashboard(): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/pei/dashboard`);
    }

    async createIndicador(data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/pei/indicador`, data);
    }

    async updateIndicador(id: string, data: any): Promise<any> {
        return apiClient.put<any>(`${SERVICE_PREFIX}/pei/indicador/${id}`, data);
    }

    async registrarAvanceIndicador(id: string, data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/pei/indicador/${id}/avance`, data);
    }

    async exportPeiZip(): Promise<Blob> {
        return apiClient.getBlob(`${SERVICE_PREFIX}/pei/export/zip`);
    }

    // Duplicate removed


    // Método Wrapper para Requerimientos OC (por si acaso el componente llama a legalService.getRequerimientosOC)
    async getRequerimientosOC(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/requerimientos-oc`);
    }

    async getOrganismosControl(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/requerimientos-oc/organismos`);
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

    // ==================== CONFIGURACIONES ====================
    async getConfiguration(key: string): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/configurations/${key}`);
    }

    async saveConfiguration(key: string, value: any): Promise<any> {
        return apiClient.put<any>(`${SERVICE_PREFIX}/configurations/${key}`, { value });
    }

    // ==================== PLANES DE MEJORAMIENTO ====================
    async getPlanesMejoramiento(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/planes-mejoramiento`);
    }

    async getPlanMejoramiento(id: string): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/planes-mejoramiento/${id}`);
    }

    async createPlanMejoramiento(data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/planes-mejoramiento`, data);
    }

    async updatePlanMejoramiento(id: string, data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/planes-mejoramiento/${id}/update`, data);
    }

    async addSeguimientoPlan(id: string, data: { descripcionAvance: string; porcentajeReportado: number }): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/planes-mejoramiento/${id}/seguimiento`, data);
    }

    async addEvidenciaPlan(id: string, data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/planes-mejoramiento/${id}/evidencias`, data);
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
    updatedAt?: string;
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
    updatedAt?: string;
}

class OCService {
    // Organismos de Control
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

    async reasignarRequerimiento(id: string, nuevoAbogadoId: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/requerimientos-oc/${id}/reasignar`, { nuevoAbogadoId });
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

    getDocumentosDownloadUrl(requerimientoId: string, nombre?: string): string {
        const baseUrl = getServiceUrl('legal');
        const prefix = API_MODE === 'direct' ? '' : '/legal/api/v1';
        let url = `${baseUrl}${prefix}/requerimientos-oc/${requerimientoId}/documentos/download-zip`;
        if (nombre) {
            url += `?nombre=${encodeURIComponent(nombre)}`;
        }
        return url;
    }

    // Enviar respuesta formal al órgano de control
    async enviarRespuesta(requerimientoId: string, data: {
        destinatarioEmail: string;
        asunto: string;
        cuerpoMensaje: string;
        tipoRespuesta: string;
        destinatarioNombre?: string;
        destinatarioCargo?: string;
    }): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/requerimientos-oc/${requerimientoId}/response`, data);
    }

    // Borradores de Respuesta
    async getBorradorRespuesta(requerimientoId: string): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/requerimientos-oc/${requerimientoId}/borrador`);
    }

    async saveBorradorRespuesta(requerimientoId: string, data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/requerimientos-oc/${requerimientoId}/borrador`, data);
    }

    // Solicitar insumos a otra área (alias más claro)
    async solicitarInsumo(requerimientoId: string, data: {
        areaDestino: string;
        descripcionSolicitud: string;
        fechaVencimientoInterna: string;
        documentosSolicitados?: string;
        funcionarioDestino?: string;
        emailDestino?: string;
    }): Promise<any> {
        return this.createSolicitudInsumo(requerimientoId, data);
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
    // Provisión Contable
    cuantiaEstimada?: number;
    provisionContable?: number;
    porcentajeProvision?: number;
    fechaCalculoProvision?: string;
    // Asociación con Proceso
    moduloOrigen?: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO' | 'ASESORIA_JURIDICA' | 'COACTIVOS' | 'ORGANOS_CONTROL';
    procesoId?: string;
    procesoRadicado?: string;
}

export interface CreateRiesgoData {
    nombre: string;
    descripcion: string;
    proceso: string;
    tipoRiesgo: 'GESTION' | 'CORRUPCION' | 'SEGURIDAD_DIGITAL' | 'FISCAL';
    etapa?: 'IDENTIFICADO' | 'ANALIZADO' | 'VALORADO' | 'TRATAMIENTO' | 'MONITOREO' | 'CERRADO' | 'MATERIALIZADO';
    probabilidadInherente: number;
    impactoInherente: number;
    probabilidadResidual?: number;
    impactoResidual?: number;
    causas?: string[];
    consecuencias?: string[];
    controlesExistentes?: { id: string; descripcion: string; efectividad: number }[];
    responsable: string;
    cuantiaEstimada?: number;
    // Asociación con Proceso
    moduloOrigen?: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO' | 'ASESORIA_JURIDICA' | 'COACTIVOS' | 'ORGANOS_CONTROL';
    procesoId?: string;
    procesoRadicado?: string;
}

export interface RiesgoHistorialAPI {
    id: string;
    riesgoId: string;
    tipoEvento: 'CREACION' | 'ACTUALIZACION' | 'CAMBIO_ETAPA' | 'CAMBIO_ZONA' | 'ARCHIVADO' | 'CONTROL_AGREGADO' | 'CONTROL_MODIFICADO' | 'TRATAMIENTO_AGREGADO';
    descripcion: string;
    campoModificado: string | null;
    valorAnterior: string | null;
    valorNuevo: string | null;
    usuario: string;
    createdAt: string;
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

    getReporteContabilidadUrl(): string {
        const baseUrl = getServiceUrl('legal');
        // Usar SERVICE_PREFIX (/legal/api/v1) en modo gateway para consistencia con otros endpoints
        // En modo directo, asumir root del backend (sin prefijo si main.ts no lo tiene)
        const path = API_MODE === 'direct' ? '' : SERVICE_PREFIX;
        return `${baseUrl}${path}/riesgos/export/contabilidad`;
    }

    async getHistorial(riesgoId: string): Promise<RiesgoHistorialAPI[]> {
        return apiClient.get<RiesgoHistorialAPI[]>(`${SERVICE_PREFIX}/riesgos/${riesgoId}/historial`);
    }
}

// ==================== CORREOS JURIDICOS SERVICE ====================
export interface CorreoJuridico {
    id: string;
    graphMessageId: string;
    asunto: string;
    remitenteEmail: string;
    remitenteNombre: string | null;
    fechaRecepcion: string;
    cuerpoHtml: string | null;
    cuerpoTexto: string | null;
    tieneAdjuntos: boolean;
    leido: boolean;
    archivado: boolean;
    urgente: boolean;
    tipo: 'JUDICIAL' | 'CORREO' | 'OFICIO';
    categoria: string | null;
    moduloSugerido: string | null;
    confianzaClasificacion: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface CorreoFilters {
    tipo?: string;
    leido?: boolean;
    urgente?: boolean;
    archivado?: boolean;
    search?: string;
}

export interface SendCorreoDto {
    to: string;
    cc?: string[];
    subject: string;
    body: string;
    attachments?: { name: string; contentBytes: string; contentType: string }[];
}

export interface AdjuntoCorreo {
    id: string;
    correoId: string;
    graphMessageId: string;
    graphAttachmentId: string;
    nombre: string;
    contentType: string | null;
    tamanio: number;
    archivoLocalUrl: string | null;
    descargado: boolean;
    createdAt: string;
}

export class CorreosJuridicosService {
    /**
     * Trigger manual sync from Microsoft Graph
     */
    async syncCorreos(nextLink?: string): Promise<{ synced: number; errors: number; total: number; nextLink: string | null }> {
        return apiClient.post(`${SERVICE_PREFIX}/correos/sync`, { nextLink });
    }

    /**
     * Test Microsoft Graph connection
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        return apiClient.get(`${SERVICE_PREFIX}/correos/test-connection`);
    }

    /**
     * Get all emails with optional filters
     */
    async getCorreos(filters?: CorreoFilters): Promise<CorreoJuridico[]> {
        const params: Record<string, string> = {};
        if (filters?.tipo) params.tipo = filters.tipo;
        if (filters?.leido !== undefined) params.leido = String(filters.leido);
        if (filters?.urgente !== undefined) params.urgente = String(filters.urgente);
        if (filters?.archivado !== undefined) params.archivado = String(filters.archivado);
        if (filters?.search) params.search = filters.search;

        return apiClient.get(`${SERVICE_PREFIX}/correos`, { params });
    }

    /**
     * Get single email with full body
     */
    async getCorreo(id: string): Promise<CorreoJuridico> {
        return apiClient.get(`${SERVICE_PREFIX}/correos/${id}`);
    }

    /**
     * Mark email as read
     */
    async markAsRead(id: string): Promise<CorreoJuridico> {
        return apiClient.patch(`${SERVICE_PREFIX}/correos/${id}/read`);
    }

    /**
     * Archive email
     */
    async archive(id: string): Promise<CorreoJuridico> {
        return apiClient.patch(`${SERVICE_PREFIX}/correos/${id}/archive`);
    }

    /**
     * Send email via Microsoft Graph
     */
    async sendEmail(dto: SendCorreoDto): Promise<{ success: boolean }> {
        return apiClient.post(`${SERVICE_PREFIX}/correos/send`, dto);
    }

    /**
     * Get attachments for an email
     */
    async getAdjuntos(correoId: string): Promise<AdjuntoCorreo[]> {
        return apiClient.get(`${SERVICE_PREFIX}/correos/${correoId}/adjuntos`);
    }

    /**
     * Download an attachment - returns a blob URL for download
     * Handles both gateway and direct modes:
     * - Gateway mode: http://gateway:3000/legal/api/v1/correos/adjuntos/{id}/download
     * - Direct mode: http://localhost:3008/correos/adjuntos/{id}/download
     */
    async downloadAdjunto(adjuntoId: string): Promise<string> {
        let url: string;

        if (API_MODE === 'direct') {
            // Direct mode: go straight to microservice without /legal/api/v1 prefix
            url = `${MICROSERVICE_URLS.legal}/correos/adjuntos/${adjuntoId}/download`;
        } else {
            // Gateway mode: use SERVICE_PREFIX which includes /legal/api/v1
            const baseUrl = getServiceUrl('legal');
            url = `${baseUrl}${SERVICE_PREFIX}/correos/adjuntos/${adjuntoId}/download`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Error downloading attachment');

        const blob = await response.blob();
        return window.URL.createObjectURL(blob);
    }

    /**
     * Export email to ZIP
     */
    async exportCorreoZip(id: string): Promise<string> {
        const blob = await apiClient.getBlob(`${SERVICE_PREFIX}/correos/${id}/export/zip`);
        return window.URL.createObjectURL(blob);
    }


}

// ===== PROCESOS COACTIVOS SERVICE =====
export interface ProcesoCoactivoDeudor {
    nombre: string;
    identificacion: string;
    telefono?: string;
    email?: string;
    direccion?: string;
}

export interface ProcesoCoactivoObligacion {
    concepto: string;
    valor: number;
    fechaVencimiento: string;
}

export interface ProcesoCoactivo {
    id: string;
    radicado: string;
    deudor: ProcesoCoactivoDeudor;
    obligacion: ProcesoCoactivoObligacion;
    estado: 'IDENTIFICADO' | 'PERSUASIVO' | 'PREJURIDICO' | 'MANDAMIENTO' | 'EMBARGO' | 'FINALIZADO';
    responsable?: string;
    documentosAdjuntos: number;
    notificacionesEnviadas: number;
    observaciones?: string;
    ultimaActuacion?: string;
    fechaCreacion: string;
    valorPagado?: number;
    saldoPendiente?: number;
}

export interface PagoCoactivo {
    id: string;
    procesoId: string;
    valor: number;
    fechaPago: string;
    soporteUrl?: string;
    origen: string;
    observaciones?: string;
}

export interface CoactivoHistorial {
    id: string;
    procesoId: string;
    tipoEvento: string;
    campoModificado?: string;
    valorAnterior?: string;
    valorNuevo?: string;
    usuario?: string;
    detalles?: string;
    fechaEvento: string;
}

export interface ProcesoCoactivoStats {
    total: number;
    activos: number;
    criticos: number;
    totalMonto: number;
    porEstado: Record<string, number>;
}

export interface CreateProcesoCoactivoDto {
    deudor: ProcesoCoactivoDeudor;
    obligacion: ProcesoCoactivoObligacion;
    responsable?: string;
    observaciones?: string;
}

export interface ProcesoCoactivoAdjunto {
    id: string;
    procesoId: string;
    nombreOriginal: string;
    nombreArchivo: string;
    mimeType: string;
    tamano: number;
    fechaCreacion: string;
}

export class ProcesosCoactivosService {
    async getAll(): Promise<ProcesoCoactivo[]> {
        return apiClient.get<ProcesoCoactivo[]>(`${SERVICE_PREFIX}/procesos-coactivos`);
    }

    async getOne(id: string): Promise<ProcesoCoactivo> {
        return apiClient.get<ProcesoCoactivo>(`${SERVICE_PREFIX}/procesos-coactivos/${id}`);
    }

    async getStats(): Promise<ProcesoCoactivoStats> {
        return apiClient.get<ProcesoCoactivoStats>(`${SERVICE_PREFIX}/procesos-coactivos/stats`);
    }

    async create(dto: CreateProcesoCoactivoDto): Promise<ProcesoCoactivo> {
        return apiClient.post<ProcesoCoactivo>(`${SERVICE_PREFIX}/procesos-coactivos`, dto);
    }

    async update(id: string, dto: Partial<ProcesoCoactivo>): Promise<ProcesoCoactivo> {
        return apiClient.put<ProcesoCoactivo>(`${SERVICE_PREFIX}/procesos-coactivos/${id}`, dto);
    }

    async delete(id: string): Promise<void> {
        await apiClient.delete(`${SERVICE_PREFIX}/procesos-coactivos/${id}`);
    }

    // Archivos
    async uploadAdjunto(procesoId: string, file: File): Promise<ProcesoCoactivoAdjunto> {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.upload<ProcesoCoactivoAdjunto>(`${SERVICE_PREFIX}/procesos-coactivos/${procesoId}/adjuntos`, formData);
    }

    async getAdjuntos(procesoId: string): Promise<ProcesoCoactivoAdjunto[]> {
        return apiClient.get<ProcesoCoactivoAdjunto[]>(`${SERVICE_PREFIX}/procesos-coactivos/${procesoId}/adjuntos`);
    }

    async deleteAdjunto(adjuntoId: string): Promise<void> {
        await apiClient.delete(`${SERVICE_PREFIX}/procesos-coactivos/adjuntos/${adjuntoId}`);
    }

    getAdjuntoDownloadUrl(filename: string, originalName: string): string {
        const baseUrl = getServiceUrl('legal');
        const prefix = API_MODE === 'direct' ? '' : '/legal';
        // Ajuste: El endpoint de files está en /files/download/{filename}
        return `${baseUrl}${prefix}/files/download/${filename}?name=${encodeURIComponent(originalName)}`;
    }

    getFichaDownloadUrl(procesoId: string): string {
        const baseUrl = getServiceUrl('legal');
        const prefix = API_MODE === 'direct' ? '' : '/legal';
        return `${baseUrl}${prefix}/procesos-coactivos/${procesoId}/download-zip`;
    }

    async registrarPago(procesoId: string, data: any): Promise<PagoCoactivo> {
        return apiClient.post<PagoCoactivo>(`${SERVICE_PREFIX}/procesos-coactivos/${procesoId}/pagos`, data);
    }

    async getPagos(procesoId: string): Promise<PagoCoactivo[]> {
        return apiClient.get<PagoCoactivo[]>(`${SERVICE_PREFIX}/procesos-coactivos/${procesoId}/pagos`);
    }

    async getHistorial(procesoId: string): Promise<CoactivoHistorial[]> {
        return apiClient.get<CoactivoHistorial[]>(`${SERVICE_PREFIX}/procesos-coactivos/${procesoId}/historial`);
    }

    async deletePago(pagoId: string): Promise<void> {
        await apiClient.delete(`${SERVICE_PREFIX}/procesos-coactivos/pagos/${pagoId}`);
    }

    async downloadPagoSoporte(filename: string): Promise<string> {
        let url: string;
        if (API_MODE === 'direct') {
            url = `${MICROSERVICE_URLS.legal}/procesos-coactivos/pagos/soporte/${filename}`;
        } else {
            const baseUrl = getServiceUrl('legal');
            url = `${baseUrl}${SERVICE_PREFIX}/procesos-coactivos/pagos/soporte/${filename}`;
        }

        // Fetch to get blob
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error descargando soporte');

        const blob = await response.blob();
        return window.URL.createObjectURL(blob);
    }
}

export const legalService = new LegalService();
export const ocService = new OCService();
export const riesgosService = new RiesgosService();
export const correosJuridicosService = new CorreosJuridicosService();
export const procesosCoactivosService = new ProcesosCoactivosService();
