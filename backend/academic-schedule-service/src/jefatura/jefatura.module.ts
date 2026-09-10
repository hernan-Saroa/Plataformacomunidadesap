import { Module } from '@nestjs/common';

import { JefaturaController } from './jefatura.controller.js';
import { JefaturaService } from './jefatura.service.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';

/**
 * Aprobación de la jefatura territorial (EFDS-1939): aprobar/devolver las franjas
 * tomadas por los docentes de la propia territorial. Estado en la franja
 * (migración 030), sin tabla nueva; sin integración con Docencia del PTA.
 */
@Module({
  controllers: [JefaturaController],
  providers: [JefaturaService, ProgramacionPermissionsService],
  exports: [JefaturaService],
})
export class JefaturaModule {}
