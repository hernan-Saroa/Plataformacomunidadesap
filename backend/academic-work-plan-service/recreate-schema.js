const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'password', // Trying password first
  host: 'localhost',
  database: 'esap_db',
  port: 5432,
});

async function run() {
  try {
    await client.connect();
  } catch (e) {
    console.log('Failed with password "password", trying "postgres"...');
    client.password = 'postgres';
    await client.connect();
  }
  
  const query = `
    DROP SCHEMA IF EXISTS academic_work_plan CASCADE;
    CREATE SCHEMA academic_work_plan;
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
