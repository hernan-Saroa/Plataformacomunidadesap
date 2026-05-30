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

    console.log('--- CHECKING RECENT MIGRATION ARTIFACTS IN DOCKER DB ---');

    // 308: control_interno.plan_mejoramiento (fecha_aprobacion)
    const res308_plan = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'control_interno' AND table_name = 'plan_mejoramiento' AND column_name = 'fecha_aprobacion';
    `);
    console.log('308: plan_mejoramiento.fecha_aprobacion exists:', res308_plan.rows.length > 0);

    const res308_accion = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'control_interno' AND table_name = 'accion_correctiva' AND column_name = 'estado_verificacion_oci';
    `);
    console.log('308: accion_correctiva.estado_verificacion_oci exists:', res308_accion.rows.length > 0);

    // 309: auth.carpeta_digital
    const res309 = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'auth' AND table_name = 'carpeta_digital';
    `);
    console.log('309: auth.carpeta_digital table exists:', res309.rows.length > 0);

    // 311: control_disciplinario.profesional
    const res311 = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'control_disciplinario' AND table_name = 'profesional';
    `);
    console.log('311: control_disciplinario.profesional table exists:', res311.rows.length > 0);

    // 314: notifications.notificacion (es_favorito)
    const res314 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'notifications' AND table_name = 'notificacion' AND column_name = 'es_favorito';
    `);
    console.log('314: notifications.notificacion.es_favorito exists:', res314.rows.length > 0);

    // 315: auth.persona_banco_docentes
    const res315 = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'auth' AND table_name = 'persona_banco_docentes';
    `);
    console.log('315: auth.persona_banco_docentes table exists:', res315.rows.length > 0);

    // 316: legal_management.tareas_expediente (abogado_id check / fk)
    const res316 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'legal_management' AND table_name = 'tareas_expediente';
    `);
    console.log('316: legal_management.tareas_expediente table exists:', res316.rows.length > 0);

    // 318: control_interno.plan_anual_5_roles (responsable_rol_id check)
    const res318 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'control_interno' AND table_name = 'plan_anual_5_roles' AND column_name = 'responsable_rol_id';
    `);
    console.log('318: plan_anual_5_roles.responsable_rol_id exists:', res318.rows.length > 0);

    // 319: control_interno.auditoria (plan_anual_vigencia check)
    const res319 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'control_interno' AND table_name = 'auditoria' AND column_name = 'plan_anual_vigencia';
    `);
    console.log('319: auditoria.plan_anual_vigencia exists:', res319.rows.length > 0);

    // 321: control_interno.rol_decreto_648 (rename check / auditor senior to lider)
    // Let's check auditoria.auditor_lider_id
    const res321 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'control_interno' AND table_name = 'auditoria' AND column_name = 'auditor_lider_id';
    `);
    console.log('321/Legacy: auditoria.auditor_lider_id exists:', res321.rows.length > 0);

    // 323: legal_management.expediente (otro_delito_penal check)
    const res323 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'legal_management' AND table_name = 'expediente' AND column_name = 'otro_delito_penal';
    `);
    console.log('323: expediente.otro_delito_penal exists:', res323.rows.length > 0);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
