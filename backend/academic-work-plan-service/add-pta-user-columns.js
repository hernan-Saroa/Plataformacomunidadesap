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
    ALTER TABLE academic_work_plan."PTAUserData" 
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT NOW();
    
    ALTER TABLE academic_work_plan."PTAUserData" 
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();
  `;
  
  try {
    console.log('Executing:', query);
    await client.query(query);
    console.log('Success');
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await client.end();
}

run().catch(console.error);
