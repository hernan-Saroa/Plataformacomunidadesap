import { Module } from '@nestjs/common';

import { AvisosController, CorreoAvisosController, DependenciasController } from './avisos.controller';
import { CadenaAprobacionModule } from '../cadena-aprobacion/cadena-aprobacion.module';
import { AvisosService } from './avisos.service';
import { NotificacionesSubscriber } from './notificaciones.subscriber';
import { NotificadorService } from './notificador.service';

/**
 * Avisos a la campana (EFDS-1183).
 *
 * Sin dependencias de los módulos del flujo: se entera de todo por la
 * trazabilidad. Quitar este módulo del arranque apaga los avisos sin tocar nada
 * más.
 */
@Module({
  // Quién decide el escalón que espera, para el aviso a quien aprueba (101).
  imports: [CadenaAprobacionModule],
  controllers: [AvisosController, CorreoAvisosController, DependenciasController],
  providers: [AvisosService, NotificadorService, NotificacionesSubscriber],
  exports: [NotificadorService],
})
export class NotificacionesModule {}
