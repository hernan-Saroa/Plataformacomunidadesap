import { Module } from '@nestjs/common';

import { AprobacionController } from './aprobacion.controller';
import { AprobacionService } from './aprobacion.service';

/**
 * Aprobación configurable de actividades (EFDS-1183).
 *
 * Sin `TypeOrmModule.forFeature`: el servicio abre su propia transacción sobre
 * el `DataSource` porque una decisión toca la actividad, su revisión y la
 * trazabilidad, y las tres deben confirmarse juntas.
 */
@Module({
  controllers: [AprobacionController],
  providers: [AprobacionService],
  exports: [AprobacionService],
})
export class AprobacionModule {}
