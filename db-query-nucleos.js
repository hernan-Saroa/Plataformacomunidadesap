const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db',
  });

  try {
    await client.connect();
    console.log('Connected to database!');
    
    // Query some subjects and their joined nucleus from academic_work_plan
    const res = await client.query(`
      SELECT 
        a.id AS subject_id, 
        a.nombre AS subject_name, 
        a.id_nucleo_tematico,
        nt.id AS nt_id,
        nt.nombre AS nt_name
      FROM academic_work_plan.asignatura a
      LEFT JOIN academic_work_plan.nucleo_tematico nt 
        ON nt.id = a.id_nucleo_tematico
      LIMIT 10;
    `);
    
    console.log('Subjects with nucleus join:');
    console.log(JSON.stringify(res.rows, null, 2));

    // Specifically query ID 133
    const nt133 = await client.query(`
      SELECT * FROM academic_work_plan.nucleo_tematico WHERE id = 133 OR id = '133';
    `);
    console.log('Nucleus with ID 133:');
    console.log(JSON.stringify(nt133.rows, null, 2));
    
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.end();
  }
}

main();
