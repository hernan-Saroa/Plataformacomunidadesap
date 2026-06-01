const jwt = require('jsonwebtoken');
const http = require('http');

function run() {
  const payload = {
    sub: '770e8400-e29b-41d4-a716-446655440001',
    username: 'superadmin',
    email: 'superadmin@esap.edu.co',
    name: 'Super Admin',
    roles: ['SUPER_ADMIN']
  };
  const token = jwt.sign(payload, 'esap_jwt_secret_change_in_production', { expiresIn: '1h' });

  // Generate a random 23-digit radicado
  const randomRadicado = '6600123330002026' + String(Math.floor(Math.random() * 9000000) + 1000000);
  console.log(`Using unique radicado: ${randomRadicado}`);

  const expedienteData = {
    radicado: randomRadicado,
    tipoProceso: 'Proceso Ordinario',
    jurisdiccion: 'Contencioso Administrativo',
    demandante: 'Hernan Buitrago',
    demandado: 'Diana Garcia',
    estado: 'ACTIVO',
    fechaRadicacion: new Date().toISOString(),
    cuantia: 10000000,
    nivelRiesgo: 'MEDIO',
    provisionContable: 5000000,
    fechaEstimacionProvision: new Date().toISOString(),
    observacionProvision: 'Estimacion inicial',
    abogadoSustanciador: '770e8400-e29b-41d4-a716-446655440001',
    medioControl: 'Nulidad y Restablecimiento del Derecho',
    juzgadoConocimiento: 'Tribunal Administrativo - Quibdo, Choco',
    ubicacionFisica: 'Quibdo',
    pretensionDemandante: 'Pretensiones de prueba para el proceso ordinario de prueba.',
    fechaNotificacion: new Date().toISOString(),
    fechaVencimientoTermino: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    etapaProcesal: 'NOTIFICADA',
    actors: [
      {
        nombre: 'Hernan Buitrago',
        tipoPersona: 'natural',
        identificacion: '12345678',
        rol: 'DEMANDANTE',
        telefono: '3001234567',
        email: 'hernan@test.com',
        direccion: 'Calle 123'
      },
      {
        nombre: 'Diana Garcia',
        tipoPersona: 'natural',
        identificacion: '87654321',
        rol: 'DEMANDADO',
        cargo: 'Funcionario',
        telefono: '3007654321',
        email: 'diana@test.com',
        direccion: 'Carrera 45'
      }
    ],
    tipoIdDemandante: 'CC',
    numeroIdDemandante: '12345678',
    demandanteDireccion: 'Calle 123',
    demandanteTelefono: '3001234567',
    demandanteEmail: 'hernan@test.com',
    tipoIdDemandado: 'CC',
    numeroIdDemandado: '87654321',
    demandadoDireccion: 'Carrera 45',
    demandadoTelefono: '3007654321',
    demandadoEmail: 'diana@test.com',
    esDelitoAdminPublica: false,
    esConductaPatrimonioPublico: false
  };

  const bodyString = JSON.stringify(expedienteData);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/legal/api/v1/expedientes',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyString)
    }
  };

  console.log(`Sending POST to gateway...`);

  const req = http.request(options, (res) => {
    let data = '';
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Response Body:', data);
    });
  });

  req.on('error', (err) => {
    console.error('Request Error:', err);
  });

  req.write(bodyString);
  req.end();
}

run();
