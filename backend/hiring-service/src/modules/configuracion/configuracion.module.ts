import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';

import {
  Actividad,
  ActividadExcluida,
  ActividadSalvedad,
} from '../../entities/actividad.entity';
import { ReglaActividad } from '../../entities/regla-actividad.entity';
import { CampoFormulario } from '../../entities/campo-formulario.entity';
import { Documento } from '../../entities/documento.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Actividad,
      ActividadExcluida,
      ActividadSalvedad,
      ReglaActividad,
      CampoFormulario,
      Documento,
      ProcesoActividad,
      Expediente,
    ]),
  ],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  // El estudio previo lo usa para evaluar sus reglas al enviar.
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
