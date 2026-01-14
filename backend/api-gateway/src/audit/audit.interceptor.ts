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

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditClientService: AuditClientService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Extraer información de la petición
    const method = request.method;
    const url = request.originalUrl || request.url;
    const path = request.path;
    const queryParams = request.query;

    // Solo registrar métodos que modifican datos (POST, PUT, DELETE, PATCH)
    // NO registrar GET, OPTIONS, HEAD, etc.
    const shouldAudit = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    
    // Si no debe auditarse, continuar sin registrar
    if (!shouldAudit) {
      return next.handle();
    }

    // Extraer módulo y versión de la URL
    // Formato: /{module}/api/v{version}/{path}
    const urlMatch = url.match(/\/([^\/]+)\/api\/v?(\d+)?/);
    const module = urlMatch?.[1] || 'unknown';
    const version = urlMatch?.[2] || '1';

    // Obtener IP del cliente (SIN modificar headers)
    const clientIp = this.getClientIp(request);

    // Extraer información del usuario del token JWT si está presente
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

  /**
   * Obtiene la IP del cliente SIN modificar headers
   * Respeta los headers existentes pero no los cambia
   */
  private getClientIp(request: Request): string {
    // Orden de prioridad para obtener IP real
    const forwardedFor = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];
    const cfConnectingIp = request.headers['cf-connecting-ip'];

    // Extraer primera IP de x-forwarded-for (puede tener múltiples)
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      const firstIp = ips.split(',')[0].trim();
      if (firstIp) return firstIp;
    }

    // Cloudflare
    if (cfConnectingIp) {
      const ip = Array.isArray(cfConnectingIp)
        ? cfConnectingIp[0]
        : cfConnectingIp;
      if (ip) return ip;
    }

    // x-real-ip
    if (realIp) {
      const ip = Array.isArray(realIp) ? realIp[0] : realIp;
      if (ip) return ip;
    }

    // Fallback a IP de conexión
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Determina si se debe registrar el body de la petición
   * Solo para peticiones pequeñas (< 10KB)
   */
  private shouldLogBody(request: Request): boolean {
    const contentLength = parseInt(
      request.headers['content-length'] || '0',
      10,
    );
    return contentLength > 0 && contentLength < 10240; // 10KB
  }

  /**
   * Determina si se debe registrar el body de la respuesta
   */
  private shouldLogResponse(data: any): boolean {
    if (!data) return false;
    try {
      const dataStr = JSON.stringify(data);
      return dataStr.length < 10240; // 10KB
    } catch {
      return false;
    }
  }

  /**
   * Sanitiza el body removiendo información sensible
   */
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

  /**
   * Extrae información del usuario del token JWT
   */
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

      const token = authHeader.substring(7); // Remover 'Bearer '
      
      // Decodificar el token sin verificar (solo extraer el payload)
      // Un JWT tiene formato: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {};
      }

      // Decodificar el payload (segunda parte del token)
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf8')
      );
      
      if (!payload || typeof payload !== 'object') {
        return {};
      }
      
      // Extraer información del payload
      // El payload puede tener: sub (userId), username, roles, email
      const userId = payload.sub ? parseInt(payload.sub, 10) : undefined;
      const userEmail = payload.email || payload.username || undefined;
      
      // Roles puede ser un array o string
      let userRole: string | undefined;
      if (payload.roles) {
        if (Array.isArray(payload.roles)) {
          userRole = payload.roles.join(', ');
        } else if (typeof payload.roles === 'string') {
          userRole = payload.roles;
        }
      }

      return {
        userId: userId && !isNaN(userId) ? userId : undefined,
        userEmail,
        userRole,
      };
    } catch (error) {
      // Si hay error al decodificar, no fallar la auditoría
      // Solo retornar objeto vacío
      return {};
    }
  }
}

