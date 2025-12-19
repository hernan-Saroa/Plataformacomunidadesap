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

// Controllers
import { NewsController } from './controllers/news.controller';
import { ProcessController } from './controllers/process.controller';
import { AutoController } from './controllers/auto.controller';
import { ProfessionalController } from './controllers/professional.controller';

// Services
import { NewsService } from './services/news.service';
import { ProcessService } from './services/process.service';
import { AutoService } from './services/auto.service';
import { SequenceService } from './services/sequence.service';
import { StorageService } from './services/storage.service';
import { TerminosCalculatorService } from './services/terminos-calculator.service';
import { SeedService } from './seed.service';
import { databaseConfig } from './database.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { StageConfiguration } from './entities/stage-configuration.entity';
import { SystemConfiguration } from './entities/system-configuration.entity';
import { ConfigurationController } from './controllers/configuration.controller';

import { FilesController } from './controllers/files.controller';

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
      Evidence,
      AutoVersion,
    ]),
  ],
  controllers: [AppController, NewsController, ProcessController, AutoController, ProfessionalController, ConfigurationController, FilesController],
  providers: [
    AppService,
    NewsService,
    ProcessService,
    AutoService,
    SequenceService,
    StorageService,
    TerminosCalculatorService,
    SeedService,
  ],
})
export class AppModule { }
