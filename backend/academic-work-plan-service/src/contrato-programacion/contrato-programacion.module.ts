import { Module } from '@nestjs/common';

import { CalculoHorasController } from './v1/calculo-horas.controller';
import { CalculoHorasService } from './v1/calculo-horas.service';
import { DocentesContratoController } from './v1/docentes-contrato.controller';
import { DocentesContratoService } from './v1/docentes-contrato.service';
import { IntegracionRundModule } from '../integracion-rund/integracion-rund.module';

/**
 * Superficie que Programación Académica consume de este servicio.
 *
 * Módulo HERMANO de `pta/`, no parte de él: agrega lo nuevo sin reorganizar
 * código existente. Ver el README de la carpeta para el porqué del versionado y
 * de los DTOs propios.
 */
@Module({
  imports: [IntegracionRundModule],
  controllers: [DocentesContratoController, CalculoHorasController],
  providers: [DocentesContratoService, CalculoHorasService],
  exports: [DocentesContratoService, CalculoHorasService],
})
export class ContratoProgramacionModule {}
