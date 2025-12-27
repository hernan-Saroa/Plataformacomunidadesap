import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './database.config';
import { Expediente } from './entities/expediente.entity';
import { Actuacion } from './entities/actuacion.entity';
import { Abogado } from './entities/abogado.entity';
import { Audiencia } from './entities/audiencia.entity';
import { ExpedienteController } from './controllers/expediente.controller';
import { ActuacionController } from './controllers/actuacion.controller';
import { AbogadoController, AbogadoStatsController } from './controllers/abogado.controller';
import { AudienciaController } from './controllers/audiencia.controller';
import { ExpedienteService } from './services/expediente.service';
import { ActuacionService } from './services/actuacion.service';
import { AbogadoService } from './services/abogado.service';
import { AudienciaService } from './services/audiencia.service';
import { Comentario } from './entities/comentario.entity';
import { ComentarioController } from './controllers/comentario.controller';
import { ComentarioService } from './services/comentario.service';

import { Requerimiento } from './entities/requerimiento.entity';
import { OrganismoControl } from './entities/organismo-control.entity';
import { RequerimientoController } from './controllers/requerimiento.controller';
import { FilesController } from './controllers/files.controller';
import { RequerimientoService } from './services/requerimiento.service';
import { JuzgamientoController } from './controllers/juzgamiento.controller';
import { TerminosController } from './controllers/terminos.controller';

import { Auto } from './entities/auto.entity';
import { AutosController } from './controllers/autos.controller';
import { AutosService } from './services/autos.service';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([
      Expediente,
      Actuacion,
      Abogado,
      Audiencia,
      Requerimiento,
      OrganismoControl,
      Comentario,
      Auto
    ]),
  ],
  controllers: [
    ExpedienteController,
    ActuacionController,
    AbogadoController,
    AbogadoStatsController,
    AudienciaController,
    RequerimientoController,
    FilesController,
    ComentarioController,
    JuzgamientoController,
    TerminosController,
    AutosController
  ],
  providers: [
    ExpedienteService,
    ActuacionService,
    AbogadoService,
    AudienciaService,
    RequerimientoService,
    ComentarioService,
    AutosService
  ],
})
export class AppModule { }
