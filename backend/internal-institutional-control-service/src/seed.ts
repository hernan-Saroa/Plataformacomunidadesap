import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { seedInformesLey } from './esap/informes-ley/seed-informes-ley';
// import { seedPlanAnual5Roles } from './esap/plan-anual-5-roles/seed-plan-anual-5-roles';
import { seedTablerosKanban } from './esap/tableros-kanban/seed-tableros-kanban';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  console.log('🌱 Iniciando seed de datos de prueba...\n');

  try {
    // ==================== INFORMES DE LEY (RF012) ====================
    await seedInformesLey(dataSource);

    // ==================== PLAN ANUAL 5 ROLES (RF001) ====================
    // Seed de plan anual 5 roles removido - los datos deben crearse manualmente
    // await seedPlanAnual5Roles(dataSource);

    // ==================== TABLEROS KANBAN Y ETAPAS ====================
    await seedTablerosKanban(dataSource);

    console.log('✅ Seed completado exitosamente!');
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Ejecutar seed
seed()
  .then(() => {
    console.log('\n🎉 Proceso de seed finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal en seed:', error);
    process.exit(1);
  });
