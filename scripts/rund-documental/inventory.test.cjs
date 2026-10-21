const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { within, resolveLocalDocument, inspectDocument, summarize } = require('./inventory.cjs');

async function fixture(t) {
  const root = path.resolve(__dirname, '../../tmp/rund-documental-tests');
  await fs.mkdir(root, { recursive: true });
  const dir = await fs.mkdtemp(path.join(root, 'inventory-'));
  t.after(async () => {
    // Se elimina exclusivamente el directorio temporal creado por esta prueba.
    assert(within(root, dir));
    await fs.rm(dir, { recursive: true, force: true });
  });
  const uploads = path.join(dir, 'uploads');
  await fs.mkdir(path.join(uploads, 'rund-documentos'), { recursive: true });
  const content = Buffer.from('%PDF-1.7\nsynthetic inventory test');
  await fs.writeFile(path.join(uploads, 'rund-documentos/test.pdf'), content);
  return { dir, roots: { pta: uploads, auth: uploads }, row: {
    id: 'synthetic-document', proveedor_almacenamiento: 'LOCAL', estado: 'ACTIVO', categoria_codigo: 'OTROS',
    almacenamiento_ruta: 'rund-documentos/test.pdf', checksum_sha256: createHash('sha256').update(content).digest('hex'), tamano_bytes: content.length,
  } };
}

test('verifica bytes sin incluir rutas ni nombres personales en el reporte', async t => {
  const { roots, row } = await fixture(t);
  const result = await inspectDocument(row, roots);
  assert.equal(result.status, 'VERIFIED');
  assert.equal(result.readyForCopy, true);
  assert.equal(JSON.stringify(result).includes('test.pdf'), false);
  assert.equal(JSON.stringify(result).includes(roots.pta), false);
});

test('no propone copiar retirados, huellas falsas, metadatos incompletos o archivos faltantes', async t => {
  const { roots, row } = await fixture(t);
  for (const [changes, expected] of [
    [{ estado: 'ELIMINADO' }, 'VERIFIED'],
    [{ checksum_sha256: '0'.repeat(64) }, 'HASH_MISMATCH'],
    [{ checksum_sha256: 'LEGACY-123' }, 'BASELINE_REQUIRED'],
    [{ tamano_bytes: 1 }, 'SIZE_MISMATCH'],
    [{ almacenamiento_ruta: 'rund-documentos/missing.pdf' }, 'MISSING_FILE'],
    [{ proveedor_almacenamiento: 'OPENKM' }, 'REMOTE_NOT_READ'],
    [{ proveedor_almacenamiento: 'INVALID' }, 'UNKNOWN_PROVIDER'],
  ]) {
    const result = await inspectDocument({ ...row, ...changes }, roots);
    assert.equal(result.status, expected);
    assert.equal(result.readyForCopy, false);
  }
});

test('rechaza rutas externas, codificadas y traversal antes de leer archivos', () => {
  for (const value of ['../../.env', 'rund-documentos/../secret.pdf', 'rund-documentos/%2e%2e/secret.pdf',
    'C:/secret.pdf', 'https://host/file.pdf', 'rund-documentos/a\\b.pdf', '/etc/passwd', 'rund-documentos//x.pdf']) {
    assert.throws(() => resolveLocalDocument('LOCAL', value, { pta: '/uploads', auth: '/auth-uploads' }));
  }
});

test('conserva referencias históricas de los dos servicios dentro de su raíz', () => {
  const roots = { pta: path.resolve('tmp/pta-uploads'), auth: path.resolve('tmp/auth-uploads') };
  assert.equal(resolveLocalDocument('LEGACY_LOCAL', '/pta/api/v1/uploads/carpeta-digital/doc/RUND/file.pdf', roots).root, roots.pta);
  assert.equal(resolveLocalDocument('LEGACY_LOCAL', '/auth/api/v1/uploads/carpeta-digital/doc/file.pdf', roots).root, roots.auth);
});

test('rechaza enlaces que sacan al lector del directorio uploads', async t => {
  const { dir, roots, row } = await fixture(t);
  const outside = path.join(dir, 'outside');
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'file.pdf'), 'private');
  await fs.symlink(outside, path.join(roots.pta, 'rund-documentos/link'), 'junction');
  const result = await inspectDocument({ ...row, almacenamiento_ruta: 'rund-documentos/link/file.pdf' }, roots);
  assert.equal(result.status, 'OUTSIDE_UPLOADS');
  assert.equal(result.readyForCopy, false);
});

test('el resumen conserva todos los estados y cuenta rutas compartidas sin duplicarlas', () => {
  const docs = [{ provider: 'LOCAL', state: 'ACTIVO', status: 'VERIFIED', pathFingerprint: 'a', readyForCopy: true },
    { provider: 'LOCAL', state: 'REEMPLAZADO', status: 'VERIFIED', pathFingerprint: 'a', readyForCopy: true },
    { provider: 'LOCAL', state: 'ELIMINADO', status: 'VERIFIED', pathFingerprint: 'b', readyForCopy: false }];
  assert.equal(summarize(docs).total, 3);
  assert.equal(summarize(docs).readyForCopy, 2);
  assert.equal(summarize(docs).uniquePaths, 2);
});
