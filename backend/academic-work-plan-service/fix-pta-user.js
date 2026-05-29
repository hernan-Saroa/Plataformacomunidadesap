const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'password', // Default docker config
  host: 'localhost',
  database: 'esap_db',
  port: 5432,
});

async function run() {
  await client.connect();
  
  const query = `
    UPDATE academic_work_plan."PTAUserData" SET "createdAt" = NOW() WHERE "createdAt" IS NULL;
    UPDATE academic_work_plan."PTAUserData" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
    ALTER TABLE academic_work_plan."PTAUserData" ALTER COLUMN "createdAt" SET NOT NULL;
    ALTER TABLE academic_work_plan."PTAUserData" ALTER COLUMN "updatedAt" SET NOT NULL;
  `;
  
  try {
    console.log('Executing fix query...');
    await client.query(query);
    console.log('Success');
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await client.end();
}

run().catch(console.error);
