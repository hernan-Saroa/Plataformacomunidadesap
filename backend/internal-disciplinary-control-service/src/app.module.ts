import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpModule } from '@nestjs/axios';

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
import { databaseConfig } from './database.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { StageConfiguration } from './entities/stage-configuration.entity';
import { SystemConfiguration } from './entities/system-configuration.entity';
import { PlantillaAuto } from './entities/plantilla-auto.entity';
import { AutoConfiguration } from './entities/auto-configuration.entity';
import { ConfigurationController } from './controllers/configuration.controller';
import { AutosConfigurationController } from './controllers/autos-configuration.controller';
import { AutosConfigurationService } from './services/autos-configuration.service';

import { FilesController } from './controllers/files.controller';

import { DisciplinaryExportController } from './controllers/disciplinary-export.controller';
import { DisciplinaryExportService } from './services/disciplinary-export.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([
      DisciplinaryNews,
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
    DisciplinaryExportController,
    AutosConfigurationController,
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
    AutosConfigurationService,
  ],
})
export class AppModule { }
