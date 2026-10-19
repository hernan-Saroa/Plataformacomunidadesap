/* Migración 672 (regla de cédula de perfiles docentes en Auth) con PostgreSQL real en un clúster temporal.
 * Parte del estado anterior (663, que valida la sugerencia solo en academic_work_plan), confirma el defecto y aplica la 672.
 * Solo datos ficticios; no lee .env ni se conecta a una base existente.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const { Client } = require(path.join(root, 'backend/rund-service/node_modules/pg'));
const pgBin = process.env.PG_BIN_DIR || ['C:/Program Files/PostgreSQL/18/bin', 'C:/Program Files/PostgreSQL/15/bin'].find(dir => fs.existsSync(dir));
const bin = name => path.join(pgBin, name + (process.platform === 'win32' ? '.exe' : ''));
const run = (exe, args) => { const r = spawnSync(bin(exe), args, { stdio: 'ignore', windowsHide: true }); assert.equal(r.status, 0, `${exe} falló`); };
const sql = file => fs.readFileSync(path.join(root, 'db/migrations', file), 'utf8');
let count = 0;
const check = async (name, fn) => { await fn(); count++; console.log('OK  ' + name); };

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-doc-'));
  const port = 55000 + Math.floor(Math.random() * 900);
  run('initdb', ['-D', dir, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8']);
  run('pg_ctl', ['-D', dir, '-o', `-p ${port} -c listen_addresses=127.0.0.1`, '-l', path.join(dir, 'log.txt'), '-w', 'start']);
  const db = new Client({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres' });
  await db.connect();
  const tables = schema => `CREATE SCHEMA IF NOT EXISTS ${schema};
    CREATE TABLE ${schema}."Docente"(id text PRIMARY KEY, "personaId" uuid);
    CREATE TABLE ${schema}."RundDocumentoPerfil"(id uuid PRIMARY KEY, estado text);
    CREATE TABLE ${schema}."RundExtraccionTrabajo"(id uuid PRIMARY KEY, documento_id uuid, docente_id text, estado text);
    CREATE TABLE ${schema}."RundExtraccionSugerencia"(id uuid PRIMARY KEY, trabajo_id uuid, campo text, valor text, estado text);`;
  const attempt = async (statements, setup = []) => {
    await db.query('BEGIN');
    try {
      for (const [text, params] of setup) await db.query(text, params);
      for (const [text, params] of statements) await db.query(text, params);
      await db.query('ROLLBACK'); return { ok: true };
    } catch (error) { await db.query('ROLLBACK'); return { ok: false, error }; }
  };
  const guc = (name, value) => [`SELECT set_config('${name}', $1, true)`, [value]];
  const update = (persona, value) => [`UPDATE auth.personas SET num_identificacion=$2 WHERE id_person=$1`, [persona, value]];
  const blocked = result => { assert.equal(result.ok, false); assert.match(result.error.message, /REQ-RUND-F001/); };

  try {
    await db.query(`CREATE SCHEMA auth; CREATE TABLE auth.personas(id_person uuid PRIMARY KEY, num_identificacion text, nom_largo text);`);
    await db.query(tables('academic_work_plan') + tables('rund'));
    await db.query(sql('663_rund_ocr_document_number_correction.sql'));
    await db.query(`CREATE TRIGGER trg_auth_personas_rund_document_immutable BEFORE UPDATE OF num_identificacion ON auth.personas
      FOR EACH ROW EXECUTE FUNCTION academic_work_plan.prevent_rund_document_change();`);

    // Personas y perfiles ficticios. A: perfil en rund. B: perfil solo en PTA. C: sin perfil. D: sin cédula previa.
    const P = { a: randomUUID(), b: randomUUID(), c: randomUUID(), d: randomUUID(), e: randomUUID() };
    await db.query(`INSERT INTO auth.personas VALUES ($1,'1000000001','A'),($2,'2000000002','B'),($3,'3000000003','C'),($4,NULL,'D'),($5,'5.000.000.005','E')`, [P.a, P.b, P.c, P.d, P.e]);
    await db.query(`INSERT INTO rund."Docente" VALUES ('rd-a',$1)`, [P.a]);
    await db.query(`INSERT INTO academic_work_plan."Docente" VALUES ('pd-a',$1),('pd-b',$2)`, [P.a, P.b]);
    await db.query(`INSERT INTO rund."Docente" VALUES ('rd-e',$1)`, [P.e]);
    const ids = () => ({ doc: randomUUID(), job: randomUUID(), sug: randomUUID() });
    const suggestion = (schema, docente, persona, { valor = '1000000009', estado = 'PENDIENTE', campo = 'documentNumber', jobEstado = 'COMPLETADO', docEstado = 'ACTIVO' } = {}) => {
      const i = ids();
      return { id: i.sug, setup: [
        [`INSERT INTO ${schema}."RundDocumentoPerfil" VALUES ($1,$2)`, [i.doc, docEstado]],
        [`INSERT INTO ${schema}."RundExtraccionTrabajo" VALUES ($1,$2,$3,$4)`, [i.job, i.doc, docente, jobEstado]],
        [`INSERT INTO ${schema}."RundExtraccionSugerencia" VALUES ($1,$2,$3,$4,$5)`, [i.sug, i.job, campo, valor, estado]],
      ] };
    };

    await check('estado anterior (663): una sugerencia que vive solo en rund es rechazada — el defecto', async () => {
      const s = suggestion('rund', 'rd-a', P.a);
      blocked(await attempt([guc('app.rund_ocr_suggestion_id', s.id), update(P.a, '1000000009')], s.setup));
    });

    await db.query(sql('672_auth_rund_documento_correccion.sql'));

    await check('672 es idempotente: se puede aplicar de nuevo sin error', async () => { await db.query(sql('672_auth_rund_documento_correccion.sql')); });

    await check('el trigger de auth.personas usa ahora la función de Auth', async () => {
      const r = await db.query(`SELECT p.pronamespace::regnamespace::text AS esquema FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
        WHERE t.tgname='trg_auth_personas_rund_document_immutable' AND NOT t.tgisinternal`);
      assert.deepEqual(r.rows, [{ esquema: 'auth' }]);
    });

    await check('ruta heredada: la sugerencia pendiente que vive en rund autoriza el cambio (defecto corregido)', async () => {
      const s = suggestion('rund', 'rd-a', P.a);
      assert.equal((await attempt([guc('app.rund_ocr_suggestion_id', s.id), update(P.a, '1000000009')], s.setup)).ok, true);
    });

    await check('ruta heredada: la sugerencia en el esquema de PTA (RUND embebido) sigue autorizando', async () => {
      const s = suggestion('academic_work_plan', 'pd-b', P.b, { valor: '2000000009' });
      assert.equal((await attempt([guc('app.rund_ocr_suggestion_id', s.id), update(P.b, '2000000009')], s.setup)).ok, true);
    });

    await check('ruta heredada: el valor se compara sin puntos ni mayúsculas', async () => {
      const s = suggestion('rund', 'rd-a', P.a, { valor: ' 1.000.000.009 ' });
      assert.equal((await attempt([guc('app.rund_ocr_suggestion_id', s.id), update(P.a, '1000000009')], s.setup)).ok, true);
    });

    await check('ruta heredada: se rechaza si la sugerencia no es vigente, otra persona, otro valor o otro campo', async () => {
      for (const [opts, persona, nuevo] of [
        [{ estado: 'CONFIRMADA' }, P.a, '1000000009'], [{ jobEstado: 'ERROR' }, P.a, '1000000009'], [{ docEstado: 'REEMPLAZADO' }, P.a, '1000000009'],
        [{ campo: 'genero' }, P.a, '1000000009'], [{}, P.a, '1000000099'], [{}, P.b, '1000000009'],
      ]) {
        const s = suggestion('rund', 'rd-a', P.a, opts);
        blocked(await attempt([guc('app.rund_ocr_suggestion_id', s.id), update(persona, nuevo)], s.setup));
      }
    });

    await check('sin autorización, el cambio de cédula de un perfil docente se rechaza (rund o PTA)', async () => {
      blocked(await attempt([update(P.a, '1000000010')])); blocked(await attempt([update(P.b, '2000000010')]));
      blocked(await attempt([guc('app.rund_ocr_suggestion_id', randomUUID()), update(P.a, '1000000010')]));
      blocked(await attempt([guc('app.rund_identity_correction_id', randomUUID()), update(P.a, '1000000010')]));
    });

    await check('personas sin perfil, sin cédula previa o con un cambio solo de formato no quedan restringidas', async () => {
      assert.equal((await attempt([update(P.c, '3000000010')])).ok, true);
      assert.equal((await attempt([update(P.d, '4000000004')])).ok, true);
      assert.equal((await attempt([update(P.e, '5000000005')])).ok, true);
      assert.equal((await attempt([update(P.a, '1.000.000.001')])).ok, true);
    });

    const correction = (persona, previo, nuevo, extra = {}) => {
      const id = extra.id || randomUUID();
      return { id, insert: [`INSERT INTO auth.rund_identidad_correccion(operacion_id,persona_id,campo,valor_previo,valor_nuevo,huella,actor_id)
        VALUES ($1,$2,$3,$4,$5,repeat('a',64),'actor-1')`, [id, persona, extra.campo || 'documentNumber', previo, nuevo]] };
    };

    await check('corrección propia de Auth: autoriza aplicar el cambio y también restaurarlo (compensación)', async () => {
      const c = correction(P.a, '1000000001', '1000000020');
      assert.equal((await attempt([guc('app.rund_identity_correction_id', c.id), update(P.a, '1000000020'), update(P.a, '1000000001')], [c.insert])).ok, true);
    });

    await check('corrección propia: restaurar una cédula previa nula (regularización) también queda autorizado', async () => {
      const c = correction(P.a, null, '1000000001');
      assert.equal((await attempt([guc('app.rund_identity_correction_id', c.id), update(P.a, null)], [c.insert])).ok, true);
      blocked(await attempt([update(P.a, null)], [c.insert]));
    });

    await check('corrección propia: se rechaza con otra persona, otro valor, otro campo, sin GUC o con la corrección ya compensada', async () => {
      const c = correction(P.a, '1000000001', '1000000020');
      blocked(await attempt([guc('app.rund_identity_correction_id', c.id), update(P.a, '1000000021')], [c.insert]));
      blocked(await attempt([update(P.a, '1000000020')], [c.insert]));
      const other = correction(P.a, '1000000001', '1000000020');
      blocked(await attempt([guc('app.rund_identity_correction_id', other.id), update(P.b, '1000000020')], [other.insert]));
      const campo = correction(P.a, '1000000001', '1000000020', { campo: 'genero' });
      blocked(await attempt([guc('app.rund_identity_correction_id', campo.id), update(P.a, '1000000020')], [campo.insert]));
      const done = correction(P.a, '1000000001', '1000000020');
      blocked(await attempt([guc('app.rund_identity_correction_id', done.id), update(P.a, '1000000020')],
        [done.insert, [`UPDATE auth.rund_identidad_correccion SET estado='COMPENSADA', compensada_en=now() WHERE operacion_id=$1`, [done.id]]]));
    });

    await check('registro de correcciones: inmutable salvo APLICADA → COMPENSADA, sin borrados y con restricciones de forma', async () => {
      const c = correction(P.a, '1000000001', '1000000020');
      await db.query(...c.insert);
      const fail = async (text, params, pattern) => assert.match((await attempt([[text, params]])).error?.message ?? '', pattern);
      await fail('DELETE FROM auth.rund_identidad_correccion WHERE operacion_id=$1', [c.id], /No se puede eliminar/);
      await fail(`UPDATE auth.rund_identidad_correccion SET valor_nuevo='x' WHERE operacion_id=$1`, [c.id], /Transición .* inválida/);
      await fail(`UPDATE auth.rund_identidad_correccion SET estado='COMPENSADA' WHERE operacion_id=$1`, [c.id], /check|Transición/i);
      assert.equal((await attempt([[`UPDATE auth.rund_identidad_correccion SET estado='COMPENSADA', compensada_en=now() WHERE operacion_id=$1`, [c.id]]])).ok, true);
      await fail(`INSERT INTO auth.rund_identidad_correccion(operacion_id,persona_id,campo,valor_nuevo,huella,actor_id) VALUES ($1,$2,'otro','x',repeat('a',64),'a')`, [randomUUID(), P.a], /check/i);
      await fail(`INSERT INTO auth.rund_identidad_correccion(operacion_id,persona_id,campo,valor_nuevo,huella,actor_id) VALUES ($1,$2,'genero','x','corta','a')`, [randomUUID(), P.a], /check|varying|value too long/i);
      await db.query('DELETE FROM auth.rund_identidad_correccion', []).then(() => assert.fail('no debía borrar'), error => assert.match(error.message, /No se puede eliminar/));
    });

    await check('la regla no depende de que existan las tablas de otro esquema (solo rund, o ninguno)', async () => {
      await db.query('DROP SCHEMA academic_work_plan CASCADE');
      blocked(await attempt([update(P.a, '1000000010')]));
      const s = suggestion('rund', 'rd-a', P.a);
      assert.equal((await attempt([guc('app.rund_ocr_suggestion_id', s.id), update(P.a, '1000000009')], s.setup)).ok, true);
      assert.equal((await attempt([update(P.c, '3000000011')])).ok, true);
      await db.query('DROP SCHEMA rund CASCADE');
      assert.equal((await attempt([update(P.a, '1000000012')])).ok, true); // sin esquemas de perfiles no hay perfil que proteger
    });
  } finally {
    await db.end().catch(() => undefined);
    spawnSync(bin('pg_ctl'), ['-D', dir, '-m', 'immediate', '-w', 'stop'], { stdio: 'ignore', windowsHide: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(`\n${count} comprobaciones correctas`);
})().catch(error => { console.error(error); process.exit(1); });
