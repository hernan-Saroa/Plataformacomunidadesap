const { Client } = require('pg');

async function check() {
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
      SELECT r.code as role, p.code as permission, rp.is_active
      FROM auth.role_permissions rp
      JOIN auth.role r ON rp.id_rol = r.id
      JOIN auth.permission p ON rp.id_permission = p.id_permission
      WHERE r.code = 'JEFE_OCI' 
      AND p.code LIKE 'control-interno%'
      LIMIT 10;
    `);
    console.log(res.rows);
    
    // Check if user has roles
    const userRes = await client.query(`
      SELECT email FROM auth."user" WHERE email = 'jefe.oci@esap.edu.co'
    `);
    console.log('User found:', userRes.rows.length);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
