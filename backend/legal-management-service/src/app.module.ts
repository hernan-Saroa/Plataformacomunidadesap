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
import { EvidenciasController } from './controllers/evidencias.controller';
import { ActasController } from './controllers/actas.controller';

// Restoration of missing imports
import { ConsultasJuridicasService } from './services/consultas-juridicas.service';
import { Evidencia } from './entities/evidencia.entity';
import { Acta } from './entities/acta.entity';
import { ConsultaJuridica } from './entities/consulta-juridica.entity';
import { TerminoProcesal } from './entities/termino-procesal.entity';
import { Auto } from './entities/auto.entity';

// Órganos de Control - Nuevo módulo
import { OrganismoControlOC } from './entities/organismo-control-legal.entity';
import { RequerimientoOC } from './entities/requerimiento-oc.entity';
import { SolicitudInsumo } from './entities/solicitud-insumo.entity';
import { Hallazgo } from './entities/hallazgo.entity';
import { RequerimientosOCController } from './controllers/requerimientos-oc.controller';
import { RequerimientosOCService } from './services/requerimientos-oc.service';

import { PeiModule } from './pei/pei.module';

// Tareas y Notas de Expedientes
import { TareaExpediente } from './entities/tarea-expediente.entity';
import { NotaExpediente } from './entities/nota-expediente.entity';
import { TareasNotasService } from './services/tareas-notas.service';
import { TareasNotasController } from './controllers/tareas-notas.controller';

// Comentarios y Documentos de Órganos de Control
import { ComentarioOC } from './entities/comentario-oc.entity';
import { DocumentoOC } from './entities/documento-oc.entity';
import { ComentariosDocumentosOCService } from './services/comentarios-documentos-oc.service';
import { ComentariosDocumentosOCController } from './controllers/comentarios-documentos-oc.controller';

// Módulo de Riesgos
import { Riesgo } from './entities/riesgo.entity';
import { RiesgosService } from './services/riesgos.service';
import { RiesgosController } from './controllers/riesgos.controller';

// Planes de Mejoramiento
import { PlanesMejoramientoModule } from './planes-mejoramiento/planes-mejoramiento.module';
import { PlanesMejoramientoController } from './controllers/planes-mejoramiento.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

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
      Hallazgo,
      // Tareas y Notas
      TareaExpediente,
      NotaExpediente,
      // Comentarios y Documentos OC
      ComentarioOC,
      DocumentoOC,
      // Riesgos
      Riesgo
    ]),
    PeiModule,
    PlanesMejoramientoModule
  ],
  controllers: [
    AppController,
    DashboardController, // Nuevo Dashboard
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
    EvidenciasController,
    ActasController,
    RequerimientosOCController,
    TareasNotasController,
    ComentariosDocumentosOCController,
    RiesgosController
  ],
  providers: [
    AppService,
    DashboardService, // Nuevo Service
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
    RequerimientosOCService,
    TareasNotasService,
    ComentariosDocumentosOCService,
    RiesgosService
  ],
})
export class AppModule { }

