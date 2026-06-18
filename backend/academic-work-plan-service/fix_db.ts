import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { BancoDocentesService } from './src/pta/banco-docentes/banco-docentes.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(BancoDocentesService);
  
  // Find all duplicates for each (docente_id, tipo_soporte)
  const duplicates = await service['dataSource'].query(`
    WITH RankedSoportes AS (
      SELECT id, ROW_NUMBER() OVER(PARTITION BY docente_id, tipo_soporte ORDER BY "createdAt" DESC) as rn
      FROM academic_work_plan."RundSoporteCampo"
    )
    SELECT id FROM RankedSoportes WHERE rn > 1;
  `);

  if (duplicates.length > 0) {
    const idsToDelete = duplicates.map((d: any) => d.id);
    console.log(`Deleting ${idsToDelete.length} duplicate records...`);
    await service['dataSource'].query(`DELETE FROM academic_work_plan."RundSoporteCampo" WHERE id = ANY($1)`, [idsToDelete]);
    console.log('Duplicates deleted successfully!');
  } else {
    console.log('No duplicates found.');
  }

  await app.close();
}

bootstrap();
