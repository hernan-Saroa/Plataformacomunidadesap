import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PtaPlanesModule } from '../../common/pta-planes.client';
import { BancoDocenteEntity } from '../../entities/banco-docente.entity';
import { PersonaEntity } from '../../entities/persona.entity';
import { RundAccesoExternoEntity } from '../../entities/rund-acceso-externo.entity';
import { RundMacroDocenteConsultaLogEntity } from '../../entities/rund-macro-docente-consulta-log.entity';
import { MacroDocenteNotificationsService } from '../../notifications/macro-docente-notifications.service';
import { MacroDocenteController } from './macro-docente.controller';
import { MacroDocenteService } from './macro-docente.service';
import { MacroDocentePermissionGuard } from './macro-docente-permission.guard';
import { AuthIdentityModule } from '../../common/auth-identity.client';
import { RundCatalogosModule } from '../../common/rund-catalogos.client';

@Module({
  imports: [
    AuthIdentityModule,
    RundCatalogosModule,
    PtaPlanesModule,
    TypeOrmModule.forFeature([
      BancoDocenteEntity,
      PersonaEntity,
      RundAccesoExternoEntity,
      RundMacroDocenteConsultaLogEntity,
    ]),
  ],
  controllers: [MacroDocenteController],
  providers: [MacroDocenteService, MacroDocentePermissionGuard, MacroDocenteNotificationsService],
})
export class MacroDocenteModule {}
