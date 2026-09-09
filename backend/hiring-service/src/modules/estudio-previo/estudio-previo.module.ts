import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EstudioPrevioController } from './estudio-previo.controller';
import { EstudioPrevioService } from './estudio-previo.service';
import { FilesController } from './files.controller';
import { ModalidadesController } from './modalidades.controller';
import { PersonasController } from './personas.controller';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

import { Proceso } from '../../entities/proceso.entity';
import { Expediente } from '../../entities/expediente.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { CampoFormulario } from '../../entities/campo-formulario.entity';
import { Documento } from '../../entities/documento.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Revision } from '../../entities/revision.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { UmbralesModule } from '../umbrales/umbrales.module';
import { AprobacionModule } from '../aprobacion/aprobacion.module';

@Module({
  imports: [
    // La creación del proceso valida la modalidad contra los umbrales vigentes.
    UmbralesModule,
    // El envio consulta si alguien revisa la 3.1 antes de dejarla en revision.
    AprobacionModule,
    TypeOrmModule.forFeature([
      Proceso,
      Expediente,
      ProcesoActividad,
      CampoFormulario,
      Documento, Trazabilidad, Revision, Plantilla, Modalidad]),
    ConfiguracionModule,
  ],
  controllers: [EstudioPrevioController, ModalidadesController, PersonasController, FilesController],
  providers: [EstudioPrevioService],
})
export class EstudioPrevioModule {}
