import { DataSource } from 'typeorm';
import { databaseConfig } from '../../src/database.config';

const AppDataSource = new DataSource({
    ...databaseConfig,
    entities: [] // Not needed for a raw query
} as any);

AppDataSource.initialize().then(async () => {
    console.log("Connected to DB");
    try {
        await AppDataSource.query(`ALTER TABLE legal_management.requerimientos_oc DROP CONSTRAINT IF EXISTS requerimientos_oc_abogado_asignado_id_fkey;`);
        console.log("Constraint dropped!");
    } catch (e) {
        console.log("Error or already dropped:", e.message);
    }
    process.exit(0);
}).catch(error => {
    console.error(error);
    process.exit(1);
});
