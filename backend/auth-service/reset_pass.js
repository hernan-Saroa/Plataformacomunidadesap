const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function run() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'esap_db',
    password: 'postgres',
    port: 5432,
  });
  
  await client.connect();
  
  const email = 'yulieth.mera@esap.edu.co';
  const password = 'Esap.2026*';
  
  // Check if user exists
  const userRes = await client.query('SELECT * FROM auth."user" u JOIN auth.personas p ON u.id_person = p.id_person WHERE p.dir_email = $1 OR u.username = $1', [email]);
  
  if (userRes.rows.length === 0) {
    console.log(`User ${email} not found.`);
  } else {
    const user = userRes.rows[0];
    console.log(`Found user ${email} (ID: ${user.id_user}). Updating password...`);
    
    const hash = await bcrypt.hash(password, 10);
    await client.query('UPDATE auth."user" SET password_hash = $1 WHERE id_user = $2', [hash, user.id_user]);
    
    console.log(`Password for ${email} updated successfully to: ${password}`);
  }
  
  await client.end();
}

run().catch(console.error);
