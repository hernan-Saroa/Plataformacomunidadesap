import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriasController } from './auditorias.controller';
import { AuditoriasService } from './auditorias.service';
import { Auditoria } from './entities/auditoria.entity';
import { ObjetivoAuditoria } from './entities/objetivo-auditoria.entity';
import { EquipoAuditor } from './entities/equipo-auditor.entity';
import { NotaAuditoria } from './entities/nota-auditoria.entity';
import { HistorialAuditoria } from './entities/historial-auditoria.entity';
import { AuditoriaTerritorialInfo } from './entities/auditoria-territorial-info.entity';
import { AuditoriaEspecialInfo } from './entities/auditoria-especial-info.entity';
import { AuditorPerfil } from './entities/auditor-perfil.entity';
import { CriterioAuditoria } from './entities/criterio-auditoria.entity';
import { Documento } from '../documentos/entities/documento.entity';
import { HallazgosModule } from '../hallazgos/hallazgos.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthModule } from '../../auth/auth.module';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Auditoria,
      ObjetivoAuditoria,
      EquipoAuditor,
      NotaAuditoria,
      HistorialAuditoria,
      AuditoriaTerritorialInfo,
      AuditoriaEspecialInfo,
      AuditorPerfil,
      CriterioAuditoria,
      Documento,
    ]),
    HallazgosModule,
    NotificacionesModule,
    AuthModule, // Para tener acceso a JwtService
  ],
  controllers: [AuditoriasController, TemplatesController],
  providers: [AuditoriasService, RolesGuard],
  exports: [AuditoriasService, TypeOrmModule],
})
export class AuditoriasModule {}












