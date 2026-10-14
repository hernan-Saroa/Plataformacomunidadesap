import { CanActivate, Controller, ExecutionContext, Get, Injectable, Param, ParseUUIDPipe, ServiceUnavailableException, UnauthorizedException, UseGuards, Header } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { Public } from '../auth/decorators/public.decorator';
import { RundStateSnapshotService } from './rund-state-snapshot.service';

@Injectable()
export class RundStateSnapshotGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = process.env.RUND_CARPETA_SYNC_TOKEN || process.env.INTERNAL_SERVICE_TOKEN;
    if (!expected) throw new ServiceUnavailableException('Credencial de sincronización no configurada.');
    const actual = context.switchToHttp().getRequest().headers['x-rund-carpeta-sync-token'];
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (typeof actual !== 'string' || !timingSafeEqual(digest(actual), digest(expected))) throw new UnauthorizedException();
    return true;
  }
}

@Public()
@UseGuards(RundStateSnapshotGuard)
@Controller('internal/carpeta-digital/personas')
export class RundStateSnapshotController {
  constructor(private readonly service: RundStateSnapshotService) {}

  @Get(':personaId/estado-rund')
  @Header('Cache-Control', 'private, no-store')
  snapshot(@Param('personaId', new ParseUUIDPipe()) personaId: string) {
    return this.service.snapshot(personaId);
  }
}
