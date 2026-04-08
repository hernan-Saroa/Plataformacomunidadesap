import { apiClient } from './apiClient';

const SERVICE_PREFIX = '/audit/api/v1';

export interface AuditLog {
  id: string;
  method: string;
  url: string;
  path: string;
  queryParams?: any;
  module?: string;
  submodule?: string;
  action?: string;
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
  responseSizeBytes?: number;
  requestBody?: any;
  requestBodySize?: number;
  responseBody?: any;
  responseBodySize?: number;
  errorMessage?: string;
  errorStack?: string;
  // Campos de tracking de cambios (datos viejos y nuevos)
  entityName?: string;
  entityId?: string;
  previousData?: any;
  newData?: any;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  timestamp: string;
  createdAt: string;
}

export interface QueryAuditLogsParams {
  startDate?: string;
  endDate?: string;
  method?: string;
  module?: string;
  userId?: number;
  ipAddress?: string;
  statusCode?: number;
  entityName?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditStats {
  total: number;
  byMethod: Array<{ method: string; count: number }>;
  byModule: Array<{ module: string; count: number }>;
  byStatusCode: Array<{ statusCode: number; count: number }>;
  avgResponseTime: number;
}

class AuditService {
  async getLogs(params?: QueryAuditLogsParams): Promise<AuditLogsResponse> {
    return apiClient.get<AuditLogsResponse>(`${SERVICE_PREFIX}/logs`, params);
  }

  async getStats(startDate?: string, endDate?: string): Promise<AuditStats> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return apiClient.get<AuditStats>(`${SERVICE_PREFIX}/logs/stats`, { params });
  }

  async getModules(): Promise<string[]> {
    return apiClient.get<string[]>(`${SERVICE_PREFIX}/logs/modules`);
  }
}

export const auditService = new AuditService();

