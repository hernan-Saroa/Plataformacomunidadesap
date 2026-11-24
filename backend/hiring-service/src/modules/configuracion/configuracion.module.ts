import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';
import { DocumentosRequeridosController } from './documentos-requeridos.controller';
import { DocumentosRequeridosService } from './documentos-requeridos.service';
import { PolizasYAmparosController } from './polizas-y-amparos.controller';
import { PolizasYAmparosService } from './polizas-y-amparos.service';

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
import { TipoAmparo, TipoPoliza } from '../../entities/amparo.entity';
import { FlujoModule } from '../flujo/flujo.module';

@Module({
  imports: [
    // Quién hace y quién aprueba se editan en el borrador del flujo (111).
    FlujoModule,
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
      // Tipos de póliza y de amparo de la 8.4 (145).
      TipoPoliza,
      TipoAmparo,
    ]),
  ],
  controllers: [ConfiguracionController, DocumentosRequeridosController, PolizasYAmparosController],
  providers: [ConfiguracionService, DocumentosRequeridosService, PolizasYAmparosService],
  // El estudio previo lo usa para evaluar sus reglas al enviar.
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
