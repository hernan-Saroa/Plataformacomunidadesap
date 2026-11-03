import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getTypeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'esap_db',
  schema: 'chatbot',
  autoLoadEntities: true,
  synchronize: false,
  // Las consultas contienen preguntas, identidades y extractos documentales.
  logging: false,
});
