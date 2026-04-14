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
  // 1. CREAR ROLES para Control Interno
  // ─────────────────────────────────────────
  const roles = [
    { name: 'Jefe Oficina Control Interno', code: 'JEFE_OCI', description: 'Jefe de la Oficina de Control Interno de Gestión', category: 'control_interno', icon: 'Crown', color: '#7c3aed' },
    { name: 'Auditor Líder', code: 'AUDITOR_LIDER', description: 'Auditor líder que coordina las auditorías', category: 'control_interno', icon: 'UserCheck', color: '#2563eb' },
    { name: 'Auditor Senior', code: 'AUDITOR_SENIOR', description: 'Auditor senior con experiencia en auditorías', category: 'control_interno', icon: 'Shield', color: '#0891b2' },
    { name: 'Auditor Junior', code: 'AUDITOR_JUNIOR', description: 'Auditor junior en formación', category: 'control_interno', icon: 'User', color: '#059669' },
    { name: 'Usuario Auditado', code: 'USUARIO_AUDITADO', description: 'Responsable de proceso que es auditado', category: 'control_interno', icon: 'Building2', color: '#d97706' },
    { name: 'Profesional OCI', code: 'PROFESIONAL_OCI', description: 'Profesional de apoyo de la Oficina de Control Interno', category: 'control_interno', icon: 'Briefcase', color: '#4f46e5' },
    { name: 'Administrador Control Interno', code: 'ADMIN_CI', description: 'Administrador del módulo de Control Interno', category: 'control_interno', icon: 'Settings', color: '#dc2626' },
  ];

  const roleIds = {};
  
  for (const role of roles) {
    // Check if role already exists
    const existing = await client.query('SELECT id FROM auth.role WHERE code = $1', [role.code]);
    if (existing.rows.length > 0) {
      roleIds[role.code] = existing.rows[0].id;
      console.log(`⚡ Rol ya existe: ${role.name} (${role.code})`);
      continue;
    }

    const result = await client.query(
      `INSERT INTO auth.role (id, name, code, description, category, icon, color, is_active) 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true) 
       RETURNING id`,
      [role.name, role.code, role.description, role.category, role.icon, role.color]
    );
    roleIds[role.code] = result.rows[0].id;
    console.log(`✅ Rol creado: ${role.name} (${role.code})`);
  }

  // Get Super Admin role ID
  const superAdminResult = await client.query("SELECT id FROM auth.role WHERE code = 'SUPER_ADMIN' LIMIT 1");
  if (superAdminResult.rows.length > 0) {
    roleIds['SUPER_ADMIN'] = superAdminResult.rows[0].id;
  }

  console.log('\n📋 IDs de Roles:');
  for (const [code, id] of Object.entries(roleIds)) {
    console.log(`   ${code}: ${id}`);
  }

  // ─────────────────────────────────────────
  // 2. CREAR USUARIOS para Control Interno
  // ─────────────────────────────────────────
  const password = await bcrypt.hash('Esap2026*', 10);

  const users = [
    {
      username: 'jefe.oci@esap.edu.co',
      nombre: 'María Elena',
      apellido: 'Rodríguez Torres',
      doc: '200000001',
      cargo: 'Jefe OCI',
      roles: ['JEFE_OCI', 'ADMIN_CI'],
      module: 'control-interno'
    },
    {
      username: 'auditor.lider@esap.edu.co',
      nombre: 'Carlos Alberto',
      apellido: 'Gómez Ruiz',
      doc: '200000002',
      cargo: 'Auditor Líder',
      roles: ['AUDITOR_LIDER'],
      module: 'control-interno'
    },
    {
      username: 'auditor.senior1@esap.edu.co',
      nombre: 'Ana Patricia',
      apellido: 'Martínez López',
      doc: '200000003',
      cargo: 'Auditor Senior',
      roles: ['AUDITOR_SENIOR'],
      module: 'control-interno'
    },
    {
      username: 'auditor.senior2@esap.edu.co',
      nombre: 'Pedro José',
      apellido: 'Silva Ramírez',
      doc: '200000004',
      cargo: 'Auditor Senior',
      roles: ['AUDITOR_SENIOR'],
      module: 'control-interno'
    },
    {
      username: 'auditor.junior1@esap.edu.co',
      nombre: 'Laura Sofía',
      apellido: 'Hernández Castro',
      doc: '200000005',
      cargo: 'Auditor Junior',
      roles: ['AUDITOR_JUNIOR'],
      module: 'control-interno'
    },
    {
      username: 'auditor.junior2@esap.edu.co',
      nombre: 'Diego Fernando',
      apellido: 'Morales Díaz',
      doc: '200000006',
      cargo: 'Auditor Junior',
      roles: ['AUDITOR_JUNIOR'],
      module: 'control-interno'
    },
    {
      username: 'profesional.oci@esap.edu.co',
      nombre: 'Sandra Milena',
      apellido: 'Vargas Peña',
      doc: '200000007',
      cargo: 'Profesional OCI',
      roles: ['PROFESIONAL_OCI'],
      module: 'control-interno'
    },
    {
      username: 'auditado.financiera@esap.edu.co',
      nombre: 'Roberto Carlos',
      apellido: 'Mendoza Arias',
      doc: '200000008',
      cargo: 'Dir. Financiera',
      roles: ['USUARIO_AUDITADO'],
      module: 'procesos'
    },
    {
      username: 'auditado.administrativa@esap.edu.co',
      nombre: 'Gloria Isabel',
      apellido: 'Patiño Suárez',
      doc: '200000009',
      cargo: 'Dir. Administrativa',
      roles: ['USUARIO_AUDITADO'],
      module: 'procesos'
    },
    {
      username: 'auditado.talento@esap.edu.co',
      nombre: 'Andrés Felipe',
      apellido: 'Rojas Mejía',
      doc: '200000010',
      cargo: 'Dir. Talento Humano',
      roles: ['USUARIO_AUDITADO'],
      module: 'procesos'
    },
  ];

  console.log('\n👥 Creando usuarios...\n');

  for (const u of users) {
    // Check if user exists
    const existing = await client.query('SELECT id_user FROM auth."user" WHERE username = $1', [u.username]);
    if (existing.rows.length > 0) {
      console.log(`⚡ Usuario ya existe: ${u.username}`);
      continue;
    }

    // Create persona
    const personResult = await client.query(
      `INSERT INTO auth.personas (num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
       VALUES ($1, 'CC', $2, $3, $4, 'M', $5)
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

    console.log(`✅ ${u.nombre} ${u.apellido} (${u.username})`);
    console.log(`   Roles: ${u.roles.join(', ')} | Módulo: ${u.module}`);
  }

  // ─────────────────────────────────────────
  // 3. VERIFICACIÓN
  // ─────────────────────────────────────────
  const totalUsers = await client.query('SELECT count(*) FROM auth."user"');
  const totalRoles = await client.query('SELECT count(*) FROM auth.role');
  
  console.log('\n═══════════════════════════════════════════');
  console.log(`📊 Total usuarios: ${totalUsers.rows[0].count}`);
  console.log(`📊 Total roles: ${totalRoles.rows[0].count}`);
  console.log('═══════════════════════════════════════════');
  
  console.log('\n🔑 Credenciales de acceso:');
  console.log('   Contraseña para TODOS: Esap2026*\n');
  
  console.log('┌──────────────────────────────────────────┬────────────────────────────┬──────────────────┐');
  console.log('│ Email                                    │ Nombre                     │ Rol              │');
  console.log('├──────────────────────────────────────────┼────────────────────────────┼──────────────────┤');
  for (const u of users) {
    console.log(`│ ${u.username.padEnd(40)} │ ${(u.nombre + ' ' + u.apellido.split(' ')[0]).padEnd(26)} │ ${u.roles[0].padEnd(16)} │`);
  }
  console.log('└──────────────────────────────────────────┴────────────────────────────┴──────────────────┘');

  await client.end();
  console.log('\n✅ Seed completado!');
}

seed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
