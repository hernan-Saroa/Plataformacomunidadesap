import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModalidadProcesoService } from './modalidad-proceso.service';
import { ModalidadProcesoController } from './modalidad-proceso.controller';

import { Proceso } from '../../entities/proceso.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Revision } from '../../entities/revision.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { ParticipacionModule } from '../participacion/participacion.module';
import { UmbralesModule } from '../umbrales/umbrales.module';
import { CdpModule } from '../cdp/cdp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proceso, Modalidad, ProcesoActividad, Revision, Trazabilidad]),
    // Quién ratifica es el abogado repartido en la 3.3.
    ParticipacionModule,
    // Corregir la modalidad se valida contra los umbrales, como al crear.
    UmbralesModule,
    // Ratificarla cierra la 3.5, y en mínima cuantía eso cierra la etapa 3: la
    // solicitud de CDP nace en ese momento.
    CdpModule,
  ],
  controllers: [ModalidadProcesoController],
  providers: [ModalidadProcesoService],
})
export class ModalidadProcesoModule {}
