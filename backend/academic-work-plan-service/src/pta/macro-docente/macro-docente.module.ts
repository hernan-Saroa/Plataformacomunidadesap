import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanTrabajoAcademicoEntity } from '../entities/plan-trabajo-academico.entity';
import { DocenteEntity } from '../entities/docente.entity';
import { PersonaEntity } from '../entities/persona.entity';
import { ProgramaEntity } from '../entities/programa.entity';
import { RundAccesoExternoEntity } from '../entities/rund-acceso-externo.entity';
import { RundMacroDocenteConsultaLogEntity } from '../entities/rund-macro-docente-consulta-log.entity';
import { PtaModule } from '../pta.module';
import { MacroDocenteController } from './macro-docente.controller';
import { MacroDocenteService } from './macro-docente.service';
import { MacroDocentePermissionGuard } from './macro-docente-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanTrabajoAcademicoEntity,
      DocenteEntity,
      PersonaEntity,
      ProgramaEntity,
      RundAccesoExternoEntity,
      RundMacroDocenteConsultaLogEntity,
    ]),
    // Reutiliza PtaPermissionsService (permisos pta.macro_docente.* resueltos
    // desde auth.role_permissions) y PtaNotificationsService (correo del
    // acceso externo otorgado) — ambos exportados por PtaModule.
    PtaModule,
  ],
  controllers: [MacroDocenteController],
  providers: [MacroDocenteService, MacroDocentePermissionGuard],
})
export class MacroDocenteModule {}
