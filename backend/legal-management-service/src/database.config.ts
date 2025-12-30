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

// Órganos de Control - Nuevo módulo
import { OrganismoControlOC } from './entities/organismo-control-legal.entity';
import { RequerimientoOC } from './entities/requerimiento-oc.entity';
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

// Planes de Mejoramiento
import { PlanMejoramiento, PlanEvidencia, PlanSeguimiento, PlanComentario } from './entities/planes-mejoramiento.entity';

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
        // Órganos de Control
        OrganismoControlOC, RequerimientoOC, SolicitudInsumo, Hallazgo,
        // PEI
        PeiIndicador, PeiRegistroAvance,
        // Tareas y Notas
        TareaExpediente, NotaExpediente,
        // Comentarios y Documentos OC
        ComentarioOC, DocumentoOC,
        // Riesgos
        Riesgo,
        // Planes de Mejoramiento
        PlanMejoramiento, PlanEvidencia, PlanSeguimiento, PlanComentario
    ],
    synchronize: false, // ⚠️ Cambiado a false para usar migraciones en producción
    logging: ['error'], // Solo mostrar errores, no queries
};
