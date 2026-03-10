import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './database.config';

// Entities
import { Expediente } from './entities/expediente.entity';
import { Actuacion } from './entities/actuacion.entity';
import { Abogado } from './entities/abogado.entity';
import { Audiencia } from './entities/audiencia.entity';
import { Documento } from './entities/documento.entity';
import { Requerimiento } from './entities/requerimiento.entity';
import { OrganismoControl } from './entities/organismo-control.entity';
import { Comentario } from './entities/comentario.entity';
import { Auto } from './entities/auto.entity';
import { Evidencia } from './entities/evidencia.entity';
import { Acta } from './entities/acta.entity';
import { ConsultaJuridica } from './entities/consulta-juridica.entity';
import { TerminoProcesal } from './entities/termino-procesal.entity';
import { OrganismoControlOC } from './entities/organismo-control-legal.entity';
import { RequerimientoOC } from './entities/requerimiento-oc.entity';
import { RespuestaBorradorOC } from './entities/respuesta-borrador-oc.entity';
import { SolicitudInsumo } from './entities/solicitud-insumo.entity';
import { Hallazgo } from './entities/hallazgo.entity';
import { TareaExpediente } from './entities/tarea-expediente.entity';
import { NotaExpediente } from './entities/nota-expediente.entity';
import { ComentarioOC } from './entities/comentario-oc.entity';
import { DocumentoOC } from './entities/documento-oc.entity';
import { Riesgo } from './entities/riesgo.entity';
import { RiesgoHistorial } from './entities/riesgo-historial.entity';
import { DocumentoConsulta } from './entities/documento-consulta.entity';
import { DecisionDisciplinaria } from './entities/decision-disciplinaria.entity';
import { CorreoJuridico } from './entities/correo-juridico.entity';
import { AdjuntoCorreo } from './entities/adjunto-correo.entity';
import { CorreoJuridicoHistorial } from './entities/correo-juridico-historial.entity';
import { ExcepcionProcesal } from './entities/excepcion-procesal.entity';
import { ProcesoCoactivo } from './entities/proceso-coactivo.entity';
import { ProcesoCoactivoAdjunto } from './entities/proceso-coactivo-adjunto.entity';
import { PagoCoactivo } from './entities/pago-coactivo.entity';
import { CoactivoHistorial } from './entities/coactivo-historial.entity';
import { ConsultaJuridicaHistorial } from './entities/consulta-juridica-historial.entity';
import { SystemConfiguration } from './entities/system-configuration.entity';
import { TipoRequerimientoOC } from './entities/tipo-requerimiento-oc.entity';
import { OficioEnviado } from './entities/oficio-enviado.entity';

// Controllers
import { ExpedienteController } from './controllers/expediente.controller';
import { ActuacionController } from './controllers/actuacion.controller';
import { AbogadoController, AbogadoStatsController } from './controllers/abogado.controller';
import { AudienciaController } from './controllers/audiencia.controller';
import { DocumentoController } from './controllers/documento.controller';
import { RequerimientoController } from './controllers/requerimiento.controller';
import { FilesController } from './controllers/files.controller';
import { ComentarioController } from './controllers/comentario.controller';
import { JuzgamientoController } from './controllers/juzgamiento.controller';
import { TerminosController } from './controllers/terminos.controller';
import { AutosController } from './controllers/autos.controller';
import { EvidenciasController } from './controllers/evidencias.controller';
import { ActasController } from './controllers/actas.controller';
import { ConsultasJuridicasController } from './controllers/consultas-juridicas.controller';
import { RequerimientosOCController } from './controllers/requerimientos-oc.controller';
import { TareasNotasController } from './controllers/tareas-notas.controller';
import { ComentariosDocumentosOCController } from './controllers/comentarios-documentos-oc.controller';
import { RiesgosController } from './controllers/riesgos.controller';
import { PlanesMejoramientoController } from './controllers/planes-mejoramiento.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DocumentosConsultaController } from './controllers/documentos-consulta.controller';
import { CorreosJuridicosController } from './controllers/correos-juridicos.controller';
import { ProcesoCoactivoController } from './controllers/proceso-coactivo.controller';
import { ConfigurationsController } from './controllers/configurations.controller';
import { OficiosController } from './controllers/oficios.controller';

// Services
import { ExpedienteService } from './services/expediente.service';
import { ActuacionService } from './services/actuacion.service';
import { AbogadoService } from './services/abogado.service';
import { AudienciaService } from './services/audiencia.service';
import { DocumentoService } from './services/documento.service';
import { RequerimientoService } from './services/requerimiento.service';
import { ComentarioService } from './services/comentario.service';
import { AutosService } from './services/autos.service';
import { EvidenciasService } from './services/evidencias.service';
import { ActasService } from './services/actas.service';
import { ConsultasJuridicasService } from './services/consultas-juridicas.service';
import { TerminosService } from './services/terminos.service';
import { RequerimientosOCService } from './services/requerimientos-oc.service';
import { TareasNotasService } from './services/tareas-notas.service';
import { ComentariosDocumentosOCService } from './services/comentarios-documentos-oc.service';
import { RiesgosService } from './services/riesgos.service';
import { DashboardService } from './services/dashboard.service';
import { DocumentosConsultaService } from './services/documentos-consulta.service';
import { ComentariosConsultaService } from './services/comentarios-consulta.service';
import { ComentarioConsulta } from './entities/comentario-consulta.entity';
import { ComentariosConsultaController } from './controllers/comentarios-consulta.controller';
import { MicrosoftGraphService } from './services/microsoft-graph.service';
import { CorreosJuridicosService } from './services/correos-juridicos.service';
import { CorreosSyncScheduler } from './services/correos-sync.scheduler';
import { ProcesoCoactivoService } from './services/proceso-coactivo.service';
import { ConfigurationsService } from './services/configurations.service';
import { DiasHabilesService } from './services/dias-habiles.service';
import { AlertasVencimientoService } from './services/alertas-vencimiento.service';
import { SmartClassificationService } from './services/smart-classification.service';
import { OficiosService } from './services/oficios.service';

// Modules
import { PeiModule } from './pei/pei.module';
import { PlanesMejoramientoModule } from './planes-mejoramiento/planes-mejoramiento.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    ScheduleModule.forRoot(),
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
      RespuestaBorradorOC,
      SolicitudInsumo,
      Hallazgo,
      TipoRequerimientoOC,
      // Tareas y Notas
      TareaExpediente,
      NotaExpediente,
      // Comentarios y Documentos OC
      ComentarioOC,
      DocumentoOC,
      // Riesgos
      Riesgo,
      RiesgoHistorial,
      // Documentos Consultas
      DocumentoConsulta,
      ComentarioConsulta,
      // Decisiones
      DecisionDisciplinaria,
      // Correos Jurídicos (Microsoft Graph)
      CorreoJuridico,
      AdjuntoCorreo,
      CorreoJuridicoHistorial,
      // Excepciones Procesales
      ExcepcionProcesal,
      // Procesos Coactivos
      ProcesoCoactivo,
      ProcesoCoactivoAdjunto,
      PagoCoactivo,
      CoactivoHistorial,
      // Historial Consultas
      ConsultaJuridicaHistorial,
      // System Configurations
      SystemConfiguration,
      // Oficios Enviados
      OficioEnviado
    ]),
    PeiModule,
    PlanesMejoramientoModule
  ],
  controllers: [
    AppController,
    DashboardController,
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
    RiesgosController,
    DocumentosConsultaController,
    ComentariosConsultaController,
    // Correos Jurídicos
    CorreosJuridicosController,
    // Procesos Coactivos
    ProcesoCoactivoController,
    // Configurations
    ConfigurationsController,
    // Oficios
    OficiosController
    // PlanesMejoramientoController is usually inside PlanesMejoramientoModule, 
    // but if it was here in HEAD, I should check. 
    // HEAD didn't have it in controllers array explicitly (it had PlanesMejoramientoModule in imports).
    // I won't add it to controllers array if it's in the module.
  ],
  providers: [
    AppService,
    DashboardService,
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
    RiesgosService,
    DocumentosConsultaService,
    ComentariosConsultaService,
    // Microsoft Graph / Correos
    MicrosoftGraphService,
    CorreosJuridicosService,
    CorreosSyncScheduler,
    SmartClassificationService,
    // Procesos Coactivos
    ProcesoCoactivoService,
    // Configurations
    ConfigurationsService,
    // Días Hábiles y Alertas
    DiasHabilesService,
    AlertasVencimientoService,
    // Oficios
    OficiosService
  ],
})
export class AppModule { }
