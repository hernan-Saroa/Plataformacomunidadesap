import { Module } from '@nestjs/common';

import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';

/**
 * Alertas de vencimiento (EFDS-1185).
 *
 * Sin `TypeOrmModule.forFeature`: el servicio consulta con SQL directo porque
 * cruza cinco tablas para armar una lista plana, y mapearlo con entidades
 * obligaría a traerlas enteras para leerles una fecha.
 */
@Module({
  controllers: [AlertasController],
  providers: [AlertasService],
  exports: [AlertasService],
})
export class AlertasModule {}
