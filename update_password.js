const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function run() {
  const hash = await bcrypt.hash('Esap2026*', 10);
  console.log('Generated hash:', hash);
  
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  
  await client.connect();
  
  // Update superuser password
  const res = await client.query(
    'UPDATE auth."user" SET password_hash = $1 WHERE username = $2',
    [hash, 'superuser@esap.edu.co']
  );
  console.log('Rows updated:', res.rowCount);

  // Also update all other users to same password for testing
  const res2 = await client.query(
    'UPDATE auth."user" SET password_hash = $1',
    [hash]
  );
  console.log('Total users updated:', res2.rowCount);
  
  await client.end();
  console.log('Done! Password set to: Esap2026*');
}

run().catch(console.error);
