import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './database.config';
import { Expediente } from './entities/expediente.entity';
import { Actuacion } from './entities/actuacion.entity';
import { Abogado } from './entities/abogado.entity';
import { Audiencia } from './entities/audiencia.entity';
import { Documento } from './entities/documento.entity';
import { ExpedienteController } from './controllers/expediente.controller';
import { ActuacionController } from './controllers/actuacion.controller';
import { AbogadoController, AbogadoStatsController } from './controllers/abogado.controller';
import { AudienciaController } from './controllers/audiencia.controller';
import { DocumentoController } from './controllers/documento.controller';
import { ExpedienteService } from './services/expediente.service';
import { ActuacionService } from './services/actuacion.service';
import { AbogadoService } from './services/abogado.service';
import { AudienciaService } from './services/audiencia.service';
import { DocumentoService } from './services/documento.service';
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
      Documento
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
    DocumentoController
  ],
  providers: [
    ExpedienteService,
    ActuacionService,
    AbogadoService,
    AudienciaService,
    RequerimientoService,
    ComentarioService,
    DocumentoService
  ],
})
export class AppModule { }
