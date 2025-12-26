import { ApiClient } from './apiClient';
import { API_MODE, MICROSERVICE_URLS } from '../../config/environment';

// Dedicated client for Legal Management Service to ensure direct connection if needed
// or we can reuse the logic if we align endpoints. 
// Given the backend is at /api/legal/expedientes and strictly on port 3008:
const BASE_URL = API_MODE === 'direct' ? MICROSERVICE_URLS.legal : 'http://localhost:3002';

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

export const legalService = new LegalService();

