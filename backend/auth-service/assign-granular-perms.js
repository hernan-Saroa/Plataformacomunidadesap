const { Client } = require('pg');

async function fix() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'esap_db'});
  await c.connect();
  console.log("Connected to DB...");

  const roleCode = 'APROBADOR_PAI';
  
  // Encontramos el rol APROBADOR_PAI y JEFE_OCI
  const rRes = await c.query("SELECT id FROM auth.role WHERE code IN ('APROBADOR_PAI', 'JEFE_OCI')");
  if(rRes.rows.length === 0) {
      console.log("No se encontraron esos roles");
      await c.end();
      return;
  }
  
  const roleIds = rRes.rows.map(x => x.id);

  // Lista de permisos requeridos para la UI y la Trazabilidad OTP
  const requiredPerms = [
      'control-interno.plan-anual.view',
      'control-interno.plan-anual.approve',
      'control-interno.plan-anual.edit',
      'control-interno.auditoria.view',
      'control-interno.configuraciones.view',
      'control-interno.configuraciones.manage',
      'control-interno.planeacion.plan.edit',
      'control-interno.aprobaciones.view'
  ];

  for (const permCode of requiredPerms) {
      // 1. Obtener ID del modulo de control interno
      const mRes = await c.query("SELECT id_module FROM auth.module WHERE code = 'control-interno' LIMIT 1");
      const idModule = mRes.rows.length > 0 ? mRes.rows[0].id_module : 'fc0051b8-761d-4cf6-9d14-9cfdc08b4555';

      // 2. Verificar/Crear permiso en auth.permission
      let pRes = await c.query("SELECT id_permission FROM auth.permission WHERE code = $1", [permCode]);
      if (pRes.rows.length === 0) {
          console.log(`Creando permiso faltante: ${permCode}`);
          await c.query(`
              INSERT INTO auth.permission (code, name, description, id_module, is_active, created_at, updated_at)
              VALUES ($1, $2, $3, $4, true, NOW(), NOW())
          `, [permCode, permCode, 'Auto-generated permission for committee', idModule]);
          pRes = await c.query("SELECT id_permission FROM auth.permission WHERE code = $1", [permCode]);
      }
      
      const permId = pRes.rows[0].id_permission;

      // 3. Asignar permiso a los roles
      for (const rId of roleIds) {
          try {
              await c.query(`
                  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
                  VALUES ($1, $2, true, NOW(), NOW())
                  ON CONFLICT DO NOTHING
              `, [rId, permId]);
          } catch(e) {
              // Ignore unique constraints if any
          }
      }
  }

  console.log("Permisos asignados exitosamente a APROBADOR_PAI y JEFE_OCI en la base de datos.");
  
  await c.end();
}
fix().catch(console.error);
