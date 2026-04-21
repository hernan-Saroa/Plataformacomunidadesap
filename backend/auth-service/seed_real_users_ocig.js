const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function seed() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db',
  });

  await client.connect();
  console.log('✅ Conectado a esap_db\n');

  // ─────────────────────────────────────────
  // 1. GET ROLES para Control Interno
  // ─────────────────────────────────────────
  const roleCodes = ['JEFE_OCI', 'AUDITOR_LIDER', 'AUDITOR_SENIOR', 'AUDITOR_JUNIOR', 'USUARIO_AUDITADO', 'PROFESIONAL_OCI', 'ADMIN_CI', 'APROBADOR_PAI'];
  const roleIds = {};
  
  for (const code of roleCodes) {
    const existing = await client.query('SELECT id FROM auth.role WHERE code = $1', [code]);
    if (existing.rows.length > 0) {
      roleIds[code] = existing.rows[0].id;
    }
  }

  // ─────────────────────────────────────────
  // 2. CREAR USUARIOS para Control Interno
  // ─────────────────────────────────────────
  const password = await bcrypt.hash('Esap2026*', 10);

  const users = [
    {
      username: 'andres.mendoza@esap.edu.co',
      nombre: 'Andrés Felipe',
      apellido: 'Mendoza Vargas',
      doc: '1020304050',
      cargo: 'Jefe OCI',
      roles: ['JEFE_OCI', 'ADMIN_CI', 'APROBADOR_PAI'],
      ocig_role: 'Jefe Oficina Control Interno',
      puedeSerLider: true
    },
    {
      username: 'carolina.gomez@esap.edu.co',
      nombre: 'Carolina Isabel',
      apellido: 'Gómez Ruiz',
      doc: '1020304051',
      cargo: 'Aprobador PAI',
      roles: ['APROBADOR_PAI'],
      ocig_role: 'Aprobador PAI',
      puedeSerLider: false
    },
    {
      username: 'gabriel.torres@esap.edu.co',
      nombre: 'Gabriel Eduardo',
      apellido: 'Torres López',
      doc: '1020304052',
      cargo: 'Aprobador PAI',
      roles: ['APROBADOR_PAI'],
      ocig_role: 'Aprobador PAI',
      puedeSerLider: false
    },
    {
      username: 'sofia.castro@esap.edu.co',
      nombre: 'Sofía',
      apellido: 'Castro Rincón',
      doc: '1020304053',
      cargo: 'Auditor Líder',
      roles: ['AUDITOR_LIDER'],
      ocig_role: 'Auditor Líder',
      puedeSerLider: true
    },
    {
      username: 'hector.silva@esap.edu.co',
      nombre: 'Héctor José',
      apellido: 'Silva Ramírez',
      doc: '1020304054',
      cargo: 'Auditor Senior',
      roles: ['AUDITOR_SENIOR'],
      ocig_role: 'Auditor Senior',
      puedeSerLider: true
    },
    {
      username: 'valentina.rojas@esap.edu.co',
      nombre: 'Valentina',
      apellido: 'Rojas Mejía',
      doc: '1020304055',
      cargo: 'Auditor Junior',
      roles: ['AUDITOR_JUNIOR'],
      ocig_role: 'Auditor Junior',
      puedeSerLider: false
    },
    {
      username: 'diana.martinez@esap.edu.co',
      nombre: 'Diana Patricia',
      apellido: 'Martínez López',
      doc: '1020304056',
      cargo: 'Profesional OCI',
      roles: ['PROFESIONAL_OCI'],
      ocig_role: 'Apoyo Técnico',
      puedeSerLider: false
    }
  ];

  console.log('\n👥 Creando usuarios reales en la Base de Datos...\n');

  for (const u of users) {
    // Check if user exists
    const existing = await client.query('SELECT id_user FROM auth."user" WHERE username = $1', [u.username]);
    if (existing.rows.length > 0) {
      console.log(`⚡ Usuario ya existe: ${u.username}`);
      continue;
    }

    // Create persona
    const personResult = await client.query(
      `INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
       VALUES (gen_random_uuid(), $1, 'CC', $2, $3, $4, 'M', $5)
       RETURNING id_person`,
      [u.doc, `${u.nombre} ${u.apellido}`, u.nombre.split(' ')[0], u.apellido.split(' ')[0], u.username]
    );
    const personId = personResult.rows[0].id_person;

    // Create user
    const userResult = await client.query(
      `INSERT INTO auth."user" (id_user, username, password_hash, is_active, id_person)
       VALUES (gen_random_uuid(), $1, $2, true, $3)
       RETURNING id_user`,
      [u.username, password, personId]
    );
    const userId = userResult.rows[0].id_user;

    // Assign roles
    for (const roleCode of u.roles) {
      if (roleIds[roleCode]) {
        await client.query(
          `INSERT INTO auth.user_roles (id_user, id_rol) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, roleIds[roleCode]]
        );
      }
    }

    // Assign to configuracion_profesionales_ocig
    // Verify if already configured
    const checkConfig = await client.query(`SELECT id FROM control_interno.configuracion_profesionales_ocig WHERE id_tercero = $1 OR id_tercero::text = $1::text`, [personId]);
    if (checkConfig.rows.length === 0) {
       await client.query(`
         INSERT INTO control_interno.configuracion_profesionales_ocig 
         (id_tercero, rol_ocig, especialidades, capacidad_maxima_auditorias, horas_mensuales_disponibles, puede_ser_lider, activo)
         VALUES ($1, $2, ARRAY['Control Interno', 'Financiera']::varchar[], $3, $4, $5, true)
       `, [personId, u.ocig_role, u.puedeSerLider ? 4 : 2, u.puedeSerLider ? 160 : 80, u.puedeSerLider]);
    }

    console.log(`✅ Creado: ${u.nombre} ${u.apellido} (${u.ocig_role})`);
  }

  await client.end();
  console.log('\n✅ Script completado!');
}

seed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
