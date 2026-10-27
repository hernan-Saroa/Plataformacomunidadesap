// Real PostgreSQL queries against synthetic TEMP tables. Always rolls back.
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { clientForLocal, serviceRoot } = require('./rund-documental/local-context.cjs');
require(path.join(serviceRoot, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(serviceRoot, 'tsconfig.json') });
const { BancoDocentesService } = require(path.join(serviceRoot, 'src/pta/banco-docentes/banco-docentes.service.ts'));
(async () => {
  const client = clientForLocal(); await client.connect();
  try {
    await client.query('BEGIN');
    const tables = [['academic_work_plan', 'Docente'], ['academic_work_plan', 'RundAprobacionLog'],
      ...['user', 'personas', 'role', 'user_roles', 'seccionales', 'sedes'].map(table => ['auth', table])];
    for (const [schema, table] of tables) await client.query(`CREATE TEMP TABLE "${table}" (LIKE ${schema}."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`);
    await client.query('ALTER TABLE pg_temp."Docente" ADD PRIMARY KEY (id)');
    await client.query(`CREATE UNIQUE INDEX fixture_unique ON pg_temp."Docente" ("personaId", COALESCE("periodoCarga",'')) WHERE "eliminadoRund"=false`);
    await client.query('CREATE TEMP TABLE pta_history (docente_id text REFERENCES pg_temp."Docente"(id)) ON COMMIT DROP');
    const fixture = async (schema, table, values) => {
      const cols = (await client.query(`SELECT column_name,data_type,character_maximum_length FROM information_schema.columns
        WHERE table_schema=$1 AND table_name=$2 AND is_nullable='NO' AND column_default IS NULL`, [schema, table])).rows;
      for (const col of cols) if (!(col.column_name in values)) values[col.column_name] = col.data_type === 'uuid' ? randomUUID()
        : /integer|numeric|bigint|double/.test(col.data_type) ? 0 : col.data_type === 'boolean' ? true
          : /date|timestamp/.test(col.data_type) ? new Date() : col.data_type === 'jsonb' ? {} : 'TEST'.slice(0, col.character_maximum_length || 4);
      await client.query(`INSERT INTO pg_temp."${table}" (${Object.keys(values).map(k => `"${k}"`).join(',')})
        VALUES (${Object.keys(values).map((_, i) => `$${i + 1}`).join(',')})`, Object.values(values));
    };
    const role = randomUUID(), actor = randomUUID(), ids = [], people = [];
    await fixture('auth', 'role', { id: role, code: 'DOCENTE', name: 'Docente', is_active: true });
    for (let i = 0; i < 53; i++) {
      const person = randomUUID(), user = randomUUID(), id = randomUUID(); ids.push(id); people.push(person);
      await fixture('auth', 'personas', { id_person: person, nom_largo: `Persona ficticia ${i}`, num_identificacion: `TEST-DELETE-${i}` });
      await fixture('auth', 'user', { id_user: user, id_person: person, username: `delete-${i}@example.invalid`, is_active: true });
      await fixture('auth', 'user_roles', { id_user: user, id_rol: role, is_active: true });
      await fixture('academic_work_plan', 'Docente', { id, personaId: person, periodoCarga: '2026-2', estado: 'ACTIVO', dedicacion: 'TC', horasAsignables: 800 });
    }
    const otherPeriod = randomUUID();
    await fixture('academic_work_plan', 'Docente', { id: otherPeriod, personaId: people[0], periodoCarga: '2025-2', estado: 'ACTIVO', dedicacion: 'TC', horasAsignables: 700 });
    await client.query('INSERT INTO pg_temp.pta_history VALUES ($1)', [ids[0]]);
    const service = Object.create(BancoDocentesService.prototype);
    let failAudit = false;
    const query = async (sql, args) => {
      if (failAudit && sql.includes('INSERT INTO academic_work_plan."RundAprobacionLog"')) throw Error('Synthetic audit failure');
      return (await client.query(sql.replaceAll('academic_work_plan.', 'pg_temp.').replaceAll('auth.', 'pg_temp.'), args)).rows;
    };
    service.dataSource = { query, transaction: async fn => {
      await client.query('SAVEPOINT delete_fixture');
      try { const result = await fn({ query }); await client.query('RELEASE SAVEPOINT delete_fixture'); return result; }
      catch (error) { await client.query('ROLLBACK TO SAVEPOINT delete_fixture'); await client.query('RELEASE SAVEPOINT delete_fixture'); throw error; }
    } };
    const confirm = preview => service.eliminarRegistros({ ...preview, confirmado: true, motivo: 'Registro sintético para verificar eliminación' }, actor, '127.0.0.1');
    assert.equal((await service.list({ periodoCarga: '2026-2', limit: 50 })).data.length, 50);
    const full = await service.previewRegistroDeletion({ todosFiltrados: true, filters: { periodoCarga: '2026-2' } });
    assert.equal(full.total, 53, 'Select-all must include more than the first page');
    assert(!full.ids.includes(otherPeriod));
    const excluded = await service.previewRegistroDeletion({ todosFiltrados: true, filters: { periodoCarga: '2026-2' }, excluirIds: [ids[0]] });
    assert.equal(excluded.total, 52); assert(!excluded.ids.includes(ids[0]));
    const single = await service.previewRegistroDeletion({ ids: [ids[0]] });
    failAudit = true;
    await assert.rejects(() => confirm(single), /Synthetic audit failure/);
    failAudit = false;
    assert.equal((await service.list({ periodoCarga: '2026-2' })).total, 53, 'Audit failure must roll back deletion');
    await client.query('UPDATE pg_temp."Docente" SET "updatedAt"="updatedAt"+INTERVAL \'1 second\' WHERE id=$1', [ids[1]]);
    await assert.rejects(() => confirm(full), /selecci/);
    assert.equal((await service.list({ periodoCarga: '2026-2' })).total, 53, 'A stale selection cannot be partially removed');
    assert.equal((await confirm(single)).eliminados, 1);
    await assert.rejects(() => confirm(single), /selecci/);
    assert.equal((await service.getStats({ periodoCarga: '2026-2' })).total, 52);
    assert.equal((await service.list({ periodoCarga: '2025-2' })).total, 1);
    assert.equal((await client.query('SELECT * FROM pg_temp.pta_history')).rows[0].docente_id, ids[0]);
    assert.equal((await client.query('SELECT count(*)::int n FROM pg_temp.personas')).rows[0].n, 53);
    assert.equal((await client.query('SELECT count(*)::int n FROM pg_temp."user" WHERE is_active=true')).rows[0].n, 53);
    const remaining = await service.previewRegistroDeletion({ todosFiltrados: true, filters: { periodoCarga: '2026-2' } });
    assert.equal((await confirm(remaining)).eliminados, 52);
    assert.equal((await service.list({ periodoCarga: '2026-2' })).total, 0);
    assert.equal((await service.getStats({ periodoCarga: '2026-2' })).total, 0);
    assert.equal((await service.list({})).total, 1, 'Removed records cannot reappear as auth-only teachers');
    const audit = (await client.query('SELECT * FROM pg_temp."RundAprobacionLog" WHERE accion=\'ELIMINAR_REGISTRO\'')).rows;
    assert.equal(audit.length, 53); assert(audit.every(row => row.actor_id === actor && row.metadata.periodoCarga === '2026-2'));
    assert.equal(new Set(audit.map(row => row.metadata.operacionId)).size, 2);
    // Re-registering does not reuse the deleted profile or its approved evidence.
    const fresh = randomUUID();
    await fixture('academic_work_plan', 'Docente', { id: fresh, personaId: people[0], periodoCarga: '2026-2', estado: 'ACTIVO', dedicacion: 'TC', horasAsignables: 800 });
    assert.equal((await service.list({ periodoCarga: '2026-2' })).data[0].id, fresh);
    assert.equal((await client.query('SELECT count(*)::int n FROM pg_temp."Docente"')).rows[0].n, 55);
    console.log('RUND eliminación: individual, 53 registros entre páginas, exclusiones, aislamiento por periodo, estadísticas, auditoría atómica, selección obsoleta, Personas y PTA preservados, nuevo registro independiente. Solo TEMP + ROLLBACK.');
  } finally { await client.query('ROLLBACK'); await client.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
