import { Module } from '@nestjs/common';

import { AlertasController } from './alertas.controller';
import { AlertasCron } from './alertas.cron';
import { AlertasService } from './alertas.service';
import { ParticipacionModule } from '../participacion/participacion.module';
import { ParametrosAlertaService } from './parametros-alerta.service';

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
  /**
   * Participación, para saber a quién avisarle de una solicitud de CDP que
   * nadie ha tomado: es el único aviso que hay que mandar sin responsable, y
   * quién puede resolverla se responde allí y no aquí.
   */
  imports: [ParticipacionModule],
  controllers: [AlertasController],
  providers: [AlertasService, AlertasCron, ParametrosAlertaService],
  exports: [AlertasService, ParametrosAlertaService],
})
export class AlertasModule {}
