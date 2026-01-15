import { auditService, type AuditLog } from '../../../services/api/audit.service';
import type { AuditEvent } from '../AuditEventDetail';

export const mapLogToEvent = (log: AuditLog): AuditEvent => {
  const status = log.statusCode >= 200 && log.statusCode < 300 ? 'success' : 
                 log.statusCode >= 400 ? 'failed' : 'warning';
  const severity = log.statusCode >= 500 ? 'critical' :
                   log.statusCode >= 400 ? 'high' :
                   log.method === 'DELETE' ? 'medium' :
                   log.method === 'POST' || log.method === 'PUT' ? 'medium' : 'low';
  
  // Usar submódulo si existe, sino usar módulo como fallback
  const displayModule = log.submodule || log.module || 'Desconocido';
  
  return {
    id: log.id,
    timestamp: new Date(log.timestamp).toLocaleString('es-CO'),
    user: log.userEmail || log.userId?.toString() || 'Desconocido',
    userId: log.userId?.toString() || 'N/A',
    action: `${log.method} ${log.path}`,
    module: displayModule,
    severity,
    status,
    ipAddress: log.ipAddress || 'N/A',
    device: log.userAgent?.split(' ')[0] || 'N/A',
    browser: log.userAgent || 'N/A',
    location: 'N/A',
    duration: `${(log.responseTimeMs / 1000).toFixed(2)}s`,
    details: log.errorMessage || `${log.method} ${log.path} - ${log.statusCode}`,
  };
};

export interface LoadLogsParams {
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  modules?: string[];
  limit?: number;
  offset?: number;
}

export interface LoadLogsResult {
  logs: AuditLog[];
  total: number;
}

export const loadAuditLogs = async (params: LoadLogsParams): Promise<LoadLogsResult> => {
  try {
    const queryParams: any = { 
      limit: params.limit || 1000, 
      offset: params.offset || 0 
    };
    
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.ipAddress) queryParams.ipAddress = params.ipAddress;
    if (params.modules && params.modules.length > 0) queryParams.module = params.modules[0];

    const response = await auditService.getLogs(queryParams);
    
    if (!response) {
      return { logs: [], total: 0 };
    }
    
    return {
      logs: Array.isArray(response.logs) ? response.logs : [],
      total: typeof response.total === 'number' ? response.total : 0,
    };
  } catch (error) {
    console.error('Error in loadAuditLogs:', error);
    return { logs: [], total: 0 };
  }
};

export const loadAvailableModules = async (): Promise<string[]> => {
  try {
    return await auditService.getModules();
  } catch (error) {
    console.error('Error loading modules:', error);
    return [];
  }
};

