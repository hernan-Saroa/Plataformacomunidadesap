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

    await client.query('BEGIN');
    console.log('Transaction started.');

    // Try inserting
    const insertQuery = `
      INSERT INTO control_interno.auditoria (
        codigo, nombre, descripcion, tipo, fase, territorial, sede, responsable,
        fecha_inicio, fecha_fin, fecha_fin_planeacion, fecha_inicio_ejecucion,
        fecha_fin_ejecucion, fecha_inicio_comunicacion, progreso, prioridad,
        hallazgos, activa, estado_kanban, plan_anual_id, plan_anual_vigencia,
        vinculada_plan_anual, auditor_lider_id, supervisor_asignado_id,
        responsable_area_nombre, responsable_area_cargo, responsable_area_email,
        calificacion_riesgo, alcance, presupuesto_estimado
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23, $24,
        $25, $26, $27,
        $28, $29, $30
      ) RETURNING id;
    `;

    const values = [
      'AUD-2026-999', // codigo
      'Auditoría de Prueba OCI', // nombre
      'Descripción de prueba', // descripcion
      'Regular', // tipo
      'planeacion', // fase
      'Sede Central', // territorial
      'Sede Central', // sede
      'Por asignar', // responsable
      '2026-06-18', // fecha_inicio
      '2026-06-30', // fecha_fin
      '2026-06-20', // fecha_fin_planeacion
      '2026-06-21', // fecha_inicio_ejecucion
      '2026-06-25', // fecha_fin_ejecucion
      '2026-06-26', // fecha_inicio_comunicacion
      0, // progreso
      'Media', // prioridad
      0, // hallazgos
      true, // activa
      'Plan Anual', // estado_kanban
      '1bb4e342-b1aa-44d5-85cf-7fa428959339', // plan_anual_id (exists in DB)
      2026, // plan_anual_vigencia
      true, // vinculada_plan_anual
      'f0ee731b-1d81-46fe-b4d3-ddc91bf73338', // auditor_lider_id (exists in DB)
      null, // supervisor_asignado_id
      'Test Auditado', // responsable_area_nombre
      'Jefe', // responsable_area_cargo
      'test@esap.edu.co', // responsable_area_email
      'Medio', // calificacion_riesgo
      'Descripción de prueba', // alcance
      1000000 // presupuesto_estimado
    ];

    const res = await client.query(insertQuery, values);
    console.log('Insert SUCCEEDED! Returned ID:', res.rows[0].id);

  } catch (err) {
    console.error('Insert FAILED with error:', err);
  } finally {
    await client.query('ROLLBACK');
    console.log('Transaction rolled back.');
    await client.end();
  }
}

main();
