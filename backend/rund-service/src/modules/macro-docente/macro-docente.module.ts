import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanTrabajoAcademicoEntity } from '../../entities/plan-trabajo-academico.entity';
import { BancoDocenteEntity } from '../../entities/banco-docente.entity';
import { PersonaEntity } from '../../entities/persona.entity';
import { ProgramaEntity } from '../../entities/programa.entity';
import { RundAccesoExternoEntity } from '../../entities/rund-acceso-externo.entity';
import { RundMacroDocenteConsultaLogEntity } from '../../entities/rund-macro-docente-consulta-log.entity';
import { PtaPermissionsService } from '../../auth/pta-permissions.service';
import { PtaNotificationsService } from '../../notifications/pta-notifications.service';
import { MacroDocenteController } from './macro-docente.controller';
import { MacroDocenteService } from './macro-docente.service';
import { MacroDocentePermissionGuard } from './macro-docente-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanTrabajoAcademicoEntity,
      BancoDocenteEntity,
      PersonaEntity,
      ProgramaEntity,
      RundAccesoExternoEntity,
      RundMacroDocenteConsultaLogEntity,
    ]),
  ],
  controllers: [MacroDocenteController],
  // PtaPermissionsService (permisos pta.macro_docente.* desde auth.role_permissions)
  // y PtaNotificationsService (correo del acceso externo) ya no vienen de PtaModule:
  // se instancian aquí porque PTA es otro microservicio.
  providers: [MacroDocenteService, MacroDocentePermissionGuard, PtaPermissionsService, PtaNotificationsService],
})
export class MacroDocenteModule {}
