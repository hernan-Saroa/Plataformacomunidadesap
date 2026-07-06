import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EsapModule } from './esap/esap.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';

// Entidades ESAP
import { PlanAnual5Roles } from './esap/plan-anual-5-roles/entities/plan-anual-5-roles.entity';
import { RolPlanAnual5 } from './esap/plan-anual-5-roles/entities/rol-plan-anual-5.entity';
import { ActividadPlanAnual5 } from './esap/plan-anual-5-roles/entities/actividad-plan-anual-5.entity';
import { AdjuntoActividadPlanAnual5 } from './esap/plan-anual-5-roles/entities/adjunto-actividad-plan-anual-5.entity';
import { HistorialPlanAnual } from './esap/plan-anual-5-roles/entities/historial-plan-anual.entity';
import { PlanAnualWizardBorrador } from './esap/plan-anual-5-roles/entities/plan-anual-wizard-borrador.entity';
import { InformeLey } from './esap/informes-ley/entities/informe-ley.entity';
import { EntregaInformeLey } from './esap/informes-ley/entities/entrega-informe-ley.entity';
import { DatosAutomaticosInforme } from './esap/informes-ley/entities/datos-automaticos-informe.entity';
import { HistorialGeneracionInforme } from './esap/informes-ley/entities/historial-generacion-informe.entity';
import { PlantillaInformeLey } from './esap/informes-ley/entities/plantilla-informe-ley.entity';
import { WorkflowAprobacionInforme } from './esap/informes-ley/entities/workflow-aprobacion-informe.entity';
import { PasoWorkflowInforme } from './esap/informes-ley/entities/paso-workflow-informe.entity';
import { Auditoria } from './esap/auditorias/entities/auditoria.entity';
import { ObjetivoAuditoria } from './esap/auditorias/entities/objetivo-auditoria.entity';
import { EquipoAuditor } from './esap/auditorias/entities/equipo-auditor.entity';
import { NotaAuditoria } from './esap/auditorias/entities/nota-auditoria.entity';
import { HistorialAuditoria } from './esap/auditorias/entities/historial-auditoria.entity';
import { AuditoriaTerritorialInfo } from './esap/auditorias/entities/auditoria-territorial-info.entity';
import { AuditoriaEspecialInfo } from './esap/auditorias/entities/auditoria-especial-info.entity';
import { AuditorPerfil } from './esap/auditorias/entities/auditor-perfil.entity';
import { CriterioAuditoria } from './esap/auditorias/entities/criterio-auditoria.entity';
import { Hallazgo } from './esap/hallazgos/entities/hallazgo.entity';
import { PlanMejoramiento } from './esap/planes-mejoramiento/entities/plan-mejoramiento.entity';
import { AccionCorrectiva } from './esap/planes-mejoramiento/entities/accion-correctiva.entity';
import { SeguimientoTrimestral } from './esap/planes-mejoramiento/entities/seguimiento-trimestral.entity';
import { RegistroSeguimiento } from './esap/planes-mejoramiento/entities/registro-seguimiento.entity';
import { EventoTimeline } from './esap/planes-mejoramiento/entities/evento-timeline.entity';
import { Aprobacion } from './esap/aprobaciones/entities/aprobacion.entity';
import { ProcesoAuditable } from './esap/universo-auditorias/entities/proceso-auditable.entity';
import { EvaluacionProceso } from './esap/universo-auditorias/entities/evaluacion-proceso.entity';
import { TipoProceso } from './esap/universo-auditorias/entities/tipo-proceso.entity';
import { Documento } from './esap/documentos/entities/documento.entity';
import { ProgramaAnual } from './esap/programa-anual/entities/programa-anual.entity';
import { AuditoriaProgramada } from './esap/programa-anual/entities/auditoria-programada.entity';
import { PlanIndividual } from './esap/plan-individual/entities/plan-individual.entity';
import { Notificacion } from './esap/notificaciones/entities/notificacion.entity';
import { PreferenciaNotificacion } from './esap/notificaciones/entities/preferencia-notificacion.entity';
import { EvidenciaDocumento } from './esap/evidencias/entities/evidencia-documento.entity';
import { TipoAuditoria } from './esap/tipos-auditoria/entities/tipo-auditoria.entity';
import { ListaChequeo } from './esap/listas-chequeo/entities/lista-chequeo.entity';
import { ItemListaChequeo } from './esap/listas-chequeo/entities/item-lista-chequeo.entity';
import { TableroKanban } from './esap/tableros-kanban/entities/tablero-kanban.entity';
import { EtapaKanban } from './esap/tableros-kanban/entities/etapa-kanban.entity';
import { TareaAuditoria } from './esap/tareas-auditoria/entities/tarea-auditoria.entity';
import { ConfiguracionProfesionalOCIG } from './esap/configuraciones/entities/configuracion-profesional-ocig.entity';
import { ReunionApertura } from './esap/auditorias/entities/reunion-apertura.entity';
import { ReunionCierre } from './esap/auditorias/entities/reunion-cierre.entity';
import { EvidenciaAccion } from './esap/planes-mejoramiento/entities/evidencia-accion.entity';
import { AlertaPlan } from './esap/planes-mejoramiento/entities/alerta-plan.entity';
import { CierrePlan } from './esap/planes-mejoramiento/entities/cierre-plan.entity';
import { SeguimientoPlan } from './esap/planes-mejoramiento/entities/seguimiento-plan.entity';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    
    // Configuración TypeORM
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const dbConfig = {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASS || 'postgres',
          database: process.env.DB_NAME || 'esap_db',
          schema: process.env.DB_SCHEMA || 'control_interno',
        };

        console.log('🔌 Configurando conexión a PostgreSQL...');
        console.log(`   Host: ${dbConfig.host}`);
        console.log(`   Port: ${dbConfig.port}`);
        console.log(`   Database: ${dbConfig.database}`);
        console.log(`   Schema: ${dbConfig.schema}`);
        console.log(`   User: ${dbConfig.username}`);
        console.log(`   Password: ${dbConfig.password ? '***' : 'NO CONFIGURADA'}`);

        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          schema: dbConfig.schema,
          entities: [
            // Entidades ESAP
            PlanAnual5Roles,
            RolPlanAnual5,
            ActividadPlanAnual5,
            AdjuntoActividadPlanAnual5,
            HistorialPlanAnual,
            PlanAnualWizardBorrador,
            InformeLey,
            EntregaInformeLey,
            DatosAutomaticosInforme,
            HistorialGeneracionInforme,
            PlantillaInformeLey,
            WorkflowAprobacionInforme,
            PasoWorkflowInforme,
            Auditoria,
            ObjetivoAuditoria,
            EquipoAuditor,
            NotaAuditoria,
            HistorialAuditoria,
            AuditoriaTerritorialInfo,
            AuditoriaEspecialInfo,
            AuditorPerfil,
            CriterioAuditoria,
            Hallazgo,
            PlanMejoramiento,
            AccionCorrectiva,
            SeguimientoTrimestral,
            RegistroSeguimiento,
            EventoTimeline,
            Aprobacion,
            ProcesoAuditable,
            TipoProceso,
            EvaluacionProceso,
            Documento,
            ProgramaAnual,
            AuditoriaProgramada,
            PlanIndividual,
            Notificacion,
            PreferenciaNotificacion,
            EvidenciaDocumento,
            TipoAuditoria,
            ListaChequeo,
            ItemListaChequeo,
            TableroKanban,
            EtapaKanban,
            TareaAuditoria,
            ConfiguracionProfesionalOCIG,
            ReunionApertura,
            ReunionCierre,
            EvidenciaAccion,
            AlertaPlan,
            CierrePlan,
            SeguimientoPlan,
          ],
          synchronize: false, // Deshabilitado - usar migraciones manuales
          // synchronize: process.env.NODE_ENV !== 'production', // Solo en desarrollo
          logging: false,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
          // Configuración correcta para PostgreSQL
          extra: {
            connect_timeout: 10000, // 10 segundos en milisegundos
            max: 20, // Máximo de conexiones en el pool
            // Configurar encoding UTF-8 explícitamente
            options: '-c client_encoding=UTF8',
          },
          // Retry logic
          retryAttempts: 3,
          retryDelay: 3000,
          // Auto reconnect
          autoLoadEntities: false, // Ya estamos cargando manualmente
        };
      },
    }),
    
    // Módulo de autenticación
    AuthModule,
    
    // Módulos ESAP
    EsapModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
