const { Client } = require('pg');

async function fix() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'esap_db'});
  await c.connect();
  
  try {
    await c.query(`ALTER TABLE control_interno.plan_anual_5_roles ADD COLUMN equipo_aprobacion jsonb DEFAULT '[]'::jsonb`);
    console.log('Added equipo_aprobacion column');
  } catch(e) {
    console.log(e.message);
  }
  
  try {
    await c.query(`ALTER TABLE control_interno.plan_anual_5_roles ADD COLUMN orden_aprobacion varchar(20) DEFAULT 'secuencial'`);
    console.log('Added orden_aprobacion column');
  } catch(e) {
    console.log(e.message);
  }

  await c.end();
}
fix();
