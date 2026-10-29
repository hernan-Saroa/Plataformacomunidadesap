import { Module } from '@nestjs/common';

import { CadenaAprobacionService } from './cadena-aprobacion.service';
import { CadenasController } from './cadenas.controller';
import { PlantillasCadenaService } from './plantillas-cadena.service';

/**
 * La aprobación por escalones (migración 101).
 *
 * Sin dependencias de otros módulos, igual que `CierreActividadModule`: lo
 * importan el cierre de los paneles, la aprobación, la bandeja y los avisos,
 * y ninguno debería arrastrar al resto para preguntar quién aprueba.
 */
@Module({
  controllers: [CadenasController],
  providers: [CadenaAprobacionService, PlantillasCadenaService],
  exports: [CadenaAprobacionService],
})
export class CadenaAprobacionModule {}
