/**
 * SERVICIO: GESTOR DOCUMENTAL - INTEGRACIÓN CON SISTEMA EXTERNO
 * 
 * Este servicio maneja todas las operaciones con el gestor documental externo.
 * 
 * PRODUCCIÓN - ENDPOINTS A CONFIGURAR:
 * - Base URL del gestor documental
 * - Autenticación (API Key, OAuth, JWT)
 * - Endpoints específicos del gestor
 * 
 * GESTORES COMPATIBLES:
 * - Alfresco
 * - SharePoint
 * - Nextcloud
 * - OpenKM
 * - Custom REST API
 */

export type DocumentCategory = 
  | 'identificacion'
  | 'referencias'
  | 'buena-conducta'
  | 'antecedentes'
  | 'grado'
  | 'acta'
  | 'tarjeta-profesional'
  | 'certificados-academicos'
  | 'otros-academicos';

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  type: 'pdf' | 'jpg' | 'png' | 'doc' | 'docx' | 'xlsx';
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
  // Metadatos del gestor documental
  documentManagerId?: string; // ID en el gestor externo
  version?: string; // Control de versiones
  checksum?: string; // Validación de integridad
  mimeType?: string;
  metadata?: Record<string, any>; // Metadatos adicionales del gestor
}

export interface UploadDocumentRequest {
  userId: string;
  file: File;
  category: DocumentCategory;
  metadata?: Record<string, any>;
}

export interface UploadDocumentResponse {
  success: boolean;
  document?: Document;
  error?: string;
  documentManagerId?: string; // ID asignado por el gestor
}

export interface GetDocumentsRequest {
  userId: string;
  category?: DocumentCategory;
  searchTerm?: string;
}

export interface GetDocumentsResponse {
  success: boolean;
  documents: Document[];
  total: number;
  error?: string;
}

export interface DeleteDocumentRequest {
  userId: string;
  documentId: string;
  documentManagerId: string; // ID en el gestor externo
}

export interface DownloadDocumentRequest {
  userId: string;
  documentId: string;
  documentManagerId: string;
}

/**
 * CONFIGURACIÓN DEL GESTOR DOCUMENTAL
 * 
 * TODO - PRODUCCIÓN: Configurar según el gestor documental utilizado
 */
const DOCUMENT_MANAGER_CONFIG = {
  // Ejemplo para REST API genérico
  baseUrl: typeof window !== 'undefined' 
    ? (window as any).ENV?.DOCUMENT_MANAGER_URL || 'https://api.gestor-documental.esap.edu.co'
    : 'https://api.gestor-documental.esap.edu.co',
  apiKey: '', // TODO: Configurar en producción
  
  // Endpoints
  endpoints: {
    upload: '/api/v1/documents/upload',
    getByUser: '/api/v1/documents/user/:userId',
    download: '/api/v1/documents/:documentId/download',
    delete: '/api/v1/documents/:documentId',
    preview: '/api/v1/documents/:documentId/preview',
    metadata: '/api/v1/documents/:documentId/metadata',
  },
  
  // Configuración de carpetas
  folderStructure: {
    basePath: '/ESAP/Carpetas_Digitales',
    userFolderPattern: '/ESAP/Carpetas_Digitales/{userId}',
    categoryFolders: {
      identificacion: 'Documentos_Identificacion',
      referencias: 'Referencias',
      'buena-conducta': 'Certificados_Buena_Conducta',
      antecedentes: 'Antecedentes',
      grado: 'Diplomas_Grado',
      acta: 'Actas_Grado',
      'tarjeta-profesional': 'Tarjetas_Profesionales',
      'certificados-academicos': 'Certificados_Academicos',
      'otros-academicos': 'Otros_Academicos',
    }
  },
  
  // Límites y validaciones
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

/**
 * CLASE: DocumentManagerService
 * 
 * Maneja todas las operaciones con el gestor documental
 */
class DocumentManagerService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = DOCUMENT_MANAGER_CONFIG.baseUrl;
    this.apiKey = DOCUMENT_MANAGER_CONFIG.apiKey;
  }

  /**
   * Headers para autenticación con el gestor documental
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Key': this.apiKey,
      // TODO - PRODUCCIÓN: Ajustar según requerimientos del gestor
    };
  }

  /**
   * OBTENER DOCUMENTOS DE UN USUARIO
   * 
   * @param request - Parámetros de búsqueda
   * @returns Lista de documentos del usuario
   * 
   * TODO - PRODUCCIÓN:
   * - Implementar paginación
   * - Implementar filtros avanzados
   * - Cache local para mejor performance
   */
  async getDocuments(request: GetDocumentsRequest): Promise<GetDocumentsResponse> {
    try {
      // TODO - PRODUCCIÓN: Descomentar y ajustar endpoint
      /*
      const url = `${this.baseUrl}${DOCUMENT_MANAGER_CONFIG.endpoints.getByUser.replace(':userId', request.userId)}`;
      const queryParams = new URLSearchParams();
      if (request.category) queryParams.append('category', request.category);
      if (request.searchTerm) queryParams.append('search', request.searchTerm);

      const response = await fetch(`${url}?${queryParams.toString()}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error del gestor documental: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        documents: data.documents || [],
        total: data.total || 0,
      };
      */

      // MOCK - Datos de prueba
      const mockDocuments: Document[] = [
        {
          id: '1',
          name: 'Cedula_Colombia.pdf',
          category: 'identificacion',
          type: 'pdf',
          size: 245000,
          uploadedBy: 'Sistema - Carga Masiva',
          uploadedAt: '2024-11-15T10:30:00',
          documentManagerId: 'doc_mgr_123456',
          version: '1.0',
          mimeType: 'application/pdf',
        },
        {
          id: '2',
          name: 'Diploma_Administracion_Publica.pdf',
          category: 'grado',
          type: 'pdf',
          size: 1200000,
          uploadedBy: 'Admin Regional',
          uploadedAt: '2024-10-20T14:15:00',
          documentManagerId: 'doc_mgr_789012',
          version: '1.0',
          mimeType: 'application/pdf',
        },
        {
          id: '3',
          name: 'Antecedentes_Judiciales.pdf',
          category: 'antecedentes',
          type: 'pdf',
          size: 180000,
          uploadedBy: 'Usuario',
          uploadedAt: '2024-09-05T08:45:00',
          documentManagerId: 'doc_mgr_345678',
          version: '1.0',
          mimeType: 'application/pdf',
        },
      ];

      // Filtrar por categoría y búsqueda
      let filtered = mockDocuments.filter(doc => doc.id.startsWith(request.userId.slice(0, 3)));
      if (request.category) {
        filtered = filtered.filter(doc => doc.category === request.category);
      }
      if (request.searchTerm) {
        filtered = filtered.filter(doc => 
          doc.name.toLowerCase().includes(request.searchTerm!.toLowerCase())
        );
      }

      return {
        success: true,
        documents: filtered,
        total: filtered.length,
      };
    } catch (error) {
      console.error('Error obteniendo documentos del gestor:', error);
      return {
        success: false,
        documents: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * SUBIR DOCUMENTO AL GESTOR DOCUMENTAL
   * 
   * @param request - Datos del documento a subir
   * @returns Información del documento subido
   * 
   * TODO - PRODUCCIÓN:
   * - Implementar carga multipart/form-data
   * - Control de versiones
   * - Validación de duplicados
   * - Progress tracking para archivos grandes
   */
  async uploadDocument(request: UploadDocumentRequest): Promise<UploadDocumentResponse> {
    try {
      // Validaciones
      if (request.file.size > DOCUMENT_MANAGER_CONFIG.maxFileSize) {
        return {
          success: false,
          error: 'El archivo excede el tamaño máximo permitido (5MB)',
        };
      }

      if (!DOCUMENT_MANAGER_CONFIG.allowedMimeTypes.includes(request.file.type)) {
        return {
          success: false,
          error: 'Tipo de archivo no permitido',
        };
      }

      // TODO - PRODUCCIÓN: Descomentar y ajustar endpoint
      /*
      const formData = new FormData();
      formData.append('file', request.file);
      formData.append('userId', request.userId);
      formData.append('category', request.category);
      formData.append('folderPath', this.getUserFolderPath(request.userId, request.category));
      
      if (request.metadata) {
        formData.append('metadata', JSON.stringify(request.metadata));
      }

      const response = await fetch(
        `${this.baseUrl}${DOCUMENT_MANAGER_CONFIG.endpoints.upload}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-API-Key': this.apiKey,
            // NO incluir Content-Type para FormData, el browser lo configura automáticamente
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Error del gestor documental: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        document: {
          id: data.id,
          name: request.file.name,
          category: request.category,
          type: this.getFileExtension(request.file.name) as any,
          size: request.file.size,
          uploadedBy: 'Usuario Actual',
          uploadedAt: new Date().toISOString(),
          documentManagerId: data.documentManagerId,
          version: data.version || '1.0',
          mimeType: request.file.type,
          url: data.downloadUrl,
        },
        documentManagerId: data.documentManagerId,
      };
      */

      // MOCK - Simular upload exitoso
      return {
        success: true,
        document: {
          id: `doc_${Date.now()}`,
          name: request.file.name,
          category: request.category,
          type: this.getFileExtension(request.file.name) as any,
          size: request.file.size,
          uploadedBy: 'Usuario Actual',
          uploadedAt: new Date().toISOString(),
          documentManagerId: `doc_mgr_${Date.now()}`,
          version: '1.0',
          mimeType: request.file.type,
        },
        documentManagerId: `doc_mgr_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error subiendo documento al gestor:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * ELIMINAR DOCUMENTO DEL GESTOR DOCUMENTAL
   * 
   * @param request - Datos del documento a eliminar
   * @returns Confirmación de eliminación
   * 
   * TODO - PRODUCCIÓN:
   * - Implementar soft delete (papelera de reciclaje)
   * - Verificar permisos
   * - Mantener historial de eliminaciones
   */
  async deleteDocument(request: DeleteDocumentRequest): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO - PRODUCCIÓN: Descomentar y ajustar endpoint
      /*
      const url = `${this.baseUrl}${DOCUMENT_MANAGER_CONFIG.endpoints.delete.replace(':documentId', request.documentManagerId)}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({
          userId: request.userId,
          documentId: request.documentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del gestor documental: ${response.status}`);
      }

      return { success: true };
      */

      // MOCK - Simular eliminación exitosa
      console.log('Eliminando documento:', request);
      return { success: true };
    } catch (error) {
      console.error('Error eliminando documento del gestor:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * DESCARGAR DOCUMENTO DEL GESTOR DOCUMENTAL
   * 
   * @param request - Datos del documento a descargar
   * @returns URL de descarga o blob del archivo
   * 
   * TODO - PRODUCCIÓN:
   * - Implementar streaming para archivos grandes
   * - Generar URLs temporales con expiración
   * - Registrar auditoría de descargas
   */
  async downloadDocument(request: DownloadDocumentRequest): Promise<{ success: boolean; url?: string; blob?: Blob; error?: string }> {
    try {
      // TODO - PRODUCCIÓN: Descomentar y ajustar endpoint
      /*
      const url = `${this.baseUrl}${DOCUMENT_MANAGER_CONFIG.endpoints.download.replace(':documentId', request.documentManagerId)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error del gestor documental: ${response.status}`);
      }

      // Opción 1: URL de descarga directa
      const data = await response.json();
      return {
        success: true,
        url: data.downloadUrl, // URL temporal con token
      };

      // Opción 2: Blob para descarga inmediata
      const blob = await response.blob();
      return {
        success: true,
        blob: blob,
      };
      */

      // MOCK - Simular descarga
      console.log('Descargando documento:', request);
      return {
        success: true,
        url: '#', // URL mock
      };
    } catch (error) {
      console.error('Error descargando documento del gestor:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * OBTENER PREVIEW/VISUALIZACIÓN DE DOCUMENTO
   * 
   * @param documentManagerId - ID del documento en el gestor
   * @returns URL para visualizar el documento
   * 
   * TODO - PRODUCCIÓN:
   * - Implementar viewer integrado
   * - Soporte para diferentes formatos
   * - Watermarks para documentos sensibles
   */
  async getDocumentPreview(documentManagerId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // TODO - PRODUCCIÓN: Descomentar y ajustar endpoint
      /*
      const url = `${this.baseUrl}${DOCUMENT_MANAGER_CONFIG.endpoints.preview.replace(':documentId', documentManagerId)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error del gestor documental: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        url: data.previewUrl,
      };
      */

      // MOCK
      return {
        success: true,
        url: '#',
      };
    } catch (error) {
      console.error('Error obteniendo preview del gestor:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * HELPER: Obtener ruta de carpeta del usuario
   */
  private getUserFolderPath(userId: string, category: DocumentCategory): string {
    const userFolder = DOCUMENT_MANAGER_CONFIG.folderStructure.userFolderPattern.replace('{userId}', userId);
    const categoryFolder = DOCUMENT_MANAGER_CONFIG.folderStructure.categoryFolders[category];
    return `${userFolder}/${categoryFolder}`;
  }

  /**
   * HELPER: Obtener extensión de archivo
   */
  private getFileExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ext;
  }
}

// Singleton
export const documentManagerService = new DocumentManagerService();

/**
 * DOCUMENTACIÓN DE INTEGRACIÓN
 * 
 * PASOS PARA CONECTAR CON GESTOR DOCUMENTAL REAL:
 * 
 * 1. CONFIGURAR VARIABLES DE ENTORNO (.env.local):
 *    NEXT_PUBLIC_DOCUMENT_MANAGER_URL=https://tu-gestor.com
 *    DOCUMENT_MANAGER_API_KEY=tu_api_key
 * 
 * 2. DESCOMENTAR CÓDIGO DE PRODUCCIÓN:
 *    - En cada método, descomentar bloques con "TODO - PRODUCCIÓN"
 *    - Comentar o eliminar bloques MOCK
 * 
 * 3. AJUSTAR ENDPOINTS:
 *    - Modificar DOCUMENT_MANAGER_CONFIG.endpoints según tu gestor
 *    - Ajustar estructura de carpetas si es necesario
 * 
 * 4. CONFIGURAR AUTENTICACIÓN:
 *    - Ajustar getHeaders() según tu gestor (Bearer, API Key, OAuth)
 * 
 * 5. PROBAR INTEGRACIÓN:
 *    - Comenzar con getDocuments()
 *    - Luego uploadDocument()
 *    - Finalmente deleteDocument() y downloadDocument()
 * 
 * 6. IMPLEMENTAR MANEJO DE ERRORES:
 *    - Retry logic para fallos temporales
 *    - Fallbacks para cuando el gestor no esté disponible
 *    - Logging para debugging
 */