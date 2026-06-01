const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 1. Cargar variables de entorno desde backend/auth-service/.env
const envPath = path.join(__dirname, '..', 'backend', 'auth-service', '.env');
console.log(`Cargando variables de entorno desde: ${envPath}`);

if (!fs.existsSync(envPath)) {
  console.error(`Error: No se encontró el archivo ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      // Quitar comillas si las tiene
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  }
});

// FORZAR VARIABLES PARA EL CONTENEDOR DOCKER DESDE EL HOST
const DB_HOST = 'localhost';
const DB_PORT = 8080;
const DB_USER = 'postgres';
const DB_PASS = 'password';
const DB_NAME = 'esap_db';
const DB_SCHEMA = 'auth';

console.log('========================================');
console.log(`Conectando a Docker DB en ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
const client = new Client({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
});

async function run() {
  try {
    await client.connect();
    console.log(`Conexión exitosa a la base de datos: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    
    // Crear esquema si no existe
    console.log(`Asegurando esquema: ${DB_SCHEMA}`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${DB_SCHEMA};`);
    
    // Crear tabla de registro de migraciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${DB_SCHEMA}.migrations_db_log (
        filename TEXT PRIMARY KEY,
        executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
      );
    `);

    // Obtener migraciones ya aplicadas
    const { rows } = await client.query(`SELECT filename FROM ${DB_SCHEMA}.migrations_db_log;`);
    const applied = new Set(rows.map(r => r.filename));

    // --- FASE 1: Archivos SQL en db/ (fuera de migrations/) ---
    const dbDir = path.join(__dirname, '..', 'db');
    if (fs.existsSync(dbDir)) {
      const files = fs.readdirSync(dbDir);
      const sqlFiles = files
        .filter(f => f.endsWith('.sql') && !f.toLowerCase().includes('backup'))
        .map(f => path.join(dbDir, f))
        .sort();

      if (sqlFiles.length > 0) {
        console.log('\n--- Ejecutando scripts SQL base en db/ ---');
        for (const file of sqlFiles) {
          const filename = path.basename(file);
          if (applied.has(filename)) {
            console.log(`  Saltando (ya aplicado): ${filename}`);
            continue;
          }

          console.log(`  Ejecutando: ${filename}...`);
          const sql = fs.readFileSync(file, 'utf8');
          
          try {
            await client.query(sql);
            await client.query(
              `INSERT INTO ${DB_SCHEMA}.migrations_db_log (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING;`,
              [filename]
            );
            console.log(`    ✓ OK`);
          } catch (err) {
            console.error(`    ✗ ERROR en ${filename}:`, err.message);
            throw err;
          }
        }
      }
    }

    // --- FASE 2: Archivos SQL en db/migrations/ ---
    const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir);
      const sqlFiles = files
        .filter(f => f.endsWith('.sql'))
        .map(f => path.join(migrationsDir, f))
        .sort();

      if (sqlFiles.length > 0) {
        console.log('\n--- Ejecutando migraciones en db/migrations/ ---');
        for (const file of sqlFiles) {
          const filename = path.basename(file);
          if (applied.has(filename)) {
            console.log(`  Saltando (ya aplicado): ${filename}`);
            continue;
          }

          console.log(`  Ejecutando: ${filename}...`);
          const sql = fs.readFileSync(file, 'utf8');
          
          try {
            await client.query(sql);
            await client.query(
              `INSERT INTO ${DB_SCHEMA}.migrations_db_log (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING;`,
              [filename]
            );
            console.log(`    ✓ OK`);
          } catch (err) {
            console.error(`    ✗ ERROR en ${filename}:`, err.message);
            throw err;
          }
        }
      }
    }

    console.log('\n========================================');
    console.log('¡Todas las migraciones se ejecutaron correctamente!');
    console.log('========================================');
  } catch (err) {
    console.error('\n========================================');
    console.error('Error crítico al ejecutar migraciones:', err.message);
    console.error('========================================');
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
