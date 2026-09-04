import { Module } from '@nestjs/common';

import { DocumentosActividadController } from './documentos-actividad.controller';
import { DocumentosActividadService } from './documentos-actividad.service';

/**
 * Documentos que una actividad entrega según sus formatos (EFDS-1183).
 *
 * Sin `TypeOrmModule.forFeature`: el servicio abre su propia transacción sobre
 * el `DataSource` porque cargar un documento toca el expediente y la
 * trazabilidad, y las dos deben confirmarse juntas.
 */
@Module({
  controllers: [DocumentosActividadController],
  providers: [DocumentosActividadService],
  exports: [DocumentosActividadService],
})
export class DocumentosActividadModule {}
