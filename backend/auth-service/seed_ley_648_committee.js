const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function seedDecreto648() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db',
  });

  await client.connect();
  console.log('✅ Conectado a esap_db\n');

  // Primero limpiamos los dos aprobadores genéricos que creamos antes
  console.log('🧹 Limpiando aprobadores viejos...');
  const emailsToClean = ['carolina.gomez@esap.edu.co', 'gabriel.torres@esap.edu.co'];
  for (const email of emailsToClean) {
    const q1 = await client.query("SELECT id_person, id_user FROM auth.personas p LEFT JOIN auth.user u USING(id_person) WHERE dir_email = $1", [email]);
    if (q1.rows.length > 0) {
      const { id_person, id_user } = q1.rows[0];
      if (id_person) await client.query("DELETE FROM control_interno.configuracion_profesionales_ocig WHERE id_tercero::text = $1", [id_person]);
      if (id_user) await client.query("DELETE FROM auth.user_roles WHERE id_user = $1", [id_user]);
      if (id_user) await client.query("DELETE FROM auth.user WHERE id_user = $1", [id_user]);
      if (id_person) await client.query("DELETE FROM auth.personas WHERE id_person = $1", [id_person]);
    }
  }

  // Obtenemos el ID del rol APROBADOR_PAI
  const roleCode = 'APROBADOR_PAI';
  const roleRes = await client.query('SELECT id FROM auth.role WHERE code = $1', [roleCode]);
  if (roleRes.rows.length === 0) {
    console.error('❌ No se encontró el rol APROBADOR_PAI en la base de datos.');
    process.exit(1);
  }
  const roleId = roleRes.rows[0].id;

  const password = await bcrypt.hash('Esap2026*', 10);

  // Comité Institucional de Coordinación de Control Interno (Decreto 648 de 2017)
  const committee = [
    {
      username: 'director.general@esap.edu.co',
      nombre: 'Jorge',
      apellido: 'Iván Bula Escobar',
      doc: '1000000001',
      cargo: 'Director General (Representante Legal)',
      ocig_role: 'Aprobador PAI'
    },
    {
      username: 'jefe.planeacion@esap.edu.co',
      nombre: 'Luis',
      apellido: 'Fernando Lozano',
      doc: '1000000002',
      cargo: 'Jefe Oficina Asesora de Planeación',
      ocig_role: 'Aprobador PAI'
    },
    {
      username: 'secretaria.general@esap.edu.co',
      nombre: 'Diana',
      apellido: 'Marcela Arboleda',
      doc: '1000000003',
      cargo: 'Secretaria General',
      ocig_role: 'Aprobador PAI'
    },
    {
      username: 'subdirector.academico@esap.edu.co',
      nombre: 'Carlos',
      apellido: 'Augusto Buitrago',
      doc: '1000000004',
      cargo: 'Subdirector Académico',
      ocig_role: 'Aprobador PAI'
    },
    {
      username: 'subdirector.administrativo@esap.edu.co',
      nombre: 'María',
      apellido: 'Fernanda Ortiz',
      doc: '1000000005',
      cargo: 'Subdirector Administrativo y Financiero',
      ocig_role: 'Aprobador PAI'
    }
  ];

  console.log('\n🏛️ Creando Miembros del Comité Institucional (Decreto 648 de 2017)...\n');

  for (const u of committee) {
    // Check if user exists
    const existing = await client.query('SELECT id_person, id_user FROM auth.personas JOIN auth."user" USING(id_person) WHERE dir_email = $1', [u.username]);
    let personId, userId;

    if (existing.rows.length === 0) {
      // Create persona
      const pRes = await client.query(
        `INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
         VALUES (gen_random_uuid(), $1, 'CC', $2, $3, $4, 'M', $5) RETURNING id_person`,
        [u.doc, `${u.nombre} ${u.apellido}`, u.nombre, u.apellido.split(' ')[0], u.username]
      );
      personId = pRes.rows[0].id_person;

      // Create user
      const uRes = await client.query(
        `INSERT INTO auth."user" (id_user, username, password_hash, is_active, id_person)
         VALUES (gen_random_uuid(), $1, $2, true, $3) RETURNING id_user`,
        [u.username, password, personId]
      );
      userId = uRes.rows[0].id_user;
    } else {
      personId = existing.rows[0].id_person;
      userId = existing.rows[0].id_user;
    }

    // Assign Role APROBADOR_PAI
    await client.query(`INSERT INTO auth.user_roles (id_user, id_rol) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, roleId]);

    // Insert into configuracion_profesionales_ocig
    const confRes = await client.query(`SELECT id FROM control_interno.configuracion_profesionales_ocig WHERE id_tercero::text = $1`, [personId]);
    if (confRes.rows.length === 0) {
      // Los componentes del comité no lideran auditorías y tienen horas limitadas para Control Interno, ya que su función es aprobar
      await client.query(`
        INSERT INTO control_interno.configuracion_profesionales_ocig 
        (id_tercero, rol_ocig, especialidades, capacidad_maxima_auditorias, horas_mensuales_disponibles, puede_ser_lider, activo, observaciones)
        VALUES ($1, $2, ARRAY['Comité Institucional']::varchar[], 1, 150, false, true, $3)
      `, [personId, u.ocig_role, `Aprobador Comité Institucional: ${u.cargo}`]);
    }

    console.log(`✅ Creado: ${u.nombre} ${u.apellido} (${u.cargo}) -> ${u.ocig_role}`);
  }

  await client.end();
  console.log('\n✅ Comité Decreto 648/2017 integrado correctamente a la BD!');
}

seedDecreto648().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
