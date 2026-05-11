import { DataSource } from 'typeorm';
import { databaseConfig } from './src/database.config';

const AppDataSource = new DataSource({
    ...databaseConfig,
    entities: []
} as any);

AppDataSource.initialize().then(async () => {
    try {
        const result = await AppDataSource.query(`SELECT COUNT(*) FROM legal_management.terminos_procesales;`);
        console.log("Terminos:", result);
    } catch (e) {
        console.log("Error:", e.message);
    }
    process.exit(0);
}).catch(error => {
    console.error(error);
    process.exit(1);
});
