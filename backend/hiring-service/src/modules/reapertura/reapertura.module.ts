import { Module } from '@nestjs/common';

import { CadenaAprobacionModule } from '../cadena-aprobacion/cadena-aprobacion.module';
import { ReaperturaController } from './reapertura.controller';
import { ReaperturaService } from './reapertura.service';

/** Reabrir actividades ya cerradas (153). */
@Module({
  imports: [CadenaAprobacionModule],
  controllers: [ReaperturaController],
  providers: [ReaperturaService],
})
export class ReaperturaModule {}
