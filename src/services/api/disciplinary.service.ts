/**
 * Disciplinary Service
 * Servicio para gestion de control disciplinario interno
 *
 * Nota: Todos los endpoints van al servicio 'control-disciplinario' del API Gateway
 * URL: /control-disciplinario/api/v1/* -> internal-disciplinary-control-service:3005/*
 */

import { apiClient } from './apiClient';
import { API_MODE, MICROSERVICE_URLS, buildApiUrl, getServiceUrl } from '../../config/environment';

// Prefijo del servicio en el API Gateway
// Nueva estructura: /{service}/api/v{version}/{path}
const SERVICE_PREFIX = '/control-disciplinario/api/v1';

// ============================================================================
// TIPOS Y DTOs
// ============================================================================

export interface DisciplinaryNews {
     id: string;
     radicado: string;
     origen: 'ANONIMO' | 'QUEJOSO' | 'OFICIO' | 'REMISION';
     fechaQueja?: string;
     fechaRecepcion?: string;
     territorial: string;
     dependenciaDenunciado: string;
     hechos: string;
     conductas?: string[];
     adjuntos?: string[];
     denunciante?: {
         nombre: string;
         email?: string;
         telefono?: string;
         direccion?: string;
         cargo?: string;
         cedula?: string;
         documento?: string;
         dependencia?: string;
         entidad?: string;
     };
     disciplinable?: {
         nombre: string;
         cargo: string;
         cedula?: string;
         documento?: string;
         email?: string;
         telefono?: string;
         dependencia?: string;
     };
     estado: 'RADICADA' | 'EN_VALORACION' | 'ASIGNADA' | 'DEVUELTA';
     kanbanStage?: string;
     createdAt: string;
     updatedAt: string;
 }

// ... (other interfaces remain similar, can refine DisciplinaryProcess if needed)

export interface CreateNewsDto {
    origen: string; // Must be: 'ANONIMO' | 'QUEJOSO' | 'OFICIO' | 'REMISION'
    territorial: string;
    dependenciaDenunciado: string;
    hechos: string;
    denunciante: string; // JSON Stringified single object
    disciplinable: string; // JSON Stringified single object
    // Backend generates these automatically, don't send:
    // radicado, fechaRecepcion, estado, observaciones
}

export interface DisciplinaryProcess {
    id: string;
    radicadoProceso: string;
    etapaActual: 'EVALUACION' | 'INDAGACION_PREVIA' | 'INVESTIGACION' | 'JUZGAMIENTO';
    kanbanStage?: string;
    kanbanNotice?: string;
    estado: 'ACTIVO' | 'SUSPENDIDO' | 'ARCHIVADO' | 'PRESCRITO';
    abogadoAsignadoId: string;
    abogadoAsignadoNombre: string;
    fechaPrescripcion: string;
    fechaVencimientoEtapa: string;
    news: DisciplinaryNews;
    createdAt: string;
    updatedAt: string;
    evidence?: any[];
    // Estadísticas dinámicas
    draftsCount?: number;
    documentsCount?: number;
    timePercentage?: number;
}

export interface ProcessStatistics {
    draftsCount: number;
    documentsCount: number;
    timePercentage: number;
}

export interface LegalAuto {
    id: string;
    tipo: string;
    contenido: string;
    estado: 'BORRADOR' | 'REVISION_JEFE' | 'APROBADO' | 'FIRMADO' | 'DEVUELTO' | 'NOTIFICADO';
    firmaUrl?: string;
    numero?: string;
    documentUrl?: string;
    documentName?: string;
    documentType?: string;
    documentSize?: number;
    comentarios?: string;
    processId: string;
    createdAt: string;
}

export interface CreateNewsDto {
    origen: string;
    fechaQueja?: string;
    territorial: string;
    dependenciaDenunciado: string;
    hechos: string;
    conductas?: string[];
    adjuntos?: string[];
    denunciante: any;
    disciplinable: any;
}

export interface AssignProcessDto {
    newsId: string;
    abogadoId: string;
    abogadoNombre: string;
}

export interface CreateAutoDto {
    processId: string;
    tipoAuto: string;
    contenidoHtml: string;
    comentarios?: string;
    numero?: string;
    documentUrl?: string;
    documentName?: string;
    documentType?: string;
    documentSize?: number;
}

export interface DocumentoExpediente {
    id: string;
    url: string;
    filename: string;
    description: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
    processId: string;
}

// ============================================================================
// SERVICIO
// ============================================================================

class DisciplinaryService {
    // --- NOTICIAS ---

    async radicarNoticia(data: CreateNewsDto, files?: File[]): Promise<DisciplinaryNews> {
        const formData = new FormData();
        // Solo enviar campos que acepta el DTO del backend
        formData.append('origen', data.origen);
        formData.append('territorial', data.territorial);
        formData.append('dependenciaDenunciado', data.dependenciaDenunciado);
        formData.append('hechos', data.hechos);
        formData.append('denunciante', JSON.stringify(data.denunciante));
        formData.append('disciplinable', JSON.stringify(data.disciplinable));
        if (data.adjuntos && data.adjuntos.length > 0) {
            formData.append('adjuntos', JSON.stringify(data.adjuntos));
        }

        // Archivos con el campo correcto que espera el backend
        if (files && files.length > 0) {
            files.forEach((file) => {
                formData.append('files', file); // Backend usa 'files', no 'adjuntos'
            });
        }

        return apiClient.upload<DisciplinaryNews>(`${SERVICE_PREFIX}/disciplinary-news`, formData);
    }

    async getNoticiasPendientes(): Promise<DisciplinaryNews[]> {
        return apiClient.get<DisciplinaryNews[]>(`${SERVICE_PREFIX}/disciplinary-news/pending-assignment`);
    }

    async getAllNoticias(): Promise<DisciplinaryNews[]> {
        return apiClient.get<DisciplinaryNews[]>(`${SERVICE_PREFIX}/disciplinary-news`);
    }

    async returnNews(id: string, observaciones: string): Promise<DisciplinaryNews> {
        return apiClient.patch<DisciplinaryNews>(`${SERVICE_PREFIX}/disciplinary-news/${id}/return`, { observaciones });
    }

    async updateNewsKanban(id: string, kanbanStage: string): Promise<DisciplinaryNews> {
        return apiClient.patch<DisciplinaryNews>(`${SERVICE_PREFIX}/disciplinary-news/${id}/kanban`, { kanbanStage });
    }

    async changeNewsStatus(id: string, newStatus: string): Promise<DisciplinaryNews> {
        return apiClient.patch<DisciplinaryNews>(`${SERVICE_PREFIX}/disciplinary-news/${id}/status`, { status: newStatus });
    }

    async archiveNews(id: string, reason: string): Promise<DisciplinaryNews> {
        return apiClient.patch<DisciplinaryNews>(`${SERVICE_PREFIX}/disciplinary-news/${id}/archive`, { reason });
    }



    // --- PROCESOS ---

    async getAllProcesos(): Promise<DisciplinaryProcess[]> {
        return apiClient.get<DisciplinaryProcess[]>(`${SERVICE_PREFIX}/disciplinary-processes`);
    }

    async getAutosByProceso(processId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/disciplinary-autos/by-process/${processId}`);
    }

    async getMisProcesos(abogadoId: string): Promise<DisciplinaryProcess[]> {
        return apiClient.get<DisciplinaryProcess[]>(`${SERVICE_PREFIX}/disciplinary-processes/my-processes`, { abogadoId });
    }

    async asignarProceso(data: AssignProcessDto): Promise<DisciplinaryProcess> {
        return apiClient.post<DisciplinaryProcess>(`${SERVICE_PREFIX}/disciplinary-processes/assign`, data);
    }

    async cambiarEtapa(id: string, nuevaEtapa: string, kanbanStage?: string, kanbanNotice?: string): Promise<DisciplinaryProcess> {
        return apiClient.patch<DisciplinaryProcess>(`${SERVICE_PREFIX}/disciplinary-processes/${id}/stage`, {
            stage: nuevaEtapa,
            kanbanStage,
            kanbanNotice,
        });
    }

    async getStats(): Promise<{ procesosActivos: number; proximosAVencer: number; vencidos: number; profesionales: number }> {
        return apiClient.get<{ procesosActivos: number; proximosAVencer: number; vencidos: number; profesionales: number }>(`${SERVICE_PREFIX}/disciplinary-processes/stats`);
    }

    async deleteProceso(id: string): Promise<void> {
        return apiClient.delete<void>(`${SERVICE_PREFIX}/disciplinary-processes/${id}`);
    }

    async addEvidence(id: string, url: string, originalName: string): Promise<DisciplinaryProcess> {
        return apiClient.patch<DisciplinaryProcess>(`${SERVICE_PREFIX}/disciplinary-processes/${id}/evidence`, { url, originalName });
    }

    // --- DOCUMENTOS DEL EXPEDIENTE ---

    /**
     * Subir documento al expediente del proceso
     */
    async uploadDocumento(
        processId: string,
        file: File,
        tipo?: string,
        descripcion?: string,
        nombre?: string,
        etapa?: string,
        usuarioCarga?: string,
        categoria?: string,
        destinatario?: string,
        asunto?: string,
        participantes?: number,
    ): Promise<{ message: string; url: string; filename: string }> {
        const formData = new FormData();
        formData.append('file', file);
        // Siempre enviar tipo, usar 'DOCUMENTO' como valor por defecto si no se proporciona
        formData.append('tipo', tipo || 'DOCUMENTO');
        if (descripcion) formData.append('descripcion', descripcion);
        if (nombre) formData.append('nombre', nombre);
        if (etapa) formData.append('etapa', etapa);
        if (usuarioCarga) formData.append('usuarioCarga', usuarioCarga);
        if (categoria) formData.append('categoria', categoria);
        if (destinatario) formData.append('destinatario', destinatario);
        if (asunto) formData.append('asunto', asunto);
        if (participantes !== undefined) {
            formData.append('participantes', String(participantes));
        }

        return apiClient.upload<{ message: string; url: string; filename: string }>(
            `${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents`,
            formData
        );
    }

    /**
     * Listar documentos del expediente del proceso
     */
    async getDocumentosExpediente(processId: string): Promise<{
        proceso: { id: string; radicadoProceso: string };
        documentos: any[]; // El backend devuelve el formato completo ya mapeado
    }> {
        return apiClient.get<{
            proceso: { id: string; radicadoProceso: string };
            documentos: any[];
        }>(`${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents`);
    }

    /**
     * Descargar documento del expediente
     */
    async downloadDocument(processId: string, documentId: string, filename: string): Promise<void> {
        // Construir URL usando buildApiUrl para respetar el modo de conexion (gateway/direct)
        const endpoint = `/api/v1/disciplinary-processes/${processId}/documents/${documentId}/download`;
        const url = buildApiUrl('control-disciplinario', endpoint);

        // Obtener token de autenticacion
        const token = localStorage.getItem('esap_access_token');
        const headers: HeadersInit = {
            'Accept': 'application/octet-stream',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch {
                // Si no es JSON, usar el texto del error
            }
            throw new Error(errorMessage);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    }

    /**
     * Descargar archivo desde una URL directa (para Autos y otros)
     */
    async downloadFileFromUrl(url: string, filename: string): Promise<void> {
        // La URL ya viene relativa del backend (ej: /control-disciplinario/api/v1/...)
        // NO remover el slash inicial
        const fullUrl = buildApiUrl('control-disciplinario', url) + (url.includes('?') ? '&' : '?') + 't=' + Date.now();

        const token = localStorage.getItem('esap_access_token');
        const headers: HeadersInit = {
            'Accept': '*/*', // Aceptar cualquier cosa (binarios)
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
        }

        const blob = await response.blob();
        const objUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objUrl);
    }

    /**
     * Eliminar documento del expediente
     */
    async deleteDocumento(processId: string, documentId: string): Promise<void> {
        return apiClient.delete<void>(
            `${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents/${documentId}`
        );
    }

    /**
     * Obtener URL para descargar documento
     */
    getDocumentoUrl(urlRelativa: string): string {
        // La URL relativa viene del backend, necesitamos construir la URL completa
        // Por ahora asumimos que esta en el mismo dominio
        return `${window.location.origin}/control-disciplinario/api/v1/files/${urlRelativa}`;
    }

    /**
     * Obtener URL completa para archivos adjuntos de noticias
     */
    getFileUrl(urlRelativa: string): string {
        if (!urlRelativa) return '';
        if (/^https?:\/\//i.test(urlRelativa)) return urlRelativa;

        const normalized = urlRelativa.startsWith('/') ? urlRelativa : `/${urlRelativa}`;
        if (API_MODE === 'direct') {
            return `${MICROSERVICE_URLS['control-disciplinario']}${normalized}`;
        }
        return `${getServiceUrl('control-disciplinario')}${SERVICE_PREFIX}${normalized}`;
    }

    // --- AUTOS ---

    async getAllAutos(): Promise<LegalAuto[]> {
        return apiClient.get<LegalAuto[]>(`${SERVICE_PREFIX}/disciplinary-autos`);
    }

    async getAutosPorProceso(processId: string): Promise<LegalAuto[]> {
        return apiClient.get<LegalAuto[]>(`${SERVICE_PREFIX}/disciplinary-autos/by-process/${processId}`);
    }

    async crearAuto(data: CreateAutoDto): Promise<LegalAuto> {
        return apiClient.post<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos`, data);
    }

    async deleteAuto(id: string): Promise<void> {
        return apiClient.delete<void>(`${SERVICE_PREFIX}/disciplinary-autos/${id}`);
    }

    async updateAuto(id: string, data: any): Promise<LegalAuto> {
        return apiClient.put<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}`, data);
    }

    async updateAutoContent(id: string, contenidoHtml: string): Promise<LegalAuto> {
        return apiClient.patch<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/content`, { contenidoHtml });
    }

    async updateProcess(id: string, data: Partial<DisciplinaryProcess> & { abogadoId?: string; hechos?: string; disciplinable?: any }): Promise<DisciplinaryProcess> {
        return apiClient.patch<DisciplinaryProcess>(`${SERVICE_PREFIX}/disciplinary-processes/${id}`, data);
    }

    async getProcesoByRadicado(radicado: string): Promise<DisciplinaryProcess> {
        const safeRadicado = encodeURIComponent(radicado);
        return apiClient.get<DisciplinaryProcess>(`${SERVICE_PREFIX}/disciplinary-processes/by-radicado/${safeRadicado}`);
    }

    async sendToReview(id: string): Promise<LegalAuto> {
        return apiClient.patch<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/send-review`, {});
    }

    async aprobarAuto(id: string, aprobadoPorId: string): Promise<LegalAuto> {
        return apiClient.patch<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/approve?aprobadoPorId=${aprobadoPorId}`, {
            action: 'APPROVE'
        });
    }

    async firmarAuto(id: string, userId: string): Promise<LegalAuto> {
        return apiClient.patch<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/sign?userId=${userId}`, {});
    }

    async devolverAuto(id: string, aprobadoPorId: string, observaciones: string): Promise<LegalAuto> {
        return apiClient.patch<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/approve?aprobadoPorId=${aprobadoPorId}`, {
            action: 'RETURN',
            observaciones
        });
    }

    async registrarNotificacion(id: string, fecha: string, evidencia?: string): Promise<LegalAuto> {
        return apiClient.patch<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/notify`, {
            notificationDate: fecha,
            notificationEvidence: evidencia
        });
    }

    async getHistorialVersiones(id: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/versions`);
    }

    // --- PROFESIONALES ---

    async getProfesionales(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/professionals`);
    }

    async deleteProfessional(id: string): Promise<void> {
        return apiClient.delete<void>(`${SERVICE_PREFIX}/professionals/${id}`);
    }

    async crearProfesional(data: any): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/professionals`, data);
    }

    async updateProfessional(id: string, data: any): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/professionals/${id}`, data);
    }

    async uploadSignature(professionalId: string, file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.upload<{ url: string }>(`${SERVICE_PREFIX}/professionals/${professionalId}/signature`, formData);
    }

    async getCandidates(): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/professionals/candidates`);
    }

    async getProfessionalsWorkload(): Promise<Array<{ id: string; nombre: string; procesosAsignados: number; capacidadMaxima: number }>> {
        return apiClient.get<Array<{ id: string; nombre: string; procesosAsignados: number; capacidadMaxima: number }>>(`${SERVICE_PREFIX}/professionals/workload`);
    }

    // --- ARCHIVOS ---
    async uploadFile(file: File): Promise<{ url: string; filename: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.upload<{ url: string; filename: string }>(`${SERVICE_PREFIX}/files/upload`, formData);
    }

    // ==================== CONFIGURACION ====================
    async getStageConfiguration() {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/configuration/stages`);
    }

    async updateStageConfiguration(configs: any[]) {
        return apiClient.put<any[]>(`${SERVICE_PREFIX}/configuration/stages`, configs);
    }

    async getGlobalConfig() {
        return apiClient.get<any>(`${SERVICE_PREFIX}/configuration/global`);
    }

    async updateGlobalConfig(config: any) {
        return apiClient.put<any>(`${SERVICE_PREFIX}/configuration/global`, config);
    }

    async getAvailableRoles(): Promise<string[]> {
        return apiClient.get<string[]>(`${SERVICE_PREFIX}/configuration/available-roles`);
    }

    /**
     * Descargar ZIP con todos los expedientes (exportación masiva)
     */
    async downloadAllExpedientesZip(): Promise<void> {
        // Usar buildApiUrl para respetar el modo de conexión
        const endpoint = `/api/v1/configuration/export/zip`;
        const url = buildApiUrl('control-disciplinario', endpoint);

        // Obtener token
        const token = localStorage.getItem('esap_access_token');
        const headers: HeadersInit = {
            'Accept': 'application/zip',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `Expedientes_Disciplinarios_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    }

    // ==================== ESTADÍSTICAS DEL PROCESO ====================

    /**
     * Obtener estadísticas dinámicas de un proceso específico
     */
    async getProcessStatistics(processId: string): Promise<ProcessStatistics> {
        return apiClient.get<ProcessStatistics>(
            `${SERVICE_PREFIX}/disciplinary-processes/${processId}/statistics`
        );
    }

    // --- PLANTILLAS DE AUTOS ---
    async getPlantillaAuto(tipoAuto: string): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/auto-templates/${tipoAuto}`);
    }

    async getConfiguracionPlantillaAuto(): Promise<any> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/auto-templates/config`);
    }

    async updateConfiguracionPlantillaAuto(config: any): Promise<any> {
        return apiClient.put<any>(`${SERVICE_PREFIX}/auto-templates/config`, config);
    }

    // --- EVIDENCIAS ---
    // Nota: Estos endpoints pertenecen al microservicio legal-management
    // Prefix: /legal/api/v1 -> api-gateway:3000/legal/api/v1/* -> legal-management-service:3008/*
    async getEvidencias(expedienteId: string): Promise<any[]> {
        return apiClient.get<any[]>(`/legal/api/v1/evidencias/expediente/${expedienteId}`);
    }

    async createEvidencia(expedienteId: string, data: any, file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('descripcion', data.descripcion || '');
        formData.append('aportadoPor', data.aportadoPor || 'Sistema');
        formData.append('tipo', data.tipo || 'Documental');
        formData.append('prioridad', data.prioridad || 'Media');

        return apiClient.upload<any>(`/legal/api/v1/evidencias/${expedienteId}`, formData);
    }

    async updateEvidenciaEstado(id: string, estado: string): Promise<any> {
        return apiClient.patch<any>(`/legal/api/v1/evidencias/${id}/estado`, { estado });
    }

    async deleteEvidenciaReal(id: string): Promise<void> {
        return apiClient.delete<void>(`/legal/api/v1/evidencias/${id}`);
    }

    // --- ACTAS ---
    async getActas(expedienteId: string): Promise<any[]> {
        return apiClient.get<any[]>(`/legal/api/v1/actas/expediente/${expedienteId}`);
    }

    async createActa(expedienteId: string, data: any, file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
                formData.append(key, data[key]);
            }
        });
        return apiClient.upload<any>(`/legal/api/v1/actas/${expedienteId}`, formData);
    }

    async updateActaEstado(id: string, estado: string): Promise<any> {
        return apiClient.patch<any>(`/legal/api/v1/actas/${id}/estado`, { estado });
    }

    async deleteActaReal(id: string): Promise<void> {
        return apiClient.delete<void>(`/legal/api/v1/actas/${id}`);
    }
}

const disciplinaryService = new DisciplinaryService();
export default disciplinaryService;
export { disciplinaryService };
