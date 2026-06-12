const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/esap_db' });
  await client.connect();
  
  const email = 'test_docente@esap.edu.co';
  const password = 'Esap2026*';
  const hash = await bcrypt.hash(password, 10);
  
  // Update or see if it exists
  const res = await client.query("SELECT * FROM auth.user WHERE username = $1", [email]);
  if (res.rows.length > 0) {
    console.log('User exists, updating password...');
    await client.query("UPDATE auth.user SET password_hash = $1 WHERE username = $2", [hash, email]);
    console.log('Password updated.');
  } else {
    console.log('User does not exist with that username, checking personas...');
    const pRes = await client.query("SELECT * FROM auth.personas WHERE dir_email = $1", [email]);
    if (pRes.rows.length > 0) {
      console.log('Persona exists but no user. You might need to seed the user.');
    } else {
      console.log('No user or persona found for ' + email);
    }
  }
  
  await client.end();
}

main().catch(console.error);
