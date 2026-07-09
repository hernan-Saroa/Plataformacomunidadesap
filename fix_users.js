const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function fixSuperUser() {
  const client = new Client({
    host: 'localhost',
    port: 8080,
    user: 'postgres',
    password: 'password',
    database: 'esap_db',
  });

  await client.connect();
  console.log('Connected to DB');

  // Generate new hash for Esap2026*
  const password = await bcrypt.hash('Esap2026*', 10);
  console.log('New hash:', password);

  // Update superuser password
  const result = await client.query(
    `UPDATE auth."user" SET password_hash = $1 WHERE username = 'superuser@esap.edu.co' RETURNING id_user, username`,
    [password]
  );
  console.log('Updated superuser:', result.rows);

  // Get the Super Administrador role ID
  const roleResult = await client.query("SELECT id FROM auth.role WHERE name = 'Super Administrador' LIMIT 1");
  const superAdminRoleId = roleResult.rows[0]?.id;
  console.log('Super Admin Role ID:', superAdminRoleId);

  // Create additional users if they don't exist
  const users = [
    { username: 'admin@esap.edu.co', nombre: 'Admin Sistema', doc: '100000001' },
    { username: 'auditor@esap.edu.co', nombre: 'Auditor Prueba', doc: '100000002' },
    { username: 'juridico@esap.edu.co', nombre: 'Juridico Prueba', doc: '100000003' },
    { username: 'disciplinario@esap.edu.co', nombre: 'Disciplinario Prueba', doc: '100000004' },
    { username: 'registro@esap.edu.co', nombre: 'Verificación de títulos', doc: '100000005' },
  ];

  for (const u of users) {
    const existing = await client.query('SELECT 1 FROM auth."user" WHERE username = $1', [u.username]);
    if (existing.rows.length > 0) {
      // Update password
      await client.query('UPDATE auth."user" SET password_hash = $1 WHERE username = $2', [password, u.username]);
      console.log(`Updated password for: ${u.username}`);
      continue;
    }

    // Create persona
    const personResult = await client.query(
      `INSERT INTO auth.personas (num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
       VALUES ($1, 'CC', $2, $3, $4, 'M', $5)
       RETURNING id_person`,
      [u.doc, u.nombre, u.nombre.split(' ')[0], u.nombre.split(' ')[1] || 'Test', u.username]
    );
    const personId = personResult.rows[0].id_person;

    // Create user
    const userResult = await client.query(
      `INSERT INTO auth."user" (id_user, username, password_hash, is_active, id_person)
       VALUES (gen_random_uuid(), $1, $2, true, $3)
       RETURNING id_user`,
      [u.username, password, personId]
    );
    const userId = userResult.rows[0].id_user;

    // Assign Super Administrador role
    if (superAdminRoleId) {
      await client.query(
        `INSERT INTO auth.user_roles (id_user, id_rol) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, superAdminRoleId]
      );
    }

    console.log(`Created: ${u.username}`);
  }

  // Also update jefe.oci password
  await client.query('UPDATE auth."user" SET password_hash = $1 WHERE username = $2', [password, 'jefe.oci@esap.edu.co']);
  console.log('Updated jefe.oci@esap.edu.co password');

  // Verify
  const count = await client.query('SELECT id_user, username, is_active FROM auth."user"');
  console.log('\nAll users:');
  count.rows.forEach(r => console.log(`  ${r.username} (active: ${r.is_active})`));

  await client.end();
  console.log('\nDone! All passwords set to: Esap2026*');
}

fixSuperUser().catch(console.error);
