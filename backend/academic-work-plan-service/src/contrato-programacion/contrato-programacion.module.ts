import { Module } from '@nestjs/common';

import { CalculoHorasController } from './v1/calculo-horas.controller';
import { CalculoHorasService } from './v1/calculo-horas.service';
import { DocentesContratoController } from './v1/docentes-contrato.controller';
import { DocentesContratoService } from './v1/docentes-contrato.service';
import { DocenciaDecisionesController } from './v1/docencia-decisiones.controller';
import { DocenciaDecisionesService } from './v1/docencia-decisiones.service';
import { PtaPermissionsService } from '../pta/auth/pta-permissions.service';

/**
 * Superficie que Programación Académica consume de este servicio.
 *
 * Módulo HERMANO de `pta/`, no parte de él: agrega lo nuevo sin reorganizar
 * código existente. Ver el README de la carpeta para el porqué del versionado y
 * de los DTOs propios.
 */
@Module({
  controllers: [DocentesContratoController, CalculoHorasController, DocenciaDecisionesController],
  // PtaPermissionsService solo necesita el DataSource: se provee aquí en vez de
  // importar todo PtaModule (EFDS-2315).
  providers: [DocentesContratoService, CalculoHorasService, DocenciaDecisionesService, PtaPermissionsService],
  exports: [DocentesContratoService, CalculoHorasService],
})
export class ContratoProgramacionModule {}
