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
import { TipologiaContrato } from '../../entities/tipologia-contrato.entity';

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
      // Las tipologías del contrato se administran desde la configuración de
      // etapas: son un parámetro del flujo, como los umbrales o los plazos.
      TipologiaContrato,
    ]),
  ],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  // El estudio previo lo usa para evaluar sus reglas al enviar.
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
