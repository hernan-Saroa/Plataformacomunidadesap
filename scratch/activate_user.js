const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'esap_db'
});

async function main() {
  await client.connect();
  
  console.log('Activating user yovannyromero@esap.edu.co...');
  const res = await client.query(
    'UPDATE auth.user SET is_active = true WHERE username = $1 RETURNING id_user, username, is_active',
    ['yovannyromero@esap.edu.co']
  );
  console.log('Update result:', res.rows);
  
  await client.end();
}

main().catch(err => {
  console.error(err);
  client.end();
});
