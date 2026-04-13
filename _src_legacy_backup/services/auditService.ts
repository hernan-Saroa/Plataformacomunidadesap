/**
 * ============================================
 * AUDIT SERVICE - CONEXIÓN CON BACKEND
 * ============================================
 * 
 * Service para consultar y exportar logs de auditoría desde el backend
 * Solo permite consultas y exportación (no creación de logs)
 * 
 * ÚLTIMA ACTUALIZACIÓN: Enero 2026
 */

import { config, getDefaultHeaders, buildApiUrl } from '../config/environment';

// Tipos basados en el backend
export interface AuditLog {
  id: string;
  method: string;
  url: string;
  path: string;
  queryParams?: any;
  module?: string;
  version?: string;
  ipAddress?: string;
  userAgent?: string;
  origin?: string;
  referer?: string;
  userId?: number;
  userEmail?: string;
  userRole?: string;
  statusCode: number;
  responseTimeMs: number;
  responseSizeBytes: number;
  requestBody?: any;
  requestBodySize: number;
  hasLargeBody: boolean;
  responseBody?: any;
  responseBodySize: number;
  hasLargeResponse: boolean;
  errorMessage?: string;
  errorStack?: string;
  timestamp: string;
  createdAt: string;
}

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  method?: string;
  module?: string;
  userId?: number;
  ipAddress?: string;
  statusCode?: number;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditStats {
  total: number;
  byMethod: Array<{ method: string; count: string }>;
  byModule: Array<{ module: string; count: string }>;
  byStatusCode: Array<{ statusCode: number; count: string }>;
  avgResponseTime: number;
}

class AuditService {
  private baseUrl = '';

  constructor() {
    // Usar el API Gateway para acceder al servicio de auditoría
    this.baseUrl = config.API_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Obtener logs de auditoría con filtros
   */
  async getLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.method) params.append('method', filters.method);
      if (filters.module) params.append('module', filters.module);
      if (filters.userId) params.append('userId', filters.userId.toString());
      if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
      if (filters.statusCode) params.append('statusCode', filters.statusCode.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const url = `${this.baseUrl}/audit/api/v1/logs${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getDefaultHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Error al obtener logs: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en getLogs:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de auditoría
   */
  async getStats(startDate?: string, endDate?: string): Promise<AuditStats> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `${this.baseUrl}/audit/api/v1/logs/stats${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getDefaultHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Error al obtener estadísticas: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en getStats:', error);
      throw error;
    }
  }

  /**
   * Obtener lista de módulos únicos
   */
  async getModules(): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/audit/api/v1/logs/modules`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getDefaultHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Error al obtener módulos: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en getModules:', error);
      throw error;
    }
  }

  /**
   * Exportar logs a CSV
   */
  async exportToCSV(filters: AuditLogFilters = {}): Promise<Blob> {
    try {
      // Obtener todos los logs (sin límite)
      const allFilters = { ...filters, limit: 10000, offset: 0 };
      const response = await this.getLogs(allFilters);
      
      // Generar CSV
      const headers = [
        'ID',
        'Timestamp',
        'Method',
        'Path',
        'Module',
        'User Email',
        'User Role',
        'IP Address',
        'Status Code',
        'Response Time (ms)',
        'Error Message'
      ];

      const rows = response.logs.map(log => [
        log.id,
        log.timestamp,
        log.method,
        log.path,
        log.module || 'N/A',
        log.userEmail || 'N/A',
        log.userRole || 'N/A',
        log.ipAddress || 'N/A',
        log.statusCode.toString(),
        log.responseTimeMs.toString(),
        log.errorMessage || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error en exportToCSV:', error);
      throw error;
    }
  }

  /**
   * Exportar logs a Excel usando la librería xlsx
   */
  async exportToExcel(filters: AuditLogFilters = {}): Promise<Blob> {
    try {
      // Importar xlsx dinámicamente
      const XLSX = await import('xlsx');
      
      // Obtener todos los logs (sin límite)
      const allFilters = { ...filters, limit: 10000, offset: 0 };
      const response = await this.getLogs(allFilters);
      
      // Preparar datos para Excel
      const headers = [
        'ID',
        'Timestamp',
        'Method',
        'Path',
        'Module',
        'User Email',
        'User Role',
        'IP Address',
        'Status Code',
        'Response Time (ms)',
        'Error Message'
      ];

      const rows = response.logs.map(log => [
        log.id,
        log.timestamp,
        log.method,
        log.path,
        log.module || 'N/A',
        log.userEmail || 'N/A',
        log.userRole || 'N/A',
        log.ipAddress || 'N/A',
        log.statusCode,
        log.responseTimeMs,
        log.errorMessage || ''
      ]);

      // Crear workbook y worksheet
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      // Ajustar ancho de columnas
      const columnWidths = [
        { wch: 36 }, // ID
        { wch: 20 }, // Timestamp
        { wch: 10 }, // Method
        { wch: 30 }, // Path
        { wch: 20 }, // Module
        { wch: 30 }, // User Email
        { wch: 20 }, // User Role
        { wch: 15 }, // IP Address
        { wch: 12 }, // Status Code
        { wch: 15 }, // Response Time
        { wch: 40 }  // Error Message
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoría');

      // Generar archivo Excel
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
      console.error('Error en exportToExcel:', error);
      throw error;
    }
  }

  /**
   * Exportar logs a PDF usando jsPDF
   */
  async exportToPDF(filters: AuditLogFilters = {}): Promise<Blob> {
    try {
      // Importar jsPDF dinámicamente
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const response = await this.getLogs({ ...filters, limit: 10000, offset: 0 });
      
      // Crear documento PDF
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Título
      doc.setFontSize(18);
      doc.text('REPORTE DE AUDITORÍA', 14, 15);
      
      // Información del reporte
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 22);
      doc.text(`Total de registros: ${response.total}`, 14, 27);
      
      // Preparar datos para la tabla
      const tableData = response.logs.map(log => [
        new Date(log.timestamp).toLocaleString('es-CO'),
        log.userEmail || 'N/A',
        log.method,
        log.path.substring(0, 30) + (log.path.length > 30 ? '...' : ''),
        log.module || 'N/A',
        log.statusCode.toString(),
        `${log.responseTimeMs}ms`,
        log.errorMessage ? 'Sí' : 'No'
      ]);

      // Agregar tabla
      autoTable(doc, {
        head: [['Timestamp', 'Usuario', 'Método', 'Path', 'Módulo', 'Status', 'Tiempo', 'Error']],
        body: tableData,
        startY: 32,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [30, 93, 168], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 32, right: 14, bottom: 14, left: 14 }
      });

      // Generar PDF
      const pdfBlob = doc.output('blob');
      return pdfBlob;
    } catch (error) {
      console.error('Error en exportToPDF:', error);
      throw error;
    }
  }

  /**
   * Exportar eventos del frontend a CSV
   */
  exportEventsToCSV(events: any[]): Blob {
    const headers = [
      'ID',
      'Timestamp',
      'Usuario',
      'User ID',
      'Acción',
      'Módulo',
      'Severidad',
      'Estado',
      'IP Address',
      'Dispositivo',
      'Navegador',
      'Ubicación',
      'Duración',
      'Detalles'
    ];

    const rows = events.map(event => [
      event.id || '',
      event.timestamp || '',
      event.user || '',
      event.userId || '',
      event.action || '',
      event.module || '',
      event.severity || '',
      event.status || '',
      event.ipAddress || '',
      event.device || '',
      event.browser || '',
      event.location || '',
      event.duration || '',
      event.details || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Exportar eventos del frontend a Excel
   */
  async exportEventsToExcel(events: any[]): Promise<Blob> {
    try {
      const XLSX = await import('xlsx');
      
      const headers = [
        'ID',
        'Timestamp',
        'Usuario',
        'User ID',
        'Acción',
        'Módulo',
        'Severidad',
        'Estado',
        'IP Address',
        'Dispositivo',
        'Navegador',
        'Ubicación',
        'Duración',
        'Detalles'
      ];

      const rows = events.map(event => [
        event.id || '',
        event.timestamp || '',
        event.user || '',
        event.userId || '',
        event.action || '',
        event.module || '',
        event.severity || '',
        event.status || '',
        event.ipAddress || '',
        event.device || '',
        event.browser || '',
        event.location || '',
        event.duration || '',
        event.details || ''
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      const columnWidths = [
        { wch: 20 }, // ID
        { wch: 20 }, // Timestamp
        { wch: 25 }, // Usuario
        { wch: 15 }, // User ID
        { wch: 30 }, // Acción
        { wch: 20 }, // Módulo
        { wch: 12 }, // Severidad
        { wch: 12 }, // Estado
        { wch: 15 }, // IP Address
        { wch: 20 }, // Dispositivo
        { wch: 20 }, // Navegador
        { wch: 20 }, // Ubicación
        { wch: 12 }, // Duración
        { wch: 50 }  // Detalles
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoría');

      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
      console.error('Error en exportEventsToExcel:', error);
      throw error;
    }
  }

  /**
   * Exportar eventos del frontend a PDF
   */
  async exportEventsToPDF(events: any[]): Promise<Blob> {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      doc.setFontSize(18);
      doc.text('REPORTE DE AUDITORÍA', 14, 15);
      
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 22);
      doc.text(`Total de registros: ${events.length}`, 14, 27);
      
      const tableData = events.map(event => [
        event.timestamp || '',
        event.user || '',
        event.action?.substring(0, 25) + (event.action?.length > 25 ? '...' : '') || '',
        event.module || '',
        event.severity || '',
        event.status || '',
        event.ipAddress || ''
      ]);

      autoTable(doc, {
        head: [['Timestamp', 'Usuario', 'Acción', 'Módulo', 'Severidad', 'Estado', 'IP']],
        body: tableData,
        startY: 32,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [30, 93, 168], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 32, right: 14, bottom: 14, left: 14 }
      });

      const pdfBlob = doc.output('blob');
      return pdfBlob;
    } catch (error) {
      console.error('Error en exportEventsToPDF:', error);
      throw error;
    }
  }

  /**
   * Descargar archivo en el navegador
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

// Exportar instancia singleton
export const auditService = new AuditService();
export default auditService;
