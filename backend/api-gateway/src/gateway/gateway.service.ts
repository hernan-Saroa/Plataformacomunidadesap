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
          validateStatus: () => true,
        }),
      );

      return res.status(response.status).send(response.data);
    } catch (error) {
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
