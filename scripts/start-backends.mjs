import { spawn } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const backendDir = path.join(repoRoot, 'backend');

// List of critical microservices that we want to start
// You can adjust this list as needed.
const backendApps = readdirSync(backendDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

const children = new Set();
let shuttingDown = false;

console.log(`[start-backends] Detectados ${backendApps.length} microservicios en /backend... Levantando todos...`);

// Helper for color prefix
const colors = ['\x1b[32m', '\x1b[33m', '\x1b[34m', '\x1b[35m', '\x1b[36m', '\x1b[90m', '\x1b[91m'];
const reset = '\x1b[0m';

backendApps.forEach((appName, index) => {
  const cwd = path.join(backendDir, appName);
  const packagePath = path.join(cwd, 'package.json');
  
  if (!existsSync(packagePath)) return;

  const color = colors[index % colors.length];
  
  // Usamos npm.cmd si estamos en windows para evitar el crasheo "ENOENT"
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npm.cmd' : 'npm';
  
  const child = spawn(cmd, ['run', 'start:dev'], {
    cwd,
    env: process.env,
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'] // Listen to output to prepend nice logs
  });

  child.appName = appName;
  children.add(child);

  child.stdout.on('data', data => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if(line.trim()) console.log(`${color}[${appName}]${reset} ${line}`);
    });
  });

  child.stderr.on('data', data => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if(line.trim()) console.error(`\x1b[31m[${appName}]${reset} ERROR: ${line}`);
    });
  });

  child.on('exit', (code) => {
    children.delete(child);
    if (!shuttingDown) {
      console.log(`\x1b[31m[${appName}] terminó con código ${code}\x1b[0m`);
    }
  });
});

// Cleanup logic
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\x1b[31m[start-backends] Cerrando todos los microservicios...\x1b[0m');
  for (const child of children) {
    if (!child.killed) {
      // kill in Windows requires taskkill for child process tree
      if (process.platform === 'win32') {
         spawn('taskkill', ['/pid', child.pid, '/f', '/t']);
      } else {
         child.kill('SIGTERM');
      }
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
