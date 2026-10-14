import { Module } from '@nestjs/common';
import { RundDocentesClient } from './rund-docentes.client';
import { RundSyncService } from './rund-sync.service';

/** Todo lo que PTA necesita para hablar con rund-service (API interna) y mantener su copia de docentes. */
@Module({
  providers: [RundDocentesClient, RundSyncService],
  exports: [RundDocentesClient, RundSyncService],
})
export class IntegracionRundModule {}
