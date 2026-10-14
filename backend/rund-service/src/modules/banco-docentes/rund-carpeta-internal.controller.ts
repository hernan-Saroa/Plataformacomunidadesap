import { BadRequestException, Body, CanActivate, Controller, ExecutionContext, Header, HttpCode, Injectable, Param, Post, ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
import { Public } from '../../auth/auth.decorators';
import { rundRequestActor } from './rund-access-audit';
import { RundCarpetaConsultaService } from './rund-carpeta-consulta.service';

/** La excepción JWT global nunca omite esta credencial de servicio. */
@Injectable()
export class RundCarpetaInternalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = String(process.env.RUND_CARPETA_INTERNAL_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
    if (!expected) throw new ServiceUnavailableException('La integración documental RUND no está configurada.');
    const supplied = context.switchToHttp().getRequest().headers['x-rund-carpeta-token'];
    if (typeof supplied !== 'string' || supplied.length > 4096 || !timingSafeEqual(
      createHash('sha256').update(expected).digest(), createHash('sha256').update(supplied).digest(),
    )) throw new UnauthorizedException('Credencial de servicio no válida.');
    return true;
  }
}

@Public()
@Controller('internal/carpeta-digital')
@UseGuards(RundCarpetaInternalGuard)
export class RundCarpetaInternalController {
  constructor(private readonly service: RundCarpetaConsultaService, private readonly jwt: JwtService) {}

  // POST mantiene el JWT del usuario fuera de URL/query/logs de acceso.
  @Post('personas/:personaId/documentos')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  async documentos(@Param('personaId') personaId: string, @Body() body?: { userToken?: unknown }) {
    return { success: true, data: await this.service.list(personaId, await this.actor(body)) };
  }

  @Post('personas/:personaId/perfiles')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  async perfiles(@Param('personaId') personaId: string, @Body() body?: { userToken?: unknown }) {
    return {success:true,data:await this.service.profiles(personaId,await this.actor(body))};
  }

  @Post('estadisticas')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  async estadisticas(@Body() body?: { personaIds?: unknown; userToken?: unknown }) {
    return { success: true, data: await this.service.stats(body?.personaIds, await this.actor(body)) };
  }

  @Post('documentos/:kind/:id')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  async documento(@Param('kind') kind: string, @Param('id') id: string, @Body() body?: { userToken?: unknown }) {
    return { success: true, data: await this.service.get(kind, id, await this.actor(body)) };
  }

  private async actor(body?: { userToken?: unknown }) {
    if (body?.userToken !== undefined && (typeof body.userToken !== 'string' || body.userToken.length > 16384)) {
      throw new BadRequestException('Formato de sesión no válido.');
    }
    let user: any;
    // Un caller interno no puede conceder roles/visibilidad mediante JSON.
    // Sesión ausente, vencida o inválida conserva la proyección enmascarada del portal.
    if (typeof body?.userToken === 'string' && body.userToken) {
      try { const payload = await this.jwt.verifyAsync(body.userToken); if (typeof payload.sub === 'string' && payload.sub.trim()) user = payload; } catch { /* sin elevación */ }
    }
    return rundRequestActor({ user });
  }
}
