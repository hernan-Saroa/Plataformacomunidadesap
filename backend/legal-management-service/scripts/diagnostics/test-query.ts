import { DataSource, Not } from 'typeorm';
import { databaseConfig } from '../../src/database.config';
import { Expediente } from '../../src/entities/expediente.entity';

const AppDataSource = new DataSource({
    ...databaseConfig,
    entities: [Expediente]
} as any);

AppDataSource.initialize().then(async () => {
    try {
        const repo = AppDataSource.getRepository(Expediente);
        const count = await repo.count({ where: { jurisdiccion: Not('DISCIPLINARIO') } });
        console.log("Count with Not('DISCIPLINARIO'):", count);
        
        const count2 = await repo.count();
        console.log("Total Count:", count2);
    } catch (e) {
        console.log("Error:", e.message);
    }
    process.exit(0);
}).catch(error => {
    console.error(error);
    process.exit(1);
});
