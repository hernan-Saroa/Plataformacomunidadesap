const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db'
  });
  
  await client.connect();
  try {
    const res = await client.query(`
      SELECT r.id, r.code, r.name 
      FROM auth.user_roles ur
      JOIN auth.role r ON ur.id_rol = r.id
      WHERE ur.id_user = '770e8400-e29b-41d4-a716-446655440001'
    `);
    console.log('Roles for superuser:', res.rows);

    const res2 = await client.query(`
      SELECT COUNT(*) as perm_count FROM auth.permission
    `);
    console.log('Total Permissions in DB:', res2.rows[0].perm_count);

    // Let's grant all permissions to the first role found (or insert a SUPER_ADMIN role if none)
    if (res.rows.length > 0) {
      const roleId = res.rows[0].id;
      const grantRes = await client.query(`
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
        SELECT $1, id_permission, true FROM auth.permission
        ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true
      `, [roleId]);
      console.log('Granted all permissions to role:', res.rows[0].code, 'rowCount:', grantRes.rowCount);
    } else {
      console.log('User has no roles!');
      // Insert SUPER_ADMIN role
      const resRole = await client.query(`
        INSERT INTO auth.role (code, name, is_active) 
        VALUES ('SUPER_ADMIN', 'Super Administrator', true) 
        ON CONFLICT (code) DO UPDATE SET is_active = true
        RETURNING id
      `);
      const roleId = resRole.rows[0].id;
      
      await client.query(`
        INSERT INTO auth.user_roles (id_user, id_rol, is_active)
        VALUES ('770e8400-e29b-41d4-a716-446655440001', $1, true)
        ON CONFLICT DO NOTHING
      `, [roleId]);

      const grantRes = await client.query(`
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
        SELECT $1, id_permission, true FROM auth.permission
        ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true
      `, [roleId]);
      console.log('Created SUPER_ADMIN and granted all permissions, rowCount:', grantRes.rowCount);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
