import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

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
  ],
  controllers: [RegistroActividadController],
  providers: [RegistroActividadService],
})
export class RegistroActividadModule {}
