const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { getRepositoryToken } = require('@nestjs/typeorm');
const { Actuacion } = require('./dist/entities/actuacion.entity');

async function run() {
  console.log('Bootstrapping AppModule to test findOne...');
  process.env.PORT = '9999';
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/esap_db';
  
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  
  const repo = app.get(getRepositoryToken(Actuacion));
  const id = '09079005-1e7e-4bc6-9fb6-c5453306318c';
  
  console.log(`Querying findOne({ where: { id: '${id}' } })...`);
  const record = await repo.findOne({ where: { id } });
  console.log('Result for findOne:', record);

  console.log('Querying find() to see all records:');
  const allRecords = await repo.find();
  console.log(`Found ${allRecords.length} records in total.`);
  if (allRecords.length > 0) {
    console.log('First record ID:', allRecords[0].id, 'Type of ID:', typeof allRecords[0].id);
    const found = allRecords.find(r => r.id === id);
    console.log('Found ID manually in array:', !!found);
  }

  await app.close();
}

run().catch(console.error);
