import { Module } from '@nestjs/common';
import { PlanAnual5RolesModule } from './plan-anual-5-roles/plan-anual-5-roles.module';
import { InformesLeyModule } from './informes-ley/informes-ley.module';
import { AuditoriasModule } from './auditorias/auditorias.module';
import { HallazgosModule } from './hallazgos/hallazgos.module';
import { PlanesMejoramientoModule } from './planes-mejoramiento/planes-mejoramiento.module';
import { AprobacionesModule } from './aprobaciones/aprobaciones.module';
import { UniversoAuditoriasModule } from './universo-auditorias/universo-auditorias.module';
import { DocumentosModule } from './documentos/documentos.module';
import { ProgramaAnualModule } from './programa-anual/programa-anual.module';
import { PlanIndividualModule } from './plan-individual/plan-individual.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { EvidenciasModule } from './evidencias/evidencias.module';
import { TiposAuditoriaModule } from './tipos-auditoria/tipos-auditoria.module';
import { ListasChequeoModule } from './listas-chequeo/listas-chequeo.module';
import { TablerosKanbanModule } from './tableros-kanban/tableros-kanban.module';
import { TareasAuditoriaModule } from './tareas-auditoria/tareas-auditoria.module';
import { ConfiguracionesModule } from './configuraciones/configuraciones.module';
import { EtapasAuditoriaModule } from './etapas-auditoria/etapas-auditoria.module';

/**
 * Módulo principal ESAP - Control Interno
 * 
 * Agrupa todos los microservicios específicos de ESAP
 * Todos los módulos están completamente integrados con PostgreSQL
 */
@Module({
  imports: [
    PlanAnual5RolesModule,
    InformesLeyModule,
    AuditoriasModule,
    HallazgosModule,
    PlanesMejoramientoModule,
    AprobacionesModule,
    UniversoAuditoriasModule,
    DocumentosModule,
    ProgramaAnualModule,
    PlanIndividualModule,
    NotificacionesModule,
    EvidenciasModule,
    TiposAuditoriaModule,
    ListasChequeoModule,
    TablerosKanbanModule,
    TareasAuditoriaModule,
    ConfiguracionesModule,
    EtapasAuditoriaModule,
  ],
  exports: [
    PlanAnual5RolesModule,
    InformesLeyModule,
    AuditoriasModule,
    HallazgosModule,
    PlanesMejoramientoModule,
    AprobacionesModule,
    UniversoAuditoriasModule,
    DocumentosModule,
    ProgramaAnualModule,
    PlanIndividualModule,
    NotificacionesModule,
    EvidenciasModule,
    TiposAuditoriaModule,
    ListasChequeoModule,
    TablerosKanbanModule,
    TareasAuditoriaModule,
    ConfiguracionesModule,
    EtapasAuditoriaModule,
  ],
})
export class EsapModule {}

