import { Module } from '@nestjs/common';

import { AlertasController } from './alertas.controller';
import { AlertasCron } from './alertas.cron';
import { AlertasService } from './alertas.service';

/**
 * Alertas de vencimiento (EFDS-1185).
 *
 * Sin `TypeOrmModule.forFeature`: el servicio consulta con SQL directo porque
 * cruza cinco tablas para armar una lista plana, y mapearlo con entidades
 * obligaría a traerlas enteras para leerles una fecha.
 *
 * El servicio calcula y el cron avisa: la pantalla consulta lo mismo que el
 * aviso diario, así que lo que ve el gestor y lo que le llega por correo no
 * pueden contradecirse.
 */
@Module({
  controllers: [AlertasController],
  providers: [AlertasService, AlertasCron],
  exports: [AlertasService],
})
export class AlertasModule {}
