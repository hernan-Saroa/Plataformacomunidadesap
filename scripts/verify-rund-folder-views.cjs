/* Solo recibe el servidor Auth temporal del fixture de PostgreSQL, nunca una URL externa. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
module.exports = async function ({ authUrl, session, person, read, check }) {
  assert.equal(new URL(authUrl).hostname, '127.0.0.1');
  const checks = [];
  const verify = (name, run) => check('Vistas carpeta: ' + name, async () => { await run(); checks.push(name); });
  const portal = async (credential = session) => {
    const res = await fetch(`${authUrl}/portal/carpeta-digital/${person}`, {
      headers: credential ? { Cookie: `esap_access_token=${credential}` } : {},
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
    return res.json();
  };
  await verify('portal y administración conservan archivos, propietarios, perfiles, versiones y totales', async () => {
    const expected = await read(`/persona/${person}/documentos`), counts = await read(`/persona/${person}`);
    const result = await portal();
    assert.equal(result.success, true); assert.equal(result.data.persona.id, person);
    assert.deepEqual(result.data.documentos, expected);
    assert.deepEqual(result.data.carpeta.estadisticas_por_propietario, counts.estadisticas_por_propietario);
    assert.equal(result.data.carpeta.total_documentos, expected.length);
    assert.equal(result.data.carpeta.conteo_completo, true);
  });
  await verify('sin sesión el portal conserva el enmascaramiento de originales RUND', async () => {
    const result = await portal(null); assert.equal(result.success, true);
    const native = result.data.documentos.filter(d => d.servicio_propietario === 'rund');
    assert(native.length > 0);
    assert(native.every(d => d.contenido_restringido && d.url_archivo === null && d.nombre === 'Documento del perfil'));
  });
  await verify('una credencial RUND incorrecta produce fallo explícito sin una carpeta parcial exitosa', async () => {
    const saved = process.env.RUND_CARPETA_INTERNAL_TOKEN;
    process.env.RUND_CARPETA_INTERNAL_TOKEN = 'credencial-ficticia-incorrecta';
    try { const result = await portal(); assert.equal(result.success, false); }
    finally { process.env.RUND_CARPETA_INTERNAL_TOKEN = saved; }
  });
  await verify('el catálogo de periodos del navegador no admite caché HTTP', async () => {
    const res = await fetch(`${authUrl}/carpeta-digital/persona/${person}/perfiles-rund`, { headers: { Authorization: `Bearer ${session}` } });
    assert.equal(res.status, 200); assert.equal(res.headers.get('cache-control'), 'private, no-store');
    assert.equal((await res.json()).data.complete, true);
  });
  fs.writeFileSync(path.resolve(__dirname, '../docs/rund/validacion-vistas-carpeta-postgres-local.json'), JSON.stringify({
    verifiedAt: new Date().toISOString(), step: '12.4', passed: true, syntheticDataOnly: true,
    existingDatabaseUsed: false, checks,
  }, null, 2) + '\n');
};
