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
  const res = await client.query('SELECT * FROM control_interno.configuracion_profesionales_ocig');
  
  if (res.rows.length >= 3) {
    const ids = res.rows.map(r => r.id).slice(0, 3);
    const inClause = ids.map(id => `'${id}'`).join(',');
    
    await client.query(`
      UPDATE control_interno.configuracion_profesionales_ocig 
      SET rol_ocig = 'Aprobador PAI' 
      WHERE id IN (${inClause});
    `);
    
    console.log(`Updated 3 professionals to have rol_ocig = 'Aprobador PAI'.`);
  } else {
    console.log('Not enough professionals to update.');
  }
  
  await client.end();
}

run().catch(console.error);
