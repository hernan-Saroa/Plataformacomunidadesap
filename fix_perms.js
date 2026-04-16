const { Client } = require('pg');

async function fix() {
  const client = new Client({
    host: 'host.docker.internal',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db'
  });

  await client.connect();
  
  try {
    const res = await client.query(`
      INSERT INTO auth.role_permissions (id_rol, id_permission, is_active) 
      SELECT r.id, p.id_permission, true 
      FROM auth.role r 
      CROSS JOIN auth.permission p 
      WHERE r.code = 'JEFE_OCI' 
      AND p.code LIKE 'control-interno%' 
      ON CONFLICT DO NOTHING;
    `);
    console.log('Fixed permissions:', res.rowCount);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fix();
