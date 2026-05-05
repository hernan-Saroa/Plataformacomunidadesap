const { Client } = require('pg');

async function fix() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'esap_db'});
  await c.connect();
  
  const r = await c.query("SELECT id, estado, equipo_aprobacion FROM control_interno.plan_anual_5_roles ORDER BY created_at DESC LIMIT 1");
  if(r.rows.length === 0) return;
  const plan = r.rows[0];
  
  plan.estado = 'borrador'; // "DEVUELTO" maps to "borrador" en la base de datos (según ESTADO_PLAN_A_BACKEND)
  
  plan.equipo_aprobacion = plan.equipo_aprobacion.map(a => {
      if(a.nombre === 'María Fernanda Ortiz' || a.email === 'subdirector.administrativo@esap.edu.co') {
          return {
              ...a,
              estado: 'OBSERVADA',
              observacion: 'El plan carece de sustento en los tiempos de auditoría trimestral. Favor ajustar el cronograma.',
              auditorId: a.id,
              auditorNombre: a.nombre,
              fecha: new Date().toISOString()
          }
      }
      return {
          ...a,
          estado: 'PENDIENTE',
          auditorId: a.id,
          auditorNombre: a.nombre
      };
  });
  
  await c.query("UPDATE control_interno.plan_anual_5_roles SET estado = 'borrador', equipo_aprobacion = $1 WHERE id = $2", [JSON.stringify(plan.equipo_aprobacion), plan.id]);
  
  console.log("Plan recuperado y puesto en observación.");
  await c.end();
}
fix();
