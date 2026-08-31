import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PtaController } from './pta.controller';
import { PtaService } from './pta.service';
import { PtaPermissionsService } from './auth/pta-permissions.service';
import { PtaAuthGuard } from './auth/pta-auth.guard';
import { PtaNotificationsService } from './notifications/pta-notifications.service';
import { PlanTrabajoAcademicoEntity } from './entities/plan-trabajo-academico.entity';
import { HistorialEstadoPtaEntity } from './entities/historial-estado-pta.entity';
import { PtaEvidenciaEntity } from './entities/pta-evidencia.entity';
import { SolicitudPtaEntity } from './entities/solicitud-pta.entity';
import { PtaConfiguracionEntity } from './entities/pta-configuracion.entity';
import { PtaUserDataEntity } from './entities/pta-user-data.entity';
import { ProgramaEntity } from './entities/programa.entity';
import { AsignaturaEntity } from './entities/asignatura.entity';
import { TerritorialEntity } from './entities/territorial.entity';
import { SedeEntity } from './entities/sede.entity';
import { DocenteEntity } from './entities/docente.entity';
import { PersonaEntity } from './entities/persona.entity';
import { UsuarioEntity } from './entities/usuario.entity';
import { AprobacionJefaturaEntity } from './entities/aprobacion-jefatura.entity';
import { PtaEventoEntity } from './entities/pta-evento.entity';
import { PtaComponentApprovalEntity } from './entities/pta-component-approval.entity';
import { PtaComponentReviewEntity } from './entities/pta-component-review.entity';
import { PtaTerritorialApprovalEntity } from './entities/pta-territorial-approval.entity';
import { PtaTerritorialReviewEntity } from './entities/pta-territorial-review.entity';

// New entities
import { FacultadEntity } from './entities/facultad.entity';
import { DireccionTerritorialEntity } from './entities/direccion-territorial.entity';
import { UbicacionSemestralEntity } from './entities/ubicacion-semestral.entity';
import { PeriodoAcademicoEntity } from './entities/periodo-academico.entity';
import { NucleoTematicoEntity } from './entities/nucleo-tematico.entity';
import { CetapEntity } from './entities/cetap.entity';
import { CetapAliasEntity } from './entities/cetap-alias.entity';
import { OfertaCetapProgramaEntity } from './entities/oferta-cetap-programa.entity';

// RUND — BR-038..BR-061: Soporte documental y aprobación
import { RundCampoEstadoEntity } from './entities/rund-campo-estado.entity';
import { RundSoporteCampoEntity } from './entities/rund-soporte-campo.entity';

// Import and Cascada Controllers & Services
import { AsignaturasImportController } from './asignaturas-import/asignaturas-import.controller';
import { AsignaturasImportService } from './asignaturas-import/asignaturas-import.service';
import { ExcelParserService } from './asignaturas-import/parsers/excel-parser.service';
import { CascadaController } from './cascada.controller';
import { PeriodoAcademicoController } from './periodo-academico.controller';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      PlanTrabajoAcademicoEntity,
      HistorialEstadoPtaEntity,
      PtaEvidenciaEntity,
      SolicitudPtaEntity,
      PtaConfiguracionEntity,
      PtaUserDataEntity,
      ProgramaEntity,
      AsignaturaEntity,
      TerritorialEntity,
      SedeEntity,
      DocenteEntity,
      PersonaEntity,
      UsuarioEntity,
      AprobacionJefaturaEntity,
      PtaEventoEntity,
      FacultadEntity,
      DireccionTerritorialEntity,
      UbicacionSemestralEntity,
      PeriodoAcademicoEntity,
      NucleoTematicoEntity,
      CetapEntity,
      CetapAliasEntity,
      OfertaCetapProgramaEntity,
      PtaComponentApprovalEntity,
      PtaComponentReviewEntity,
      PtaTerritorialApprovalEntity,
      PtaTerritorialReviewEntity,
      RundCampoEstadoEntity,
      RundSoporteCampoEntity,
    ]),
  ],
  controllers: [PtaController, AsignaturasImportController, CascadaController, PeriodoAcademicoController],
  providers: [PtaService, AsignaturasImportService, ExcelParserService, PtaPermissionsService, PtaAuthGuard, PtaNotificationsService],
  // PtaPermissionsService/PtaNotificationsService se reutilizan desde MacroDocenteModule
  // (permisos granulares pta.macro_docente.* y correo de acceso externo otorgado).
  exports: [PtaPermissionsService, PtaNotificationsService],
})
export class PtaModule {}
