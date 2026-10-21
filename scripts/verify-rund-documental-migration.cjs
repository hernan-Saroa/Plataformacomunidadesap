// Sin flags: ensayo en tabla temporal. --apply-local: únicamente las 3 categorías.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { root, clientForLocal, reportError } = require('./rund-documental/local-context.cjs');
const expected = ['ACTOS_ADMINISTRATIVOS', 'EVALUACIONES', 'EXPERIENCIA'];

async function verify(client, apply) {
  const source = fs.readFileSync(path.join(root, 'db/migrations/665_rund_categorias_expediente.sql'), 'utf8');
  const sql = source.replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, '');
  // Evita que modificaciones futuras conviertan este verificador en un ejecutor genérico.
  const withoutComments = sql.replace(/--[^\n]*/g, '');
  assert(!/\b(UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|BEGIN|COMMIT|ROLLBACK)\b/i.test(withoutComments));
  assert.match(withoutComments, /^\s*INSERT INTO academic_work_plan\."RundDocumentoCategoria"/);
  assert.equal((withoutComments.match(/;/g) || []).length, 1);
  assert.match(withoutComments, /ON CONFLICT \(codigo\) DO NOTHING;\s*$/);
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    // Bloqueo solo si se pidió aplicar; evita cambios concurrentes del catálogo.
    if (apply) await client.query('LOCK TABLE academic_work_plan."RundDocumentoCategoria" IN SHARE ROW EXCLUSIVE MODE');
    if (apply) {
      const triggers = (await client.query(`SELECT count(*)::int AS total FROM pg_trigger
        WHERE tgrelid = 'academic_work_plan."RundDocumentoCategoria"'::regclass AND NOT tgisinternal`)).rows[0].total;
      assert.equal(triggers, 0, 'Unexpected category triggers require review');
    }
    const documentFingerprint = async () => (await client.query(`SELECT count(*)::int AS total,
      md5(COALESCE(string_agg(md5(row_to_json(d)::text), '' ORDER BY id), '')) AS fingerprint
      FROM academic_work_plan."RundDocumentoPerfil" d`)).rows[0];
    const documentsBefore = await documentFingerprint();
    const original = (await client.query('SELECT * FROM academic_work_plan."RundDocumentoCategoria" ORDER BY codigo')).rows;
    if (!apply) {
      await client.query('CREATE TEMP TABLE "RundDocumentoCategoria" (LIKE academic_work_plan."RundDocumentoCategoria" INCLUDING ALL) ON COMMIT DROP');
      await client.query('INSERT INTO pg_temp."RundDocumentoCategoria" SELECT * FROM academic_work_plan."RundDocumentoCategoria"');
    }
    const target = apply ? 'academic_work_plan."RundDocumentoCategoria"' : 'pg_temp."RundDocumentoCategoria"';
    const statement = sql.replaceAll('academic_work_plan."RundDocumentoCategoria"', target);
    await client.query(statement);
    const first = (await client.query(`SELECT * FROM ${target} ORDER BY codigo`)).rows;
    for (const row of original) assert.deepEqual(first.find(item => item.codigo === row.codigo), row, 'Existing category changed');
    for (const code of expected) assert(first.some(row => row.codigo === code), 'Expected category missing');
    assert(first.filter(row => !original.some(old => old.codigo === row.codigo)).every(row => expected.includes(row.codigo)));
    await client.query(statement);
    assert.deepEqual((await client.query(`SELECT * FROM ${target} ORDER BY codigo`)).rows, first, 'Migration is not idempotent');
    assert.deepEqual(await documentFingerprint(), documentsBefore, 'Document metadata changed during verification');
    const result = { ok: true, mode: apply ? 'APPLIED_LOCAL' : 'TEMP_TABLE_REHEARSAL',
      migration: '665_rund_categorias_expediente.sql', sha256: createHash('sha256').update(source).digest('hex'),
      previousCategories: original.length, resultingCategories: first.length,
      added: first.filter(row => !original.some(old => old.codigo === row.codigo)).map(row => row.codigo),
      existingCategoriesUnchanged: true, documentMetadataUnchanged: true, idempotent: true };
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}

if (require.main === module) {
  (async () => {
    assert(process.argv.slice(2).every(arg => arg === '--apply-local'), 'Unsupported option');
    const client = clientForLocal();
    try { await client.connect(); console.log(JSON.stringify(await verify(client, process.argv.includes('--apply-local')), null, 2)); }
    finally { await client.end(); }
  })().catch(reportError);
}
module.exports = { verify };
