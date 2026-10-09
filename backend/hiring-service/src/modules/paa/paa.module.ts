import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ENTIDADES_PAA } from '../../entities/paa.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { UmbralesModule } from '../umbrales/umbrales.module';
import { EstudioPrevioModule } from '../estudio-previo/estudio-previo.module';
import { PaaController } from './paa.controller';
import { PaaAdminService } from './paa-admin.service';
import { PaaCamposService } from './paa-campos.service';
import { PaaLineasService } from './paa-lineas.service';
import { PaaActivacionService } from './paa-activacion.service';
import { PaaRevisionesService } from './paa-revisiones.service';
import { PaaOrigenService } from './paa-origen.service';
import { ProcesoSinBloqueoGuard } from './proceso-sin-bloqueo.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([...ENTIDADES_PAA, Trazabilidad, Proceso, ProcesoActividad, Modalidad]),
    // Un cambio de modalidad que trae el PAA reinstancia el riel, como el que
    // se hace a mano en la 3.1, y pasa por los mismos umbrales.
    ConfiguracionModule,
    UmbralesModule,
    // Devolver por un cambio del PAA es la devolución de la 3.4, no otra.
    EstudioPrevioModule,
  ],
  controllers: [PaaController],
  providers: [
    PaaAdminService,
    PaaCamposService,
    PaaLineasService,
    PaaActivacionService,
    PaaRevisionesService,
    PaaOrigenService,
    ProcesoSinBloqueoGuard,
  ],
  exports: [PaaAdminService, PaaCamposService, PaaActivacionService, PaaRevisionesService, ProcesoSinBloqueoGuard],
})
export class PaaModule {}
