import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentosService } from './documentos.service';
import { DocumentosController } from './documentos.controller';

import { DocumentoRequerido } from '../../entities/documento-requerido.entity';
import { DocumentoProceso } from '../../entities/documento-proceso.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { CdpModule } from '../cdp/cdp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentoRequerido,
      DocumentoProceso,
      ActividadExcluida,
      Modalidad,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
    // Por `exigirCdpParaDocumentos`: en contratación directa el CDP condiciona
    // esta actividad, y esa regla ya vive en el ciclo del CDP (EFDS-1148).
    CdpModule,
  ],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  // Lo consumirá la apertura (EFDS-1152): el pliego definitivo se registra
  // sobre los documentos elaborados aquí.
  exports: [DocumentosService],
})
export class DocumentosModule {}
