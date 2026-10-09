import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ENTIDADES_PAA } from '../../entities/paa.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { UmbralesModule } from '../umbrales/umbrales.module';
import { PaaController } from './paa.controller';
import { PaaAdminService } from './paa-admin.service';
import { PaaCamposService } from './paa-campos.service';
import { PaaLineasService } from './paa-lineas.service';
import { PaaActivacionService } from './paa-activacion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([...ENTIDADES_PAA, Trazabilidad, Proceso, ProcesoActividad, Modalidad]),
    // Un cambio de modalidad que trae el PAA reinstancia el riel, como el que
    // se hace a mano en la 3.1, y pasa por los mismos umbrales.
    ConfiguracionModule,
    UmbralesModule,
  ],
  controllers: [PaaController],
  providers: [PaaAdminService, PaaCamposService, PaaLineasService, PaaActivacionService],
  exports: [PaaAdminService, PaaCamposService, PaaActivacionService],
})
export class PaaModule {}
