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

// export interface CreateNewsDto {
//     origen: string; // Must be: 'ANONIMO' | 'QUEJOSO' | 'OFICIO' | 'REMISION'
//     territorial: string;
//     dependenciaDenunciado: string;
//     hechos: string;
//     denunciante: string; // JSON Stringified single object
//     disciplinable: string; // JSON Stringified single object
//     // Backend generates these automatically, don't send:
//     // radicado, fechaRecepcion, estado, observaciones
// }

export interface DisciplinaryProcess {
    id: string;
    radicadoProceso: string;
    etapaActual: 'EVALUACION' | 'INDAGACION_PREVIA' | 'INVESTIGACION' | 'JUZGAMIENTO' | 'FALLO' | 'SEGUNDA_INSTANCIA' | 'INDAGACION';
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

// Tipo para configuración de autos
export interface AutoConfiguration {
    id: string;
    tipo: string;
    nombre: string;
    estado: string;
    plantilla?: string;
    stage: string | null;
    orden: number;
    createdAt: string;
    updatedAt: string;
    // Campos de plantilla
    nombre_plantilla?: string;
    descripcion_plantilla?: string;
    version_plantilla?: string;
    estado_plantilla?: string;
}

// DTO para crear configuración de auto
export interface CreateAutoConfigurationDto {
    tipo: string;
    nombre: string;
    estado?: 'activo' | 'inactivo';
    plantilla?: string;
    stage?: string;
    orden?: number;
}

// DTO para actualizar configuración de auto
export interface UpdateAutoConfigurationDto {
    tipo?: string;
    nombre?: string;
    estado?: 'activo' | 'inactivo';
    plantilla?: string;
    stage?: string;
    orden?: number;
    // Campos de plantilla
    nombre_plantilla?: string;
    descripcion_plantilla?: string;
    version_plantilla?: string;
    estado_plantilla?: string;
}

// ==================== CONFIGURACIÓN DE OFICIOS ====================

// Tipo para configuración de oficios
export interface OficioConfiguration {
    id: string;
    tipo: string;
    nombre: string;
    codigo: string;
    descripcion: string;
    estado: string;
    plantilla?: string;
    stage: string | null;
    orden: number;
    createdAt: string;
    updatedAt: string;
    // Campos de plantilla
    nombre_plantilla?: string;
    descripcion_plantilla?: string;
    version_plantilla?: string;
    estado_plantilla?: string;
}

// DTO para crear configuración de oficio
export interface CreateOficioConfigurationDto {
    tipo: string;
    nombre: string;
    codigo: string;
    descripcion?: string;
    estado?: 'activo' | 'inactivo';
    plantilla?: string;
    stage?: string;
    orden?: number;
}

// DTO para actualizar configuración de oficio
export interface UpdateOficioConfigurationDto {
    tipo?: string;
    nombre?: string;
    codigo?: string;
    descripcion?: string;
    estado?: 'activo' | 'inactivo';
    plantilla?: string;
    stage?: string;
    orden?: number;
    // Campos de plantilla
    nombre_plantilla?: string;
    descripcion_plantilla?: string;
    version_plantilla?: string;
    estado_plantilla?: string;
}

export interface CreateNewsDto {
    origen: string;
    fechaQueja?: string;
    fechaHechos?: string;
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
        if (data.fechaHechos) {
            formData.append('fechaHechos', data.fechaHechos);
        }
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

    async updateNoticia(id: string, data: {
        origen?: string;
        territorial?: string;
        dependenciaDenunciado?: string;
        hechos?: string;
        denunciante?: any;
        disciplinable?: any;
        conductas?: string[];
        fechaHechos?: string | null;
        fechaQueja?: string;
        usuario?: string;
    }): Promise<DisciplinaryNews> {
        return apiClient.put<DisciplinaryNews>(`${SERVICE_PREFIX}/disciplinary-news/${id}`, data);
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

    /**
     * Remitir noticia por competencia a otra entidad
     * Envía un correo con la información de la noticia a la entidad destinataria
     */
    async remitirPorCompetencia(data: {
        newsId: string;
        emailDestinatario: string;
        entidadDestino: string;
        justificacion: string;
        usuarioRemision?: string;
    }): Promise<{
        success: boolean;
        message: string;
        newsId: string;
        emailEnviado: string;
        fechaRemision: Date;
    }> {
        return apiClient.post<{
            success: boolean;
            message: string;
            newsId: string;
            emailEnviado: string;
            fechaRemision: Date;
        }>(`${SERVICE_PREFIX}/disciplinary-processes/remitir-competencia`, data);
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
        // Verificar si la URL ya es absoluta (contiene protocolo)
        let fullUrl: string;

        if (/^https?:\/\//i.test(url)) {
            // URL ya es absoluta, usarla directamente
            fullUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
        } else if (url.startsWith('/control-disciplinario/')) {
            // La URL ya contiene el prefijo del servicio, extraer la ruta relativa
            // /control-disciplinario/api/v1/... -> /api/v1/...
            const path = url.replace(/^\/control-disciplinario/, '/');
            fullUrl = buildApiUrl('control-disciplinario', path) + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
        } else if (url.startsWith('/files/')) {
            // La URL es para archivos estáticos, construir correctamente
            // /files/filename -> /files/filename
            fullUrl = buildApiUrl('control-disciplinario', url) + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
        } else {
            // URL relativa, construir URL completa
            fullUrl = buildApiUrl('control-disciplinario', url) + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
        }

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
     * Obtener URL completa para archivos adjuntos
     * SIMPLIFICADO: Los archivos se guardan en ./uploads/{timestamp}_{nombre_original}
     * Siempre devuelve una ruta relativa para que downloadFileFromUrl funcione correctamente
     */
    getFileUrl(urlRelativa: string): string {
        if (!urlRelativa) return '';

        // Si ya es una URL completa, devolverla tal cual (para backward compatibility)
        if (/^https?:\/\//i.test(urlRelativa)) return urlRelativa;

        // Extraer solo el nombre del archivo (última parte del path)
        let filename = urlRelativa;
        if (urlRelativa.includes('/')) {
            filename = urlRelativa.split('/').pop() || urlRelativa;
        }
        // Limpiar prefijo /files/ si existe
        if (filename.startsWith('/files/')) {
            filename = filename.substring(7);
        } else if (filename.startsWith('files/')) {
            filename = filename.substring(6);
        }

        // Devolver solo la ruta relativa (sin el host)
        // Esto permite que downloadFileFromUrl construya la URL correctamente
        return `/files/${filename}`;
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

    async firmarAuto(id: string, userId: string, data?: any): Promise<LegalAuto> {
        return apiClient.patch<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/sign?userId=${userId}`, data || {});
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
    async uploadFile(file: File, tipo: string = 'default'): Promise<{ url: string; filename: string }> {
        const formData = new FormData();
        formData.append('file', file);
        // Enviar el tipo de documento para que el backend valide los formatos permitidos
        formData.append('tipo', tipo);
        return apiClient.upload<{ url: string; filename: string }>(`${SERVICE_PREFIX}/files/upload`, formData);
    }

    // ==================== CONFIGURACION ====================
    async getStageConfiguration() {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/configuration/stages`);
    }

    async createStage(config: any) {
        return apiClient.post<any>(`${SERVICE_PREFIX}/configuration/stages`, config);
    }

    async deleteStage(id: string) {
        return apiClient.delete<any>(`${SERVICE_PREFIX}/configuration/stages/${id}`);
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
    // ✅ Redirigido al servicio disciplinario (port 3005) en vez de legal-management (port 3008)
    // Los documentos de tipo EVIDENCIA se gestionan via los endpoints de documents del proceso
    async getEvidencias(processId: string): Promise<any[]> {
        try {
            const response = await apiClient.get<any>(`${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents`);
            const documentos = response.documentos || [];
            // Filtrar solo los documentos de tipo evidencia y mapear al formato esperado
            return documentos
                .filter((doc: any) => doc.tipo === 'evidencia' || doc.tipo === 'otro')
                .map((doc: any) => ({
                    id: doc.id,
                    archivoNombre: doc.archivoNombre || doc.nombre || 'Evidencia',
                    tipo: doc.tipo || 'evidencia',
                    categoria: doc.etapa || null,
                    fechaPresentacion: doc.fechaCarga,
                    archivoTamano: doc.fileSize || 0,
                    archivoUrl: doc.downloadUrl || doc.url || null,
                    tipoArchivo: doc.fileType || '',
                    descripcion: doc.descripcion || '',
                    estado: 'Pendiente',
                    processId: doc.processId || processId,
                }));
        } catch (error) {
            console.error('Error cargando evidencias:', error);
            return [];
        }
    }

    async createEvidencia(processId: string, data: any, file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', 'EVIDENCIA');
        formData.append('descripcion', data.descripcion || '');
        formData.append('nombre', file.name);
        formData.append('etapa', data.tipo || 'Evidencia');
        formData.append('usuarioCarga', data.aportadoPor || 'Sistema');

        return apiClient.upload<any>(`${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents`, formData);
    }

    async updateEvidenciaEstado(id: string, estado: string): Promise<any> {
        // No hay endpoint directo para actualizar estado de evidencia en el servicio disciplinario
        // Se actualiza localmente en el frontend por ahora
        console.warn('updateEvidenciaEstado: no hay endpoint disponible en port 3005, operación local');
        return { id, estado };
    }

    async deleteEvidenciaReal(evidenciaId: string, processId?: string): Promise<void> {
        if (processId) {
            return apiClient.delete<void>(`${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents/${evidenciaId}`);
        }
        // Fallback: intentar eliminar sin processId (puede fallar si la ruta lo requiere)
        console.warn('deleteEvidenciaReal: processId no proporcionado, intentando ruta alternativa');
        return apiClient.delete<void>(`${SERVICE_PREFIX}/disciplinary-processes/documents/${evidenciaId}`);
    }

    // --- OFICIOS ---
    async getOficios(processId: string): Promise<any[]> {
        try {
            const response = await apiClient.get<any>(`${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents`);
            const documentos = response.documentos || [];
            return documentos.filter((doc: any) => doc.tipo === 'oficio');
        } catch (error) {
            console.error('Error cargando oficios:', error);
            return [];
        }
    }

    async createOficio(processId: string, data: { nombre?: string; destinatario?: string; asunto?: string; descripcion?: string; etapa?: string; categoria?: string; usuarioCarga?: string }, file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', 'OFICIO');
        formData.append('nombre', data.nombre || file.name);
        if (data.destinatario) formData.append('destinatario', data.destinatario);
        if (data.asunto) formData.append('asunto', data.asunto);
        if (data.descripcion) formData.append('descripcion', data.descripcion);
        if (data.etapa) formData.append('etapa', data.etapa);
        if (data.categoria) formData.append('categoria', data.categoria);
        formData.append('usuarioCarga', data.usuarioCarga || 'Sistema');
        return apiClient.upload<any>(`${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents`, formData);
    }

    async deleteOficio(processId: string, oficioId: string): Promise<void> {
        return apiClient.delete<void>(`${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents/${oficioId}`);
    }

    // --- ACTAS ---
    async getActas(processId: string): Promise<any[]> {
        try {
            const response = await apiClient.get<any>(`${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents`);
            const documentos = response.documentos || [];
            return documentos.filter((doc: any) => doc.tipo === 'acta');
        } catch (error) {
            console.error('Error cargando actas:', error);
            return [];
        }
    }

    async createActa(processId: string, data: any, file: File): Promise<any> {
        // Build a structured description containing all acta-specific fields
        const parts: string[] = [];
        if (data.tipo) parts.push(`Tipo: ${data.tipo}`);
        if (data.horario) parts.push(`Horario: ${data.horario}`);
        if (data.duracion) parts.push(`Duración: ${data.duracion}`);
        if (data.lugar) parts.push(`Lugar: ${data.lugar}`);
        if (data.presidente) parts.push(`Presidente: ${data.presidente}`);
        if (data.participantes) parts.push(`Participantes: ${data.participantes}`);
        if (data.resumen) parts.push(`Resumen: ${data.resumen}`);
        if (data.decisionesTomadas) parts.push(`Decisiones: ${data.decisionesTomadas}`);
        const descripcion = parts.join(' | ');

        const nombre = data.numeroActa || data.nombre || file.name;
        return this.uploadDocumento(
            processId,
            file,
            'ACTA',
            descripcion,
            nombre,
            data.etapa || undefined,
            data.usuarioCarga || 'Sistema',
        );
    }

    async deleteActa(processId: string, actaId: string): Promise<void> {
        return apiClient.delete<void>(`${SERVICE_PREFIX}/disciplinary-processes/${processId}/documents/${actaId}`);
    }

    // ==================== CONFIGURACIÓN DE AUTOS ====================

    /**
     * Obtener todas las configuraciones de autos
     */
    async getAutosConfiguration(): Promise<AutoConfiguration[]> {
        return apiClient.get<AutoConfiguration[]>(`${SERVICE_PREFIX}/autos-configuration`);
    }

    /**
     * Obtener solo las configuraciones de autos activas
     */
    async getAutosConfigurationActive(): Promise<AutoConfiguration[]> {
        return apiClient.get<AutoConfiguration[]>(`${SERVICE_PREFIX}/autos-configuration/active`);
    }

    /**
     * Obtener una configuración de auto por ID
     */
    async getAutosConfigurationById(id: string): Promise<AutoConfiguration> {
        return apiClient.get<AutoConfiguration>(`${SERVICE_PREFIX}/autos-configuration/${id}`);
    }

    /**
     * Obtener una configuración de auto por tipo
     */
    async getAutosConfigurationByTipo(tipo: string): Promise<AutoConfiguration> {
        return apiClient.get<AutoConfiguration>(`${SERVICE_PREFIX}/autos-configuration/tipo/${tipo}`);
    }

    /**
     * Crear nueva configuración de auto
     */
    async createAutosConfiguration(data: CreateAutoConfigurationDto): Promise<AutoConfiguration> {
        return apiClient.post<AutoConfiguration>(`${SERVICE_PREFIX}/autos-configuration`, data);
    }

    /**
     * Actualizar configuración de auto
     */
    async updateAutosConfiguration(id: string, data: UpdateAutoConfigurationDto): Promise<AutoConfiguration> {
        return apiClient.put<AutoConfiguration>(`${SERVICE_PREFIX}/autos-configuration/${id}`, data);
    }

    /**
     * Eliminar configuración de auto
     */
    async deleteAutosConfiguration(id: string): Promise<void> {
        return apiClient.delete<void>(`${SERVICE_PREFIX}/autos-configuration/${id}`);
    }

    /**
     * Activar/desactivar configuración de auto
     */
    async toggleAutosConfigurationEstado(id: string): Promise<AutoConfiguration> {
        return apiClient.patch<AutoConfiguration>(`${SERVICE_PREFIX}/autos-configuration/${id}/toggle-estado`, {});
    }

    /**
     * Subir plantilla Word para un auto
     */
    async uploadAutoPlantilla(id: string, file: File): Promise<AutoConfiguration> {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.upload<AutoConfiguration>(`${SERVICE_PREFIX}/autos-configuration/${id}/upload-files`, formData);
    }

    // ==================== CONFIGURACIÓN DE OFICIOS ====================

    /**
     * Obtener todas las configuraciones de oficios
     */
    async getOficiosConfiguration(): Promise<OficioConfiguration[]> {
        return apiClient.get<OficioConfiguration[]>(`${SERVICE_PREFIX}/oficios-configuration`);
    }

    /**
     * Obtener solo las configuraciones de oficios activas
     */
    async getOficiosConfigurationActive(): Promise<OficioConfiguration[]> {
        return apiClient.get<OficioConfiguration[]>(`${SERVICE_PREFIX}/oficios-configuration/active`);
    }

    /**
     * Obtener una configuración de oficio por ID
     */
    async getOficiosConfigurationById(id: string): Promise<OficioConfiguration> {
        return apiClient.get<OficioConfiguration>(`${SERVICE_PREFIX}/oficios-configuration/${id}`);
    }

    /**
     * Obtener una configuración de oficio por tipo
     */
    async getOficiosConfigurationByTipo(tipo: string): Promise<OficioConfiguration> {
        return apiClient.get<OficioConfiguration>(`${SERVICE_PREFIX}/oficios-configuration/tipo/${tipo}`);
    }

    /**
     * Obtener configuraciones de oficio por stage
     */
    async getOficiosConfigurationByStage(stage: string): Promise<OficioConfiguration[]> {
        return apiClient.get<OficioConfiguration[]>(`${SERVICE_PREFIX}/oficios-configuration/stage/${stage}`);
    }

    /**
     * Crear nueva configuración de oficio
     */
    async createOficioConfiguration(data: CreateOficioConfigurationDto): Promise<OficioConfiguration> {
        return apiClient.post<OficioConfiguration>(`${SERVICE_PREFIX}/oficios-configuration`, data);
    }

    /**
     * Actualizar configuración de oficio
     */
    async updateOficioConfiguration(id: string, data: UpdateOficioConfigurationDto): Promise<OficioConfiguration> {
        return apiClient.put<OficioConfiguration>(`${SERVICE_PREFIX}/oficios-configuration/${id}`, data);
    }

    /**
     * Eliminar configuración de oficio
     */
    async deleteOficioConfiguration(id: string): Promise<void> {
        return apiClient.delete<void>(`${SERVICE_PREFIX}/oficios-configuration/${id}`);
    }

    /**
     * Activar/desactivar configuración de oficio
     */
    async toggleOficioConfigurationEstado(id: string): Promise<OficioConfiguration> {
        return apiClient.patch<OficioConfiguration>(`${SERVICE_PREFIX}/oficios-configuration/${id}/toggle-estado`, {});
    }

    /**
     * Subir plantilla Word para un oficio
     */
    async uploadOficioPlantilla(
        id: string, 
        file: File,
        nombrePlantilla?: string,
        descripcionPlantilla?: string,
        versionPlantilla?: string,
        estadoPlantilla?: string
    ): Promise<OficioConfiguration> {
        const formData = new FormData();
        formData.append('file', file);
        // Enviar campos adicionales del plantilla
        if (nombrePlantilla) formData.append('nombre_plantilla', nombrePlantilla);
        if (descripcionPlantilla) formData.append('descripcion_plantilla', descripcionPlantilla);
        if (versionPlantilla) formData.append('version_plantilla', versionPlantilla);
        if (estadoPlantilla) formData.append('estado_plantilla', estadoPlantilla);
        return apiClient.upload<OficioConfiguration>(`${SERVICE_PREFIX}/oficios-configuration/${id}/upload-files`, formData);
    }

    // ==================== COMPARTIR EXPEDIENTE ====================

    /**
     * Crear un enlace compartido para un expediente
     */
    async crearEnlaceCompartido(
        procesoId: string,
        data: {
            tipoCompartido?: 'LINK' | 'QR' | 'EMAIL';
            requiereClave?: boolean;
            clave?: string;
            tiempoExpiracionHoras?: number;
            emailDestinatario?: string;
            mensajeAdicional?: string;
            esPublico?: boolean;
        }
    ): Promise<{
        id: string;
        token: string;
        url: string;
        urlQR: string;
        tipoCompartido: string;
        requiereClave: boolean;
        tiempoExpiracionHoras: number;
        fechaExpiracion: string;
        emailDestinatario: string;
        createdAt: string;
    }> {
        // Debug: verificar que hay token disponible
        const token = localStorage.getItem('esap_auth_token');
        console.log('[DEBUG] Token available:', !!token);
        console.log('[DEBUG] Token prefix:', token?.substring(0, 20));

        // Obtener la URL base del frontend para generar enlaces correctos
        // Esto asegura que la URL funcione en todos los ambientes (local, dev, qa, pre, prod)
        const frontendBaseUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
        console.log('[DEBUG] Frontend base URL:', frontendBaseUrl);

        return apiClient.post<any>(`${SERVICE_PREFIX}/compartir-expediente/${procesoId}`, {
            ...data,
            frontendBaseUrl
        });
    }

    /**
     * Listar enlaces compartidos de un proceso
     */
    async listarEnlacesCompartidos(procesoId: string): Promise<any[]> {
        return apiClient.get<any[]>(`${SERVICE_PREFIX}/compartir-expediente/proceso/${procesoId}`);
    }

    /**
     * Desactivar un enlace compartido
     */
    async desactivarEnlaceCompartido(id: string): Promise<{ message: string }> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/compartir-expediente/${id}/desactivar`, {});
    }

    /**
     * Verificar acceso a un enlace compartido (público)
     * Cambiado a GET para evitar problemas con autenticación
     */
    async verificarAccesoCompartido(token: string, clave?: string): Promise<{
        tieneAcceso: boolean;
        requiereClave: boolean;
        expediente?: { id: string; radicado: string };
        mensaje?: string;
    }> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/compartir-expediente/verificar/${token}`, { clave: clave || '' }, { skipAuth: true });
    }

    /**
     * Obtener datos públicos del expediente compartido (público)
     */
    async obtenerExpedientePublico(token: string): Promise<{
        token: string;
        requiereClave: boolean;
        proceso: {
            id: string;
            radicado: string;
            etapaActual: string;
            estado: string;
            fechaVencimientoEtapa: string;
        };
    }> {
        return apiClient.get<any>(`${SERVICE_PREFIX}/compartir-expediente/publico/${token}`, undefined, { skipAuth: true });
    }

    // --- ASOCIACIONES ---

    async asociarNoticiaAProceso(noticiaId: string, procesoId: string, justificacion: string): Promise<any> {
        return apiClient.patch<any>(`${SERVICE_PREFIX}/disciplinary-news/${noticiaId}/associate-process`, {
            procesoDestinoId: procesoId,
            justificacion,
        });
    }

    async asociarProcesoAProceso(
        procesoOrigenId: string,
        procesoDestinoId: string,
        tipoAsociacion: 'conexo' | 'similar' | 'consolidado',
        justificacion: string,
    ): Promise<any> {
        return apiClient.post<any>(`${SERVICE_PREFIX}/disciplinary-processes/${procesoOrigenId}/associate-process`, {
            procesoDestinoId,
            tipoAsociacion,
            justificacion,
        });
    }
}

const disciplinaryService = new DisciplinaryService();
export default disciplinaryService;
export { disciplinaryService };
