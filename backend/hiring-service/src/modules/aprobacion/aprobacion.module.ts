import { Module } from '@nestjs/common';

import { AprobacionController } from './aprobacion.controller';
import { AprobacionService } from './aprobacion.service';
import { CdpModule } from '../cdp/cdp.module';
import { CierreActividadModule } from '../cierre-actividad/cierre-actividad.module';
import { DocumentosActividadModule } from '../documentos-actividad/documentos-actividad.module';

/**
 * Aprobación configurable de actividades (EFDS-1183).
 *
 * Sin `TypeOrmModule.forFeature`: el servicio abre su propia transacción sobre
 * el `DataSource` porque una decisión toca la actividad, su revisión y la
 * trazabilidad, y las tres deben confirmarse juntas.
 */
@Module({
  // Aprobar la última actividad abierta de la etapa 3 radica la solicitud de
  // CDP: la aprobación configurable es el tercero de los caminos por los que
  // una actividad de esa etapa queda cerrada.
  // El catálogo único dice qué documentos le faltan a la actividad (EFDS-2066).
  imports: [CdpModule, CierreActividadModule, DocumentosActividadModule],
  controllers: [AprobacionController],
  providers: [AprobacionService],
  exports: [AprobacionService],
})
export class AprobacionModule {}
