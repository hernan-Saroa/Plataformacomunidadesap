// Diagnóstico de conectividad; no usa credenciales ni ejecuta consultas SQL.
// Uso: node scripts/check-isolucion-connectivity.cjs [IP] [puerto]
const net = require('node:net');
const dgram = require('node:dgram');
const { execFileSync } = require('node:child_process');

const server = process.argv[2] || '172.16.202.145';
const port = Number(process.argv[3] || 1433);
if (net.isIP(server) !== 4 || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Indique una dirección IPv4 y un puerto válido.');
  process.exit(2);
}
const number = (ip) => ip.split('.').reduce((value, part) => ((value << 8) + Number(part)) >>> 0, 0);
function routeForServer() {
  if (process.platform !== 'win32') return undefined;
  try {
    const table = execFileSync('route.exe', ['print', '-4'], { encoding: 'utf8', timeout: 5000 });
    return table.split(/\r?\n/).map((line) => line.trim().split(/\s+/))
      .filter((parts) => parts.length >= 5 && parts.slice(0, 2).every((part) => net.isIP(part) === 4))
      .map((parts) => ({ destination: parts[0], mask: parts[1], gateway: parts[2], interface: parts[3],
        metric: Number(parts[4]), prefix: number(parts[1]).toString(2).replace(/0/g, '').length }))
      .filter((route) => ((number(server) & number(route.mask)) >>> 0) === ((number(route.destination) & number(route.mask)) >>> 0))
      .sort((a, b) => b.prefix - a.prefix || a.metric - b.metric)[0];
  } catch { return undefined; }
}

function tcpProbe(localAddress) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.createConnection({ host: server, port, ...(localAddress ? { localAddress } : {}) });
    let finished = false;
    const finish = (status) => {
      if (finished) return;
      finished = true;
      const source = socket.localAddress || localAddress;
      socket.destroy();
      resolve({ status, elapsedMs: Date.now() - started, source });
    };
    socket.setTimeout(10000);
    socket.once('connect', () => finish('connected'));
    socket.once('timeout', () => finish('timeout'));
    socket.once('error', (error) => finish(error.code || 'error'));
  });
}

function sqlBrowserProbe() {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    let finished = false;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      try { socket.close(); } catch { /* El socket puede no haberse abierto. */ }
      resolve(value);
    };
    const timeout = setTimeout(() => finish({ status: 'no-response' }), 3000);
    socket.on('error', (error) => finish({ status: error.code || 'error' }));
    socket.on('message', (data, remote) => {
      if (remote.address !== server || remote.port !== 1434 || data[0] !== 5) return;
      const instances = data.subarray(3).toString('utf8').split(';;').filter(Boolean).map((record) => {
        const parts = record.split(';');
        const fields = {};
        for (let index = 0; index < parts.length - 1; index += 2) fields[parts[index]] = parts[index + 1];
        return { instance: fields.InstanceName, tcpPort: fields.tcp };
      });
      finish({ status: 'responded', instances });
    });
    socket.send(Buffer.from([3]), 1434, server);
  });
}

(async () => {
  const route = routeForServer();
  const [automatic, explicit, browser] = await Promise.all([
    tcpProbe(), route && route.prefix > 0 ? tcpProbe(route.interface) : Promise.resolve(undefined), sqlBrowserProbe(),
  ]);
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), server, port, route,
    automaticTcp: automatic, explicitRouteTcp: explicit, sqlBrowser: browser }, null, 2));
  process.exitCode = automatic.status === 'connected' || explicit?.status === 'connected' ? 0 : 1;
})().catch((error) => { console.error('No se pudo completar el diagnóstico:', error.code || error.name); process.exitCode = 1; });
