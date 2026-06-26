const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function seed() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  await client.connect();

  // Get the Super Administrador role ID
  const roleResult = await client.query("SELECT id FROM auth.role WHERE name = 'Super Administrador' LIMIT 1");
  if (roleResult.rows.length === 0) {
    console.log('No Super Administrador role found');
    await client.end();
    return;
  }
  const superAdminRoleId = roleResult.rows[0].id;
  console.log('Super Administrador role ID:', superAdminRoleId);

  const password = await bcrypt.hash('Esap2026*', 10);
  
  const users = [
    { username: 'admin@esap.edu.co', nombre: 'Admin Sistema', doc: '100000001' },
    { username: 'auditor@esap.edu.co', nombre: 'Auditor Prueba', doc: '100000002' },
    { username: 'juridico@esap.edu.co', nombre: 'Juridico Prueba', doc: '100000003' },
    { username: 'disciplinario@esap.edu.co', nombre: 'Disciplinario Prueba', doc: '100000004' },
    { username: 'registro@esap.edu.co', nombre: 'Verificación de títulos', doc: '100000005' },
  ];

  for (const u of users) {
    // Check if user exists
    const existing = await client.query('SELECT 1 FROM auth."user" WHERE username = $1', [u.username]);
    if (existing.rows.length > 0) {
      console.log(`User already exists: ${u.username}`);
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
    await client.query(
      `INSERT INTO auth.user_roles (id_user, id_rol) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, superAdminRoleId]
    );

    console.log(`Created: ${u.username} (password: Esap2026*)`);
  }

  // Verify
  const count = await client.query('SELECT count(*) FROM auth."user"');
  console.log(`\nTotal users in DB: ${count.rows[0].count}`);

  await client.end();
  console.log('Seed complete!');
}

seed().catch(console.error);
