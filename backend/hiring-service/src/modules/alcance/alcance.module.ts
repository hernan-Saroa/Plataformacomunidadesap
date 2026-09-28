import { Module } from '@nestjs/common';

import { AlcanceController } from './alcance.controller';
import { AlcanceAdminService } from './alcance-admin.service';

/**
 * La matriz de permisos por etapa. `AlcanceService` y `PermisosService` los
 * aporta AuthModule, que es global.
 */
@Module({
  controllers: [AlcanceController],
  providers: [AlcanceAdminService],
})
export class AlcanceModule {}
