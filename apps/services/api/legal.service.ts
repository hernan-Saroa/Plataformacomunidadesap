import { apiClient } from './apiClient';
import { API_MODE, MICROSERVICE_URLS, getServiceUrl, buildApiUrl } from '../../config/environment';
import { authService } from './authService';

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
        return apiClient.get<Expediente[]>(`${SERVICE_PREFIX}/expedientes`, filtros);
    }



    async getJuzgamientoProcesos(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/juzgamiento`);
    }

    async getJuzgamientoProceso(radicado: string): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}`);
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

    // ===== TAREAS (Juzgamiento) =====
    async getJuzgamientoTareas(radicado: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/tareas`);
    }

    async createJuzgamientoTarea(radicado: string, data: {
        titulo: string;
        descripcion?: string;
        fechaVencimiento?: string;
        prioridad?: string;
        responsableNombre?: string;
        creadoPor?: string;
    }): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/tareas`, data);
    }

    async updateJuzgamientoTarea(radicado: string, tareaId: string, data: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/tareas/${tareaId}`, data);
    }

    async deleteJuzgamientoTarea(radicado: string, tareaId: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/juzgamiento/${radicado}/tareas/${tareaId}`);
    }

    // ===== NOTAS (Juzgamiento) =====
    async getJuzgamientoNotas(radicado: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/notas`);
    }

    async createJuzgamientoNota(radicado: string, data: {
        contenido: string;
        tipo?: string;
        autorNombre?: string;
    }): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/juzgamiento/${radicado}/notas`, data);
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

    // ==================== ABOGADOS ====================
    async getAbogados(): Promise<any[]> {
        return authService.getAbogadosRolResuelve();
    }

    // ==================== ARCHIVADO/ELIMINADO DE EXPEDIENTES ====================
    async getExpedientesArchivados(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/expedientes/estado/archivados`);
    }

    async archivarExpediente(id: string, motivo?: string, usuario?: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/expedientes/${id}/archivar`, { motivo, usuario });
    }

    async eliminarExpedienteSoft(id: string, motivo?: string, usuario?: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/expedientes/${id}/eliminar`, { motivo, usuario });
    }

    async restaurarExpediente(id: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/expedientes/${id}/restaurar`, {});
    }

    async eliminarPermanenteExpediente(id: string): Promise<void> {
        await apiClient.delete(`${SERVICE_PREFIX}/expedientes/${id}/permanente`);
    }

    async deleteAudiencia(id: string): Promise<void> {
        await apiClient.delete(`${SERVICE_PREFIX}/audiencias/${id}`);
    }

    // ==================== PROCESOS ANEXADOS ====================
    async anexarExpediente(anexadoId: string, principalId: string, usuario?: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/expedientes/${anexadoId}/anexar`, { principalId, usuario });
    }

    async desanexarExpediente(anexadoId: string, usuario?: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/expedientes/${anexadoId}/desanexar`, { usuario });
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
        responsable?: string;
        estado?: string;
        observaciones?: string;
        file?: File;
    }): Promise<Actuacion> {
        if (data.file) {
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('tipoActuacion', data.tipoActuacion);
            formData.append('descripcion', data.descripcion);
            formData.append('fechaActuacion', data.fechaActuacion); // Backend espera string ISO o similar
            if (data.responsable) formData.append('responsable', data.responsable);
            if (data.estado) formData.append('estado', data.estado);
            if (data.observaciones) formData.append('observaciones', data.observaciones);
            return apiClient.upload<Actuacion>(`${SERVICE_PREFIX}/expedientes/${data.expedienteId}/actuaciones`, formData);
        }
        return apiClient.post<Actuacion>(`${SERVICE_PREFIX}/expedientes/${data.expedienteId}/actuaciones`, data);
    }

    // Abogados
    async getAbogadosDashboard(): Promise<any[]> {
        return authService.getAbogadosRolResuelve();
    }

    async getStatsGeneral(): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/stats/general`);
    }



    async createAbogado(data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/abogados`, data);
    }

    // ==================== AUDIENCIAS ====================
    async getAudiencias(filtros?: { start?: string; end?: string; expedienteId?: string }): Promise<Audiencia[]> {
        return apiClient.get<Audiencia[]>(`${SERVICE_PREFIX}/audiencias`, filtros);
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

    async updateAudiencia(id: string, data: any): Promise<Audiencia> {
        return apiClient.put<Audiencia>(`${SERVICE_PREFIX}/audiencias/${id}`, data);
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

    // ==================== COMENTARIOS DE EXPEDIENTE ====================
    async getComentariosExpediente(expedienteId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/expedientes/${expedienteId}/comentarios`);
    }

    async createComentarioExpediente(expedienteId: string, data: { contenido: string; tipo?: string; usuarioId?: string; autorNombre?: string }): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/expedientes/${expedienteId}/comentarios`, data);
    }

    async deleteComentarioExpediente(comentarioId: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/expedientes/comentarios/${comentarioId}`);
    }

    // ==================== OFICIOS JUDICIALES ====================
    async createOficio(formData: FormData): Promise<any> {
        return apiClient.upload<any>(`${SERVICE_PREFIX}/oficios`, formData);
    }

    async getOficios(expedienteId: string, modulo?: string): Promise<any[]> {
        const params = modulo ? `?modulo=${encodeURIComponent(modulo)}` : '';
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/oficios/expediente/${expedienteId}${params}`);
    }

    getOficiosDownloadZipUrl(expedienteId: string, modulo?: string): string {
        const baseUrl = getServiceUrl('legal');
        const prefix = API_MODE === 'direct' ? '' : '/legal';
        const params = modulo ? `?modulo=${encodeURIComponent(modulo)}` : '';
        return `${baseUrl}${prefix}/oficios/expediente/${expedienteId}/download-zip${params}`;
    }

    async deleteOficio(id: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/oficios/${id}`);
    }

    // Duplicates removed


    async updateEstadoConsulta(id: string, estado: string, usuario?: string, estadoNombre?: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/consultas-juridicas/${id}/estado`, { estado, usuario, estadoNombre });
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
        return apiClient.delete(`${SERVICE_PREFIX}/consultas-juridicas/${id}`); // Esto sería soft delete si el backend lo maneja así, o hard delete
    }

    // --- Métodos de Archivo Consultas ---
    async getConsultasArchivadas(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/consultas-juridicas/archivadas/lista`);
    }

    async archivarConsulta(id: string, motivo: string, usuario: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/consultas-juridicas/${id}/archivar`, { motivo, usuario });
    }

    async eliminarConsultaSoft(id: string, motivo: string, usuario: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/consultas-juridicas/${id}/eliminar`, { motivo, usuario });
    }

    async restaurarConsulta(id: string, usuario: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/consultas-juridicas/${id}/restaurar`, { usuario });
    }

    async eliminarConsultaPermanente(id: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/consultas-juridicas/${id}/permanente`);
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

    async replaceDocumentoConsulta(documentoId: string, formData: FormData): Promise<any> {
        return apiClient.upload<any>(`${SERVICE_PREFIX}/consultas-juridicas/documentos/${documentoId}/replace`, formData);
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

    async updateTermino(id: string, data: any): Promise<any> {
        return apiClient.patch(`${SERVICE_PREFIX}/terminos/${id}`, data);
    }

    async exportarTerminoPdf(id: string): Promise<Blob> {
        return apiClient.getBlob(`${SERVICE_PREFIX}/terminos/${id}/exportar/pdf`);
    }

    async getDocumentosTermino(id: string): Promise<any[]> {
        return apiClient.get(`${SERVICE_PREFIX}/terminos/${id}/documentos`);
    }

    async cargarDocumentoTermino(id: string, file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post(`${SERVICE_PREFIX}/terminos/${id}/upload-documento`, formData);
    }

    async eliminarTermino(id: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/terminos/${id}`);
    }

    async getNotasTermino(id: string): Promise<any[]> {
        return apiClient.get(`${SERVICE_PREFIX}/terminos/${id}/notas`);
    }

    async addNotaTermino(id: string, texto: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/terminos/${id}/notas`, { texto });
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

    // ==================== PEI - ARCHIVADO ====================
    async getPeiArchivados(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/pei/archivados`);
    }

    async archivarPeiIndicador(id: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/pei/indicador/${id}/archivar`, {});
    }

    async restaurarPeiIndicador(id: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/pei/indicador/${id}/restaurar`, {});
    }

    async eliminarPeiIndicador(id: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/pei/indicador/${id}`);
    }


    // Método Wrapper para Requerimientos OC (por si acaso el componente llama a legalService.getRequerimientosOC)
    async getRequerimientosOC(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/requerimientos-oc`);
    }

    async getOrganismosControl(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/requerimientos-oc/organismos`);
    }

    async getTiposRequerimientoOC(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/requerimientos-oc/tipos-requerimiento`);
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

    // ==================== PLANES MEJORAMIENTO - ARCHIVADO ====================
    async getPlanesMejoramientoArchivados(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/planes-mejoramiento/archivados/all`);
    }

    async archivarPlanMejoramiento(id: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/planes-mejoramiento/${id}/archivar`, {});
    }

    async restaurarPlanMejoramiento(id: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/planes-mejoramiento/${id}/restaurar`, {});
    }

    async eliminarPlanMejoramiento(id: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/planes-mejoramiento/${id}`);
    }

    async getDocumentosPlan(id: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/planes-mejoramiento/${id}/documentos`);
    }

    async uploadDocumentoPlan(id: string, formData: FormData): Promise<any> {
        return apiClient.upload<any>(`${SERVICE_PREFIX}/planes-mejoramiento/${id}/documentos`, formData);
    }

    getPlanFileViewUrl(filename: string): string {
        const baseUrl = getServiceUrl('legal');
        const prefix = API_MODE === 'direct' ? '' : '/legal';
        return `${baseUrl}${prefix}/files/${filename}`;
    }

    getPlanFileDownloadUrl(filename: string, originalName: string): string {
        const baseUrl = getServiceUrl('legal');
        const prefix = API_MODE === 'direct' ? '' : '/legal';
        return `${baseUrl}${prefix}/files/download/${filename}?name=${encodeURIComponent(originalName)}`;
    }

    // ==================== JUZGAMIENTO DISCIPLINARIO ====================
    async createJuzgamientoProceso(data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/juzgamiento`, data);
    }

    async anexarJuzgamientoProceso(radicadoAnexado: string, radicadoPrincipal: string, usuario?: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/juzgamiento/${radicadoAnexado}/anexar`, { principalRadicado: radicadoPrincipal, usuario });
    }

    async desanexarJuzgamientoProceso(radicado: string, usuario?: string): Promise<any> {
        return apiClient.post(`${SERVICE_PREFIX}/juzgamiento/${radicado}/desanexar`, { usuario });
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

    // Catálogo de tipos de requerimiento
    async getTiposRequerimientoOC(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/requerimientos-oc/tipos-requerimiento`);
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

    // Sistema de Archivo
    async getArchivados(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/requerimientos-oc/archivados/list`);
    }

    async archivarRequerimiento(id: string, motivo: string, usuario: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/requerimientos-oc/${id}/archivar`, { motivo, usuario });
    }

    async restaurarRequerimiento(id: string, usuario: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/requerimientos-oc/${id}/restaurar`, { usuario });
    }

    async eliminarRequerimientoPermanente(id: string, usuario: string, motivo: string): Promise<void> {
        return apiClient.delete(`${SERVICE_PREFIX}/requerimientos-oc/${id}/permanente?usuario=${encodeURIComponent(usuario)}&motivo=${encodeURIComponent(motivo)}`);
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
    motivoArchivo?: string;
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
    estado: 'ACTIVO' | 'ARCHIVADO' | 'ELIMINADO' | 'CERRADO';
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

    async archivar(id: string, motivo?: string): Promise<RiesgoAPI> {
        return apiClient.patch<RiesgoAPI>(`${SERVICE_PREFIX}/riesgos/${id}/archivar`, { motivo });
    }

    async getArchived(): Promise<RiesgoAPI[]> {
        return apiClient.get<RiesgoAPI[]>(`${SERVICE_PREFIX}/riesgos/archivados/all`);
    }

    async restaurar(id: string): Promise<RiesgoAPI> {
        return apiClient.patch<RiesgoAPI>(`${SERVICE_PREFIX}/riesgos/${id}/restaurar`, {});
    }

    async eliminarPermanente(id: string): Promise<void> {
        await apiClient.delete(`${SERVICE_PREFIX}/riesgos/${id}/permanente`);
    }

    async marcarEliminado(id: string, motivo?: string): Promise<RiesgoAPI> {
        return apiClient.patch<RiesgoAPI>(`${SERVICE_PREFIX}/riesgos/${id}/eliminar`, { motivo });
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
    aiSuggestedCategory?: string;
    isTrained?: boolean;
    expedienteId?: string;
    direccion?: string; // ENTRANTE, ENVIADO
    destinatariosTo?: string;
    // Threading
    isReplied?: boolean;
    parentEmailId?: string;
    threadId?: string;
    internetMessageId?: string;
    // NLP entities
    procesoIdSugerido?: string;
    implicadoSugerido?: string;
    submoduloSugerido?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CorreoFilters {
    tipo?: string;
    leido?: boolean;
    urgente?: boolean;
    archivado?: boolean;
    direccion?: string;
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
     * Unarchive email - restore to original location
     */
    async unarchive(id: string): Promise<CorreoJuridico> {
        return apiClient.patch(`${SERVICE_PREFIX}/correos/${id}/unarchive`);
    }

    /**
     * Send email via Microsoft Graph
     */
    async sendEmail(dto: SendCorreoDto): Promise<{ success: boolean }> {
        return apiClient.post(`${SERVICE_PREFIX}/correos/send`, dto);
    }

    /**
     * Forward an email
     */
    async forwardEmail(correoId: string, to: string, comment: string): Promise<{ success: boolean; correo?: CorreoJuridico }> {
        return apiClient.post(`${SERVICE_PREFIX}/correos/${correoId}/forward`, { to, comment });
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
        // Use apiClient.getBlob so the Authorization header is included automatically
        const blob = await apiClient.getBlob(`${SERVICE_PREFIX}/correos/adjuntos/${adjuntoId}/download`);
        return window.URL.createObjectURL(blob);
    }

    /**
     * Export email to ZIP
     */
    async exportCorreoZip(id: string): Promise<string> {
        const blob = await apiClient.getBlob(`${SERVICE_PREFIX}/correos/${id}/export/zip`);
        return window.URL.createObjectURL(blob);
    }

    /**
     * Update classification manually (AI Feedback Loop)
     */
    async updateClasificacion(id: string, category: string): Promise<CorreoJuridico> {
        return apiClient.patch(`${SERVICE_PREFIX}/correos/${id}/classify`, { category });
    }

    /**
     * Link email to legal process
     */
    async vincularProceso(id: string, expedienteId: string, targetModule?: string): Promise<CorreoJuridico> {
        return apiClient.patch(`${SERVICE_PREFIX}/correos/${id}/link-process`, { expedienteId, targetModule });
    }

    /**
     * Reply to an email (maintains thread)
     */
    async replyEmail(id: string, body: string, attachments?: { name: string; contentBytes: string; contentType: string }[]): Promise<{ success: boolean }> {
        return apiClient.post(`${SERVICE_PREFIX}/correos/${id}/reply`, { body, attachments });
    }

    /**
     * Search Defensa Judicial expedientes for linking
     */
    async searchProcesosDefensa(search?: string): Promise<any[]> {
        return apiClient.get(`${SERVICE_PREFIX}/expedientes`, { params: { search } });
    }

    /**
     * Search Juzgamiento Disciplinario processes for linking
     */
    async searchProcesosJuzgamiento(search?: string): Promise<any[]> {
        return apiClient.get(`${SERVICE_PREFIX}/juzgamiento`, { params: { search } });
    }

    /**
     * Get emails linked to a specific process (Oficios)
     */
    async getCorreosByExpediente(expedienteId: string, tipo?: string): Promise<CorreoJuridico[]> {
        return apiClient.get(`${SERVICE_PREFIX}/correos`, { params: { expedienteId, tipo } });
    }

    /**
     * Reclassify ALL emails with updated heuristics
     */
    async reclassifyAll(): Promise<{ processed: number; updated: number; unchanged: number }> {
        return apiClient.post(`${SERVICE_PREFIX}/correos/reclassify-all`, {});
    }

    /**
     * Get email history / traceability
     */
    async getHistorial(id: string): Promise<any[]> {
        return apiClient.get(`${SERVICE_PREFIX}/correos/${id}/historial`);
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
    estado: 'PERSUASIVA' | 'COACTIVA' | 'MEDIDAS_CAUTELARES' | 'EXCEPCIONES' | 'LIQUIDACION';
    fechaEjecutoria?: string;
    tipoInteresAplicable?: string;
    valorCostas?: number;
    responsable?: string;
    documentosAdjuntos: number;
    notificacionesEnviadas: number;
    observaciones?: string;
    ultimaActuacion?: string;
    fechaCreacion: string;
    valorPagado?: number;
    saldoPendiente?: number;
    // Archive fields
    estadoArchivo?: 'ACTIVO' | 'ARCHIVADO' | 'ELIMINADO';
    fechaArchivo?: string;
    usuarioArchivo?: string;
    motivoArchivo?: string;
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
    fechaEjecutoria?: string;
    tipoInteresAplicable?: string;
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
    async uploadAdjunto(
        procesoId: string,
        file: File,
        metadata?: { esTituloEjecutivo?: boolean; fechaEjecutoria?: string }
    ): Promise<ProcesoCoactivoAdjunto> {
        const formData = new FormData();
        formData.append('file', file);
        if (metadata?.esTituloEjecutivo) {
            formData.append('esTituloEjecutivo', 'true');
        }
        if (metadata?.fechaEjecutoria) {
            formData.append('fechaEjecutoria', metadata.fechaEjecutoria);
        }
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

    getExportPdfUrl(procesoId: string): string {
        const baseUrl = getServiceUrl('legal');
        const prefix = API_MODE === 'direct' ? '' : '/legal/api/v1';
        return `${baseUrl}${prefix}/procesos-coactivos/${procesoId}/export-pdf`;
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

        const token = localStorage.getItem('esap_auth_token');
        const response = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error('Error descargando soporte');

        const blob = await response.blob();
        return window.URL.createObjectURL(blob);
    }

    // ============ SISTEMA DE ARCHIVO ============

    async getArchivados(): Promise<ProcesoCoactivo[]> {
        return apiClient.get<ProcesoCoactivo[]>(`${SERVICE_PREFIX}/procesos-coactivos/archivados/all`);
    }

    async archivar(id: string, motivo: string, usuario: string): Promise<ProcesoCoactivo> {
        return apiClient.put<ProcesoCoactivo>(`${SERVICE_PREFIX}/procesos-coactivos/${id}/archivar`, { motivo, usuario });
    }

    async restaurar(id: string, usuario: string): Promise<ProcesoCoactivo> {
        return apiClient.put<ProcesoCoactivo>(`${SERVICE_PREFIX}/procesos-coactivos/${id}/restaurar`, { usuario });
    }

    async eliminarPermanente(id: string, usuario: string, motivo: string): Promise<void> {
        return apiClient.post(`${SERVICE_PREFIX}/procesos-coactivos/${id}/eliminar`, { usuario, motivo });
    }

    // ============================================================================
    // CONFIGURACIONES (Key-Value)
    // ============================================================================

    /**
     * Obtiene una configuración por su clave (key)
     */
    async getConfiguration(key: string): Promise<any> {
        try {
            const response = await apiClient.get(`${SERVICE_PREFIX}/configurations/${key}`);
            return response.data?.value || null;
        } catch (error: any) {
            if (error?.response?.status === 404) {
                return null; // Si no existe, retorna null
            }
            console.error(`Error getConfiguration(${key}):`, error);
            throw error;
        }
    }

    /**
     * Actualiza o crea una configuración por su clave
     */
    async updateConfiguration(key: string, data: { value: any, module?: string, description?: string }): Promise<any> {
        try {
            const response = await apiClient.put(`${SERVICE_PREFIX}/configurations/${key}`, data);
            return response.data;
        } catch (error) {
            console.error(`Error updateConfiguration(${key}):`, error);
            throw error;
        }
    }
}

export const legalService = new LegalService();
export const ocService = new OCService();
export const riesgosService = new RiesgosService();
export const correosJuridicosService = new CorreosJuridicosService();
export const procesosCoactivosService = new ProcesosCoactivosService();
