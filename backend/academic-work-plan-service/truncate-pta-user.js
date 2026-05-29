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
    TRUNCATE TABLE academic_work_plan."PTAUserData" CASCADE;
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
