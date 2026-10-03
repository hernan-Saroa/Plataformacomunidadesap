import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { RundDocumentStorageService } from '../pta/banco-docentes/rund-document-storage.service';
import { migrateRundDocument } from '../pta/banco-docentes/rund-document-migration';

async function main() {
  const args = process.argv.slice(2);
  const allowed = new Set(['--apply', '--all', '--include-retired']);
  let id: string | undefined;
  let actor = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id') { id = args[++i]; if (!id || !/^[a-f0-9-]{36}$/i.test(id)) throw new Error('INVALID_ID'); }
    else if (args[i] === '--actor') { actor = args[++i] || ''; if (!/^[\w@.-]{1,200}$/.test(actor)) throw new Error('INVALID_ACTOR'); }
    else if (!allowed.has(args[i])) throw new Error('INVALID_OPTION');
  }
  if ((!id && !args.includes('--all')) || (!!id && args.includes('--all'))) throw new Error('SELECT_ID_OR_ALL');
  const apply = args.includes('--apply');
  if (apply && !actor) throw new Error('ACTOR_REQUIRED');
  for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS']) if (!process.env[key]) throw new Error('DATABASE_CONFIG_REQUIRED');
  const storage = new RundDocumentStorageService();
  if (apply && (storage.provider !== 'OPENKM' || !storage.configurationStatus().escrituraConfigurada)) throw new Error('OPENKM_CONFIG_REQUIRED');
  const db = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
    synchronize: false, logging: false, extra: { connectionTimeoutMillis: 10000, statement_timeout: 120000, lock_timeout: 10000,
      application_name: 'rund_documental_migration' } });
  await db.initialize();
  try {
    const rows = id ? [{ id }] : await db.query(`SELECT id FROM academic_work_plan."RundDocumentoPerfil"
      WHERE proveedor_almacenamiento IN ('LOCAL','LEGACY_LOCAL') ORDER BY id`);
    for (const row of rows) {
      const result = await migrateRundDocument(db, storage, row.id, { apply, actor, includeRetired: args.includes('--include-retired') });
      console.log(JSON.stringify(result));
    }
    console.log(JSON.stringify({ terminado: true, modo: apply ? 'APLICAR' : 'VERIFICAR', registros: rows.length, originalesEliminados: false }));
  } finally { await db.destroy(); }
}

main().catch(error => {
  console.error(JSON.stringify({ terminado: false, error: /^[A-Z_]+$/.test(error?.message || '') ? error.message : 'MIGRATION_FAILED_SOURCE_PRESERVED' }));
  process.exitCode = 1;
});
