import { Module } from '@nestjs/common';

import { ConcertacionController } from './concertacion.controller.js';
import { ConcertacionService } from './concertacion.service.js';
import { ContratoPtaClient } from './contrato-pta.client.js';
import { PermisosPtaService } from './permisos-pta.service.js';

/** Concertación de la docencia (EFDS-2315). Apagada por defecto. */
@Module({
  controllers: [ConcertacionController],
  providers: [ConcertacionService, ContratoPtaClient, PermisosPtaService],
  exports: [ConcertacionService],
})
export class ConcertacionModule {}
