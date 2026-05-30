const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envPath = path.join(__dirname, 'backend', 'auth-service', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  }
});

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT username, password_hash, is_active FROM auth."user" WHERE username = 'superuser@esap.edu.co';
    `);
    console.log('User:', res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
