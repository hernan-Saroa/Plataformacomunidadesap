/* Chromium + IndexedDB reales, origen temporal y datos ficticios. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

(async () => {
  const bundle = await esbuild.build({ entryPoints: [path.resolve(__dirname, '../apps/shell/src/services/api/offlineCache.ts')],
    bundle: true, write: false, format: 'iife', globalName: 'RundCache', platform: 'browser' });
  const server = http.createServer((_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Prueba aislada de caché RUND</title>'); });
  let browser;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('esap_offline_db', 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore('api_cache', { keyPath: 'url' });
          req.result.createObjectStore('mutation_queue', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('api_cache', 'readwrite');
        const store = tx.objectStore('api_cache');
        store.put({ url: '/pta/api/v1/banco-docentes', data: [{ documento_identidad: '1020304050' }] });
        store.put({ url: '/pta/api/v1/pta/plan', data: { docente: { num_identificacion: '1020304050' } } });
        store.put({ url: '/certificates/api/v1/solicitudes', data: { id: 'general', estado: 'PENDIENTE' } });
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const result = await page.evaluate(async () => {
      const cache = RundCache.offlineCache;
      const rund = await cache.getCache('/pta/api/v1/banco-docentes');
      const embedded = await cache.getCache('/pta/api/v1/pta/plan');
      const general = await cache.getCache('/certificates/api/v1/solicitudes');
      await cache.setCache('/pta/api/v1/banco-docentes', { puntajeSalarial: 145.5 });
      await cache.setCache('/pta/api/v1/pta/periodos', [{ id: '2026-1' }]);
      const db = await new Promise((resolve) => { const req = indexedDB.open('esap_offline_db', 1); req.onsuccess = () => resolve(req.result); });
      const persisted = await new Promise((resolve) => { const req = db.transaction('api_cache').objectStore('api_cache').getAll(); req.onsuccess = () => resolve(req.result); });
      db.close();
      return { rund, embedded, general, persisted };
    });
    assert.equal(result.rund, null); assert.equal(result.embedded, null);
    assert.equal(result.general.id, 'general');
    assert.equal(result.persisted.length, 2);
    assert(!JSON.stringify(result.persisted).includes('1020304050'));
    assert(!JSON.stringify(result.persisted).includes('145.5'));
    const report = { executedAt: new Date().toISOString(), browser: await browser.version(), businessDataModified: false,
      checks: ['Caché RUND histórica eliminada', 'Datos docentes incluidos en PTA eliminados',
        'Respuestas sensibles nuevas no persistidas', 'Caché de certificados conservada', 'Catálogos PTA siguen disponibles sin conexión'], passed: true };
    fs.writeFileSync(path.resolve(__dirname, '../docs/rund/validacion-rbac-navegador.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('PASS Chromium/IndexedDB: 5 comprobaciones, caché de otros módulos conservada.');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
