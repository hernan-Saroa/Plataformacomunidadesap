import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpModule } from '@nestjs/axios';

// Auth
import { AuthModule } from './auth/auth.module';

// Entities
import { DisciplinaryNews } from './entities/disciplinary-news.entity';
import { DisciplinaryProcess } from './entities/disciplinary-process.entity';
import { LegalAuto } from './entities/legal-auto.entity';
import { Sequence } from './entities/sequence.entity';
import { DisciplinaryProfessional } from './entities/disciplinary-professional.entity';
import { Evidence } from './entities/evidence.entity';
import { AutoVersion } from './entities/auto-version.entity';
import { TerminoProcesal } from './entities/termino-procesal.entity';
import { DiaFestivo } from './entities/dia-festivo.entity';
import { ReglaAlerta } from './entities/regla-alerta.entity';
import { AlertaEnviada } from './entities/alerta-enviada.entity';
import { EntidadRemision } from './entities/entidad-remision.entity';
import { DisciplinaryProcessActuacion } from './entities/disciplinary-process-actuacion.entity';
import { DisciplinaryProcessTask } from './entities/disciplinary-process-task.entity';
import { DisciplinaryProcessNote } from './entities/disciplinary-process-note.entity';
import { DisciplinaryNewsProcess } from './entities/disciplinary-news-process.entity';
import { DisciplinaryProcessReassignmentRequest } from './entities/disciplinary-process-reassignment-request.entity';
import { DisciplinaryBehavior } from './entities/disciplinary-behavior.entity';

// Controllers
import { NewsController } from './controllers/news.controller';
import { ProcessController } from './controllers/process.controller';
import { AutoController } from './controllers/auto.controller';
import { AutoTemplatesController } from './controllers/auto-templates.controller';
import { ProfessionalController } from './controllers/professional.controller';
import { TerminosProcesalesController } from './controllers/terminos-procesales.controller';
import { DiasFestivosController } from './controllers/dias-festivos.controller';
import { ReglasAlertaController } from './controllers/reglas-alerta.controller';
import { AlertasController } from './controllers/alertas.controller';
import { JobsController } from './controllers/jobs.controller';
import { DisciplinaryProcessActuacionesController } from './controllers/disciplinary-process-actuaciones.controller';
import { DisciplinaryProcessTasksController } from './controllers/disciplinary-process-tasks.controller';
import { DisciplinaryProcessNotesController } from './controllers/disciplinary-process-notes.controller';
import { DisciplinaryProcessReassignmentController } from './controllers/disciplinary-process-reassignment.controller';
import { DisciplinaryBehaviorController } from './controllers/disciplinary-behavior.controller';

// Services
import { NewsService } from './services/news.service';
import { ProcessService } from './services/process.service';
import { AutoService } from './services/auto.service';
import { SequenceService } from './services/sequence.service';
import { StorageService } from './services/storage.service';
import { TerminosCalculatorService } from './services/terminos-calculator.service';
import { TerminosProcesalesService } from './services/terminos-procesales.service';
import { DiasFestivosService } from './services/dias-festivos.service';
import { ReglasAlertaService } from './services/reglas-alerta.service';
import { AlertasService } from './services/alertas.service';
import { AlertasAutomaticasService } from './services/alertas-automaticas.service';
import { SchedulerService } from './services/scheduler.service';
import { SeedService } from './seed.service';
import { OnlyOfficeService } from './services/onlyoffice.service';
import { PdfModifierService } from './services/pdf-modifier.service';
import { DocumentConversionService } from './services/document-conversion.service';
import { databaseConfig } from './database.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { StageConfiguration } from './entities/stage-configuration.entity';
import { SystemConfiguration } from './entities/system-configuration.entity';
import { PlantillaAuto } from './entities/plantilla-auto.entity';
import { AutoConfiguration } from './entities/auto-configuration.entity';
import { OficioConfiguration } from './entities/oficio-configuration.entity';
import { ActaConfiguration } from './entities/acta-configuration.entity';
import { ConfigurationController } from './controllers/configuration.controller';
import { AutosConfigurationController } from './controllers/autos-configuration.controller';
import { OficiosConfigurationController } from './controllers/oficio-configuration.controller';
import { ActasConfigurationController } from './controllers/acta-configuration.controller';
import { AutosConfigurationService } from './services/autos-configuration.service';
import { OficiosConfigurationService } from './services/oficio-configuration.service';
import { ActasConfigurationService } from './services/acta-configuration.service';

import { FilesController } from './controllers/files.controller';

import { DisciplinaryExportController } from './controllers/disciplinary-export.controller';
import { DisciplinaryExportService } from './services/disciplinary-export.service';
import { CompartirExpedienteController } from './controllers/compartir-expediente.controller';
import { CompartirExpedienteService } from './services/compartir-expediente.service';
import { ExpedienteCompartido } from './entities/expediente-compartido.entity';
import { EntidadRemisionController } from './controllers/entidad-remision.controller';
import { EntidadRemisionService } from './services/entidad-remision.service';
import { TipoRemision } from './entities/tipo-remision.entity';
import { TipoRemisionController } from './controllers/tipo-remision.controller';
import { TipoRemisionService } from './services/tipo-remision.service';
import { DisciplinaryProcessActuacionesService } from './services/disciplinary-process-actuaciones.service';
import { DisciplinaryProcessTasksService } from './services/disciplinary-process-tasks.service';
import { DisciplinaryProcessNotesService } from './services/disciplinary-process-notes.service';
import { DisciplinaryProcessReassignmentService } from './services/disciplinary-process-reassignment.service';
import { JuridicaEmailService } from './services/juridica-email.service';
import { DisciplinaryBehaviorService } from './services/disciplinary-behavior.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
      },
    }),
    HttpModule,
    AuthModule,
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([
      DisciplinaryNews,
      DisciplinaryNewsProcess,
      DisciplinaryProcess,
      LegalAuto,
      Sequence,
      DisciplinaryProfessional,
      StageConfiguration,
      SystemConfiguration,
      PlantillaAuto,
      Evidence,
      AutoVersion,
      TerminoProcesal,
      DiaFestivo,
      ReglaAlerta,
      AlertaEnviada,
      AutoConfiguration,
      OficioConfiguration,
      ActaConfiguration,
      ExpedienteCompartido,
      EntidadRemision,
      TipoRemision,
      DisciplinaryProcessActuacion,
      DisciplinaryProcessTask,
      DisciplinaryProcessNote,
      DisciplinaryProcessReassignmentRequest,
      DisciplinaryBehavior,
    ]),
  ],
  controllers: [
    AppController,
    NewsController,
    ProcessController,
    AutoController,
    AutoTemplatesController,
    ProfessionalController,
    ConfigurationController,
    FilesController,
    TerminosProcesalesController,
    DiasFestivosController,
    ReglasAlertaController,
    AlertasController,
    JobsController,
    DisciplinaryProcessActuacionesController,
    DisciplinaryProcessTasksController,
    DisciplinaryProcessNotesController,
    DisciplinaryExportController,
    AutosConfigurationController,
    OficiosConfigurationController,
    ActasConfigurationController,
    CompartirExpedienteController,
    EntidadRemisionController,
    TipoRemisionController,
    DisciplinaryProcessReassignmentController,
    DisciplinaryBehaviorController,
  ],
  providers: [
    AppService,
    NewsService,
    ProcessService,
    AutoService,
    SequenceService,
    StorageService,
    TerminosCalculatorService,
    TerminosProcesalesService,
    DiasFestivosService,
    ReglasAlertaService,
    AlertasService,
    AlertasAutomaticasService,
    SchedulerService,
    SeedService,
    DisciplinaryExportService,
    OnlyOfficeService,
    PdfModifierService,
    DocumentConversionService,
    AutosConfigurationService,
    OficiosConfigurationService,
    ActasConfigurationService,
    CompartirExpedienteService,
    EntidadRemisionService,
    TipoRemisionService,
    DisciplinaryProcessActuacionesService,
    DisciplinaryProcessTasksService,
    DisciplinaryProcessNotesService,
    DisciplinaryProcessReassignmentService,
    JuridicaEmailService,
    DisciplinaryBehaviorService,
  ],
})
export class AppModule { }
