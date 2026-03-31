import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Expediente } from './entities/expediente.entity';
import { Actuacion } from './entities/actuacion.entity';
import { Abogado } from './entities/abogado.entity';
import { Audiencia } from './entities/audiencia.entity';
import { Requerimiento } from './entities/requerimiento.entity';
import { OrganismoControl } from './entities/organismo-control.entity';
import { Auto } from './entities/auto.entity';
import { Documento } from './entities/documento.entity';
import { Comentario } from './entities/comentario.entity';
import { Evidencia } from './entities/evidencia.entity';
import { Acta } from './entities/acta.entity';
import { ConsultaJuridica } from './entities/consulta-juridica.entity';
import { TerminoProcesal } from './entities/termino-procesal.entity';
import { Actor } from './entities/actor.entity';

// Órganos de Control - Nuevo módulo
import { OrganismoControlOC } from './entities/organismo-control-legal.entity';
import { RequerimientoOC } from './entities/requerimiento-oc.entity';
import { RespuestaBorradorOC } from './entities/respuesta-borrador-oc.entity';
import { TipoRequerimientoOC } from './entities/tipo-requerimiento-oc.entity';
import { SolicitudInsumo } from './entities/solicitud-insumo.entity';
import { Hallazgo } from './entities/hallazgo.entity';
import { PeiIndicador } from './entities/pei-indicador.entity';
import { PeiRegistroAvance } from './entities/pei-registro-avance.entity';

// Tareas y Notas de Expedientes
import { TareaExpediente } from './entities/tarea-expediente.entity';
import { NotaExpediente } from './entities/nota-expediente.entity';

// Comentarios y Documentos de Órganos de Control
import { ComentarioOC } from './entities/comentario-oc.entity';
import { DocumentoOC } from './entities/documento-oc.entity';

// Módulo de Riesgos
import { Riesgo } from './entities/riesgo.entity';
import { RiesgoHistorial } from './entities/riesgo-historial.entity';
import { DecisionDisciplinaria } from './entities/decision-disciplinaria.entity';

// Planes de Mejoramiento
import { PlanMejoramiento, PlanEvidencia, PlanSeguimiento, PlanComentario } from './entities/planes-mejoramiento.entity';

// Documentos de Consultas Jurídicas
import { DocumentoConsulta } from './entities/documento-consulta.entity';
import { ComentarioConsulta } from './entities/comentario-consulta.entity';
import { ConsultaJuridicaHistorial } from './entities/consulta-juridica-historial.entity';

// Correos Jurídicos (Microsoft Graph)
import { CorreoJuridico } from './entities/correo-juridico.entity';
import { AdjuntoCorreo } from './entities/adjunto-correo.entity';
import { CorreoJuridicoHistorial } from './entities/correo-juridico-historial.entity';

// Excepciones Procesales
import { ExcepcionProcesal } from './entities/excepcion-procesal.entity';

// Procesos Coactivos
import { ProcesoCoactivo } from './entities/proceso-coactivo.entity';
import { ProcesoCoactivoAdjunto } from './entities/proceso-coactivo-adjunto.entity';
import { PagoCoactivo } from './entities/pago-coactivo.entity';
import { CoactivoHistorial } from './entities/coactivo-historial.entity';

// System Configurations
import { SystemConfiguration } from './entities/system-configuration.entity';

// Oficios Enviados
import { OficioEnviado } from './entities/oficio-enviado.entity';

// Plantillas de Documentos
import { PlantillaDocumento } from './entities/plantilla-documento.entity';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

export const databaseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'esap_db',
    // No especificar schema por defecto para permitir múltiples schemas

    entities: [
        Expediente, Actuacion, Abogado, Audiencia, Requerimiento, OrganismoControl,
        Auto, Documento, Comentario, Evidencia, Acta, ConsultaJuridica, TerminoProcesal,
        Actor,
        // Órganos de Control
        OrganismoControlOC, RequerimientoOC, RespuestaBorradorOC, SolicitudInsumo, Hallazgo, TipoRequerimientoOC,
        // PEI
        PeiIndicador, PeiRegistroAvance,
        // Tareas y Notas
        TareaExpediente, NotaExpediente,
        // Comentarios y Documentos OC
        ComentarioOC, DocumentoOC,
        // Riesgos
        Riesgo, RiesgoHistorial,
        // Decisiones
        DecisionDisciplinaria,
        // Planes de Mejoramiento
        PlanMejoramiento, PlanEvidencia, PlanSeguimiento, PlanComentario,
        // Documentos de Consultas Jurídicas
        DocumentoConsulta, ComentarioConsulta, ConsultaJuridicaHistorial,
        // Correos Jurídicos
        CorreoJuridico, AdjuntoCorreo, CorreoJuridicoHistorial,
        // Excepciones Procesales
        ExcepcionProcesal,
        // Procesos Coactivos
        ProcesoCoactivo, ProcesoCoactivoAdjunto, PagoCoactivo, CoactivoHistorial,
        // System Configurations
        SystemConfiguration,
        // Oficios Enviados
        OficioEnviado,
        // Plantillas de Documentos
        PlantillaDocumento
    ],
    synchronize: false, // ⚠️ Reverted to false to avoid conflicts
    logging: ['error'], // Solo mostrar errores, no queries
};

