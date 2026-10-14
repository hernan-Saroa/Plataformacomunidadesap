/* Inventario offline por defecto. --database agrega exclusivamente lecturas sobre
 * una conexión PG* explícita, dentro de una transacción READ ONLY que termina en ROLLBACK.
 * No carga dotenv, ejecuta Docker ni activa funciones. Nunca publica errores del driver.
 */
const fs = require('node:fs');
const path = require('node:path');
const { environments, inventory, inspectDatabase } = require('./lib/rund-installation-review.cjs');
const root = path.resolve(__dirname, '..');
async function run(args = process.argv.slice(2), env = process.env) {
  let databaseMode = false, environment, output;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--database') databaseMode = true;
    else if (args[i] === '--environment') { environment = args[++i]; if (!environment) throw new Error('invalid_arguments'); }
    else if (args[i] === '--output') { output = args[++i]; if (!output) throw new Error('invalid_arguments'); }
    else if (args[i] === '--help') {
      console.log('node scripts/review-rund-installation.cjs [--environment local|dev|qa|pre|prod] [--database] [--output archivo.json]');
      console.log('--database requiere PGHOST, PGPORT, PGUSER y PGDATABASE explícitos; PGPASSWORD por el mecanismo de secretos. No lee .env.');
      return 0;
    } else throw new Error('invalid_arguments');
  }
  if ((environment !== undefined && !environments.includes(environment)) || (databaseMode && !environment) || (args.includes('--output') && !output)) throw new Error('invalid_arguments');
  if (databaseMode && (!['PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE'].every(key => typeof env[key] === 'string' && env[key].trim()) ||
    !/^\d+$/.test(env.PGPORT) || Number(env.PGPORT) < 1 || Number(env.PGPORT) > 65535)) throw new Error('explicit_pg_configuration_required');
  const target = path.resolve(root, output || (databaseMode ? `docs/rund/revision-instalacion-${environment}.json` : 'docs/rund/revision-artefactos-repositorio.json'));
  // Validate before attempting any connection; restrict evidence to dedicated JSON reports.
  const relative = path.relative(path.join(root, 'docs/rund'), target);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !/^revision-(?:instalacion-[a-z]+|artefactos-[a-z-]+)\.json$/.test(path.basename(target)) || path.dirname(relative) !== '.') throw new Error('invalid_report_path');
  const report = { reviewedAt: new Date().toISOString(), step: '12.5d.1',
    mode: databaseMode ? 'repository-and-read-only-database' : 'repository-only',
    environment: environment || null, activationReadiness: 'not_verified',
    realEnvironmentFilesRead: false, runtimeModified: false, deploymentExecuted: false,
    repository: inventory(root), database: { status: 'not_verified' } };
  if (databaseMode) {
    const { Client } = require(path.join(root, 'backend/rund-service/node_modules/pg'));
    // Explicit values only; do not infer a database from a developer's current environment.
    const client = new Client({ host: env.PGHOST, port: Number(env.PGPORT), user: env.PGUSER,
      database: env.PGDATABASE, password: env.PGPASSWORD, connectionTimeoutMillis: 5000,
      application_name: 'rund-read-only-review', options: '-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000' });
    // An idle socket error must not print a driver stack containing connection details.
    client.on('error', () => {});
    try {
      await client.connect();
      report.database = await inspectDatabase(client);
    } catch { report.database = { status: 'not_verified', reason: 'database_check_failed' }; }
    finally { await client.end().catch(() => {}); }
  }
  fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
  console.log(`Revisión RUND: ${report.mode}; base: ${report.database.status}; activación sin verificar.`);
  return databaseMode && report.database.status !== 'checked_scope_passed' ? 1 : 0;
}
if (require.main === module) run().then(code => { process.exitCode = code; }).catch(() => { console.error('No se completó la revisión. Verifique argumentos/configuración explícita; no se muestran valores privados.'); process.exitCode = 1; });
module.exports = { run };
