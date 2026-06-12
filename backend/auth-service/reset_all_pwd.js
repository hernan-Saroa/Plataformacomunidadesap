const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/esap_db',
  });
  await client.connect();

  const password = 'Esap2026*';
  const hash = await bcrypt.hash(password, 10);

  const result = await client.query(
    'UPDATE auth."user" SET password_hash = $1',
    [hash],
  );
  console.log(`Updated ${result.rowCount} users with password: ${password}`);

  const users = await client.query(
    'SELECT username FROM auth."user" LIMIT 10',
  );
  console.log('Sample users:', users.rows.map((u) => u.username));

  await client.end();
}

main().catch(console.error);
