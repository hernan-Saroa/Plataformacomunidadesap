// Local PostgreSQL only; production tables are never modified.
// Runs the real migration and service against TEMP tables, then rolls back.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../backend/certification-service');
const env = require(path.join(root, 'node_modules/dotenv')).parse(fs.readFileSync(path.join(root, '.env')));
if (!['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST)) {
  throw new Error('Esta verificación solo admite PostgreSQL local.');
}
require(path.join(root, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(root, 'tsconfig.json') });
const { DataSource } = require(path.join(root, 'node_modules/typeorm'));
const { LaborFunctionProfile } = require(path.join(root, 'src/certificates/labor-function-profile.entity'));
const { LaborFunction } = require(path.join(root, 'src/certificates/labor-function.entity'));
const { LaborFunctionsService } = require(path.join(root, 'src/certificates/labor-functions.service'));

(async () => {
  const source = new DataSource({ type: 'postgres', host: env.DB_HOST, port: Number(env.DB_PORT || 5432),
    username: env.DB_USER, password: env.DB_PASS, database: env.DB_NAME, schema: 'pg_temp',
    entities: [LaborFunctionProfile, LaborFunction], synchronize: false, connectTimeoutMS: 5000 });
  await source.initialize();
  const runner = source.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const original = fs.readFileSync(path.resolve(__dirname, '../db/migrations/406_create_labor_functions_catalog.sql'), 'utf8');
    const tables = original.slice(original.indexOf('CREATE TABLE IF NOT EXISTS certification.labor_function_profiles'),
      original.indexOf('ALTER TABLE certification.certificates'))
      .replaceAll('CREATE TABLE IF NOT EXISTS certification.', 'CREATE TEMP TABLE ')
      .replaceAll('certification.', 'pg_temp.');
    await runner.query(tables);
    const [legacy] = await runner.query(`INSERT INTO pg_temp.labor_function_profiles
      (position_code, combined_code, match_key, position_name) VALUES ('2028', '202824', 'legacy', 'Cargo anterior') RETURNING id`);
    await runner.query('INSERT INTO pg_temp.labor_functions(profile_id, ordinal, description) VALUES ($1,1,$2)', [legacy.id, 'Funcion anterior conservada.']);
    const migration = fs.readFileSync(path.resolve(__dirname, '../db/migrations/664_labor_functions_by_identification.sql'), 'utf8')
      .replaceAll('certification.', 'pg_temp.').replace(/^BEGIN;|^COMMIT;/gm, '');
    await runner.query(migration);
    await runner.query(migration); // Reapplying the migration must be harmless.
    const profiles = runner.manager.getRepository(LaborFunctionProfile);
    const functions = runner.manager.getRepository(LaborFunction);
    const db = { transaction: async callback => {
      await runner.startTransaction();
      try { const result = await callback(runner.manager); await runner.commitTransaction(); return result; }
      catch (error) { await runner.rollbackTransaction(); throw error; }
    } };
    const service = new LaborFunctionsService(profiles, functions, {}, db, { isEnabled: () => false });
    assert.equal((await service.findOne(legacy.id)).needs_assignment, true);
    assert.equal((await service.resolveForRequest({ id_number: '12345678' })).available, false);
    const created = await service.create({ idNumber: '00.123.456-78', functions: '1. Aplicar el numeral 2. Revisar los expedientes.\n2. Presentar informes institucionales.' });
    assert.equal(created.id_number, '0012345678');
    assert.equal(created.function_count, 2);
    await assert.rejects(() => service.create({ idNumber: '0012345678', functions: 'Otra funcion institucional.' }), /ya tiene funciones/);
    await assert.rejects(() => service.update(legacy.id, { idNumber: '0012345678', functions: 'No debe reemplazar el original.' }), /ya tiene funciones/);
    assert.equal((await service.findOne(legacy.id)).functions[0].description, 'Funcion anterior conservada.');
    await service.update(legacy.id, { idNumber: '98765432', functions: 'Funciones asignadas manualmente.' });
    assert.equal((await service.resolveForRequest({ id_number: '98765432' })).count, 1);
    await service.update(created.id, { idNumber: '11223344', functions: 'Funcion nueva para la persona.' });
    assert.equal((await service.resolveForRequest({ id_number: '0012345678' })).available, false);
    assert.equal((await service.resolveForRequest({ id_number: '11223344' })).count, 1);
    const bulk = await service.bulk([{ idNumber: '22334455', functions: 'Primera funcion para importar.' },
      { idNumber: '22.334.455', functions: 'No sobrescribir esta identificacion.' }]);
    assert.deepEqual(bulk.summary, { total: 2, success: 1, failed: 1, created: 1, updated: 0 });
    // Exercise the unique index independently of application validation.
    await runner.startTransaction();
    await assert.rejects(() => profiles.save(profiles.create({ id_number: '11223344', match_key: 'different-key' })), error => error.code === '23505');
    await runner.rollbackTransaction();
    const selection = await service.listAllForSelection();
    const removed = await service.removeMany(selection.items.map(item => item.id));
    assert.equal(removed.deletedCount, 3);
    assert.equal(await functions.count(), 0); // FK cascade remains intact.
    console.log('PASS: migracion idempotente, legado conservado, CRUD, reasignacion, carga parcial, unicidad SQL y borrado en cascada; solo tablas TEMP.');
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await source.destroy();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
