import { DataSource } from 'typeorm';
import { databaseConfig } from './src/database.config';
import { Expediente } from './src/entities/expediente.entity';

const AppDataSource = new DataSource({
    ...databaseConfig,
    entities: [Expediente]
} as any);

AppDataSource.initialize().then(async () => {
    try {
        const result = await AppDataSource.query(`SELECT id, radicado, jurisdiccion FROM legal_management.expedientes;`);
        console.log(result);
        
        const count = await AppDataSource.query(`SELECT count(*) FROM legal_management.expedientes WHERE jurisdiccion != 'DISCIPLINARIO'`);
        console.log("Count from SQL:", count);
        
    } catch (e) {
        console.log("Error:", e.message);
    }
    process.exit(0);
}).catch(error => {
    console.error(error);
    process.exit(1);
});
