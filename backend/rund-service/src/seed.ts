import { DataSource } from 'typeorm';
import { DocenteEntity } from './entities/docente.entity';
import { FormacionAcademicaEntity } from './entities/formacion-academica.entity';
import { ExperienciaDocenteEntity } from './entities/experiencia-docente.entity';
import { ProduccionIntelectualEntity } from './entities/produccion-intelectual.entity';
import { SituacionAdministrativaEntity } from './entities/situacion-administrativa.entity';
import { SoporteDocumentalEntity } from './entities/soporte-documental.entity';
import { TarjetaRundLogEntity } from './entities/tarjeta-rund-log.entity';
import { InvitacionDocenteEntity } from './entities/invitacion-docente.entity';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'esap_db',
    schema: 'rund',
    entities: [
      DocenteEntity,
      FormacionAcademicaEntity,
      ExperienciaDocenteEntity,
      ProduccionIntelectualEntity,
      SituacionAdministrativaEntity,
      SoporteDocumentalEntity,
      TarjetaRundLogEntity,
      InvitacionDocenteEntity,
    ],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('📦 DataSource initialized for RUND Seeder');

  const docenteRepo = dataSource.getRepository(DocenteEntity);
  const count = await docenteRepo.count();

  if (count === 0) {
    console.log('🌱 Seeding initial RUND teachers...');

    const docente1 = docenteRepo.create({
      numeroDocumento: '1014234567',
      tipoDocumento: 'CC',
      nombres: 'María Alejandra',
      apellidos: 'Restrepo Gómez',
      correoInstitucional: 'maria.restrepo@esap.edu.co',
      correoPersonal: 'alejandra.restrepo@gmail.com',
      celular: '3114567890',
      direccion: 'Carrera 7 # 45-20',
      departamentoNombre: 'Bogotá D.C.',
      municipioNombre: 'Bogotá D.C.',
      escalafonDocente: 'ASOCIADO',
      categoriaMinciencias: 'INVESTIGADOR_SENIOR',
      estadoRund: 'ACTIVO',
      numeroTarjetaRund: 'RUND-2026-001045',
      fechaExpedicionRund: new Date(),
      horasSemanalesMax: 40,
      sedePrincipalNombre: 'Sede Central Bogotá',
      esParEvaluador: true,
    });

    await docenteRepo.save(docente1);

    const docente2 = docenteRepo.create({
      numeroDocumento: '79845123',
      tipoDocumento: 'CC',
      nombres: 'Hernando José',
      apellidos: 'Vargas Silva',
      correoInstitucional: 'hernando.vargas@esap.edu.co',
      correoPersonal: 'hjvargas@hotmail.com',
      celular: '3209876543',
      direccion: 'Calle 100 # 15-30',
      departamentoNombre: 'Antioquia',
      municipioNombre: 'Medellín',
      escalafonDocente: 'TITULAR',
      categoriaMinciencias: 'EMERITO',
      estadoRund: 'ACTIVO',
      numeroTarjetaRund: 'RUND-2026-001046',
      fechaExpedicionRund: new Date(),
      horasSemanalesMax: 40,
      sedePrincipalNombre: 'Territorial Antioquia - Chocó',
      esParEvaluador: true,
    });

    await docenteRepo.save(docente2);

    console.log('✅ Seed completed successfully!');
  } else {
    console.log(`ℹ️ RUND already has ${count} docentes.`);
  }

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Error during RUND seed:', err);
  process.exit(1);
});
