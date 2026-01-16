import {
  All,
  Controller,
  Req,
  Res,
  Param,
} from '@nestjs/common';
import { GatewayService } from './gateway.service';
import type { Request, Response } from 'express';

/**
 * Gateway Controller
 *
 * Maneja el ruteo de todas las peticiones a los microservicios.
 *
 * Estructura de URL: /{service}/api/v{version}/{path}
 * Ejemplos:
 *   - /auth/api/v1/users -> auth-service:3001/users
 *   - /auth/api/v2/users -> auth-service:3001/v2/users (si el servicio soporta v2)
 *   - /certificados/api/v1/generate -> certification-service:3004/generate
 *
 * Esto permite versionamiento independiente por microservicio.
 */
@Controller(':service')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) { }

  @All('api/v:version/*')
  async proxyVersioned(
    @Param('service') service: string,
    @Param('version') version: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.gatewayService.forwardRequest(service, version, req, res);
  }

  // Ruta de fallback para requests sin versión (redirige a v1)
  @All('api/*')
  async proxyDefault(
    @Param('service') service: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.gatewayService.forwardRequest(service, '1', req, res);
  }

  // Proxy para archivos estáticos (ej. /certificados/uploads/...)
  @All('uploads/*')
  async proxyUploads(
    @Param('service') service: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.gatewayService.forwardStatic(service, req, res);
  }

  // Proxy para archivos del controlador FilesController (ej. /legal/files/...)
  @All('files/*')
  async proxyFiles(
    @Param('service') service: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.gatewayService.forwardStatic(service, req, res);
  }
}
