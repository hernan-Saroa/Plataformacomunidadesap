import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const backendRoot = path.join(repoRoot, 'backend');

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const allServices = listBackendServices();

if (options.listServices) {
  console.log('Servicios disponibles para `npm run dev:backend -- --services=...`:');
  for (const service of allServices) {
    console.log(`- ${service}`);
  }
  process.exit(0);
}

const selectedServices = selectServices(allServices, options.services);

console.log(`[dev:backend] Servicios seleccionados: ${selectedServices.join(', ')}`);

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = new Set();
let shuttingDown = false;

function shutdown(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
  }, 3500).unref();
}

for (const serviceName of selectedServices) {
  const cwd = path.join(backendRoot, serviceName);

  // Load the service's .env file and merge with process.env
  const envFilePath = path.join(cwd, '.env');
  const serviceEnv = { ...process.env };
  if (existsSync(envFilePath)) {
    const envContent = readFileSync(envFilePath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        serviceEnv[key] = val;
      }
    }
  }

  const child = spawn(npmCmd, ['run', 'start:dev'], {
    cwd,
    env: serviceEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  child.serviceName = serviceName;
  children.add(child);

  const stdout = readline.createInterface({ input: child.stdout });
  stdout.on('line', (line) => {
    process.stdout.write(`[${serviceName}] ${line}\n`);
  });

  const stderr = readline.createInterface({ input: child.stderr });
  stderr.on('line', (line) => {
    process.stderr.write(`[${serviceName}] ${line}\n`);
  });

  child.on('exit', (code, signal) => {
    children.delete(child);
    stdout.close();
    stderr.close();

    if (shuttingDown) {
      if (children.size === 0) process.exit(code ?? 0);
      return;
    }

    if (signal) {
      process.stderr.write(
        `\n[dev:backend] ⚠️  ${serviceName} terminó por señal ${signal}. Continuando con los demás servicios.\n`,
      );
    } else if (code !== 0) {
      process.stderr.write(
        `\n[dev:backend] ⚠️  ${serviceName} terminó con código ${code}. Continuando con los demás servicios.\n`,
      );
    }

    if (children.size === 0) {
      process.stderr.write('\n[dev:backend] Todos los servicios han terminado.\n');
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

function listBackendServices() {
  if (!existsSync(backendRoot)) {
    console.error('[dev:backend] No se encontró la carpeta backend/.');
    process.exit(1);
  }

  return readdirSync(backendRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(path.join(backendRoot, name, 'package.json')))
    .sort();
}

function parseArgs(args) {
  const parsed = {
    services: process.env.DEV_BACKEND_SERVICES || '',
    listServices: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    if (arg === '--list-services') {
      parsed.listServices = true;
      continue;
    }

    if (arg.startsWith('--services=')) {
      parsed.services = arg.slice('--services='.length);
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`
Uso:
  npm run dev:backend
  npm run dev:backend -- --services=api-gateway,auth-service
  npm run dev:backend -- --list-services

Opciones:
  --services=lista      Lista separada por comas de servicios de backend a iniciar.
                        Si no se envía, inicia todos.
                        También se puede definir con DEV_BACKEND_SERVICES.
  --list-services       Muestra los nombres válidos para --services.
  --help                Muestra esta ayuda.
`);
}

function selectServices(allServices, servicesOption) {
  if (!servicesOption || servicesOption === 'all') {
    return allServices;
  }

  const requested = new Set(
    servicesOption
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  const selected = allServices.filter((name) => requested.has(name));
  const missing = [...requested].filter((name) => !allServices.includes(name));

  if (missing.length > 0) {
    console.error(
      `[dev:backend] Servicios desconocidos: ${missing.join(', ')}. Usa --list-services para ver los válidos.`,
    );
    process.exit(1);
  }

  if (selected.length === 0) {
    console.error('[dev:backend] No hay servicios seleccionados.');
    process.exit(1);
  }

  return selected;
}

