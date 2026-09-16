import { Module } from '@nestjs/common';

import { EstadisticasController } from './estadisticas.controller';
import { EstadisticasService } from './estadisticas.service';

/**
 * Estadísticas y reportes de gestión (EFDS-1189).
 *
 * Sin `TypeOrmModule.forFeature`, por lo mismo que las alertas: el servicio
 * agrupa y suma con SQL directo. Traer las entidades enteras para contarlas en
 * memoria significaría cargar todos los contratos de la entidad para responder
 * cinco números.
 */
@Module({
  controllers: [EstadisticasController],
  providers: [EstadisticasService],
  exports: [EstadisticasService],
})
export class EstadisticasModule {}
