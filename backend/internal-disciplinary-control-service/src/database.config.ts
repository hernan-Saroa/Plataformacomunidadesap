import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from cwd or from the service folder.
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '..', '.env'),
];
let result: dotenv.DotenvConfigOutput | null = null;
let loadedPath: string | null = null;

for (const candidate of envPaths) {
  const attempt = dotenv.config({ path: candidate });
  if (!attempt.error) {
    result = attempt;
    loadedPath = candidate;
    break;
  }
  result = attempt;
}

if (result?.error) {
  console.error('Error loading .env file from:', envPaths, result.error);
} else if (loadedPath) {
  console.log('Successfully loaded .env file from:', loadedPath);
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_PORT:', process.env.DB_PORT);
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('DB_SCHEMA:', process.env.DB_SCHEMA);
  console.log('DB_PASS exists:', !!process.env.DB_PASS);
}

const dbPassword = process.env.DATABASE_PASSWORD ?? process.env.DB_PASS;

import { DisciplinaryNews } from './entities/disciplinary-news.entity';
import { DisciplinaryProcess } from './entities/disciplinary-process.entity';
import { LegalAuto } from './entities/legal-auto.entity';
import { Sequence } from './entities/sequence.entity';
import { DisciplinaryProfessional } from './entities/disciplinary-professional.entity';
import { Evidence } from './entities/evidence.entity';
import { StageConfiguration } from './entities/stage-configuration.entity';
import { SystemConfiguration } from './entities/system-configuration.entity';
import { AutoVersion } from './entities/auto-version.entity';
import { TerminoProcesal } from './entities/termino-procesal.entity';
import { DiaFestivo } from './entities/dia-festivo.entity';
import { ReglaAlerta } from './entities/regla-alerta.entity';
import { AlertaEnviada } from './entities/alerta-enviada.entity';
import { PlantillaAuto } from './entities/plantilla-auto.entity';
import { AutoConfiguration } from './entities/auto-configuration.entity';
import { OficioConfiguration } from './entities/oficio-configuration.entity';
import { ActaConfiguration } from './entities/acta-configuration.entity';
import { ExpedienteCompartido } from './entities/expediente-compartido.entity';
import { EntidadRemision } from './entities/entidad-remision.entity';
import { TipoRemision } from './entities/tipo-remision.entity';
import { DisciplinaryProcessActuacion } from './entities/disciplinary-process-actuacion.entity';
import { DisciplinaryProcessTask } from './entities/disciplinary-process-task.entity';
import { DisciplinaryProcessNote } from './entities/disciplinary-process-note.entity';
import { DisciplinaryNewsProcess } from './entities/disciplinary-news-process.entity';
import { DisciplinaryProcessReassignmentRequest } from './entities/disciplinary-process-reassignment-request.entity';
import { DisciplinaryBehavior } from './entities/disciplinary-behavior.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? process.env.DB_HOST,
  port: parseInt(process.env.DATABASE_PORT ?? process.env.DB_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? process.env.DB_USER,
  password: dbPassword !== undefined ? String(dbPassword) : '',
  database: process.env.DATABASE_NAME ?? process.env.DB_NAME,
  schema: process.env.DB_SCHEMA,
  entities: [
    DisciplinaryNews,
    DisciplinaryProcess,
    LegalAuto,
    Sequence,
    DisciplinaryProfessional,
    Evidence,
    StageConfiguration,
    SystemConfiguration,
    PlantillaAuto,
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
    DisciplinaryNewsProcess,
    DisciplinaryProcessReassignmentRequest,
    DisciplinaryBehavior,
  ],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
};
