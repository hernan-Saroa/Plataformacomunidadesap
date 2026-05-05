const { Client } = require('pg');

async function fix() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'esap_db'});
  await c.connect();
  
  try {
    await c.query("ALTER TABLE auth.personas ADD COLUMN IF NOT EXISTS id_tercero BIGINT;");
    console.log("Added id_tercero column!");
  } catch(e) {
    console.error("SQL Error:", e.message);
  }
  await c.end();
}
fix();
