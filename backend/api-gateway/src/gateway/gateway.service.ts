import { Injectable, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { serviceMap } from './proxy.config';
import { HttpService } from '@nestjs/axios';
import type { Request, Response } from 'express';
import { lastValueFrom } from 'rxjs';

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

    // Reenviar headers existentes sin modificarlos
    // NO modificar x-forwarded-for ni x-real-ip (eliminado módulo de cambio de IP)
    const forwardHeaders = {
      ...req.headers,
      host: undefined, // Eliminar host para evitar conflictos
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
          // Sino usar 'arraybuffer' para mejor manejo de datos binarios
          responseType: expectsBinaryFile ? 'stream' : 'arraybuffer',
          validateStatus: () => true,
        }),
      );

      console.log(`[Gateway] Response status: ${response.status}`);
      console.log(`[Gateway] Response has pipe: ${typeof response.data?.pipe}`);

      // Si la respuesta es un stream (archivos binarios grandes), hacer pipe directamente
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
        // Manejar respuesta con arraybuffer
        // Forward response headers (especially Content-Type for files)
        Object.entries(response.headers || {}).forEach(([key, value]) => {
          if (value && key.toLowerCase() !== 'transfer-encoding') {
            res.setHeader(key, value as any);
          }
        });

        // Si la respuesta es un error (4xx, 5xx), intentar parsear el arraybuffer como JSON
        if (response.status >= 400) {
          try {
            const buffer = Buffer.from(response.data);
            const jsonString = buffer.toString('utf-8');
            const errorData = JSON.parse(jsonString);
            return res.status(response.status).json(errorData);
          } catch (parseError) {
            // Si no es JSON, enviar el buffer directamente
            return res.status(response.status).send(response.data);
          }
        }

        return res.status(response.status).send(response.data);
      }
    } catch (error: any) {
      console.error(`[Gateway] Error caught:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        responseStatus: error.response?.status,
        responseHeaders: error.response?.headers,
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
    const serviceUrl = (serviceMap as Record<string, string>)[serviceName];

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
    } catch (error: any) {
      const status = error.response?.status || 500;
      const msg =
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.message || 'Error at API Gateway';
      return res.status(status).send(msg);
    }
  }
}
