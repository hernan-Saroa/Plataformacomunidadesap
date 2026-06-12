const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/esap_db' });
  await client.connect();
  
  const email = 'test_docente@esap.edu.co';
  const password = 'Esap2026*';
  const hash = await bcrypt.hash(password, 10);
  
  await client.query("UPDATE auth.user SET password_hash = $1 WHERE username = $2", [hash, email]);
  console.log('Password updated successfully for ' + email);

  await client.end();
}

main().catch(console.error);
