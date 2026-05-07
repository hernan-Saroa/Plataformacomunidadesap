import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '..', '.env'),
];

for (const candidate of envPaths) {
  const attempt = dotenv.config({ path: candidate });
  if (!attempt.error) break;
}

import { Notification } from './notifications/entities/notification.entity';

const parseBooleanEnv = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'esap_db',
  schema: process.env.DB_SCHEMA ?? 'notifications',
  entities: [Notification],
  synchronize: parseBooleanEnv(process.env.TYPEORM_SYNCHRONIZE, false),
  logging: parseBooleanEnv(process.env.TYPEORM_LOGGING, false),
};
