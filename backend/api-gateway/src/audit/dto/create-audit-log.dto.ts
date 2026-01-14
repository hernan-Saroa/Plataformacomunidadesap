export class CreateAuditLogDto {
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
  responseSizeBytes?: number;
  requestBody?: any;
  requestBodySize?: number;
  responseBody?: any;
  responseBodySize?: number;
  errorMessage?: string;
  errorStack?: string;
}

