// Carga el .env del servicio para Jest (setupFiles), sin dependencias.
//
// Las pruebas de agregado se conectan a la base real con DB_PASS y, si no
// pueden conectarse, se omiten: sin esto, en local se omitían EN SILENCIO y se
// contaban como pasadas. Solo completa variables NO definidas; sin .env (CI) no
// cambia nada.
const fs = require('fs');
const path = require('path');

const archivo = path.join(__dirname, '..', '.env');
if (fs.existsSync(archivo)) {
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    // El interruptor de la concertación y su corte los fija CADA prueba. Si el .env los
    // dejara encendidos para el entorno de pruebas manuales, toda la suite cambiaría de régimen.
    if (m[1].startsWith('PROG_CONCERTACION_')) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
