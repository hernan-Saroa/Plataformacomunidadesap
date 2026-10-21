#!/usr/bin/env node
/* Levanta o apaga el RUND independiente en local, con las banderas activas, para probar a mano.
 *
 *   node scripts/dev-rund-local.cjs up [--build]   Compila (opcional) y levanta Auth, PTA, RUND, gateway, remoto RUND y shell.
 *   node scripts/dev-rund-local.cjs down           Apaga todo lo que levantó.
 *   node scripts/dev-rund-local.cjs status         Muestra qué puertos están escuchando.
 *
 * Requiere PostgreSQL local con las migraciones del RUND aplicadas (docs/rund/ACTIVACION-RUND-LOCAL-Y-DESPLIEGUE.md)
 * y los .env de cada servicio. No modifica ningún archivo .env: las banderas se pasan solo a los procesos.
 * Para el correo de bienvenida hace falta además notifications-service; sin él el alta funciona y el correo sale como no enviado.
 */
const { spawn, spawnSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const stateFile = path.join(os.tmpdir(), 'esap-rund-local.json');
const logDir = path.join(os.tmpdir(), 'esap-rund-local-logs');
const isWin = process.platform === 'win32';

const readEnv = file => {
  try { return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])); }
  catch { return {}; }
};
const authEnv = readEnv(path.join(root, 'backend/auth-service/.env'));
const token = process.env.INTERNAL_SERVICE_TOKEN || authEnv.INTERNAL_SERVICE_TOKEN || '';

const services = [
  { name: 'pta', port: 3003, cwd: 'backend/academic-work-plan-service', cmd: ['node', 'dist/main.js'],
    env: { RUND_SYNC_ENABLED: 'true', RUND_SERVICE_URL: 'http://localhost:3016' } },
  { name: 'auth', port: 3001, cwd: 'backend/auth-service', cmd: ['node', 'dist/main.js'],
    env: { RUND_CARPETA_ENABLED: 'true', RUND_IDENTITY_APPLY_ENABLED: 'true', RUND_IDENTITY_COMPENSATION_ENABLED: 'true', PTA_HISTORICO_API_ENABLED: 'true',
      ACADEMIC_WORK_PLAN_SERVICE_URL: 'http://localhost:3003', RUND_SERVICE_URL: 'http://localhost:3016' } },
  { name: 'rund', port: 3016, cwd: 'backend/rund-service', cmd: ['node', 'dist/main.js'],
    env: { RUND_IDENTITY_WRITE_VIA_AUTH_API: 'true', RUND_OCR_IDENTITY_VIA_AUTH_API: 'true', RUND_DOCUMENT_ALLOW_LOCAL: 'true', RUND_ENABLE_DEV_OTP: 'true',
      AUTH_SERVICE_URL: 'http://localhost:3001', ACADEMIC_WORK_PLAN_SERVICE_URL: 'http://localhost:3003' } },
  { name: 'gateway', port: 4000, cwd: 'backend/api-gateway', cmd: ['node', 'dist/main.js'], env: {} },
  { name: 'remoto-rund', port: 3119, cwd: 'apps/mfe-rund', cmd: ['npx', 'vite', 'preview', '--port', '3119', '--strictPort'], env: {}, build: ['npx', 'vite', 'build'] },
  { name: 'shell', port: 3000, cwd: 'apps/shell', cmd: ['npx', 'vite', '--port', '3000', '--strictPort'], env: { VITE_API_URL: 'http://localhost:4000' } },
];

const listening = port => new Promise(resolve => {
  const socket = net.connect({ port, host: 'localhost' }); socket.once('connect', () => { socket.destroy(); resolve(true); }); socket.once('error', () => resolve(false));
});
const waitPort = async (port, ms = 90000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await listening(port)) return true; await new Promise(r => setTimeout(r, 1000)); } return false; };
const killTree = pid => { try { if (isWin) execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGTERM'); } catch { /* ya terminó */ } };
const pidOnPort = port => {
  try {
    if (isWin) { const out = execSync('netstat -ano', { encoding: 'utf8' }); const line = out.split(/\r?\n/).find(l => new RegExp(`:${port}\\s+\\S+\\s+LISTENING`).test(l)); return line ? Number(line.trim().split(/\s+/).pop()) : null; }
    return Number(execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).split('\n')[0]) || null;
  } catch { return null; }
};

async function up(build) {
  if (!token) { console.error('Falta INTERNAL_SERVICE_TOKEN (defínelo o ponlo en backend/auth-service/.env).'); process.exit(1); }
  fs.mkdirSync(logDir, { recursive: true });
  if (build) for (const dir of ['backend/auth-service', 'backend/academic-work-plan-service', 'backend/rund-service', 'backend/api-gateway']) {
    console.log('compilando ' + dir + ' ...'); const r = spawnSync(isWin ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: path.join(root, dir), stdio: 'ignore', shell: isWin });
    if (r.status !== 0) { console.error('falló la compilación de ' + dir); process.exit(1); }
  }
  const started = [];
  for (const s of services) {
    if (await listening(s.port)) { console.log(`${s.name.padEnd(12)} ya escucha en :${s.port}`); continue; }
    const cwd = path.join(root, s.cwd);
    if (s.build && build) spawnSync(isWin ? 'npx.cmd' : 'npx', s.build.slice(1), { cwd, stdio: 'ignore', shell: isWin });
    const out = fs.openSync(path.join(logDir, s.name + '.log'), 'w');
    const [bin, ...args] = s.cmd; const exe = bin === 'node' ? process.execPath : (isWin ? bin + '.cmd' : bin);
    const child = spawn(exe, args, { cwd, detached: true, stdio: ['ignore', out, out], shell: isWin && bin !== 'node', windowsHide: true,
      env: { ...process.env, INTERNAL_SERVICE_TOKEN: token, ...s.env } });
    child.unref(); started.push({ name: s.name, port: s.port, pid: child.pid });
    process.stdout.write(`${s.name.padEnd(12)} arrancando en :${s.port} ... `);
    console.log((await waitPort(s.port)) ? 'listo' : 'NO respondió (revisa ' + path.join(logDir, s.name + '.log') + ')');
  }
  fs.writeFileSync(stateFile, JSON.stringify(started));
  console.log(`\nShell:        http://localhost:3000        (módulo RUND: menú "Registro Único Nacional Docente (RUND) V.2.0")\nGateway:      http://localhost:4000\nLogs:         ${logDir}\nApagar:       node scripts/dev-rund-local.cjs down`);
}

async function down() {
  let state = []; try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { /* sin estado previo */ }
  for (const s of services) {
    const pid = (state.find(x => x.name === s.name) || {}).pid; const onPort = pidOnPort(s.port);
    for (const p of new Set([pid, onPort].filter(Boolean))) killTree(p);
    if (pid || onPort) console.log(`apagado ${s.name} (:${s.port})`);
  }
  try { fs.unlinkSync(stateFile); } catch { /* nada */ }
}

async function status() { for (const s of services) console.log(`${s.name.padEnd(12)} :${s.port}  ${(await listening(s.port)) ? 'escuchando' : 'apagado'}`); }

const [command, ...flags] = process.argv.slice(2);
({ up: () => up(flags.includes('--build')), down, status }[command] || (() => { console.log('Uso: node scripts/dev-rund-local.cjs up [--build] | down | status'); }))();
