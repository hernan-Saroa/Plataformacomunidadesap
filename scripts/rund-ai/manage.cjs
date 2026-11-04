// Instala exclusivamente motores nuevos. Nunca modifica .env actuales ni migra BD.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const environments = ['dev', 'qa', 'pre', 'prod'];
const keys = ['RUND_OCR_ENABLED', 'RUND_OCR_PROVIDER', 'RUND_OCR_URL', 'RUND_OLLAMA_URL',
  'RUND_OLLAMA_MODEL', 'RUND_AI_MODE', 'RUND_AI_NETWORK', 'RUND_AI_OCR_PORT', 'RUND_AI_OLLAMA_PORT'];

function parseProfile(content) {
  const result = {};
  for (const line of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*([^#]*?)(?:\s+#.*)?$/);
    if (!match || !keys.includes(match[1]) || Object.hasOwn(result, match[1]))
      throw new Error('Perfil RUND invalido: solo claves de IA permitidas, sin duplicados.');
    let value = match[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    // No hay secretos ni interpolacion en este perfil; impedir expansiones de shell/Compose.
    if (!value || /[^a-zA-Z0-9_.:/\[\]-]/.test(value)) throw new Error('Valor RUND invalido.');
    result[match[1]] = value;
  }
  for (const key of keys) if (!result[key]) throw new Error(`Falta ${key}.`);
  if (!['true', 'false'].includes(result.RUND_OCR_ENABLED) || result.RUND_OCR_PROVIDER !== 'RUND'
    || result.RUND_OLLAMA_MODEL !== 'gemma4:e4b' || !['managed', 'external'].includes(result.RUND_AI_MODE))
    throw new Error('Este perfil requiere el contrato RUND y Gemma gemma4:e4b.');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}$/.test(result.RUND_AI_NETWORK)) throw new Error('Red RUND invalida.');
  for (const key of ['RUND_AI_OCR_PORT', 'RUND_AI_OLLAMA_PORT']) {
    if (!/^\d+$/.test(result[key]) || +result[key] < 1024 || +result[key] > 65535) throw new Error('Puerto RUND invalido.');
  }
  if (+result.RUND_AI_OCR_PORT === +result.RUND_AI_OLLAMA_PORT) throw new Error('Los puertos RUND deben ser distintos.');
  for (const key of ['RUND_OCR_URL', 'RUND_OLLAMA_URL']) {
    const url = new URL(result[key]);
    const host = url.hostname;
    const local = host === 'localhost' || host === '[::1]' || /^127\./.test(host) || /^10\./.test(host)
      || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
      || /^[a-z][a-z0-9-]*$/i.test(host) || host.endsWith('.local') || host === 'host.docker.internal';
    if (!local || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/')
      throw new Error('Los motores RUND deben tener URL privada, sin credenciales ni rutas.');
    // localhost en PTA Docker apunta a PTA, no al motor.
    if (host === 'localhost' || host === '[::1]' || /^127\./.test(host)) throw new Error('Use el nombre Docker o servidor privado, no localhost, en el perfil Docker.');
  }
  if (result.RUND_AI_MODE === 'managed' && (result.RUND_OCR_URL !== 'http://rund-ocr:8000'
    || result.RUND_OLLAMA_URL !== 'http://rund-ollama:11434')) throw new Error('Las URL managed deben apuntar a sus motores Docker.');
  return result;
}

function profilePath(environment, env = process.env) {
  if (!environments.includes(environment)) throw new Error('Ambiente no valido: dev, qa, pre o prod.');
  return path.resolve(root, env.RUND_AI_ENV_FILE || `backend/academic-work-plan-service/.env.rund-ai.${environment}`);
}
function docker(args, values, options = {}) {
  const env = { ...process.env };
  for (const key of keys) delete env[key];
  const result = spawnSync('docker', args, { cwd: root, env: { ...env, ...values }, stdio: 'inherit', windowsHide: true, ...options });
  if (result.error) throw new Error(`No se pudo ejecutar Docker: ${result.error.code}.`);
  if (result.status !== 0) throw new Error('Docker no completo la operacion RUND. Revise el mensaje anterior.');
}
function main(args) {
  const [environment, command, option] = args;
  const file = profilePath(environment);
  if (!['init', 'profile', 'install', 'prepare', 'check', 'status'].includes(command)
    || args.length > 3 || (option && !(command === 'install' && option === '--gpu')))
    throw new Error('Uso: node scripts/rund-ai/manage.cjs dev|qa|pre|prod init|install [--gpu]|prepare|check|status');
  if (command === 'init') {
    const offset = environments.indexOf(environment) * 100;
    const template = fs.readFileSync(path.join(root, 'backend/academic-work-plan-service/rund-ai.env.example'), 'utf8')
      .replace('RUND_AI_NETWORK=esap-rund-ai-dev', `RUND_AI_NETWORK=esap-rund-ai-${environment}`)
      .replace('RUND_AI_OCR_PORT=8091', `RUND_AI_OCR_PORT=${8091 + offset}`)
      .replace('RUND_AI_OLLAMA_PORT=11435', `RUND_AI_OLLAMA_PORT=${11435 + offset}`);
    fs.writeFileSync(file, template, { flag: 'wx', mode: 0o600 });
    console.log(`RUND: perfil creado sin sobrescribir configuraciones: ${path.relative(root, file)}`);
    return;
  }
  const values = parseProfile(fs.readFileSync(file, 'utf8'));
  const project = `esap-rund-ai-${environment}`;
  if (values.RUND_AI_MODE === 'managed' && values.RUND_AI_NETWORK !== project)
    throw new Error('La red managed debe ser exclusiva del ambiente; use external para reutilizar una red.');
  if (command === 'profile') { console.log(keys.map(key => `${key}=${values[key]}`).join('\n')); return; }
  const stack = ['compose', '-p', project, '--env-file', file, '-f', 'docker-compose.rund-ai.yml'];
  const pta = ['compose', '--env-file', `.env.${environment}`, '-f', `docker-compose.${environment}.yml`, '-f', 'docker-compose.rund-ai-config.yml'];
  const check = () => {
    docker([...pta, 'config', '--quiet'], values);
    // Arranque independiente: no importa AppModule, no inicia el worker ni procesa colas.
    docker([...pta, 'run', '--rm', '--no-deps', '--entrypoint', 'node', 'academic-work-plan-service', 'scripts/check-rund-ai.cjs'], values);
  };
  switch (command) {
    case 'install':
      if (values.RUND_AI_MODE !== 'managed') throw new Error('Perfil external: sus motores se conservan; ejecute check.');
      // Permitir --gpu solo de forma explicita; no tocar contenedores anteriores.
      if (option) stack.push('-f', 'docker-compose.rund-ai.gpu.yml');
      docker([...stack, 'config', '--quiet'], values);
      docker([...stack, 'up', '-d', '--build', '--wait', '--wait-timeout', '1200'], values);
      docker([...stack, 'exec', '-T', 'rund-ollama', 'ollama', 'pull', values.RUND_OLLAMA_MODEL], values);
      console.log('RUND: motores preparados; PTA sigue intacto. Compile PTA y ejecute check antes de desplegar.');
      break;
    case 'check': check(); break;
    case 'prepare':
      docker([...pta, 'config', '--quiet'], values);
      docker([...pta, 'build', 'academic-work-plan-service'], values);
      console.log('RUND: imagen PTA preparada sin reemplazar servicios. Ejecute check y despues el despliegue habitual de PTA.');
      break;
    case 'status':
      if (values.RUND_AI_MODE === 'managed') docker([...stack, 'ps'], values);
      docker([...pta, 'ps', 'academic-work-plan-service'], values);
      break;
  }
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`RUND: ${error.code === 'EEXIST' ? 'El perfil ya existe y se conservo sin cambios.' : error.code === 'ENOENT' ? 'Falta un archivo requerido; ejecute init y configure el ambiente.' : error.message}`); process.exitCode = 1; }
}
module.exports = { parseProfile, profilePath, keys, main };
