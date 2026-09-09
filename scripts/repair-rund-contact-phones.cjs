// Restore only phone values matching the old import transformation exactly.
// Default: dry run and rollback. No personal contact values are printed.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { config } = require('./audit-rund-excel.cjs');
const root = path.resolve(__dirname, '../backend/academic-work-plan-service');
require(path.join(root, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(root, 'tsconfig.json') });
const { recoverOriginalRundPhone, normalizeRundPhones } = require(path.join(root, 'src/pta/banco-docentes/rund-phones.ts'));

async function main() {
  const apply = process.argv.includes('--apply');
  assert(process.argv.slice(2).every(arg => arg === '--apply'), 'Uso: node scripts/repair-rund-contact-phones.cjs [--apply]');
  assert(['localhost', '127.0.0.1', '::1'].includes(config.host), 'Solo PostgreSQL local.');
  const client = new Client(config);
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query(fs.readFileSync(path.resolve(__dirname, '../db/migrations/431_rund_multiple_contact_phones.sql'), 'utf8'));
    const rows = (await client.query(`SELECT d.id, d."personaId", d."datosCargaMasiva"->>'TELEFONO' AS original, p.tel_celular AS saved
      FROM academic_work_plan."Docente" d JOIN auth.personas p ON p.id_person::text = d."personaId"::text
      WHERE d."datosCargaMasiva"->>'TELEFONO' IS NOT NULL FOR UPDATE OF p`)).rows;
    const groups = new Map();
    rows.forEach(row => groups.set(row.personaId, [...(groups.get(row.personaId) || []), row]));
    const result = { mode: apply ? 'APLICADO' : 'SIMULACION_REVERTIDA', personasCorregidas: 0, perfilesAuditados: 0, ambiguosOEditados: 0, originalesInvalidos: 0 };
    for (const profiles of groups.values()) {
      const proposals = profiles.map(row => recoverOriginalRundPhone(row.saved, row.original)).filter(Boolean);
      if (!proposals.length) {
        if (profiles.some(row => normalizeRundPhones(row.original) === null)) result.originalesInvalidos++;
        continue;
      }
      const choices = new Set(proposals);
      // Different originals across periods may represent a deliberate contact change.
      const originals = new Set(profiles.map(row => normalizeRundPhones(row.original)).filter(Boolean));
      if (choices.size !== 1 || originals.size !== 1) { result.ambiguosOEditados++; continue; }
      const phone = proposals[0];
      const first = profiles[0];
      const updated = await client.query('UPDATE auth.personas SET tel_celular = $2 WHERE id_person::text = $1 AND tel_celular IS NOT DISTINCT FROM $3', [first.personaId, phone, first.saved]);
      assert.equal(updated.rowCount, 1);
      result.personasCorregidas++;
      for (const profile of profiles) {
        await client.query(`INSERT INTO academic_work_plan."RundAprobacionLog"
          (id, docente_id, bloque, accion, actor_id, canal_origen, campo_afectado, dato_previo, dato_nuevo, observacion, metadata)
          VALUES ($1,$2,'CONTACTO','RECUPERAR_TELEFONOS','SISTEMA','MASIVO','TELEFONO',$3,$4,$5,$6::jsonb)`,
          [randomUUID(), profile.id, profile.saved, phone, 'Restauración de separadores y números conservados en el archivo original; coincidencia exacta con la transformación antigua.', JSON.stringify({ origen: 'datosCargaMasiva.TELEFONO', correccionFormato: true })]);
        result.perfilesAuditados++;
      }
      assert.equal(recoverOriginalRundPhone(phone, first.original), null, 'La recuperación debe ser idempotente.');
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
