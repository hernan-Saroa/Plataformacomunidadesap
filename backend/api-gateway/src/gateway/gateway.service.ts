import { Injectable, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { serviceMap } from './proxy.config';
import { HttpService } from '@nestjs/axios';
import type { Request, Response } from 'express';
import { lastValueFrom } from 'rxjs';

const parseIpHeader = (value?: string | string[]): string[] => {
  const raw = Array.isArray(value) ? value.join(',') : value || '';
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const isIpLike = (value: string): boolean => {
  if (!value) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return true;
  return value.includes(':');
};

const normalizeSingleIp = (raw?: string): string | null => {
  if (!raw) return null;
  let normalized = String(raw).trim();
  if (!normalized) return null;

  if (normalized.toLowerCase().startsWith('for=')) {
    normalized = normalized.slice(4).trim();
  }

  normalized = normalized.replace(/^"+|"+$/g, '');
  normalized = normalized.split(';')[0]?.trim() || normalized;

  if (normalized.startsWith('[') && normalized.includes(']')) {
    normalized = normalized.slice(1, normalized.indexOf(']'));
  }

  normalized = normalized.replace(/^::ffff:/i, '');

  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(normalized)) {
    normalized = normalized.split(':')[0];
  }

  if (!isIpLike(normalized)) return null;
  return normalized || null;
};

const isPrivateIp = (ip: string): boolean => {
  if (!ip) return true;
  const lower = ip.toLowerCase();
  if (
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80')
  ) {
    return true;
  }

  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;

  return false;
};

const getClientIp = (req: Request): string => {
  const candidates = [
    ...parseIpHeader(req.headers['x-forwarded-for']),
    ...parseIpHeader(req.headers.forwarded),
    ...parseIpHeader(req.headers['cf-connecting-ip']),
    ...parseIpHeader(req.headers['x-real-ip']),
    ...parseIpHeader(req.headers['x-client-ip']),
    ...(Array.isArray(req.ips) ? req.ips.map((item) => String(item || '').trim()) : []),
    typeof req.ip === 'string' ? req.ip.trim() : '',
    req.socket?.remoteAddress || '',
  ]
    .map((candidate) => normalizeSingleIp(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  if (!candidates.length) {
    return '';
  }

  const publicIp = candidates.find((candidate) => !isPrivateIp(candidate));
  return publicIp || candidates[0] || '';
};

@Injectable()
export class GatewayService {
  constructor(
    private readonly http: HttpService,
  ) {}

  /**
   * Reenvía la petición al microservicio correspondiente.
   *
   * Nueva estructura de URL: /{service}/api/v{version}/{path}
   * Ejemplos:
   *   - /auth/api/v1/users -> auth-service:3001/users
   *   - /auth/api/v2/users -> auth-service:3001/v2/users
   *   - /certificados/api/v1/generate -> certification-service:3004/generate
   *
   * Para v1, el path se envía directamente al microservicio.
   * Para otras versiones (v2, v3, etc.), se incluye el prefijo de versión.
   */
  async forwardRequest(
    serviceName: string,
    version: string,
    req: Request,
    res: Response,
  ) {
    const serviceUrl = (serviceMap as Record<string, string>)[serviceName];

    if (!serviceUrl) {
      console.error(`[Gateway] Service not found: "${serviceName}"`);
      console.error(`[Gateway] Available services:`, Object.keys(serviceMap));
      console.error(`[Gateway] serviceMap content:`, serviceMap);
      throw new HttpException(
        { 
          message: `Service not found: ${serviceName}`, 
          availableServices: Object.keys(serviceMap) 
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Eliminar el prefijo /{service}/api/v{version} del path
    // originalUrl: /auth/api/v1/users?page=1
    // path a enviar: /users?page=1
    const pathWithoutPrefix = req.originalUrl.replace(
      new RegExp(`^/${serviceName}/api/v\\d+`),
      '',
    );

    // Para v1, enviar directamente al microservicio
    // Para otras versiones, incluir el prefijo de versión
    const versionPrefix = version === '1' ? '' : `/v${version}`;
    const targetUrl = `${serviceUrl}${versionPrefix}${pathWithoutPrefix}`;
    
    const contentType = (req.headers['content-type'] as string) || '';
    const isMultipart = contentType.toLowerCase().includes('multipart/form-data');
    const clientIp = getClientIp(req);
    
    // Reenviar headers existentes sin modificarlos
    // NO modificar x-forwarded-for ni x-real-ip (eliminado módulo de cambio de IP)
    const user = (req as any).user;
    const userHeaders = user
      ? {
          'x-user-id': user.userId,
          'x-user-username': user.username,
          'x-user-email': user.email,
          'x-user-name': user.name,
          'x-user-roles': Array.isArray(user.roles)
            ? (user.roles as any[])
                .map((r: any) => (typeof r === 'string' ? r : (r?.code ?? r?.name ?? '')))
                .filter(Boolean)
                .join(',')
            : user.roles,
        }
      : {};

    // Si el request llegó con cookie HttpOnly (OTIC-001) y no trae Authorization header,
    // extraer el token de la cookie e inyectarlo como Authorization para los microservicios.
    const cookieToken = (() => {
      const cookieHeader = req.headers.cookie || '';
      for (const part of cookieHeader.split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key.trim() === 'esap_access_token') return rest.join('=').trim() || null;
      }
      return null;
    })();
    const authHeaderFromCookie =
      cookieToken && !req.headers.authorization
        ? { authorization: `Bearer ${cookieToken}` }
        : {};

    const forwardHeaders = {
      ...req.headers,
      ...userHeaders,
      ...authHeaderFromCookie,
      host: undefined, // Eliminar host para evitar conflictos
      'x-forwarded-proto': (req.headers['x-forwarded-proto'] as string) || req.protocol,
      ...(clientIp ? { 'x-client-ip': clientIp } : {}),
    };

    try {
      // Detectar si se espera un archivo binario basándose en el Accept header
      const acceptHeader = (req.headers['accept'] as string) || '';
      const expectsBinaryFile = acceptHeader.includes('application/zip') ||
                                acceptHeader.includes('application/octet-stream') ||
                                acceptHeader.includes('application/pdf');

      console.log(`[Gateway] Forwarding to: ${targetUrl}`);
      console.log(`[Gateway] Expects binary: ${expectsBinaryFile}`);
      console.log(`[Gateway] Accept header: ${acceptHeader}`);

      const response = await lastValueFrom(
        this.http.request({
          method: req.method,
          url: targetUrl,
          data: isMultipart ? req : req.body,
          headers: isMultipart ? forwardHeaders : forwardHeaders,
          ...(isMultipart
            ? {
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              timeout: 0,
            }
            : {}),
          // Si esperamos un archivo binario, usar responseType: 'stream' para no cargar todo en memoria
          responseType: expectsBinaryFile ? 'stream' : 'arraybuffer',
          validateStatus: () => true,
        }),
      );

      console.log(`[Gateway] Response status: ${response.status}`);
      console.log(`[Gateway] Response has pipe: ${typeof response.data?.pipe}`);

      // Si la respuesta es un stream (archivo binario), hacer pipe directamente
      if (expectsBinaryFile && response.data?.pipe) {
        console.log(`[Gateway] Streaming binary file...`);
        res.status(response.status);
        // Copiar headers importantes del microservicio
        Object.entries(response.headers || {}).forEach(([key, value]) => {
          if (value && key.toLowerCase() !== 'transfer-encoding') {
            res.setHeader(key, value as any);
          }
        });
        response.data.pipe(res);
        return;
      }

      // Forward response headers (especially Content-Type for files)
      Object.entries(response.headers || {}).forEach(([key, value]) => {
        if (value && key.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(key, value as any);
        }
      });

      // Intentar parsear arraybuffer a JSON para guardar en locals (auditoría)
      let parsedResponseBody: any = null;
      try {
        const buffer = Buffer.from(response.data);
        const jsonString = buffer.toString('utf-8');
        parsedResponseBody = JSON.parse(jsonString);
      } catch (_) { /* no es JSON */ }

      // Guardar cuerpo de respuesta para el interceptor de auditoría
      res.locals.auditResponseBody = parsedResponseBody;
      res.locals.auditResponseStatus = response.status;

      // Si la respuesta es un error (4xx, 5xx), intentar parsear el arraybuffer como JSON
      if (response.status >= 400) {
        if (parsedResponseBody !== null) {
          return res.status(response.status).json(parsedResponseBody);
        }
        return res.status(response.status).send(response.data);
      }

      return res.status(response.status).send(response.data);
    } catch (error: any) {
      console.error(`[Gateway] Error caught:`, {
        message: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          responseType: error.config?.responseType,
        }
      });
      const status = error.response?.status || 500;
      
      // Intentar parsear el error si viene como arraybuffer
      if (error.response?.data) {
        try {
          const buffer = Buffer.from(error.response.data);
          const jsonString = buffer.toString('utf-8');
          const errorData = JSON.parse(jsonString);
          return res.status(status).json(errorData);
        } catch (parseError) {
          // Si no es JSON, usar el mensaje de error
          const msg =
            typeof error.response.data === 'string'
              ? error.response.data
              : error.response.data?.message || 'Error at API Gateway';
          return res.status(status).send(msg);
        }
      }

      return res.status(status).json({ 
        message: error.message || 'Error at API Gateway',
        statusCode: status 
      });
    }
  }

  /**
   * Proxy para rutas estáticas (ej: /certificados/uploads/...)
   */
  async forwardStatic(
    serviceName: string,
    req: Request,
    res: Response,
  ) {
    const serviceUrl = serviceMap[serviceName];

    if (!serviceUrl) {
      throw new HttpException(
        { message: `Service not found: ${serviceName}` },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Quitar el prefijo /{service} del path para reenviar al microservicio
    const pathWithoutService = req.originalUrl.replace(
      new RegExp(`^/${serviceName}`),
      '',
    );
    const targetUrl = `${serviceUrl}${pathWithoutService}`;

    try {
      const response = await lastValueFrom(
        this.http.request({
          method: req.method,
          url: targetUrl,
          data: req.body,
          headers: req.headers,
          responseType: 'stream',
        }),
      );

      // Reenviar headers y status
      res.status(response.status);
      Object.entries(response.headers || {}).forEach(([key, value]) => {
        if (value) res.setHeader(key, value as any);
      });
      response.data.pipe(res);
    } catch (error) {
      const status = error.response?.status || 500;
      const msg =
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.message || 'Error at API Gateway';
      return res.status(status).send(msg);
    }
  }
}
