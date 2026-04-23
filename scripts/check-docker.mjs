import { execSync } from 'node:child_process';

try {
  const ps = execSync('tasklist /NH', { encoding: 'utf8' });
  const dockerRunning = ps.toLowerCase().includes('docker');
  console.log('Docker Desktop:', dockerRunning ? 'RUNNING' : 'NOT RUNNING');
  
  if (dockerRunning) {
    try {
      const containers = execSync('docker ps --format "{{.Names}}\\t{{.Status}}\\t{{.Ports}}"', { encoding: 'utf8' });
      console.log('\nRunning containers:');
      console.log(containers || '(none)');
    } catch {
      console.log('Docker daemon not responding (maybe still starting up)');
    }
  }
} catch (e) {
  console.error('Error checking Docker:', e.message);
}
