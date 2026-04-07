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
    const action = this.determineAction(method, url);
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

        // Leer cuerpo de respuesta desde res.locals (guardado por gateway.service)
        const localsBody = (response as any).locals?.auditResponseBody ?? null;
        const responseBody = this.shouldLogResponse(localsBody)
          ? this.sanitizeBody(localsBody)
          : null;
        const responseBodySize = responseBody
          ? JSON.stringify(responseBody).length
          : 0;

        // Para POST: newData = requestBody (lo que se intentó crear)
        // Para PUT/PATCH: newData = responseBody (el objeto actualizado si fue exitoso)
        // Esto permite al audit-service generar el diff de cambios
        const newData = ['POST', 'PUT', 'PATCH'].includes(method)
          ? (method === 'POST' ? requestBody : (responseBody || requestBody))
          : undefined;

        // Si la respuesta es un error, extraer el mensaje
        const errorMessage = statusCode >= 400
          ? (responseBody?.message || responseBody?.error || `Error HTTP ${statusCode}`)
          : undefined;

        // Preparar datos del log
        const logData: CreateAuditLogDto = {
          method,
          url,
          path,
          queryParams,
          module,
          submodule,
          action,
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
          newData,
          errorMessage,
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
          action,
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
          newData: ['POST', 'PUT', 'PATCH'].includes(method) ? requestBody : undefined,
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
    if (!request.body || typeof request.body !== 'object') return false;
    if (Object.keys(request.body).length === 0) return false;
    try {
      const bodyStr = JSON.stringify(request.body);
      return bodyStr.length < 10240;
    } catch {
      return false;
    }
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
      const reqUser = (request as any).user as Record<string, any> | undefined;

      // Priorizar el usuario ya validado por JwtAuthGuard
      const guardDisplayUser = this.getDisplayUserFromPayload(reqUser);
      const guardUserRole = this.extractRoles(reqUser?.roles);
      const guardUserId = this.parseNumericUserId(reqUser?.userId ?? reqUser?.sub ?? reqUser?.id);

      if (guardDisplayUser || guardUserRole || guardUserId !== undefined) {
        return {
          userId: guardUserId,
          userEmail: guardDisplayUser,
          userRole: guardUserRole,
        };
      }

      const token = this.extractTokenFromRequest(request);
      if (!token) {
        return {};
      }

      const payload = this.decodeJwtPayload(token);
      if (!payload) {
        return {};
      }

      return {
        userId: this.parseNumericUserId(payload.sub),
        userEmail: this.getDisplayUserFromPayload(payload),
        userRole: this.extractRoles(payload.roles),
      };
    } catch (error) {
      return {};
    }
  }

  private extractTokenFromRequest(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    const xAccessToken = request.headers['x-access-token'];
    const xAuthToken = request.headers['x-auth-token'];

    const candidates = [
      authHeader,
      Array.isArray(xAccessToken) ? xAccessToken[0] : xAccessToken,
      Array.isArray(xAuthToken) ? xAuthToken[0] : xAuthToken,
    ];

    for (const rawCandidate of candidates) {
      if (!rawCandidate || typeof rawCandidate !== 'string') continue;
      const candidate = rawCandidate.trim();
      if (!candidate) continue;

      if (/^bearer\s+/i.test(candidate)) {
        const token = candidate.replace(/^bearer\s+/i, '').trim();
        if (token) return token;
      }

      if (candidate.split('.').length === 3) {
        return candidate;
      }
    }

    return undefined;
  }

  private decodeJwtPayload(token: string): Record<string, any> | undefined {
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;

    const rawPayload = parts[1];
    if (!rawPayload) return undefined;

    const normalized = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return payload && typeof payload === 'object' ? payload : undefined;
  }

  private parseNumericUserId(rawUserId: unknown): number | undefined {
    if (typeof rawUserId === 'number' && Number.isFinite(rawUserId)) {
      return rawUserId;
    }

    if (typeof rawUserId === 'string' && rawUserId.trim()) {
      const parsed = parseInt(rawUserId, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    }

    return undefined;
  }

  private extractRoles(rawRoles: unknown): string | undefined {
    if (!rawRoles) return undefined;

    if (Array.isArray(rawRoles)) {
      if (rawRoles.length > 0 && typeof rawRoles[0] === 'object') {
        return rawRoles
          .map((r: any) => r.code || r.name || r.id || JSON.stringify(r))
          .join(', ');
      }
      return rawRoles.join(', ');
    }

    if (typeof rawRoles === 'string') {
      return rawRoles;
    }

    if (typeof rawRoles === 'object') {
      return (rawRoles as any).code || (rawRoles as any).name || JSON.stringify(rawRoles);
    }

    return undefined;
  }

  private getDisplayUserFromPayload(payload?: Record<string, any>): string | undefined {
    if (!payload || typeof payload !== 'object') return undefined;

    const candidates = [
      payload.name,
      payload.full_name,
      payload.preferred_username,
      payload.email,
      payload.upn,
      payload.unique_name,
      payload.username,
      payload.sub,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    return undefined;
  }

  /**
   * Determina la acción basándose en el método HTTP y la ruta
   * Retorna acciones legibles como "crear auditoria", "iniciar sesión", etc.
   */
  private determineAction(method: string, urlOrPath: string): string | undefined {
    // Normalizar: remover query params y prefijos de servicio
    const normalizedPath = urlOrPath
      .split('?')[0] // Remover query params
      .replace(/^\/[^\/]+\/api\/v\d+\//, '/') // Remover prefijo /servicio/api/v1/
      .replace(/^\/esap\//, '/') // Remover prefijo /esap/
      .toLowerCase();
    
    const pathLower = normalizedPath;

    // ========== CASOS ESPECIALES DE AUTENTICACIÓN ==========
    // Usar expresiones regulares más precisas para evitar falsos positivos
    if (/^\/login(\/|$|\?)/.test(pathLower) || pathLower === 'login') {
      return 'iniciar sesión';
    }
    if (/^\/logout(\/|$|\?)/.test(pathLower) || pathLower === 'logout') {
      return 'cerrar sesión';
    }
    if (/^\/change-password(\/|$|\?)/.test(pathLower) || 
        /^\/cambiar-contraseña(\/|$|\?)/.test(pathLower)) {
      return 'cambiar contraseña';
    }
    if (/^\/forgot-password(\/|$|\?)/.test(pathLower) || 
        /^\/recuperar-contraseña(\/|$|\?)/.test(pathLower)) {
      return 'recuperar contraseña';
    }
    if (/^\/reset-password(\/|$|\?)/.test(pathLower) || 
        /^\/restablecer-contraseña(\/|$|\?)/.test(pathLower)) {
      return 'restablecer contraseña';
    }
    if (/^\/verify(\/|$|\?)/.test(pathLower) || 
        /^\/verificar(\/|$|\?)/.test(pathLower)) {
      return 'verificar sesión';
    }
    if (/^\/refresh(\/|$|\?)/.test(pathLower) || 
        /^\/refresh-token(\/|$|\?)/.test(pathLower)) {
      return 'renovar token';
    }
    if (/^\/new-person(\/|$|\?)/.test(pathLower) || 
        /^\/registrar(\/|$|\?)/.test(pathLower) ||
        /^\/register(\/|$|\?)/.test(pathLower)) {
      return 'registrar usuario';
    }

    // ========== MAPEO DE RECURSOS ==========
    const resourceMap: Record<string, string> = {
      'auditorias': 'auditoria',
      'hallazgos': 'hallazgo',
      'planes-mejoramiento': 'plan de mejoramiento',
      'plan-mejoramiento': 'plan de mejoramiento',
      'programa-anual': 'programa anual',
      'plan-individual': 'plan individual',
      'plan-anual-5-roles': 'plan anual 5 roles',
      'listas-chequeo': 'lista de chequeo',
      'informes-ley': 'informe de ley',
      'notificaciones': 'notificación',
      'evidencias': 'evidencia',
      'documentos': 'documento',
      'aprobaciones': 'aprobación',
      'tableros-kanban': 'tablero kanban',
      'tipos-auditoria': 'tipo de auditoria',
      'universo-auditorias': 'universo de auditorias',
      'procesos': 'proceso',
      'actividades': 'actividad',
      'roles': 'rol',
      'permisos': 'permiso',
      'usuarios': 'usuario',
      'personas': 'persona',
    };

    // ========== ACCIONES ESPECÍFICAS EN LA RUTA ==========
    // Usar expresiones regulares para coincidencias más precisas
    const specificActions: Array<{ pattern: RegExp; action: string }> = [
      { pattern: /\/aprobar(\/|$|\?)/, action: 'aprobar' },
      { pattern: /\/rechazar(\/|$|\?)/, action: 'rechazar' },
      { pattern: /\/enviar(\/|$|\?)/, action: 'enviar' },
      { pattern: /\/aceptar(\/|$|\?)/, action: 'aceptar' },
      { pattern: /\/importar(\/|$|\?)/, action: 'importar' },
      { pattern: /\/generar(\/|$|\?)/, action: 'generar' },
      { pattern: /\/validar(\/|$|\?)/, action: 'validar' },
      { pattern: /\/ampliar-plazo(\/|$|\?)/, action: 'ampliar plazo' },
      { pattern: /\/solicitar(\/|$|\?)/, action: 'solicitar' },
      { pattern: /\/restore(\/|$|\?)/, action: 'restaurar' },
      { pattern: /\/archivar(\/|$|\?)/, action: 'archivar' },
      { pattern: /\/leida(\/|$|\?)/, action: 'marcar como leída' },
      { pattern: /\/progreso(\/|$|\?)/, action: 'actualizar progreso' },
      { pattern: /\/fase(\/|$|\?)/, action: 'cambiar fase' },
      { pattern: /\/incrementar(\/|$|\?)/, action: 'incrementar' },
      { pattern: /\/decrementar(\/|$|\?)/, action: 'decrementar' },
      { pattern: /\/aplicar(\/|$|\?)/, action: 'aplicar' },
      { pattern: /\/exportar(\/|$|\?)/, action: 'exportar' },
    ];

    // Buscar acciones específicas en la ruta
    for (const { pattern, action } of specificActions) {
      if (pattern.test(pathLower)) {
        const resource = this.extractResourceFromPath(normalizedPath, resourceMap);
        if (resource) {
          return `${action} ${resource}`;
        }
        return action;
      }
    }

    // ========== ACCIONES BASADAS EN MÉTODO HTTP ==========
    let baseAction: string;
    if (method === 'POST') {
      baseAction = 'crear';
    } else if (method === 'PUT' || method === 'PATCH') {
      baseAction = 'actualizar';
    } else if (method === 'DELETE') {
      baseAction = 'eliminar';
    } else {
      return undefined;
    }

    // Extraer recurso de la ruta (ya normalizada)
    const resource = this.extractResourceFromPath(normalizedPath, resourceMap);
    
    if (resource) {
      return `${baseAction} ${resource}`;
    }

    return baseAction;
  }

  /**
   * Extrae el nombre del recurso de la ruta usando el mapeo de recursos
   * Nota: El path ya debe estar normalizado (sin prefijos de servicio ni query params)
   */
  private extractResourceFromPath(
    path: string,
    resourceMap: Record<string, string>
  ): string | null {
    // El path ya viene normalizado, solo remover la barra inicial si existe
    const cleanPath = path
      .replace(/^\//, '')
      .toLowerCase();

    // Buscar en el mapeo de recursos
    for (const [key, value] of Object.entries(resourceMap)) {
      if (cleanPath.includes(key)) {
        return value;
      }
    }

    // Si no está en el mapeo, extraer el primer segmento y normalizar
    const segments = cleanPath
      .split('/')
      .filter(s => s && !/^\d+$/.test(s) && !/^[a-f0-9-]{36}$/i.test(s));
    
    if (segments.length > 0) {
      const firstSegment = segments[0];
      
      // Normalizar: remover plurales y convertir a formato legible
      let normalized = firstSegment
        .replace(/s$/, '')
        .replace(/es$/, '')
        .replace(/-/g, ' ');
      
      // Capitalizar primera letra de cada palabra
      normalized = normalized
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return normalized.toLowerCase();
    }

    return null;
  }
}
