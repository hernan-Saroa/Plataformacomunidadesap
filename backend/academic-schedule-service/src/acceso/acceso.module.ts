import { Global, Module } from '@nestjs/common';

import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { AlcanceService } from './alcance.service.js';
import { NivelesRequestService } from './niveles-request.service.js';
import { TerritorialService } from './territorial.service.js';

/**
 * Alcance del usuario sobre periodos y niveles (EFDS-2301, EFDS-2302). Global:
 * lo usan el guard de AppModule y los controladores que listan por nivel.
 */
@Global()
@Module({
  providers: [AlcanceService, NivelesRequestService, ProgramacionPermissionsService, TerritorialService],
  exports: [AlcanceService, NivelesRequestService, ProgramacionPermissionsService, TerritorialService],
})
export class AccesoModule {}
