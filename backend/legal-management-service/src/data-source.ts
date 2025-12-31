import { DataSource } from 'typeorm';
import { databaseConfig } from './database.config';

export const AppDataSource = new DataSource({
    ...databaseConfig as any,
    migrations: ['src/migrations/*.ts'],
});
