/**
 * Disciplinary Service
 * Servicio para gestión de control disciplinario interno
 *
 * Nota: Todos los endpoints van al servicio 'control-disciplinario' del API Gateway
 * URL: /control-disciplinario/api/v1/* -> internal-disciplinary-control-service:3005/*
 */

import { apiClient } from './apiClient';
import { buildApiUrl } from '../../config/environment';

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
    territorial: string;
    dependenciaDenunciado: string;
    hechos: string;
    denunciante: {
        nombre: string;
        email: string;
        telefono?: string;
        direccion?: string;
    };
    disciplinable: {
        nombre: string;
        cargo: string;
        cedula?: string;
        email?: string;
        telefono?: string;
    };
    estado: 'RADICADA' | 'EN_VALORACION' | 'ASIGNADA' | 'DEVUELTA';
    createdAt: string;
    updatedAt: string;
}

export interface DisciplinaryProcess {
    id: string;
    radicadoProceso: string;
    etapaActual: 'EVALUACION' | 'INDAGACION_PREVIA' | 'INVESTIGACION' | 'JUZGAMIENTO';
    estado: 'ACTIVO' | 'SUSPENDIDO' | 'ARCHIVADO' | 'PRESCRITO';
    abogadoAsignadoId: string;
    abogadoAsignadoNombre: string; // Backend might need to return this or we fetch it
    fechaPrescripcion: string;
    fechaVencimientoEtapa: string;
    news: DisciplinaryNews;
    createdAt: string;
    updatedAt: string;
    evidence?: any[];
}

export interface LegalAuto {
    id: string;
    tipo: string;
    contenido: string;
    estado: 'BORRADOR' | 'REVISION_JEFE' | 'APROBADO' | 'FIRMADO';
    firmaUrl?: string;
    processId: string;
    createdAt: string;
}

export interface CreateNewsDto {
    origen: string;
    territorial: string;
    dependenciaDenunciado: string;
    hechos: string;
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

    async radicarNoticia(data: CreateNewsDto): Promise<DisciplinaryNews> {
        return apiClient.post<DisciplinaryNews>(`${SERVICE_PREFIX}/disciplinary-news`, data);
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

    async changeNewsStatus(id: string, newStatus: string): Promise<DisciplinaryNews> {
        return apiClient.patch<DisciplinaryNews>(`${SERVICE_PREFIX}/disciplinary-news/${id}/status`, { status: newStatus });
    }

    // --- PROCESOS ---

    async getAllProcesos(): Promise<DisciplinaryProcess[]> {
        return apiClient.get<DisciplinaryProcess[]>(`${SERVICE_PREFIX}/disciplinary-processes`);
    }

    async getMisProcesos(abogadoId: string): Promise<DisciplinaryProcess[]> {
        return apiClient.get<DisciplinaryProcess[]>(`${SERVICE_PREFIX}/disciplinary-processes/my-processes`, { abogadoId });
    }

    async asignarProceso(data: AssignProcessDto): Promise<DisciplinaryProcess> {
        return apiClient.post<DisciplinaryProcess>(`${SERVICE_PREFIX}/disciplinary-processes/assign`, data);
    }

    async cambiarEtapa(id: string, nuevaEtapa: string): Promise<DisciplinaryProcess> {
        return apiClient.patch<DisciplinaryProcess>(`${SERVICE_PREFIX}/disciplinary-processes/${id}/stage`, { stage: nuevaEtapa });
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
    ): Promise<{ message: string; url: string; filename: string }> {
        const formData = new FormData();
        formData.append('file', file);
        if (tipo) formData.append('tipo', tipo);
        if (descripcion) formData.append('descripcion', descripcion);
        if (nombre) formData.append('nombre', nombre);
        if (etapa) formData.append('etapa', etapa);
        if (usuarioCarga) formData.append('usuarioCarga', usuarioCarga);

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
        // Construir URL usando buildApiUrl para respetar el modo de conexión (gateway/direct)
        const endpoint = `/api/v1/disciplinary-processes/${processId}/documents/${documentId}/download`;
        const url = buildApiUrl('control-disciplinario', endpoint);
        
        // Obtener token de autenticación
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
        window.URL.revokeObjectURL(downloadUrl);
    }

    /**
     * Obtener URL para descargar documento
     */
    getDocumentoUrl(urlRelativa: string): string {
        // La URL relativa viene del backend, necesitamos construir la URL completa
        // Por ahora asumimos que está en el mismo dominio
        return `${window.location.origin}/control-disciplinario/api/v1/files/${urlRelativa}`;
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

    async updateAutoContent(id: string, contenidoHtml: string): Promise<LegalAuto> {
        return apiClient.patch<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/content`, { contenidoHtml });
    }

    async updateProcess(id: string, data: Partial<DisciplinaryProcess> & { abogadoId?: string; hechos?: string; disciplinable?: any }): Promise<DisciplinaryProcess> {
        return apiClient.patch<DisciplinaryProcess>(`${SERVICE_PREFIX}/disciplinary-processes/${id}`, data);
    }

    async sendToReview(id: string): Promise<LegalAuto> {
        return apiClient.patch<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/send-review`, {});
    }

    async firmarAuto(id: string, aprobadoPorId: string): Promise<LegalAuto> {
        return apiClient.patch<LegalAuto>(`${SERVICE_PREFIX}/disciplinary-autos/${id}/approve?aprobadoPorId=${aprobadoPorId}`, {
            action: 'APPROVE'
        });
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

    async getProfessionalsWorkload(): Promise<Array<{ id: string; nombre: string; procesosAsignados: number; capacidadMaxima: number }>> {
        return apiClient.get<Array<{ id: string; nombre: string; procesosAsignados: number; capacidadMaxima: number }>>(`${SERVICE_PREFIX}/professionals/workload`);
    }

    // --- ARCHIVOS ---
    async uploadFile(file: File): Promise<{ url: string; filename: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.upload<{ url: string; filename: string }>(`${SERVICE_PREFIX}/files/upload`, formData);
    }

    // ==================== CONFIGURACIÓN ====================
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
}

const disciplinaryService = new DisciplinaryService();
export default disciplinaryService;
export { disciplinaryService };
