import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Expediente } from './entities/expediente.entity';
import { Actuacion } from './entities/actuacion.entity';
import { Abogado } from './entities/abogado.entity';
import { Audiencia } from './entities/audiencia.entity';
import { Requerimiento } from './entities/requerimiento.entity';
import { OrganismoControl } from './entities/organismo-control.entity';

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
    entities: [Expediente, Actuacion, Abogado, Audiencia, Requerimiento, OrganismoControl],
    synchronize: false, // ⚠️ Cambiado a false para usar migraciones en producción
    logging: true,
};
