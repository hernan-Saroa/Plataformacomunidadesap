import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar explícitamente el archivo .env
// Usar process.cwd() es más seguro para encontrar el .env en la raíz del proyecto
// tanto en desarrollo (src) como en producción (dist)
const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file from:', envPath, result.error);
} else {
  console.log('Successfully loaded .env file from:', envPath);
  console.log('DATABASE_HOST:', process.env.DATABASE_HOST);
  console.log('DATABASE_PORT:', process.env.DATABASE_PORT);
  console.log('DATABASE_USER:', process.env.DATABASE_USER);
  console.log('DATABASE_NAME:', process.env.DATABASE_NAME);
  console.log('DB_SCHEMA:', process.env.DB_SCHEMA);
  // No loguear la contraseña por seguridad, pero verificar si existe
  console.log('DATABASE_PASSWORD exists:', !!process.env.DATABASE_PASSWORD);
}

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

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASS ? String(process.env.DB_PASS) : '', // Asegurar que sea string
  database: process.env.DB_NAME,
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
    AutoVersion,
    TerminoProcesal,
    DiaFestivo,
    ReglaAlerta,
    AlertaEnviada,
  ],
  synchronize: false,
  logging: false,
};
