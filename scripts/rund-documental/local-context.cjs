const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const root = path.resolve(__dirname, '../..');
const serviceRoot = path.join(root, 'backend/academic-work-plan-service');

function localConfig() {
  // Archivo explícito: no hereda accidentalmente DATABASE_URL/PGHOST del shell.
  const text = fs.readFileSync(path.join(serviceRoot, '.env'), 'utf8');
  const env = require(path.join(serviceRoot, 'node_modules/dotenv')).parse(text);
  if (!['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST)
    || !['development', 'test'].includes(env.NODE_ENV)) {
    throw new Error('LOCAL_DEVELOPMENT_REQUIRED');
  }
  if (!env.DB_NAME || !env.DB_USER || !env.DB_PASS) throw new Error('LOCAL_DATABASE_CONFIG_INCOMPLETE');
  return {
    database: { host: env.DB_HOST, port: Number(env.DB_PORT || 5432), user: env.DB_USER,
      password: env.DB_PASS, database: env.DB_NAME, connectionTimeoutMillis: 5000,
      application_name: 'rund_documental_local_validation', statement_timeout: 30000 },
    openKmConfigured: Boolean(env.OPENKM_BASE_URL?.trim()),
    openKmCredentialsPresent: Boolean(env.OPENKM_USERNAME && env.OPENKM_PASSWORD),
  };
}

function clientForLocal() { return new Client(localConfig().database); }

function reportError(error) {
  // No imprime mensajes del driver: pueden contener datos o conexión interna.
  console.error(JSON.stringify({ ok: false, error: error.code
    || (/^[A-Z_]+$/.test(error.message || '') ? error.message : 'LOCAL_VALIDATION_FAILED') }));
  process.exitCode = 1;
}

module.exports = { root, serviceRoot, localConfig, clientForLocal, reportError };
