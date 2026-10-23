// Verifica SQL y migración con datos ficticios en tablas TEMP de PostgreSQL local.
// Reutiliza exclusivamente la configuración de desarrollo local ya validada.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { clientForLocal, reportError } = require('./rund-documental/local-context.cjs');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'backend/chatbot-service/db/migrations/003_secure_conversation_ownership.sql'), 'utf8')
  .replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, '')
  .replace(/\bchatbot\.(?=conversacion\b)/g, 'pg_temp.').replaceAll('auth.', 'pg_temp.');
const guardSource = fs.readFileSync(path.join(root, 'backend/chatbot-service/src/auth/chatbot-auth.guard.ts'), 'utf8');
const authQuery = guardSource.match(/dataSource\.query\(\s*`([\s\S]*?)`/)[1].replaceAll('auth.', 'pg_temp.');
const permission = 'chatbot.conversaciones.read_all';
const publicSource = fs.readFileSync(path.join(root, 'backend/chatbot-service/src/modules/chat/public-chat.service.ts'), 'utf8');
const availabilityQuery = publicSource.match(/dataSource\.query\('([^']+)'/)[1].replaceAll('auth.', 'pg_temp.');

(async () => {
  const client = clientForLocal();
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TEMP TABLE "user" (id_user uuid PRIMARY KEY, id_person uuid, username text, is_active boolean);
      CREATE TEMP TABLE personas (id_person uuid PRIMARY KEY, dir_email text, nom_largo text);
      CREATE TEMP TABLE role (id uuid PRIMARY KEY, code text, is_active boolean);
      CREATE TEMP TABLE user_roles (id_user uuid, id_rol uuid, is_active boolean);
      CREATE TEMP TABLE module (id_module uuid PRIMARY KEY, code text, is_active boolean DEFAULT true);
      CREATE TEMP TABLE permission (id_permission uuid PRIMARY KEY, code text UNIQUE, name text,
        description text, id_module uuid, is_active boolean, created_at timestamptz, updated_at timestamptz);
      CREATE TEMP TABLE role_permissions (id_rol uuid, id_permission uuid, is_active boolean,
        created_at timestamptz, updated_at timestamptz, PRIMARY KEY (id_rol, id_permission));
      CREATE TEMP TABLE conversacion (id uuid PRIMARY KEY, usuario_id uuid, usuario_email text,
        updated_at timestamptz DEFAULT now(), is_activo boolean DEFAULT true);
    `);
    const user = randomUUID(), person = randomUUID(), superRole = randomUUID(), ordinaryRole = randomUUID(), legacy = randomUUID();
    await client.query('INSERT INTO pg_temp.personas VALUES ($1, $2, $3)', [person, 'synthetic@example.invalid', 'Persona ficticia']);
    await client.query('INSERT INTO pg_temp."user" VALUES ($1, $2, $3, true)', [user, person, 'synthetic']);
    await client.query('INSERT INTO pg_temp.role VALUES ($1, $2, true), ($3, $4, true)', [superRole, 'SUPER_ADMIN', ordinaryRole, 'ADMIN']);
    await client.query('INSERT INTO pg_temp.user_roles VALUES ($1, $2, true)', [user, superRole]);
    await client.query('INSERT INTO pg_temp.module (id_module, code) VALUES ($1, $2)', [randomUUID(), 'chatbot']);
    assert.deepEqual((await client.query(availabilityQuery, ['chatbot'])).rows, [{ is_active: true }]);
    await client.query('UPDATE pg_temp.module SET is_active=false');
    assert.deepEqual((await client.query(availabilityQuery, ['chatbot'])).rows, [{ is_active: false }]);
    assert.deepEqual((await client.query(availabilityQuery, ['missing'])).rows, []);
    await client.query('UPDATE pg_temp.module SET is_active=true');
    await client.query('INSERT INTO pg_temp.conversacion (id,usuario_id,usuario_email) VALUES ($1,$2,$3)', [legacy, user, 'synthetic@example.invalid']);

    await client.query(migration);
    await client.query(migration);
    assert.equal((await client.query('SELECT * FROM pg_temp.permission')).rows.length, 1);
    const grants = (await client.query('SELECT * FROM pg_temp.role_permissions')).rows;
    assert.equal(grants.length, 1); assert.equal(grants[0].id_rol, superRole);
    assert.equal((await client.query('SELECT propietario_usuario_id FROM pg_temp.conversacion WHERE id=$1', [legacy])).rows[0].propietario_usuario_id, null);

    const resolveActor = async () => (await client.query(authQuery, [user, permission])).rows[0];
    assert.deepEqual(await resolveActor(), { userId: user, email: 'synthetic@example.invalid', name: 'Persona ficticia', canReadAll: true });
    for (const table of ['role_permissions', 'permission', 'role', 'user_roles']) {
      await client.query(`UPDATE pg_temp.${table} SET is_active=false`);
      assert.equal((await resolveActor()).canReadAll, false, `${table} inactivo debe retirar lectura global`);
      if (table === 'role_permissions') {
        await client.query(migration);
        assert.equal((await resolveActor()).canReadAll, false, 'Reejecutar migración no debe reactivar permisos retirados');
      }
      await client.query(`UPDATE pg_temp.${table} SET is_active=true`);
    }
    await client.query('UPDATE pg_temp."user" SET is_active=false');
    assert.equal(await resolveActor(), undefined);
    await client.query('UPDATE pg_temp."user" SET is_active=true');

    const owned = randomUUID();
    await client.query('INSERT INTO pg_temp.conversacion (id,propietario_usuario_id) VALUES ($1,$2)', [owned, user]);
    const own = await client.query('SELECT id FROM pg_temp.conversacion WHERE is_activo=true AND propietario_usuario_id=$1 ORDER BY updated_at DESC', [user]);
    assert.deepEqual(own.rows.map((row) => row.id), [owned]);
    console.log('PASS: disponibilidad del módulo, migración idempotente, historial legacy conservado, permiso exclusivo, revocaciones vigentes e identidad canónica verificados con PostgreSQL y tablas TEMP.');
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
})().catch(reportError);
