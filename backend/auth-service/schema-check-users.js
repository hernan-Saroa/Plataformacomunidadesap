const { Client } = require('pg');

async function check() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'esap_db'});
  await c.connect();

  const res2 = await c.query(`
    SELECT ur.id_user, p.nom_largo, r.name as role_name
    FROM auth.user_roles ur
    JOIN auth.role r ON ur.id_rol = r.id
    JOIN auth.user u ON ur.id_user = u.id_user
    JOIN auth.personas p ON u.id_person::text = p.id_person::text
    JOIN control_interno.configuracion_profesionales_ocig c ON c.id_tercero::text = p.id_person::text
  `);
  console.log("Roles for these users in global platform:");
  console.table(res2.rows);

  // Users in config but not matching global
  const res3 = await c.query(`
    SELECT p.nom_largo, c.rol_ocig
    FROM control_interno.configuracion_profesionales_ocig c
    LEFT JOIN auth.personas p ON c.id_tercero::text = p.id_person::text
    WHERE c.id_tercero NOT IN (
      SELECT u.id_person
      FROM auth.user_roles ur
      JOIN auth.user u ON ur.id_user = u.id_user
      JOIN auth.role r ON ur.id_rol = r.id
      WHERE r.category = 'control_interno'
    )
  `);
  console.log("Users in config WITHOUT control_interno global roles:");
  console.table(res3.rows);

  await c.end();
}
check();
