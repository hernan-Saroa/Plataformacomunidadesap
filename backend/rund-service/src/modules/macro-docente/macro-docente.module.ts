import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanTrabajoAcademicoEntity } from '../../entities/plan-trabajo-academico.entity';
import { BancoDocenteEntity } from '../../entities/banco-docente.entity';
import { PersonaEntity } from '../../entities/persona.entity';
import { FacultadEntity } from '../../entities/facultad.entity';
import { ProgramaEntity } from '../../entities/programa.entity';
import { RundAccesoExternoEntity } from '../../entities/rund-acceso-externo.entity';
import { RundMacroDocenteConsultaLogEntity } from '../../entities/rund-macro-docente-consulta-log.entity';
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
      FacultadEntity,
      RundAccesoExternoEntity,
      RundMacroDocenteConsultaLogEntity,
    ]),
  ],
  controllers: [MacroDocenteController],
  providers: [MacroDocenteService, MacroDocentePermissionGuard, PtaNotificationsService],
})
export class MacroDocenteModule {}
