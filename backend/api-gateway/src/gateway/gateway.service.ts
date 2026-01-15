import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { serviceMap } from './proxy.config';
import { HttpService } from '@nestjs/axios';
import type { Request, Response } from 'express';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class GatewayService {
  constructor(private readonly http: HttpService) {}

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
    const serviceUrl = serviceMap[serviceName];

    if (!serviceUrl) {
      throw new HttpException(
        { message: `Service not found: ${serviceName}` },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Eliminar el prefijo /{service} del path, pero mantener /api/v{version}
    // originalUrl: /control-disciplinario/api/v1/configuration/export/zip
    // path a enviar: /api/v1/configuration/export/zip
    const pathWithoutPrefix = req.originalUrl.replace(
      new RegExp(`^/${serviceName}`),
      '',
    );

    // El path ya incluye /api/v{version}, no necesitamos agregarlo
    const targetUrl = `${serviceUrl}${pathWithoutPrefix}`;
    const contentType = (req.headers['content-type'] as string) || '';
    const isMultipart = contentType.toLowerCase().includes('multipart/form-data');
    const forwardedForHeader = req.headers['x-forwarded-for'];
    const realIpHeader = req.headers['x-real-ip'];
    const forwardedFor = Array.isArray(forwardedForHeader)
      ? forwardedForHeader.join(', ')
      : typeof forwardedForHeader === 'string'
        ? forwardedForHeader
        : '';
    const realIp = Array.isArray(realIpHeader)
      ? realIpHeader[0]
      : typeof realIpHeader === 'string'
        ? realIpHeader
        : '';
    const clientIp = req.ip || req.connection?.remoteAddress || realIp || '';
    const nextForwardedFor = forwardedFor || realIp || clientIp;
    const forwardHeaders = {
      ...req.headers,
      host: undefined,
      'x-forwarded-for': nextForwardedFor || undefined,
      'x-real-ip': clientIp || undefined,
      'x-forwarded-proto': (req.headers['x-forwarded-proto'] as string) || req.protocol,
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
              }
            : {}),
          // Si esperamos un archivo binario, usar responseType: 'stream'
          ...(expectsBinaryFile ? { responseType: 'stream' } : {}),
          validateStatus: () => true,
        }),
      );

      console.log(`[Gateway] Response status: ${response.status}`);
      console.log(`[Gateway] Response has pipe: ${typeof response.data?.pipe}`);

      // Si la respuesta es un stream, hacer pipe directamente
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
      } else {
        console.log(`[Gateway] Sending normal response`);
        return res.status(response.status).send(response.data);
      }
    } catch (error) {
      console.error(`[Gateway] Error caught:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          responseType: error.config?.responseType,
        }
      });
      const status = error.response?.status || 500;
      const msg =
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.message || 'Error at API Gateway';
      return res.status(status).send(msg);
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
