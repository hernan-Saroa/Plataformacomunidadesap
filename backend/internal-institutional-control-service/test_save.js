const { DataSource } = require('typeorm');
const path = require('path');

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'esap_db',
    schema: 'control_interno',
    entities: [path.join(__dirname, 'dist/**/*.entity.js')],
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('DataSource initialized!');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { Auditoria } = require('./dist/esap/auditorias/entities/auditoria.entity');
      const auditoriaRepository = queryRunner.manager.getRepository(Auditoria);
      
      const auditoriaData = {
        nombre: "Auditoría de Prueba TypeORM",
        tipo: "Regular",
        territorial: "Sede Central",
        sede: "Sede Central",
        responsable: "Por asignar",
        codigo: "AUD-2026-987",
        fechaInicio: new Date("2026-06-18"),
        fechaFin: new Date("2026-06-30"),
        fechaFinPlaneacion: new Date("2026-06-20"),
        fechaInicioEjecucion: new Date("2026-06-21"),
        fechaFinEjecucion: new Date("2026-06-25"),
        fechaInicioComunicacion: new Date("2026-06-26"),
        fase: 'planeacion',
        prioridad: 'Media',
        progreso: 0,
        hallazgos: 0,
        activa: true,
        estadoKanban: 'Plan Anual',
        planAnualId: '1bb4e342-b1aa-44d5-85cf-7fa428959339', // Plan válido
        planAnualVigencia: 2026,
        vinculadaPlanAnual: true,
        auditorLiderId: 'f0ee731b-1d81-46fe-b4d3-ddc91bf73338', // Andrés Felipe Mendoza Vargas
      };

      const auditoria = auditoriaRepository.create(auditoriaData);
      console.log('Creating auditoria entity...');
      const saved = await auditoriaRepository.save(auditoria);
      console.log('Auditoria saved successfully!', saved.id);

    } catch (err) {
      console.error('--- ERROR DURING INSERT ---');
      console.error(err);
    } finally {
      await queryRunner.rollbackTransaction();
      console.log('Transaction rolled back.');
      await queryRunner.release();
    }

  } catch (err) {
    console.error('Initialization error:', err);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main();
