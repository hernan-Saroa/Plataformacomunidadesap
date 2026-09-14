#!/usr/bin/env node
/**
 * Ejecuta las migraciones de academic-schedule-service SIN Docker.
 *
 * El runner por microservicio del repo (`cmd_db_migrate` en deploy.*.sh) hace
 * `docker exec superapp-db`, así que no sirve para el flujo local con
 * `npm run start:dev`. Este script cubre ese hueco usando el mismo cliente `pg`
 * que ya es dependencia del servicio: no exige tener `psql` en el PATH.
 *
 * Lleva su propio registro por nombre de archivo, igual que `migrate.local.sh`,
 * de modo que reejecutarlo es seguro y no vuelve a aplicar lo ya aplicado.
 *
 *   node scripts/migrate.mjs            aplica lo pendiente
 *   node scripts/migrate.mjs --status   solo informa, no aplica
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const aquí = path.dirname(fileURLToPath(import.meta.url));
const raízServicio = path.resolve(aquí, '..');
const dirMigraciones = path.join(raízServicio, 'db', 'migrations');

/** Lee el .env del servicio sin depender de dotenv. */
function cargarEnv() {
  const archivo = path.join(raízServicio, '.env');
  if (!existsSync(archivo)) return;
  for (const línea of readFileSync(archivo, 'utf8').split('\n')) {
    const limpia = línea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const i = limpia.indexOf('=');
    if (i < 0) continue;
    const clave = limpia.slice(0, i).trim();
    const valor = limpia.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!(clave in process.env)) process.env[clave] = valor;
  }
}

cargarEnv();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  // Misma precedencia que el servicio: DB_PASS es la convención del repo.
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

const soloEstado = process.argv.includes('--status');

async function main() {
  if (!existsSync(dirMigraciones)) {
    console.error(`No existe ${dirMigraciones}`);
    process.exit(1);
  }

  const archivos = readdirSync(dirMigraciones)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  const cliente = new pg.Client(config);
  try {
    await cliente.connect();
  } catch (e) {
    console.error(`\nNo se pudo conectar a ${config.host}:${config.port}/${config.database} como ${config.user}.`);
    console.error(`Motivo: ${e.message}`);
    console.error('\nSi tiene PostgreSQL local en Windows, puede estar tapando el puerto del');
    console.error('contenedor. Vea la nota de DB_PORT en .env.example.\n');
    process.exit(1);
  }

  console.log(`[migrate] ${config.host}:${config.port}/${config.database}`);

  // Registro propio del servicio, para no mezclarse con el de db/migrations.
  await cliente.query(`
    CREATE TABLE IF NOT EXISTS public.academic_schedule_migrations (
      filename    TEXT PRIMARY KEY,
      executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
    )`);

  const { rows } = await cliente.query('SELECT filename FROM public.academic_schedule_migrations');
  const aplicadas = new Set(rows.map((r) => r.filename));

  let nuevas = 0;
  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) {
      if (soloEstado) console.log(`  ya aplicada  ${archivo}`);
      continue;
    }
    if (soloEstado) {
      console.log(`  PENDIENTE    ${archivo}`);
      nuevas += 1;
      continue;
    }

    const sql = readFileSync(path.join(dirMigraciones, archivo), 'utf8');
    try {
      // Cada migración va en su propia transacción: si una falla, no deja el
      // esquema a medias ni marca como aplicadas las siguientes.
      await cliente.query('BEGIN');
      await cliente.query(sql);
      await cliente.query(
        'INSERT INTO public.academic_schedule_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [archivo],
      );
      await cliente.query('COMMIT');
      console.log(`  aplicada     ${archivo}`);
      nuevas += 1;
    } catch (e) {
      await cliente.query('ROLLBACK');
      console.error(`\n  FALLÓ        ${archivo}`);
      console.error(`  ${e.message}\n`);
      await cliente.end();
      process.exit(1);
    }
  }

  await cliente.end();
  if (soloEstado) console.log(`\n[migrate] ${nuevas} pendiente(s).`);
  else console.log(`\n[migrate] ${nuevas} migración(es) aplicada(s). Total: ${archivos.length}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
