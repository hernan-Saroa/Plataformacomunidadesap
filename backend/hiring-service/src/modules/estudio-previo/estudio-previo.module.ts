import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EstudioPrevioController } from './estudio-previo.controller';
import { EstudioPrevioService } from './estudio-previo.service';
import { FilesController } from './files.controller';
import { ModalidadesController } from './modalidades.controller';
import { PersonasController } from './personas.controller';

import { Proceso } from '../../entities/proceso.entity';
import { Expediente } from '../../entities/expediente.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { CampoFormulario } from '../../entities/campo-formulario.entity';
import { Documento } from '../../entities/documento.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Revision } from '../../entities/revision.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import { Modalidad } from '../../entities/modalidad.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Proceso,
      Expediente,
      ProcesoActividad,
      CampoFormulario,
      Documento, Trazabilidad, Revision, Plantilla, Modalidad]),
  ],
  controllers: [EstudioPrevioController, ModalidadesController, PersonasController, FilesController],
  providers: [EstudioPrevioService],
})
export class EstudioPrevioModule {}
