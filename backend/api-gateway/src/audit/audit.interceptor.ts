import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditClientService } from './audit-client.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { getServiceFromUrl, getModuleFromService, getSubmoduleFromUrl, Microservice } from './microservice.enum';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditClientService: AuditClientService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    const method = request.method;
    const url = request.originalUrl || request.url;
    const path = request.path;
    const queryParams = request.query;

    const shouldAudit = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    if (!shouldAudit) {
      return next.handle();
    }

    const urlMatch = url.match(/^\/([^\/]+)\/api\/v(\d+)/);
    const serviceName = urlMatch?.[1] || null;
    const version = urlMatch?.[2] || '1';
    const module = getModuleFromService(serviceName, url);
    const submodule = getSubmoduleFromUrl(url) || undefined;
    const clientIp = this.getClientIp(request);
    const userInfo = this.extractUserInfo(request);

    // Capturar body de la petición (solo si es pequeño)
    const requestBody = this.shouldLogBody(request)
      ? this.sanitizeBody(request.body)
      : null;
    const requestBodySize = requestBody
      ? JSON.stringify(requestBody).length
      : 0;

    return next.handle().pipe(
      tap((data) => {
        // Petición exitosa
        const responseTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Capturar body de respuesta (solo si es pequeño)
        const responseBody = this.shouldLogResponse(data)
          ? this.sanitizeBody(data)
          : null;
        const responseBodySize = responseBody
          ? JSON.stringify(responseBody).length
          : 0;

        // Preparar datos del log
        const logData: CreateAuditLogDto = {
          method,
          url,
          path,
          queryParams,
          module,
          submodule,
          version,
          ipAddress: clientIp,
          userAgent: request.headers['user-agent'],
          origin: request.headers.origin,
          referer: request.headers.referer,
          userId: userInfo.userId,
          userEmail: userInfo.userEmail,
          userRole: userInfo.userRole,
          statusCode,
          responseTimeMs: responseTime,
          requestBody,
          requestBodySize,
          responseBody,
          responseBodySize,
          responseSizeBytes: responseBodySize,
        };

        // Registrar de forma asíncrona (no bloquea la respuesta)
        this.auditClientService.logRequest(logData).catch((error) => {
          // No fallar la petición si la auditoría falla
          if (process.env.NODE_ENV === 'development') {
            this.logger.error('Error al registrar auditoría:', error);
          }
        });
      }),
      catchError((error) => {
        // Petición con error
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        const logData: CreateAuditLogDto = {
          method,
          url,
          path,
          queryParams,
          module,
          submodule,
          version,
          ipAddress: clientIp,
          userAgent: request.headers['user-agent'],
          origin: request.headers.origin,
          referer: request.headers.referer,
          userId: userInfo.userId,
          userEmail: userInfo.userEmail,
          userRole: userInfo.userRole,
          statusCode,
          responseTimeMs: responseTime,
          requestBody,
          requestBodySize,
          errorMessage: error.message,
          errorStack: error.stack,
        };

        this.auditClientService.logRequest(logData).catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            this.logger.error('Error al registrar auditoría de error:', err);
          }
        });

        throw error;
      }),
    );
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];
    const cfConnectingIp = request.headers['cf-connecting-ip'];

    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      const firstIp = ips.split(',')[0].trim();
      if (firstIp) return firstIp;
    }

    if (cfConnectingIp) {
      const ip = Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
      if (ip) return ip;
    }

    if (realIp) {
      const ip = Array.isArray(realIp) ? realIp[0] : realIp;
      if (ip) return ip;
    }

    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  private shouldLogBody(request: Request): boolean {
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);
    return contentLength > 0 && contentLength < 10240;
  }

  private shouldLogResponse(data: any): boolean {
    if (!data) return false;
    try {
      const dataStr = JSON.stringify(data);
      return dataStr.length < 10240;
    } catch {
      return false;
    }
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'authorization',
      'creditCard',
      'ssn',
      'accessToken',
      'refreshToken',
    ];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }


  private extractUserInfo(request: Request): {
    userId?: number;
    userEmail?: string;
    userRole?: string;
  } {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {};
      }

      const token = authHeader.substring(7);
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {};
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (!payload || typeof payload !== 'object') {
        return {};
      }
      
      const userId = payload.sub ? parseInt(payload.sub, 10) : undefined;
      const userEmail = payload.email || payload.username || undefined;
      
      let userRole: string | undefined;
      if (payload.roles) {
        if (Array.isArray(payload.roles)) {
          if (payload.roles.length > 0 && typeof payload.roles[0] === 'object') {
            userRole = payload.roles
              .map((r: any) => r.code || r.name || r.id || JSON.stringify(r))
              .join(', ');
          } else {
            userRole = payload.roles.join(', ');
          }
        } else if (typeof payload.roles === 'string') {
          userRole = payload.roles;
        } else if (typeof payload.roles === 'object') {
          userRole = payload.roles.code || payload.roles.name || JSON.stringify(payload.roles);
        }
      }

      return {
        userId: userId && !isNaN(userId) ? userId : undefined,
        userEmail,
        userRole,
      };
    } catch (error) {
      return {};
    }
  }
}

