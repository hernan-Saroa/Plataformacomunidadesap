import { ConsultasJuridicasController } from './controllers/consultas-juridicas.controller';
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
import { TerminosService } from './services/terminos.service';
import { AutosController } from './controllers/autos.controller';
import { AutosService } from './services/autos.service';
import { EvidenciasService } from './services/evidencias.service';
import { ActasService } from './services/actas.service';
import { ConsultasJuridicasService } from './services/consultas-juridicas.service';
import { Evidencia } from './entities/evidencia.entity';
import { Acta } from './entities/acta.entity';
import { ConsultaJuridica } from './entities/consulta-juridica.entity';
import { TerminoProcesal } from './entities/termino-procesal.entity';
import { Auto } from './entities/auto.entity';

// ... (existing imports)

// Órganos de Control - Nuevo módulo
import { OrganismoControlOC } from './entities/organismo-control-legal.entity';
import { RequerimientoOC } from './entities/requerimiento-oc.entity';
import { SolicitudInsumo } from './entities/solicitud-insumo.entity';
import { Hallazgo } from './entities/hallazgo.entity';
import { RequerimientosOCController } from './controllers/requerimientos-oc.controller';
import { RequerimientosOCService } from './services/requerimientos-oc.service';

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
      Auto,
      Documento,
      Evidencia,
      Acta,
      ConsultaJuridica,
      TerminoProcesal,
      // Órganos de Control
      OrganismoControlOC,
      RequerimientoOC,
      SolicitudInsumo,
      Hallazgo
    ]),
  ],
  controllers: [
    AppController,
    ExpedienteController,
    ActuacionController,
    AbogadoController,
    AbogadoStatsController,
    AudienciaController,
    DocumentoController,
    ComentarioController,
    RequerimientoController,
    FilesController,
    JuzgamientoController,
    TerminosController,
    AutosController,
    ConsultasJuridicasController,
    DocumentoController,
    EvidenciasController,
    ActasController,
    RequerimientosOCController
  ],
  providers: [
    AppService,
    ExpedienteService,
    ActuacionService,
    AbogadoService,
    AudienciaService,
    RequerimientoService,
    ComentarioService,
    AutosService,
    DocumentoService,
    EvidenciasService,
    ActasService,
    ConsultasJuridicasService,
    TerminosService,
    RequerimientosOCService
  ],
})
export class AppModule { }

