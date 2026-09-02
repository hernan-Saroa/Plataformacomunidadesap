import { Module } from '@nestjs/common';

import { DocentesContratoController } from './v1/docentes-contrato.controller';
import { DocentesContratoService } from './v1/docentes-contrato.service';

/**
 * Superficie que Programación Académica consume de este servicio.
 *
 * Módulo HERMANO de `pta/`, no parte de él: agrega lo nuevo sin reorganizar
 * código existente. Ver el README de la carpeta para el porqué del versionado y
 * de los DTOs propios.
 */
@Module({
  controllers: [DocentesContratoController],
  providers: [DocentesContratoService],
  exports: [DocentesContratoService],
})
export class ContratoProgramacionModule {}
