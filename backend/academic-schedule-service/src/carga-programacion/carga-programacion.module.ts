import { Module } from '@nestjs/common';

import { AccesoModule } from '../acceso/acceso.module.js';
import { ContratoClient } from '../asignaciones/contrato-client.js';
import { CargaProgramacionController } from './carga-programacion.controller.js';
import { CargaProgramacionService } from './carga-programacion.service.js';
import { ReutilizarPeriodoService } from './reutilizar-periodo.service.js';

/** Carga de la programación por plantilla de Excel y reutilización de periodos anteriores. */
@Module({
  imports: [AccesoModule],
  controllers: [CargaProgramacionController],
  providers: [CargaProgramacionService, ReutilizarPeriodoService, ContratoClient],
})
export class CargaProgramacionModule {}
