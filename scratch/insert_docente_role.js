const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 8080,
  user: 'postgres',
  password: 'password',
  database: 'esap_db',
});

async function run() {
  try {
    await client.connect();

    // Check table structure of auth.role
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'auth' AND table_name = 'role';
    `);
    console.log('Columns of auth.role:');
    columns.rows.forEach(c => console.log(`- ${c.column_name}: ${c.data_type}`));

    // Insert DOCENTE role if not exists
    const checkRole = await client.query(`
      SELECT id FROM auth.role WHERE code = 'DOCENTE';
    `);

    if (checkRole.rows.length === 0) {
      console.log('Inserting DOCENTE role...');
      await client.query(`
        INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
        VALUES ('660e8400-e29b-41d4-a716-446655440003', 'DOCENTE', 'Docente', 'Docente de la institución', 'academico', 'BookOpen', '#16a34a', 'personalizado', true)
        ON CONFLICT (id) DO UPDATE SET code = 'DOCENTE', name = 'Docente';
      `);
      console.log('DOCENTE role inserted successfully.');
    } else {
      console.log('DOCENTE role already exists.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
