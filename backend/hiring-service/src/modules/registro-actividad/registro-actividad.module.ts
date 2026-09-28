import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AprobacionModule } from '../aprobacion/aprobacion.module';
import { CdpModule } from '../cdp/cdp.module';
import { DocumentosActividadModule } from '../documentos-actividad/documentos-actividad.module';
import { RegistroActividadService } from './registro-actividad.service';
import { RegistroActividadController } from './registro-actividad.controller';

import {
  ActividadConSoporte,
  RegistroActividad,
} from '../../entities/registro-actividad.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RegistroActividad,
      // Qué actividades admiten registro y cuáles exigen soporte: parámetro, no
      // constante. Ver la migración 051.
      ActividadConSoporte,
      // Hay modalidades que no adelantan estas actividades —la subasta solo
      // aplica a la selección abreviada—, y eso lo dice la matriz cargada.
      ActividadExcluida,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
    // El registro decide si la actividad queda cerrada o pasa a revision, y
    // quien revisa lo dice la matriz: la regla vive en aprobacion, no aqui.
    AprobacionModule,
    // Un registro que cierra puede cerrar la etapa 3 —el comité de la 3.7 en
    // contratación directa—, y con ella nace la solicitud de CDP.
    CdpModule,
    // Qué documentos pide la actividad: el catálogo único (EFDS-2066).
    DocumentosActividadModule,
  ],
  controllers: [RegistroActividadController],
  providers: [RegistroActividadService],
})
export class RegistroActividadModule {}
