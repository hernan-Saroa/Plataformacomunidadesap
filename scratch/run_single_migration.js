const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Cargar variables de entorno desde backend/auth-service/.env
const envPath = path.join(__dirname, '..', 'backend', 'auth-service', '.env');
if (fs.existsSync(envPath)) {
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
}

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
    console.log('Conectado a la base de datos.');
    
    const migrationFile = path.join(__dirname, '..', 'db', 'migrations', '327_create_pta_component_approvals.sql');
    console.log(`Leyendo migración de: ${migrationFile}`);
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('Ejecutando SQL...');
    await client.query(sql);
    console.log('✓ Migración 327 aplicada con éxito.');

    // Opcional: registrar en la tabla migrations_db_log para consistencia
    await client.query(
      `INSERT INTO auth.migrations_db_log (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING;`,
      ['327_create_pta_component_approvals.sql']
    );
    console.log('✓ Registrada en auth.migrations_db_log.');
  } catch (err) {
    console.error('Error al aplicar la migración:', err);
  } finally {
    await client.end();
  }
}

run();
