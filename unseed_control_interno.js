const { Client } = require('pg');

async function unseed() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db',
  });

  await client.connect();
  console.log('✅ Conectado a esap_db\n');

  const emails = [
    'jefe.oci@esap.edu.co',
    'auditor.lider@esap.edu.co',
    'auditor.senior1@esap.edu.co',
    'auditor.senior2@esap.edu.co',
    'auditor.junior1@esap.edu.co',
    'auditor.junior2@esap.edu.co',
    'profesional.oci@esap.edu.co',
    'auditado.financiera@esap.edu.co',
    'auditado.administrativa@esap.edu.co',
    'auditado.talento@esap.edu.co'
  ];

  console.log('🗑️ Eliminando usuarios semilla...');

  for (const email of emails) {
    try {
      // Get the persona ID and user ID
      const queryResult = await client.query(`
        SELECT p.id_person, u.id_user 
        FROM auth.personas p
        LEFT JOIN auth."user" u ON p.id_person = u.id_person
        WHERE p.dir_email = $1 OR p.num_identificacion IN ('200000001','200000002','200000003','200000004','200000005','200000006','200000007','200000008','200000009','200000010') AND p.dir_email = $1
      `, [email]);

      if (queryResult.rows.length > 0) {
        const { id_person, id_user } = queryResult.rows[0];

        // Delete from configuracion_profesionales_ocig (idTercero is character varying)
        if (id_person) {
          await client.query(`DELETE FROM control_interno.configuracion_profesionales_ocig WHERE id_tercero = $1 OR id_tercero::text = $1::text`, [id_person]);
        }

        // Delete from auth.user_roles
        if (id_user) {
          await client.query(`DELETE FROM auth.user_roles WHERE id_user = $1`, [id_user]);
        }

        // Delete from auth.user
        if (id_user) {
          await client.query(`DELETE FROM auth."user" WHERE id_user = $1`, [id_user]);
        }

        // Delete from auth.personas
        if (id_person) {
          await client.query(`DELETE FROM auth.personas WHERE id_person = $1`, [id_person]);
        }

        console.log(`✅ Eliminado correctamente: ${email}`);
      } else {
        console.log(`⚡ No se encontró: ${email}`);
      }
    } catch (e) {
      console.error(`❌ Error eliminando ${email}:`, e.message);
    }
  }

  await client.end();
  console.log('\n✅ Limpieza completada!');
}

unseed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
