import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ENTIDADES_TRAMITE_MODIFICACION } from '../../entities/tramite-modificacion.entity';
import { ModificacionesModule } from '../modificaciones/modificaciones.module';
import { ConfiguracionModificacionesService } from './configuracion-modificaciones.service';
import {
  ConfiguracionModificacionesController,
  TramitesModificacionController,
} from './tramites-modificacion.controller';
import { TramitesModificacionService } from './tramites-modificacion.service';

/** El módulo de Modificaciones, fuera del proceso (150). */
@Module({
  imports: [TypeOrmModule.forFeature(ENTIDADES_TRAMITE_MODIFICACION), ModificacionesModule],
  controllers: [TramitesModificacionController, ConfiguracionModificacionesController],
  providers: [TramitesModificacionService, ConfiguracionModificacionesService],
})
export class TramitesModificacionModule {}
