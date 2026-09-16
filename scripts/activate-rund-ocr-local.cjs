// Activa exclusivamente la instalación local configurada en este workspace.
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const root = path.resolve(__dirname, '..');
const service = path.join(root, 'backend/academic-work-plan-service');
const dotenv = require(path.join(service, 'node_modules/dotenv'));
const backendFile = path.join(service, '.env');
const localFile = path.join(root, '.env.rund-ocr.local');
const local = dotenv.parse(fs.readFileSync(localFile));
const backend = dotenv.parse(fs.readFileSync(backendFile));
const keys = ['RUND_OCR_ENABLED','RUND_OCR_URL','RUND_OCR_TOKEN','RUND_OLLAMA_URL','RUND_OLLAMA_MODEL'];
function configure(file) {
  let content = fs.readFileSync(file, 'utf8');
  for (const key of keys) {
    const line = `${key}=${key === 'RUND_OCR_ENABLED' ? 'true' : local[key]}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    content = pattern.test(content) ? content.replace(pattern, () => line) : content.trimEnd() + '\n' + line + '\n';
  }
  fs.writeFileSync(file, content);
}
(async () => {
  if (!['localhost','127.0.0.1','::1'].includes(backend.DB_HOST)) throw new Error('Este activador solo admite PostgreSQL local.');
  for (const key of keys.slice(1)) if (!local[key] || /[\r\n]/.test(local[key])) throw new Error(`Configuración local incompleta: ${key}`);
  if (local.RUND_OCR_TOKEN.length < 32) throw new Error('Token OCR local inválido.');
  for (const key of ['RUND_OCR_URL','RUND_OLLAMA_URL']) if (!['localhost','127.0.0.1','[::1]'].includes(new URL(local[key]).hostname)) throw new Error('Los motores deben estar en localhost para esta activación.');
  const health = await fetch(`${local.RUND_OCR_URL}/health`, {signal:AbortSignal.timeout(10000)});
  const status = await health.json();
  if (!health.ok || !status.configured || status.status !== 'ready') throw new Error('Primero ejecute la prueba real y compruebe que PaddleOCR está listo.');
  const tags = await fetch(`${local.RUND_OLLAMA_URL}/api/tags`, {signal:AbortSignal.timeout(10000)});
  const models = await tags.json();
  if (!tags.ok || !models.models?.some(m=>m.name===local.RUND_OLLAMA_MODEL)) throw new Error('El modelo local configurado no está instalado.');
  const client = new Client({host:backend.DB_HOST,port:Number(backend.DB_PORT||5432),user:backend.DB_USER,password:backend.DB_PASS,database:backend.DB_NAME});
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('rund-extraccion-migration-656'))");
    await client.query(fs.readFileSync(path.join(root,'db/migrations/656_rund_extraccion_experimental.sql'),'utf8'));
    await client.query(fs.readFileSync(path.join(root,'db/migrations/657_rund_extraccion_progreso.sql'),'utf8'));
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
  configure(localFile); configure(backendFile);
  console.log('Migraciones OCR 656 y 657 aplicadas a PostgreSQL local. OCR habilitado en el archivo de entorno del servicio PTA; reinicie ese servicio para cargarlo. No se modificaron perfiles.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
