// Verifica la interpolación efectiva de Compose sin arrancar contenedores.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

for (const ambiente of ['dev', 'qa', 'pre', 'prod']) {
  for (const proveedor of ['smtp', 'microsoft_graph']) {
    const configuracion = {
      SMTP_HOST: 'smtp.configurado.example.test', SMTP_PORT: '587',
      SMTP_USER: 'usuario@example.test', SMTP_PASS: 'clave-ficticia-de-prueba',
      SMTP_FROM: 'remitente@example.test', EMAIL_PROVIDER: proveedor,
      LEGAL_EMAIL_ACCOUNT_JUDICIAL: 'judicial@example.test',
      MAIL_TEST_INBOX: '', JURIDICA_EMAIL: '',
      DEV_LEGAL_EMAIL_ACCOUNT_JUDICIAL: '', QA_LEGAL_EMAIL_ACCOUNT_JUDICIAL: '', PRE_LEGAL_EMAIL_ACCOUNT_JUDICIAL: '',
    };
    const args = ['compose', '--env-file', '.env.example', '-f', `docker-compose.${ambiente}.yml`];
    if (ambiente !== 'dev') args.push('-f', `docker-compose.${ambiente}.ghcr.yml`);
    args.push('config', '--format', 'json');
    const result = spawnSync('docker', args, {encoding:'utf8', env:{...process.env,...configuracion},maxBuffer:10*1024*1024});
    assert.equal(result.status, 0, 'No se pudo resolver Compose de ' + ambiente);
    const services = JSON.parse(result.stdout).services;
    const correo = services['notifications-service'].environment;
    for (const clave of ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_FROM','EMAIL_PROVIDER']) {
      assert.equal(String(correo[clave]),configuracion[clave],`${ambiente} sobrescribe ${clave}`);
    }
    for (const service of ['notifications-service','internal-disciplinary-control-service','legal-management-service']) {
      assert.equal(services[service].environment.JURIDICA_EMAIL,configuracion.LEGAL_EMAIL_ACCOUNT_JUDICIAL);
    }
    if (ambiente !== 'prod') assert.equal(correo.MAIL_TEST_INBOX,'');
    console.log(`PASS ${ambiente}, proveedor ${proveedor}, valores del entorno conservados`);
  }
}
