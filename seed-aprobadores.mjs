import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'esap_db'
});

async function run() {
  await client.connect();
  console.log('Connected to DB');

  // Verify Table Exists
  const check = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'control_interno' 
      AND table_name = 'configuracion_profesionales_ocig'
    );
  `);

  if (!check.rows[0].exists) {
    console.log("Table doesn't exist!");
    await client.end();
    return;
  }

  const res = await client.query('SELECT * FROM control_interno.configuracion_profesionales_ocig');
  console.log('Current Professionals in DB:', res.rows.length);

  if (res.rows.filter(r => r.rol.toLowerCase().includes('aprobador')).length === 0) {
    console.log('No Aprobador PAI found. Seeding them...');
    
    // Check if we can seed based on existing tables structure
    const query = `
      INSERT INTO control_interno.configuracion_profesionales_ocig 
      (usuario_id, nombre_completo, cargo, rol, activo, created_at, updated_at) 
      VALUES 
      ('usr-100', 'Carlos Aprobador Gómez', 'Director Control Interno', 'Aprobador PAI', true, NOW(), NOW()),
      ('usr-101', 'María Aprobador Pérez', 'Auditora Senior', 'Aprobador PAI', true, NOW(), NOW()),
      ('usr-102', 'Juan Aprobador Rodríguez', 'Evaluador PAI', 'Aprobador PAI', true, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `;
    
    try {
      await client.query(query);
      console.log('Seeded Aprobadores PAI successfully.');
    } catch(err) {
      console.error('Error seeding data:', err.message);
    }
  } else {
    console.log('Aprobadores PAI already exist!');
  }

  await client.end();
}

run().catch(console.error);
