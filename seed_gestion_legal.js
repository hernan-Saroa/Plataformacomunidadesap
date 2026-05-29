const { Client } = require('pg');

async function seed() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'esap_db',
  });

  await client.connect();
  console.log(`✅ Conectado a ${client.database || 'esap_db'} en ${client.host}:${client.port} para el seeding de Gestión Legal (SIGL)\n`);

  // ─────────────────────────────────────────
  // 1. LIMPIEZA DE TABLAS EXISTENTES
  // ─────────────────────────────────────────
  console.log('🧹 Limpiando tablas de legal_management...');
  const tablesToTruncate = [
    'actors',
    'actuaciones',
    'tareas_expediente',
    'notas_expediente',
    'decisiones_disciplinarias',
    'excepciones_procesales',
    'expedientes',
    'consultas_juridicas',
    'pagos_coactivos',
    'procesos_coactivos_adjuntos',
    'procesos_coactivos',
    'documentos_oc',
    'comentarios_oc',
    'requerimientos_oc',
    'riesgo_historial',
    'riesgos',
    'planes_evidencias',
    'planes_seguimientos',
    'planes_comentarios',
    'planes_hallazgos',
    'planes_mejoramiento',
    'hallazgos',
    'pei_registros_avance',
    'pei_indicadores',
    'actas',
    'evidencias',
    'autos',
    'audiencias',
    'documentos',
    'adjuntos_correo',
    'correos_juridicos',
    'cat_tipos_requerimiento'
  ];

  for (const table of tablesToTruncate) {
    await client.query(`TRUNCATE TABLE legal_management.${table} CASCADE`);
  }
  console.log('✅ Tablas limpiadas exitosamente.');

  // ─────────────────────────────────────────
  // 2. INSERTAR ORGANISMOS DE CONTROL
  // ─────────────────────────────────────────
  console.log('\n🏢 Insertando Organismos de Control...');
  const organismos = [
    { id: 1, sigla: 'CGR', nombre: 'Contraloría General de la República', correos: '["notificaciones@cgr.gov.co"]', activo: true },
    { id: 2, sigla: 'PGN', nombre: 'Procuraduría General de la Nación', correos: '["notificaciones@pgn.gov.co"]', activo: true },
    { id: 3, sigla: 'Defensoria', nombre: 'Defensoría del Pueblo', correos: '["notificaciones@defensoria.gov.co"]', activo: true }
  ];

  for (const org of organismos) {
    await client.query(`
      INSERT INTO legal_management.organismos_control (id, sigla, nombre, correos, activo)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET sigla = EXCLUDED.sigla, nombre = EXCLUDED.nombre
    `, [org.id, org.sigla, org.nombre, org.correos, org.activo]);
  }
  console.log('✅ Organismos de control creados.');

  // ─────────────────────────────────────────
  // 3. DEFENDER JUDICIAL (EXPEDIENTES & ACTORES & ACTUACIONES)
  // ─────────────────────────────────────────
  console.log('\n⚖️ Insertando Expedientes de Defensa Judicial...');
  const juridicoUserId = 'c88b10d0-c44e-4edc-b821-2630b4db3737'; // Juridico Prueba

  const expedientesJudiciales = [
    {
      id: 'd3b07384-d113-4a15-bb8a-1a8b10111111',
      radicado: '11001333100320250014500',
      jurisdiccion: 'Contencioso Administrativo',
      tipo_proceso: 'nulidad-restablecimiento',
      demandante: 'Juan Carlos Pérez Trujillo',
      demandado: 'ESAP',
      estado: 'ACTIVO',
      fecha_radicacion: new Date('2025-03-15T08:00:00Z'),
      cuantia: 185000000.00,
      nivel_riesgo: 'MEDIO',
      provision_contable: 92500000.00,
      fecha_estimacion_provision: new Date('2025-04-10T10:00:00Z'),
      observacion_provision: 'Provisión estimada al 50% de probabilidad de pérdida según análisis de defensa.',
      abogado_sustanciador: juridicoUserId,
      termino_procesal_dias: 20,
      tipo_conteo_termino: 'HABILES',
      ultima_actuacion: 'Contestación de demanda radicada satisfactoriamente.',
      ubicacion_fisica: 'Archivo Central - Caja 15 - Carpeta 4',
      medio_control: 'Nulidad y Restablecimiento del Derecho',
      juzgado_conocimiento: 'Juzgado 15 Administrativo del Circuito de Bogotá',
      pretension_demandante: 'Declarar la nulidad de la Resolución No. 0451 de 2024 y ordenar el reintegro al cargo de Profesional Universitario junto con el pago de salarios dejados de percibir.',
      acto_administrativo_demandado: 'Resolución No. 0451 de 2024 expedida por la Subdirección Administrativa de la ESAP',
      fecha_notificacion: new Date('2025-04-02T14:30:00Z'),
      fecha_admision: new Date('2025-03-28T09:00:00Z'),
      fecha_vencimiento_termino: new Date('2025-05-02T17:00:00Z'),
      tipo_id_demandante: 'CC',
      numero_id_demandante: '79876543',
      tipo_id_demandado: 'NIT',
      numero_id_demandado: '899999023-1',
      demandante_direccion: 'Calle 45 No. 12 - 34, Bogotá',
      demandante_telefono: '3102223344',
      demandante_email: 'juancarlos.perez@gmail.com',
      demandante_apoderado: 'Dra. Patricia Salamanca (T.P. 125432CSJ)',
      etapa_procesal: 'CONTESTACIÓN'
    },
    {
      id: 'd3b07384-d113-4a15-bb8a-1a8b10222222',
      radicado: '25000233600020240032100',
      jurisdiccion: 'Contencioso Administrativo',
      tipo_proceso: 'reparacion-directa',
      demandante: 'Inversiones y Obras del Centro S.A.S.',
      demandado: 'ESAP',
      estado: 'ACTIVO',
      fecha_radicacion: new Date('2024-08-10T09:00:00Z'),
      cuantia: 450000000.00,
      nivel_riesgo: 'ALTO',
      provision_contable: 360000000.00,
      fecha_estimacion_provision: new Date('2024-09-05T11:00:00Z'),
      observacion_provision: 'Riesgo alto debido a falla en el servicio de almacenamiento de archivos y daño a servidores colindantes.',
      abogado_sustanciador: juridicoUserId,
      termino_procesal_dias: 30,
      tipo_conteo_termino: 'HABILES',
      ultima_actuacion: 'Auto que decreta pruebas notificado por estado.',
      ubicacion_fisica: 'Archivo Oficina Jurídica - Estante 2 - Fila B',
      medio_control: 'Reparación Directa',
      juzgado_conocimiento: 'Tribunal Administrativo de Cundinamarca - Sección Tercera',
      pretension_demandante: 'Indemnización por daños materiales y lucro cesante generados por el incendio originado en las instalaciones de la Territorial Cundinamarca de la ESAP.',
      acto_administrativo_demandado: null,
      fecha_notificacion: new Date('2024-08-25T15:00:00Z'),
      fecha_admision: new Date('2024-08-18T10:00:00Z'),
      fecha_vencimiento_termino: new Date('2024-10-08T17:00:00Z'),
      tipo_id_demandante: 'NIT',
      numero_id_demandante: '901234567-8',
      tipo_id_demandado: 'NIT',
      numero_id_demandado: '899999023-1',
      demandante_direccion: 'Carrera 7 No. 72 - 80, Bogotá',
      demandante_telefono: '6013456789',
      demandante_email: 'juridico@obrasdelcentro.com',
      demandante_apoderado: 'Dr. Fernando Villegas (T.P. 98765CSJ)',
      etapa_procesal: 'PROBATORIA'
    },
    {
      id: 'd3b07384-d113-4a15-bb8a-1a8b10333333',
      radicado: '11001333100520260001200',
      jurisdiccion: 'Contencioso Administrativo',
      tipo_proceso: 'controversias-contractuales',
      demandante: 'Unión Temporal Tecnologías ESAP 2025',
      demandado: 'ESAP',
      estado: 'ACTIVO',
      fecha_radicacion: new Date('2026-02-12T08:30:00Z'),
      cuantia: 820000000.00,
      nivel_riesgo: 'BAJO',
      provision_contable: 0.00,
      fecha_estimacion_provision: new Date('2026-03-01T09:00:00Z'),
      observacion_provision: 'Probabilidad de pérdida remota por cuanto el contratista incumplió las especificaciones técnicas del pliego de condiciones.',
      abogado_sustanciador: juridicoUserId,
      termino_procesal_dias: 35,
      tipo_conteo_termino: 'HABILES',
      ultima_actuacion: 'Demanda notificada a la entidad.',
      ubicacion_fisica: 'Pendiente asignación física - Bandeja de Entrada',
      medio_control: 'Controversias Contractuales',
      juzgado_conocimiento: 'Juzgado 5 Administrativo Oral de Bogotá',
      pretension_demandante: 'Declarar el desequilibrio económico del Contrato de Compraventa No. 1024 de 2025 y ordenar a la ESAP el pago de $820.000.000 por concepto de mayores costos imprevistos.',
      acto_administrativo_demandado: 'Resolución de Liquidación Unilateral No. 1205 de 2025',
      fecha_notificacion: new Date('2026-05-10T11:00:00Z'),
      fecha_admision: new Date('2026-04-20T10:00:00Z'),
      fecha_vencimiento_termino: new Date('2026-06-30T17:00:00Z'),
      tipo_id_demandante: 'NIT',
      numero_id_demandante: '901876543-2',
      tipo_id_demandado: 'NIT',
      numero_id_demandado: '899999023-1',
      demandante_direccion: 'Avenida El Dorado No. 68C - 20, Bogotá',
      demandante_telefono: '3158909876',
      demandante_email: 'representante@uttecnologia.com',
      demandante_apoderado: 'Dr. Alejandro Rojas (T.P. 245612CSJ)',
      etapa_procesal: 'NOTIFICADA'
    },
    {
      id: 'd3b07384-d113-4a15-bb8a-1a8b10444444',
      radicado: '76001400300220260008900',
      jurisdiccion: 'Constitucional',
      tipo_proceso: 'tutela',
      demandante: 'Carlos Arturo Gómez',
      demandado: 'ESAP',
      estado: 'ACTIVO',
      fecha_radicacion: new Date('2026-05-20T08:00:00Z'),
      cuantia: 0.00,
      nivel_riesgo: 'MEDIO',
      provision_contable: 0.00,
      fecha_estimacion_provision: null,
      observacion_provision: null,
      abogado_sustanciador: juridicoUserId,
      termino_procesal_dias: 3,
      tipo_conteo_termino: 'CALENDARIO',
      ultima_actuacion: 'Fallo de primera instancia adverso notificado.',
      ubicacion_fisica: 'Carpeta Virtual - Tutelas Urgent',
      medio_control: 'Tutela',
      juzgado_conocimiento: 'Juzgado Segundo Penal Municipal de Cali',
      pretension_demandante: 'Protección al derecho fundamental a la educación y al debido proceso administrativo. Solicita suspender la sanción disciplinaria académica impuesta por copia en examen final.',
      acto_administrativo_demandado: 'Decisión del Consejo Directivo Territorial Valle de fecha 10 de Mayo de 2026',
      fecha_notificacion: new Date('2026-05-21T09:00:00Z'),
      fecha_admision: new Date('2026-05-20T14:00:00Z'),
      fecha_vencimiento_termino: new Date('2026-05-24T17:00:00Z'),
      tipo_id_demandante: 'CC',
      numero_id_demandante: '1144098765',
      tipo_id_demandado: 'NIT',
      numero_id_demandado: '899999023-1',
      demandante_direccion: 'Calle 5 No. 34 - 56, Cali',
      demandante_telefono: '3007654321',
      demandante_email: 'carlosgomez98@gmail.com',
      demandante_apoderado: 'Ninguno (Acción directa)',
      etapa_procesal: 'SENTENCIA'
    }
  ];

  for (const exp of expedientesJudiciales) {
    await client.query(`
      INSERT INTO legal_management.expedientes (
        id, radicado, jurisdiccion, tipo_proceso, demandante, demandado, estado,
        fecha_radicacion, cuantia, nivel_riesgo, provision_contable, fecha_estimacion_provision,
        observacion_provision, abogado_sustanciador, termino_procesal_dias, tipo_conteo_termino,
        ultima_actuacion, ubicacion_fisica, medio_control, juzgado_conocimiento, pretension_demandante,
        acto_administrativo_demandado, fecha_notificacion, fecha_admision, fecha_vencimiento_termino,
        tipo_id_demandante, numero_id_demandante, tipo_id_demandado, numero_id_demandado,
        demandante_direccion, demandante_telefono, demandante_email, demandante_apoderado,
        etapa_procesal, estado_archivo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, 'ACTIVO')
    `, [
      exp.id, exp.radicado, exp.jurisdiccion, exp.tipo_proceso, exp.demandante, exp.demandado, exp.estado,
      exp.fecha_radicacion, exp.cuantia, exp.nivel_riesgo, exp.provision_contable, exp.fecha_estimacion_provision,
      exp.observacion_provision, exp.abogado_sustanciador, exp.termino_procesal_dias, exp.tipo_conteo_termino,
      exp.ultima_actuacion, exp.ubicacion_fisica, exp.medio_control, exp.juzgado_conocimiento, exp.pretension_demandante,
      exp.acto_administrativo_demandado, exp.fecha_notificacion, exp.fecha_admision, exp.fecha_vencimiento_termino,
      exp.tipo_id_demandante, exp.numero_id_demandante, exp.tipo_id_demandado, exp.numero_id_demandado,
      exp.demandante_direccion, exp.demandante_telefono, exp.demandante_email, exp.demandante_apoderado,
      exp.etapa_procesal
    ]);

    // Insertar Actores asociados (Demandante)
    await client.query(`
      INSERT INTO legal_management.actors (id, expediente_id, nombre, tipo_persona, identificacion, rol, cargo, email, telefono, direccion, apoderado)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'DEMANDANTE', null, $5, $6, $7, $8)
    `, [
      exp.id, exp.demandante, exp.tipo_id_demandante === 'CC' ? 'NATURAL' : 'JURIDICA',
      exp.numero_id_demandante, exp.demandante_email, exp.demandante_telefono, exp.demandante_direccion, exp.demandante_apoderado
    ]);

    // Insertar Actores asociados (Demandado ESAP)
    await client.query(`
      INSERT INTO legal_management.actors (id, expediente_id, nombre, tipo_persona, identificacion, rol, cargo, email, telefono, direccion, apoderado)
      VALUES (gen_random_uuid(), $1, 'ESAP', 'JURIDICA', '899999023-1', 'DEMANDADO', null, 'notificaciones@esap.edu.co', '6013476543', 'Calle 44 No. 53 - 37, Bogotá', null)
    `, [exp.id]);
  }
  console.log('✅ 4 Expedientes y sus correspondientes Actores insertados.');

  // Actuaciones de Defensa Judicial
  console.log('⚙️ Insertando Actuaciones de Defensa Judicial...');
  const actuacionesJudiciales = [
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10111111', tipo: 'CAMBIO_ETAPA', desc: 'Cambio de etapa: RADICACION -> NOTIFICADA', fecha: new Date('2025-04-02T15:00:00Z'), origen: 'MANUAL' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10111111', tipo: 'CONTESTACION', desc: 'Contestación de demanda radicada en el juzgado. Se formularon excepciones de ineptitud sustantiva de la demanda.', fecha: new Date('2025-04-20T11:00:00Z'), origen: 'MANUAL' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10222222', tipo: 'AUDIENCIA', desc: 'Audiencia Inicial del Art. 180 CPACA celebrada de forma virtual. Se fijó el litigio.', fecha: new Date('2024-11-15T09:30:00Z'), origen: 'AUDIENCIA' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10222222', tipo: 'AUTO', desc: 'Auto que decreta las pruebas aportadas por las partes y ordena la práctica de dictamen pericial.', fecha: new Date('2025-02-10T16:00:00Z'), origen: 'AUTO' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10333333', tipo: 'NOTIFICACION', desc: 'Notificación electrónica de la demanda remitida al buzón de notificaciones judiciales.', fecha: new Date('2026-05-10T11:00:00Z'), origen: 'MANUAL' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10333333', tipo: 'TRASLADO', desc: 'Traslado de la demanda por el término de 30 días para contestar.', fecha: new Date('2026-05-12T08:00:00Z'), origen: 'MANUAL' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10444444', tipo: 'AUTO', desc: 'Auto admisorio de la acción de tutela y orden de rendir informe de descargos.', fecha: new Date('2026-05-20T14:30:00Z'), origen: 'AUTO' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10444444', tipo: 'SENTENCIA', desc: 'Fallo de tutela de primera instancia que ampara parcialmente el debido proceso y ordena retrotraer la investigación disciplinaria académica.', fecha: new Date('2026-05-25T16:30:00Z'), origen: 'MANUAL' }
  ];

  for (const act of actuacionesJudiciales) {
    await client.query(`
      INSERT INTO legal_management.actuaciones (id, expediente_id, tipo_actuacion, descripcion, fecha_actuacion, origen, usuario_responsable)
      VALUES ($1, $2, $3, $4, $5, $6, 'Sistema')
    `, [act.id, act.expId, act.tipo, act.desc, act.fecha, act.origen]);
  }
  console.log('✅ Actuaciones insertadas.');

  // Tareas de Defensa Judicial
  console.log('📋 Insertando Tareas de Defensa Judicial...');
  const tareasJudiciales = [
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10111111', titulo: 'Preparar alegatos de conclusión', desc: 'Revisar las pruebas aportadas por la contraparte y proyectar alegatos de conclusión en PDF.', fechaVenc: new Date('2025-06-15T17:00:00Z'), prioridad: 'alta', estado: 'pendiente' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10333333', titulo: 'Contestar demanda UT Tecnologías', desc: 'Proyectar borrador de contestación y solicitar insumos técnicos a la Subdirección de Tecnología.', fechaVenc: new Date('2026-06-10T17:00:00Z'), prioridad: 'alta', estado: 'en_proceso' }
  ];

  for (const t of tareasJudiciales) {
    await client.query(`
      INSERT INTO legal_management.tareas_expediente (id, expediente_id, titulo, descripcion, fecha_vencimiento, prioridad, estado, responsable_id, responsable_nombre, creado_por)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Juridico Prueba', 'Sistema')
    `, [t.id, t.expId, t.titulo, t.desc, t.fechaVenc, t.prioridad, t.estado, juridicoUserId]);
  }
  console.log('✅ Tareas insertadas.');


  // ─────────────────────────────────────────
  // 4. JUZGAMIENTO DISCIPLINARIO (EXPEDIENTES, DECISIONES, EXCEPCIONES)
  // ─────────────────────────────────────────
  console.log('\n⚖️ Insertando Expedientes de Juzgamiento Disciplinario...');
  const disciplinarioUserId = '6117d1a1-451a-4efd-8612-ace53ab40db4'; // Disciplinario Prueba

  const expedientesDisciplinarios = [
    {
      id: 'd3b07384-d113-4a15-bb8a-1a8b10555555',
      radicado: 'PD-2025-0012',
      jurisdiccion: 'DISCIPLINARIO',
      tipo_proceso: 'DISCIPLINARIO',
      demandante: 'ESAP',
      demandado: 'Roberto Mendoza Arias',
      estado: 'ACTIVO',
      fecha_radicacion: new Date('2025-02-15T09:00:00Z'),
      cuantia: 0.00,
      nivel_riesgo: 'MEDIO',
      abogado_sustanciador: disciplinarioUserId,
      fecha_prescripcion: new Date('2030-02-15T09:00:00Z'),
      termino_procesal_dias: 10,
      tipo_conteo_termino: 'HABILES',
      ultima_actuacion: 'Pliego de cargos notificado personalmente al disciplinado.',
      ubicacion_fisica: 'Estante Disciplinario - Sección 3 - Fila A',
      cargo_investigado: 'Director Financiero Territorial Cundinamarca',
      ley_aplicable: 'Ley 1952/2019',
      fecha_hechos: new Date('2024-11-20T10:00:00Z'),
      tipo_falta: 'GRAVISIMA',
      dependencia_investigado: 'Subdirección Administrativa y Financiera',
      hechos: 'Presunto favorecimiento e irregularidades en el proceso de selección y adjudicación de la licitación de mantenimiento del edificio de la territorial.',
      etapa: 'E2_DESCARGOS',
      etapa_procesal: 'INDAGACION_PREVIA'
    },
    {
      id: 'd3b07384-d113-4a15-bb8a-1a8b10666666',
      radicado: 'PD-2026-0003',
      jurisdiccion: 'DISCIPLINARIO',
      tipo_proceso: 'DISCIPLINARIO',
      demandante: 'ESAP',
      demandado: 'Gloria Isabel Patiño Suárez',
      estado: 'ACTIVO',
      fecha_radicacion: new Date('2026-01-10T10:00:00Z'),
      cuantia: 0.00,
      nivel_riesgo: 'BAJO',
      abogado_sustanciador: disciplinarioUserId,
      fecha_prescripcion: new Date('2031-01-10T10:00:00Z'),
      termino_procesal_dias: 30,
      tipo_conteo_termino: 'HABILES',
      ultima_actuacion: 'Alegatos de conclusión presentados por la defensa.',
      ubicacion_fisica: 'Estante Disciplinario - Sección 1 - Fila B',
      cargo_investigado: 'Director Administrativo Sede Central',
      ley_aplicable: 'Ley 1952/2019',
      fecha_hechos: new Date('2025-08-15T09:00:00Z'),
      tipo_falta: 'LEVE_CULPOSA',
      dependencia_investigado: 'Subdirección Administrativa y Financiera',
      hechos: 'Incumplimiento reiterado del deber de control de asistencia del personal de planta a su cargo durante el periodo de Agosto a Octubre de 2025.',
      etapa: 'E5_FALLO_1I',
      etapa_procesal: 'INDAGACION_PREVIA'
    }
  ];

  for (const exp of expedientesDisciplinarios) {
    await client.query(`
      INSERT INTO legal_management.expedientes (
        id, radicado, jurisdiccion, tipo_proceso, demandante, demandado, estado,
        fecha_radicacion, cuantia, nivel_riesgo, abogado_sustanciador, fecha_prescripcion,
        termino_procesal_dias, tipo_conteo_termino, ultima_actuacion, ubicacion_fisica,
        cargo_investigado, ley_aplicable, fecha_hechos, tipo_falta, dependencia_investigado,
        hechos, etapa, etapa_procesal, estado_archivo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'ACTIVO')
    `, [
      exp.id, exp.radicado, exp.jurisdiccion, exp.tipo_proceso, exp.demandante, exp.demandado, exp.estado,
      exp.fecha_radicacion, exp.cuantia, exp.nivel_riesgo, exp.abogado_sustanciador, exp.fecha_prescripcion,
      exp.termino_procesal_dias, exp.tipo_conteo_termino, exp.ultima_actuacion, exp.ubicacion_fisica,
      exp.cargo_investigado, exp.ley_applicable, exp.fecha_hechos, exp.tipo_falta, exp.dependencia_investigado,
      exp.hechos, exp.etapa, exp.etapa_procesal
    ]);
  }
  console.log('✅ 2 Expedientes disciplinarios creados.');

  // Actuaciones Disciplinarias
  console.log('⚙️ Insertando Actuaciones Disciplinarias...');
  const actuacionesDisciplinarias = [
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10555555', tipo: 'AUTO', desc: 'Auto de apertura de investigación disciplinaria.', fecha: new Date('2025-02-28T09:00:00Z'), origen: 'AUTO' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10555555', tipo: 'CARGO', desc: 'Auto de formulación de pliego de cargos.', fecha: new Date('2025-04-15T15:00:00Z'), origen: 'AUTO' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10666666', tipo: 'DESCARGOS', desc: 'Presentación de descargos por escrito y solicitud de pruebas testimoniales.', fecha: new Date('2026-02-05T10:30:00Z'), origen: 'MANUAL' },
    { id: genUuid(), expId: 'd3b07384-d113-4a15-bb8a-1a8b10666666', tipo: 'ALEGATOS', desc: 'Traslado para alegar de conclusión. Defensa presenta memorial.', fecha: new Date('2026-05-18T16:00:00Z'), origen: 'MANUAL' }
  ];

  for (const act of actuacionesDisciplinarias) {
    await client.query(`
      INSERT INTO legal_management.actuaciones (id, expediente_id, tipo_actuacion, descripcion, fecha_actuacion, origen, usuario_responsable)
      VALUES ($1, $2, $3, $4, $5, $6, 'Sistema')
    `, [act.id, act.expId, act.tipo, act.desc, act.fecha, act.origen]);
  }

  // Decisión Disciplinaria
  console.log('⚖️ Insertando Decisión Disciplinaria para Fallo 1ª Instancia...');
  await client.query(`
    INSERT INTO legal_management.decisiones_disciplinarias (id, expediente_id, tipo_decision, tipo_fallo, sancion, consideraciones, fundamentos_juridicos, responsable, cargo_responsable, fecha)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    'a1111111-2222-3333-4444-555555555555',
    'd3b07384-d113-4a15-bb8a-1a8b10666666',
    'FALLO_SANCIONATORIO',
    'PRIMERA_INSTANCIA',
    'Amonestación escrita en hoja de vida civil y suspensión del cargo por 15 días.',
    'Se encuentra plenamente demostrado que la investigada incurrió en falta de supervisión del personal, según planillas de control biométrico aportadas.',
    'Artículo 34 numeral 1 de la Ley 1952 de 2019.',
    'Disciplinario Prueba',
    'Abogado Sustanciador OCID',
    new Date('2026-05-26T12:00:00Z')
  ]);

  // Excepción Procesal
  console.log('⚠️ Insertando Excepción Procesal en Juzgamiento...');
  await client.query(`
    INSERT INTO legal_management.excepciones_procesales (id, expediente_id, tipo, descripcion, fundamento, presentado_por, estado, fecha_presentacion)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    'b1111111-2222-3333-4444-555555555555',
    'd3b07384-d113-4a15-bb8a-1a8b10555555',
    'NULIDAD',
    'Solicitud de nulidad de lo actuado a partir de la formulación de cargos por presunta indebida notificación personal.',
    'Violación al debido proceso por omitir el envío de la citación para notificación al correo institucional registrado.',
    'Apoderado del investigado (Dr. Jorge Eliécer)',
    'PENDIENTE', // TypeORM entity has: 'PENDIENTE'
    '2025-05-10'
  ]);
  console.log('✅ Relaciones de Juzgamiento creadas.');


  // ─────────────────────────────────────────
  // 5. ASESORÍA JURÍDICA (CONSULTAS JURÍDICAS)
  // ─────────────────────────────────────────
  console.log('\n💬 Insertando Consultas Jurídicas (Asesoría)...');
  const consultas = [
    {
      id: 'c3b07384-d113-4a15-bb8a-1a8b10777777',
      numero_radicado: 'CJ-2026-0045',
      fecha_recepcion: new Date('2026-04-10T10:00:00Z'),
      canal_entrada: 'ventanilla_unica',
      tipo_solicitud: 'concepto_juridico',
      dependencia_solicitante: 'Subdirección de Gestión Contractual',
      nombre_solicitante: 'María Camila Vargas',
      cargo_solicitante: 'Profesional Especializado Contratación',
      email_solicitante: 'camila.vargas@esap.edu.co',
      telefono_solicitante: '3004445566',
      tipo_usuario: 'interno',
      materia_juridica: 'contractual',
      descripcion: 'Consulta sobre la viabilidad jurídica de prorrogar el plazo y adicionar el valor del Contrato de Prestación de Servicios de Conectividad No. 985 de 2024, superando el 50% del valor original.',
      antecedentes: 'El contrato fue suscrito el 15 de diciembre de 2024. Presenta dificultades por demoras en la importación de equipos del proveedor.',
      abogado_asignado_id: juridicoUserId,
      abogado_asignado_nombre: 'Juridico Prueba',
      fecha_asignacion: new Date('2026-04-12T14:00:00Z'),
      prioridad: 'media',
      complejidad: 'media',
      termino_legal_dias: 30,
      fecha_maxima_respuesta: new Date('2026-05-24T17:00:00Z'),
      estado: 'respondido',
      numero_oficio_respuesta: 'OFJ-2026-0254',
      fecha_respuesta: new Date('2026-05-20T16:00:00Z'),
      tipo_respuesta: 'favorable',
      documento_respuesta_url: 'https://esap.edu.co/juridica/conceptos/Concepto_CPS_985_2024.pdf',
      respuesta: 'Se concluye que no es jurídicamente viable adicionar el valor del contrato por encima del 50% establecido en el parágrafo del artículo 40 de la Ley 80 de 1993. No obstante, frente al plazo sí es posible prorrogarlo por el tiempo estrictamente necesario para garantizar la continuidad del servicio público sin que esto constituya una adición de valor.',
      destinatarios_adicionales: '["jefe.contratacion@esap.edu.co"]',
      observaciones: 'Se tramitó sin inconvenientes y se notificó a la dependencia de origen.'
    },
    {
      id: 'c3b07384-d113-4a15-bb8a-1a8b10888888',
      numero_radicado: 'CJ-2026-0046',
      fecha_recepcion: new Date('2026-05-18T10:00:00Z'),
      canal_entrada: 'correo_electronico',
      tipo_solicitud: 'concepto_juridico',
      dependencia_solicitante: 'Subdirección de Gestión de Talento Humano',
      nombre_solicitante: 'Pedro Nel Gómez',
      cargo_solicitante: 'Subdirector de Talento Humano',
      email_solicitante: 'pedro.gomez@esap.edu.co',
      telefono_solicitante: '3127654321',
      tipo_usuario: 'interno',
      materia_juridica: 'laboral',
      descripcion: 'Consulta sobre la aplicación retroactiva del incremento salarial para docentes ocasionales de la ESAP vigencia 2026, de conformidad con el Decreto Presidencial de reajuste.',
      antecedentes: 'El decreto de reajuste salarial de la rama ejecutiva nacional fue expedido en mayo de 2026, con vigencia a partir del 1 de enero.',
      abogado_asignado_id: juridicoUserId,
      abogado_asignado_nombre: 'Juridico Prueba',
      fecha_asignacion: new Date('2026-05-19T09:00:00Z'),
      prioridad: 'alta',
      complejidad: 'alta',
      termino_legal_dias: 30,
      fecha_maxima_respuesta: new Date('2026-06-30T17:00:00Z'),
      estado: 'en_analisis',
      numero_oficio_respuesta: null,
      fecha_respuesta: null,
      tipo_respuesta: null,
      documento_respuesta_url: null,
      respuesta: null,
      destinatarios_adicionales: null,
      observaciones: 'Se está recopilando la normativa presupuestal aplicable antes de proyectar el concepto.'
    },
    {
      id: 'c3b07384-d113-4a15-bb8a-1a8b10999999',
      numero_radicado: 'CJ-2026-0047',
      fecha_recepcion: new Date('2026-05-25T11:30:00Z'),
      canal_entrada: 'ventanilla_unica',
      tipo_solicitud: 'consulta',
      dependencia_solicitante: 'Territorial Valle del Cauca',
      nombre_solicitante: 'Claudia Patricia Restrepo',
      cargo_solicitante: 'Directora Territorial Valle',
      email_solicitante: 'claudia.restrepo@esap.edu.co',
      telefono_solicitante: '3119876543',
      tipo_usuario: 'interno',
      materia_juridica: 'administrativa',
      descripcion: 'Consulta sobre la procedencia de ceder el uso del auditorio de la territorial a una asociación privada sin ánimo de lucro para realizar eventos académicos de carácter político.',
      antecedentes: 'La asociación solicitó formalmente el auditorio por escrito para los días 10 y 11 de junio.',
      abogado_asignado_id: null,
      abogado_asignado_nombre: null,
      fecha_asignacion: null,
      prioridad: 'media',
      complejidad: null,
      termino_legal_dias: 30,
      fecha_maxima_respuesta: new Date('2026-07-06T17:00:00Z'),
      estado: 'en_radicacion',
      numero_oficio_respuesta: null,
      fecha_respuesta: null,
      tipo_respuesta: null,
      documento_respuesta_url: null,
      respuesta: null,
      destinatarios_adicionales: null,
      observaciones: 'Pendiente asignación por parte del Jefe de Oficina Jurídica.'
    }
  ];

  for (const c of consultas) {
    await client.query(`
      INSERT INTO legal_management.consultas_juridicas (
        id, numero_radicado, fecha_recepcion, canal_entrada, tipo_solicitud,
        dependencia_solicitante, nombre_solicitante, cargo_solicitante, email_solicitante,
        telefono_solicitante, tipo_usuario, materia_juridica, descripcion, antecedentes,
        abogado_asignado_id, abogado_asignado_nombre, fecha_asignacion, prioridad, complejidad,
        termino_legal_dias, fecha_maxima_respuesta, estado, numero_oficio_respuesta,
        fecha_respuesta, tipo_respuesta, documento_respuesta_url, respuesta,
        destinatarios_adicionales, observaciones, estado_archivo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, 'ACTIVO')
    `, [
      c.id, c.numero_radicado, c.fecha_recepcion, c.canal_entrada, c.tipo_solicitud,
      c.dependencia_solicitante, c.nombre_solicitante, c.cargo_solicitante, c.email_solicitante,
      c.telefono_solicitante, c.tipo_usuario, c.materia_juridica, c.descripcion, c.antecedentes,
      c.abogado_asignado_id, c.abogado_asignado_nombre, c.fecha_asignacion, c.prioridad, c.complejidad,
      c.termino_legal_dias, c.fecha_maxima_respuesta, c.estado, c.numero_oficio_respuesta,
      c.fecha_respuesta, c.tipo_respuesta, c.documento_respuesta_url, c.respuesta,
      c.destinatarios_adicionales, c.observaciones
    ]);
  }
  console.log('✅ 3 Consultas de Asesoría Jurídica creadas.');


  // ─────────────────────────────────────────
  // 6. PROCESOS COACTIVOS (PROCESOS, PAGOS)
  // ─────────────────────────────────────────
  console.log('\n💵 Insertando Procesos Coactivos...');
  const coactivos = [
    {
      id: 'f3b07384-d113-4a15-bb8a-1a8b10aaaaaa',
      radicado: 'PC-2025-0089',
      deudor: { nombre: 'Consorcio Mantenimiento Educativo 2024', identificacion: '901999888-1', telefono: '3201112233', email: 'contacto@mantenimientoedu.com', direccion: 'Av. Cll 26 No. 45 - 90, Bogotá' },
      obligacion: { concepto: 'MULTA', valor: 45000000.00, fechaVencimiento: '2024-11-10' },
      estado: 'COACTIVA',
      responsable: 'Juridico Prueba',
      documentos_adjuntos: 2,
      valor_pagado: 15000000.00,
      saldo_pendiente: 30000000.00,
      fecha_ejecutoria: new Date('2025-01-20T09:00:00Z'),
      tipo_interes_aplicable: 'DIAN',
      valor_costas: 1500000.00,
      notificaciones_enviadas: 3,
      observaciones: 'El ejecutado realizó un abono parcial de $15.000.000. Se requiere dictar mandamiento de pago por el saldo pendiente de $30.000.000 más intereses y costas.',
      ultima_actuacion: new Date('2026-05-10T14:30:00Z'),
      fecha_creacion: new Date('2025-02-01T08:00:00Z')
    },
    {
      id: 'f3b07384-d113-4a15-bb8a-1a8b10bbbbbb',
      radicado: 'PC-2026-0002',
      deudor: { nombre: 'Sofía Patricia Rojas Torres', identificacion: '1015432765', telefono: '3154567890', email: 'sofia.rojas@gmail.com', direccion: 'Transversal 5 No. 67 - 23, Tunja' },
      obligacion: { concepto: 'MATRICULA', valor: 3200000.00, fechaVencimiento: '2025-07-20' },
      estado: 'PERSUASIVA',
      responsable: 'Juridico Prueba',
      documentos_adjuntos: 1,
      valor_pagado: 0.00,
      saldo_pendiente: 3200000.00,
      fecha_ejecutoria: new Date('2025-10-15T10:00:00Z'),
      tipo_interes_aplicable: 'DIAN',
      valor_costas: 0.00,
      notificaciones_enviadas: 1,
      observaciones: 'Se envió oficio persuasivo para pago voluntario. El término vence en 15 días.',
      ultima_actuacion: new Date('2026-05-15T09:00:00Z'),
      fecha_creacion: new Date('2026-03-10T08:00:00Z')
    },
    {
      id: 'f3b07384-d113-4a15-bb8a-1a8b10cccccc',
      radicado: 'PC-2025-0041',
      deudor: { nombre: 'Luis Fernando Galindo', identificacion: '19456123', telefono: '3009876543', email: 'luis.galindo@outlook.com', direccion: 'Manzana C Casa 12, Ibagué' },
      obligacion: { concepto: 'RECUPERACION_RECURSOS', valor: 12500000.00, fechaVencimiento: '2025-03-05' },
      estado: 'MEDIDAS_CAUTELARES',
      responsable: 'Juridico Prueba',
      documentos_adjuntos: 3,
      valor_pagado: 0.00,
      saldo_pendiente: 12500000.00,
      fecha_ejecutoria: new Date('2025-05-10T09:00:00Z'),
      tipo_interes_aplicable: 'USURA',
      valor_costas: 800000.00,
      notificaciones_enviadas: 2,
      observaciones: 'Se profirió auto ordenando el embargo de cuentas bancarias en Bancolombia y Davivienda, y del vehículo de placas BCD-123.',
      ultima_actuacion: new Date('2026-05-02T11:00:00Z'),
      fecha_creacion: new Date('2025-06-01T08:00:00Z')
    }
  ];

  for (const pc of coactivos) {
    await client.query(`
      INSERT INTO legal_management.procesos_coactivos (
        id, radicado, deudor, obligacion, estado, responsable, documentos_adjuntos,
        valor_pagado, saldo_pendiente, fecha_ejecutoria, tipo_interes_aplicable,
        valor_costas, notificaciones_enviadas, observaciones, ultima_actuacion,
        fecha_creacion, estado_archivo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'ACTIVO')
    `, [
      pc.id, pc.radicado, JSON.stringify(pc.deudor), JSON.stringify(pc.obligacion), pc.estado, pc.responsable,
      pc.documentos_adjuntos, pc.valor_pagado, pc.saldo_pendiente, pc.fecha_ejecutoria, pc.tipo_interes_aplicable,
      pc.valor_costas, pc.notificaciones_enviadas, pc.observaciones, pc.ultima_actuacion, pc.fecha_creacion
    ]);
  }

  // Insertar Pago Coactivo para PC-2025-0089
  console.log('💵 Insertando Pago Coactivo...');
  await client.query(`
    INSERT INTO legal_management.pagos_coactivos (id, proceso_id, valor, abono_capital, abono_intereses, abono_costas, fecha_pago, soporte_url, origen, observaciones)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    'e1111111-2222-3333-4444-555555555555',
    'f3b07384-d113-4a15-bb8a-1a8b10aaaaaa',
    15000000.00,
    15000000.00,
    0.00,
    0.00,
    new Date('2025-04-10T11:00:00Z'),
    'https://esap.edu.co/coactivos/pagos/soporte_rec_0012548.pdf',
    'MANUAL',
    'Abono parcial de capital aprobado por Tesorería.'
  ]);
  console.log('✅ Procesos Coactivos y Pagos creados.');


  // ─────────────────────────────────────────
  // 7. ÓRGANOS DE CONTROL (REQUERIMIENTOS, DOCUMENTOS, COMENTARIOS)
  // ─────────────────────────────────────────
  console.log('\n🏛️ Insertando Requerimientos de Órganos de Control...');
  const requerimientos = [
    {
      id: 'a3b07384-d113-4a15-bb8a-1a8b10dddddd',
      radicado_externo: 'CGR-2026-98754',
      radicado_interno: 'OC-2026-0012',
      organismo_id: '1', // CGR
      tipo_requerimiento: 'SOLICITUD_INFORMACION',
      asunto: 'Solicitud de información sobre contratación directa en vigencia 2025',
      descripcion: 'Remitir listado de contratos de prestación de servicios profesionales suscritos de manera directa por la Dirección General durante la vigencia 2025.',
      fecha_recepcion: '2026-05-18',
      unidad_tiempo: 'DIAS_HABILES',
      plazo_otorgado: 10,
      fecha_vencimiento: '2026-06-02',
      funcionario_responsable: 'Subdirector de Gestión Contractual',
      area_responsable: 'Oficina Asesora Jurídica',
      abogado_asignado_id: juridicoUserId,
      estado: 'EN_RESPUESTA',
      prioridad: 'ALTA',
      archivo_adjunto_url: 'https://esap.edu.co/cgr/requerimiento_cgr_98754.pdf',
      observaciones: 'Se solicitaron insumos a la Subdirección Administrativa el 19 de mayo.',
      created_by: 'Super User'
    },
    {
      id: 'a3b07384-d113-4a15-bb8a-1a8b10eeeeee',
      radicado_externo: 'PGN-2026-00125',
      radicado_interno: 'OC-2026-0013',
      organismo_id: '2', // PGN
      tipo_requerimiento: 'FUNCION_PREVENTIVA',
      asunto: 'Proceso de selección de Subdirectores Territoriales de la ESAP',
      descripcion: 'Vigilancia preventiva al proceso de convocatoria pública para la designación de Directores Territoriales.',
      fecha_recepcion: '2026-05-25',
      unidad_tiempo: 'DIAS_HABILES',
      plazo_otorgado: 15,
      fecha_vencimiento: '2026-06-16',
      funcionario_responsable: 'Subdirector de Alto Gobierno',
      area_responsable: 'Subdirección Académica',
      abogado_asignado_id: null,
      estado: 'RECIBIDO',
      prioridad: 'CRITICA',
      archivo_adjunto_url: 'https://esap.edu.co/pgn/vigilancia_preventiva_territoriales.pdf',
      observaciones: 'Pendiente asignación jurídica.',
      created_by: 'Super User'
    }
  ];

  for (const req of requerimientos) {
    await client.query(`
      INSERT INTO legal_management.requerimientos_oc (
        id, radicado_externo, radicado_interno, organismo_id, tipo_requerimiento,
        asunto, descripcion, fecha_recepcion, unidad_tiempo, plazo_otorgado,
        fecha_vencimiento, funcionario_responsable, area_responsable, abogado_asignado_id,
        estado, prioridad, archivo_adjunto_url, observaciones, created_by,
        estado_archivo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'ACTIVO', NOW(), NOW())
    `, [
      req.id, req.radicado_externo, req.radicado_interno, req.organismo_id, req.tipo_requerimiento,
      req.asunto, req.descripcion, req.fecha_recepcion, req.unidad_tiempo, req.plazo_otorgado,
      req.fecha_vencimiento, req.funcionario_responsable, req.area_responsable, req.abogado_asignado_id,
      req.estado, req.prioridad, req.archivo_adjunto_url, req.observaciones, req.created_by
    ]);

    // Documento OC asociado
    await client.query(`
      INSERT INTO legal_management.documentos_oc (id, requerimiento_id, nombre, tipo_documento, archivo_url, subido_por, created_at)
      VALUES (gen_random_uuid(), $1, $2, 'oficio', $3, 'Super User', NOW())
    `, [req.id, `${req.radicado_externo}_Oficio.pdf`, req.archivo_adjunto_url]);
  }
  console.log('✅ Requerimientos y Documentos de órganos de control creados.');


  // ─────────────────────────────────────────
  // 8. RIESGOS (RIESGOS DE GESTIÓN Y CUMPLIMIENTO)
  // ─────────────────────────────────────────
  console.log('\n⚡ Insertando Riesgos...');
  const riesgos = [
    {
      id: 'b3b07384-d113-4a15-bb8a-1a8b10ffffff',
      codigo: 'RG-COACTIVOS-01',
      nombre: 'Prescripción de la Acción de Cobro Coactivo',
      descripcion: 'Riesgo de pérdida de la facultad de cobro por vencimiento de los términos legales establecidos para adelantar el cobro de obligaciones coactivas.',
      proceso: 'Cobro Coactivo',
      tipo_riesgo: 'FISCAL',
      etapa: 'MONITOREO',
      probabilidad_inherente: 3,
      impacto_inherente: 4,
      zona_inherente: 'ALTO',
      probabilidad_residual: 2,
      impacto_residual: 3,
      zona_residual: 'MODERADO',
      causas: ['Demora en la remisión de los títulos ejecutivos por las dependencias de origen', 'Falta de un sistema automatizado de alertas de vencimientos de plazos', 'Sobrecarga de trabajo de los abogados sustanciadores'],
      consecuencias: ['Pérdida de recursos públicos por extinción de las obligaciones de cobro', 'Investigaciones de carácter disciplinario y fiscal para los funcionarios implicados', 'Detrimento patrimonial de la entidad'],
      controles_existentes: [{ id: 'C01', descripcion: 'Revisión trimestral del estado de prescripciones de la cartera coactiva', efectividad: 75 }],
      plan_tratamiento: [{ accion: 'Implementar módulo automatizado de alertas del término de cobros', responsable: 'Oficina Asesora de Planeación / Oficina Jurídica', fechaLimite: new Date('2026-10-30T17:00:00Z'), estado: 'EN_CURSO', avance: 40 }],
      responsable: 'CARLOS ANDRES MENDOZA SILVA',
      responsable_id: '756acfd7-2f3d-44f8-903c-e3a24a8b40dc',
      cuantia_estimada: 120000000.00,
      provision_contable: 36000000.00,
      porcentaje_provision: 30,
      modulo_origen: 'COACTIVOS'
    },
    {
      id: 'b3b07384-d113-4a15-bb8a-1a8b10eeeeee',
      codigo: 'RG-DEFENSA-02',
      nombre: 'Pérdida de Procesos Judiciales por Notificaciones Extemporáneas',
      descripcion: 'Riesgo de fallo judicial en contra por la falta de contestación de demandas dentro de los plazos legales, ocasionado por fallas o demoras en la canalización del buzón de notificaciones judiciales.',
      proceso: 'Defensa Judicial',
      tipo_riesgo: 'GESTION',
      etapa: 'TRATAMIENTO',
      probabilidad_inherente: 4,
      impacto_inherente: 5,
      zona_inherente: 'EXTREMO',
      probabilidad_residual: 2,
      impacto_residual: 3,
      zona_residual: 'BAJO',
      causas: ['Descoordinación en la recepción de correspondencia', 'Uso de múltiples buzones informales no parametrizados', 'Falta de protocolo claro de asignación inmediata de expedientes'],
      consecuencias: ['Declaratoria de condenas contra la ESAP en rebeldía', 'Pérdida de la oportunidad procesal de presentar pruebas', 'Pérdida de credibilidad institucional'],
      controles_existentes: [{ id: 'C02', descripcion: 'Buzón unificado de notificaciones judiciales centralizado y monitoreado diariamente', efectividad: 90 }],
      plan_tratamiento: [{ accion: 'Suscripción de capacitaciones y protocolos con el centro de comunicaciones', responsable: 'Líder de Defensa Judicial', fechaLimite: new Date('2026-07-15T17:00:00Z'), estado: 'COMPLETADA', avance: 100 }],
      responsable: 'Juridico Prueba',
      responsable_id: juridicoUserId,
      cuantia_estimada: 500000000.00,
      provision_contable: 50000000.00,
      porcentaje_provision: 10,
      modulo_origen: 'DEFENSA_JUDICIAL'
    }
  ];

  for (const r of riesgos) {
    await client.query(`
      INSERT INTO legal_management.riesgos (
        id, codigo, nombre, descripcion, proceso, tipo_riesgo, etapa,
        probabilidad_inherente, impacto_inherente, zona_inherente,
        probabilidad_residual, impacto_residual, zona_residual,
        causas, consecuencias, controles_existentes, plan_tratamiento,
        responsable, responsable_id, cuantia_estimada, provision_contable,
        porcentaje_provision, modulo_origen, estado, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 'ACTIVO', 'Super User', NOW(), NOW())
    `, [
      r.id, r.codigo, r.nombre, r.descripcion, r.proceso, r.tipo_riesgo, r.etapa,
      r.probabilidad_inherente, r.impacto_inherente, r.zona_inherente,
      r.probabilidad_residual, r.impacto_residual, r.zona_residual,
      JSON.stringify(r.causas), JSON.stringify(r.consecuencias), JSON.stringify(r.controles_existentes),
      JSON.stringify(r.plan_tratamiento), r.responsable, r.responsable_id, r.cuantia_estimada,
      r.provision_contable, r.porcentaje_provision, r.modulo_origen
    ]);
  }
  console.log('✅ 2 Riesgos creados.');


  // ─────────────────────────────────────────
  // 9. PLANES DE MEJORAMIENTO & HALLAZGOS
  // ─────────────────────────────────────────
  console.log('\n📋 Insertando Planes de Mejoramiento y Hallazgos...');
  const planes = [
    {
      id: 'e3b07384-d113-4a15-bb8a-1a8b10111111',
      codigo: 'PM-2025-0012',
      titulo: 'Fortalecimiento del Control y Asignación de Notificaciones Judiciales',
      descripcion: 'Plan derivado del hallazgo de la auditoría interna OCIG-024 de 2025, enfocado en corregir debilidades en los tiempos de respuesta y radicación de notificaciones de demandas.',
      origen: 'HALLAZGO_AUDITORIA',
      responsable_id: juridicoUserId,
      responsable_nombre: 'Juridico Prueba',
      fecha_inicio: new Date('2025-11-01'),
      fecha_fin_estimada: new Date('2026-06-30'),
      avance_porcentaje: 50.00,
      presupuesto: 15000000.00,
      estado: 'EN_EJECUCION',
      documento_origen: 'Informe Final de Auditoría Interna OCIG-2025.pdf',
      area_responsable: 'Oficina Asesora Jurídica',
      fecha_recepcion: new Date('2025-10-15'),
      fecha_respuesta: new Date('2025-10-25'),
      severidad: 'ALTO'
    },
    {
      id: 'e3b07384-d113-4a15-bb8a-1a8b10222222',
      codigo: 'PM-2026-0002',
      titulo: 'Optimización del Proceso de Cobro Coactivo de la ESAP',
      descripcion: 'Plan enfocado en reducir el índice de cartera coactiva pendiente mediante depuración de títulos y ejecución ágil de medidas cautelares.',
      origen: 'RIESGO',
      origen_id: 'b3b07384-d113-4a15-bb8a-1a8b10ffffff', // links to Risk 1
      responsable_id: juridicoUserId,
      responsable_nombre: 'Juridico Prueba',
      fecha_inicio: new Date('2026-02-01'),
      fecha_fin_estimada: new Date('2026-11-30'),
      avance_porcentaje: 0.00,
      presupuesto: 8000000.00,
      estado: 'ABIERTO',
      documento_origen: 'Matriz de Riesgos Institucionales - Vigencia 2026',
      area_responsable: 'Subdirección de Cartera / Oficina Jurídica',
      fecha_recepcion: new Date('2026-01-15'),
      fecha_respuesta: new Date('2026-01-20'),
      severidad: 'MEDIO'
    }
  ];

  for (const pm of planes) {
    await client.query(`
      INSERT INTO legal_management.planes_mejoramiento (
        id, codigo, titulo, descripcion, origen, origen_id, responsable_id, responsable_nombre,
        fecha_inicio, fecha_fin_estimada, avance_porcentaje, presupuesto, estado, documento_origen,
        area_responsable, fecha_recepcion, fecha_respuesta, severidad, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
    `, [
      pm.id, pm.codigo, pm.titulo, pm.descripcion, pm.origen, pm.origen_id, pm.responsable_id, pm.responsable_nombre,
      pm.fecha_inicio, pm.fecha_fin_estimada, pm.avance_porcentaje, pm.presupuesto, pm.estado, pm.documento_origen,
      pm.area_responsable, pm.fecha_recepcion, pm.fecha_respuesta, pm.severidad
    ]);
  }

  // Insertar Planes Hallazgos asociados
  const planHallazgos = [
    { id: 'f1111111-2222-3333-4444-555555555555', planId: 'e3b07384-d113-4a15-bb8a-1a8b10111111', nombre: 'Ausencia de conciliación de radicados con despachos judiciales', desc: 'Se evidenció que no existe un cruce periódico entre el reporte de demandas de la ESAP y la base de datos de la rama judicial (Siglo XXI / SAMAI).', avance: 60 },
    { id: 'f2222222-2222-3333-4444-555555555555', planId: 'e3b07384-d113-4a15-bb8a-1a8b10111111', nombre: 'Ineficiencia en la asignación de apoderados', desc: 'Demoras superiores a 5 días hábiles en la expedición de poderes a abogados sustanciadores para asumir la representación judicial.', avance: 40 },
    { id: 'f3333333-2222-3333-4444-555555555555', planId: 'e3b07384-d113-4a15-bb8a-1a8b10222222', nombre: 'Falta de depuración periódica de deudas de menor cuantía', desc: 'Existencia de obligaciones inferiores a 1 SMMLV con más de 3 años de antigüedad sin estudio de costo-beneficio para cobro coactivo.', avance: 0 }
  ];

  for (const ph of planHallazgos) {
    await client.query(`
      INSERT INTO legal_management.planes_hallazgos (id, plan_id, nombre, descripcion, porcentaje_avance, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'Juridico Prueba', NOW(), NOW())
    `, [ph.id, ph.planId, ph.nombre, ph.desc, ph.avance]);
  }

  // Insertar un Hallazgo vinculante para el requerimiento CGR de Órganos de Control
  console.log('🏛️ Insertando Hallazgo en la tabla principal de Hallazgos vinculados...');
  await client.query(`
    INSERT INTO legal_management.hallazgos (
      id, requerimiento_id, codigo_hallazgo, numero_interno, tipo_hallazgo, titulo, descripcion,
      causa_raiz, efecto, area_responsable, funcionario_responsable, accion_correctiva,
      fecha_compromiso, indicador_cumplimiento, meta_indicador, estado, porcentaje_avance,
      fecha_ultimo_reporte, fecha_proximo_reporte, periodicidad_reporte, created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
  `, [
    '01111111-2222-3333-4444-555555555555',
    'a3b07384-d113-4a15-bb8a-1a8b10dddddd', // Requerimiento 1 CGR
    'HAL-2026-CGR-01',
    'HI-0254',
    'FISCAL',
    'Pagos en exceso por servicios de conectividad no prestados',
    'Se constataron desembolsos correspondientes a cánones mensuales de internet para sedes territoriales cerradas temporalmente durante el receso académico de 2025.',
    'Falta de comunicación oportuna entre la Dirección Territorial y la Subdirección de Tecnología para ordenar la suspensión del servicio.',
    'Detrimento patrimonial estimado en $25.000.000 COP.',
    'Subdirección de Tecnología / Oficina Jurídica',
    'Líder de Infraestructura Tecnológica',
    'Implementar protocolo de suspensión de servicios por receso y adelantar reclamación formal de reintegro ante el proveedor.',
    '2026-08-30',
    'Resolución o acta de reintegro de fondos por parte del operador de internet.',
    '100% de los fondos reintegrados',
    'EN_CURSO',
    35,
    new Date('2026-05-10T09:00:00Z'),
    '2026-08-10',
    'TRIMESTRAL',
    'Super User'
  ]);
  console.log('✅ Planes y Hallazgos creados exitosamente.');


  // ─────────────────────────────────────────
  // 10. PEI INDICADORES & REGISTROS DE AVANCE
  // ─────────────────────────────────────────
  console.log('\n📊 Insertando Indicadores PEI...');
  const peiIndicadores = [
    {
      id: 1,
      nombre: 'Eficiencia en la Defensa Judicial de la ESAP',
      descripcion: 'Porcentaje de sentencias judiciales favorables de primera y segunda instancia notificadas a la ESAP sobre el total de fallos de fondo proferidos en el periodo.',
      eje: 'GESTION',
      meta: 85.00,
      unidad: 'PORCENTAJE',
      inicio: '2026-01-01',
      fin: '2026-12-31',
      frecuencia: 'TRIMESTRAL',
      responsableId: juridicoUserId,
      responsableNombre: 'Juridico Prueba',
      prioridad: 'ALTA',
      tipo: 'GESTION'
    },
    {
      id: 2,
      nombre: 'Tiempo Promedio de Respuesta a Consultas y Conceptos',
      descripcion: 'Porcentaje de conceptos y consultas jurídicas resueltas dentro de los términos legales establecidos (30 días hábiles) en el periodo.',
      eje: 'GESTION',
      meta: 95.00,
      unidad: 'PORCENTAJE',
      inicio: '2026-01-01',
      fin: '2026-12-31',
      frecuencia: 'MENSUAL',
      responsableId: juridicoUserId,
      responsableNombre: 'Juridico Prueba',
      prioridad: 'MEDIA',
      tipo: 'GESTION'
    },
    {
      id: 3,
      nombre: 'Cumplimiento de Acciones de Planes de Mejoramiento',
      descripcion: 'Porcentaje de acciones correctivas y de mejora implementadas y certificadas en los planes de mejoramiento suscritos frente al total de compromisos vencidos.',
      eje: 'TRANSPARENCIA',
      meta: 100.00,
      unidad: 'PORCENTAJE',
      inicio: '2026-01-01',
      fin: '2026-12-31',
      frecuencia: 'SEMESTRAL',
      responsableId: '50c8e692-3204-4451-9284-06dd0f56eb81', // Jefe OCI
      responsableNombre: 'Jefe OCI',
      prioridad: 'ALTA',
      tipo: 'CALIDAD'
    }
  ];

  for (const pei of peiIndicadores) {
    await client.query(`
      INSERT INTO legal_management.pei_indicadores (
        id, nombre, descripcion, eje_estrategico, meta_objetivo, unidad_medida,
        fecha_inicio, fecha_fin, frecuencia_medicion, responsable_id, responsable_nombre,
        estado, prioridad, tipo_indicador, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVO', $12, $13, NOW(), NOW())
    `, [
      pei.id, pei.nombre, pei.descripcion, pei.eje, pei.meta, pei.unidad,
      pei.inicio, pei.fin, pei.frecuencia, pei.responsableId, pei.responsableNombre,
      pei.prioridad, pei.tipo
    ]);
  }

  // Insertar registros de avance para PEI
  console.log('📊 Insertando Registros de Avance PEI...');
  const peiAvances = [
    { indicadorId: 1, valorReportado: 88.50, porcentajeAvance: 104.11, obs: 'Primer trimestre de 2026 cerró con un total de 18 fallos de fondo de los cuales 16 resultaron favorables a la ESAP.', url: 'https://esap.edu.co/juridica/pei/Informe_Defensa_Q1_2026.pdf', usr: juridicoUserId },
    { indicadorId: 2, valorReportado: 92.00, porcentajeAvance: 96.84, obs: 'En el mes de marzo se respondieron 23 consultas a tiempo y 2 consultas con retraso por complejidad.', url: 'https://esap.edu.co/juridica/pei/Reporte_Consultas_Marzo_2026.pdf', usr: juridicoUserId }
  ];

  for (const av of peiAvances) {
    await client.query(`
      INSERT INTO legal_management.pei_registros_avance (indicador_id, valor_reportado, porcentaje_avance, observaciones, evidencia_url, usuario_registra_id, fecha_registro)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [av.indicadorId, av.valorReportado, av.porcentajeAvance, av.obs, av.url, av.usr]);
  }
  console.log('✅ Indicadores y Avances PEI insertados.');

  // ─────────────────────────────────────────
  // 11. CORREOS Y COMUNICACIONES JURÍDICAS
  // ─────────────────────────────────────────
  console.log('\n📬 Insertando Correos y Comunicaciones Jurídicas...');
  const correos = [
    {
      id: 'a3b07384-d113-4a15-bb8a-1a8b10900001',
      graphMessageId: 'graph-msg-tutela-001',
      asunto: 'Notificación de admisión de tutela - Derecho a la educación',
      remitenteEmail: 'notificaciones@juzgados.ramajudicial.gov.co',
      remitenteNombre: 'Juzgado 33 Administrativo del Circuito de Bogotá',
      destinatarios: 'notificaciones.judiciales@esap.edu.co',
      fechaRecepcion: new Date('2026-05-20T08:00:00Z'),
      cuerpoHtml: '<p>El Juzgado 33 Administrativo de Bogotá admite tutela interpuesta por estudiante en contra de ESAP por presunta vulneración al derecho fundamental a la educación.</p>',
      cuerpoTexto: 'El Juzgado 33 Administrativo de Bogotá admite tutela interpuesta por estudiante en contra de ESAP por presunta vulneración al derecho fundamental a la educación.',
      tieneAdjuntos: true,
      leido: false,
      archivado: false,
      urgente: true,
      tipo: 'JUDICIAL',
      categoria: 'Acción de Tutela',
      moduloSugerido: 'Defensa Judicial',
      confianzaClasificacion: 0.95,
      direccion: 'ENTRANTE'
    },
    {
      id: 'a3b07384-d113-4a15-bb8a-1a8b10900002',
      graphMessageId: 'graph-msg-pet-001',
      asunto: 'Consulta sobre requisitos para inscripción de título',
      remitenteEmail: 'ciudadano@gmail.com',
      remitenteNombre: 'Juan Carlos Pérez Trujillo',
      destinatarios: 'contacto@esap.edu.co',
      fechaRecepcion: new Date('2026-05-24T10:15:00Z'),
      cuerpoHtml: '<p>Ciudadano solicita información sobre procedimiento y documentos necesarios para inscribir título profesional obtenido en ESAP.</p>',
      cuerpoTexto: 'Ciudadano solicita información sobre procedimiento y documentos necesarios para inscribir título profesional obtenido en ESAP.',
      tieneAdjuntos: false,
      leido: false,
      archivado: false,
      urgente: false,
      tipo: 'CORREO',
      categoria: 'Derecho de Petición',
      moduloSugerido: 'Asesoría Jurídica',
      confianzaClasificacion: 0.92,
      direccion: 'ENTRANTE'
    },
    {
      id: 'a3b07384-d113-4a15-bb8a-1a8b10900003',
      graphMessageId: 'graph-msg-cgr-001',
      asunto: 'Requerimiento Contraloría - Información presupuestal',
      remitenteEmail: 'notificaciones@cgr.gov.co',
      remitenteNombre: 'Contraloría General de la República',
      destinatarios: 'notificaciones.judiciales@esap.edu.co',
      fechaRecepcion: new Date('2026-05-25T14:30:00Z'),
      cuerpoHtml: '<p>La Contraloría General solicita información detallada sobre ejecución presupuestal del último trimestre 2025 en las territoriales.</p>',
      cuerpoTexto: 'La Contraloría General solicita información detallada sobre ejecución presupuestal del último trimestre 2025 en las territoriales.',
      tieneAdjuntos: true,
      leido: false,
      archivado: false,
      urgente: true,
      tipo: 'CORREO',
      categoria: 'Órgano de Control',
      moduloSugerido: 'Órganos de Control',
      confianzaClasificacion: 0.98,
      direccion: 'ENTRANTE'
    },
    {
      id: 'a3b07384-d113-4a15-bb8a-1a8b10900004',
      graphMessageId: 'graph-msg-oficio-001',
      asunto: 'Concepto jurídico sobre modificación contractual',
      remitenteEmail: 'jorge.contratacion@esap.edu.co',
      remitenteNombre: 'Subdirección Financiera - ESAP',
      destinatarios: 'oficina.juridica@esap.edu.co',
      fechaRecepcion: new Date('2026-05-25T09:00:00Z'),
      cuerpoHtml: '<p>La Subdirección Financiera solicita concepto jurídico sobre viabilidad de modificación del contrato 045-2025.</p>',
      cuerpoTexto: 'La Subdirección Financiera solicita concepto jurídico sobre viabilidad de modificación del contrato 045-2025.',
      tieneAdjuntos: true,
      leido: true,
      archivado: false,
      urgente: false,
      tipo: 'OFICIO',
      categoria: 'Oficio Interno',
      moduloSugerido: 'Asesoría Jurídica',
      confianzaClasificacion: 0.88,
      direccion: 'ENTRANTE'
    }
  ];

  for (const c of correos) {
    await client.query(`
      INSERT INTO legal_management.correos_juridicos (
        id, graph_message_id, asunto, remitente_email, remitente_nombre, destinatarios,
        fecha_recepcion, cuerpo_html, cuerpo_texto, tiene_adjuntos, leido, archivado,
        urgente, tipo, categoria, modulo_sugerido, confianza_clasificacion, direccion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      c.id, c.graphMessageId, c.asunto, c.remitenteEmail, c.remitenteNombre, c.destinatarios,
      c.fechaRecepcion, c.cuerpoHtml, c.cuerpoTexto, c.tieneAdjuntos, c.leido, c.archivado,
      c.urgente, c.tipo, c.categoria, c.moduloSugerido, c.confianzaClasificacion, c.direccion
    ]);

    if (c.tieneAdjuntos) {
      await client.query(`
        INSERT INTO legal_management.adjuntos_correo (
          id, correo_id, graph_message_id, graph_attachment_id, nombre, content_type, tamanio, archivo_local_url, descargado
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'application/pdf', 102456, $5, true)
      `, [
        c.id,
        c.graphMessageId,
        `attach-id-${c.id}`,
        c.tipo === 'JUDICIAL' ? 'admision_tutela.pdf' : 'requerimiento_cgr.pdf',
        c.tipo === 'JUDICIAL' ? 'https://esap.edu.co/documentos/admision_tutela.pdf' : 'https://esap.edu.co/documentos/requerimiento_cgr.pdf'
      ]);
    }
  }
  console.log('✅ 4 Correos y Comunicaciones creados exitosamente.');

  // ─────────────────────────────────────────
  // 12. TIPOS DE REQUERIMIENTO (CATÁLOGO)
  // ─────────────────────────────────────────
  console.log('\n📋 Insertando Tipos de Requerimientos de Órganos de Control...');
  const tiposRequerimientos = [
    { id: 'SOLICITUD_INFORMACION', nombre: 'Solicitud de Información', desc: 'Requerimientos orientados a recabar información o documentos.', activo: true, orden: 1 },
    { id: 'FUNCION_PREVENTIVA', nombre: 'Función Preventiva', desc: 'Vigilancia preventiva y solicitudes de actuación para evitar faltas o fallos.', activo: true, orden: 2 },
    { id: 'AUDITORIA', nombre: 'Auditoría', desc: 'Acciones de auditoría formal por parte de entes de control.', activo: true, orden: 3 },
    { id: 'VISITA_INSPECCION', nombre: 'Visita de Inspección', desc: 'Visitas y revisiones in situ a dependencias de la ESAP.', activo: true, orden: 4 }
  ];

  for (const tr of tiposRequerimientos) {
    await client.query(`
      INSERT INTO legal_management.cat_tipos_requerimiento (
        id, nombre, descripcion, activo, orden, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `, [tr.id, tr.nombre, tr.desc, tr.activo, tr.orden]);
  }
  console.log('✅ 4 Tipos de Requerimientos creados.');

  await client.end();
  console.log('\n🎉 ¡Seeding de Gestión Legal completado exitosamente!');
}

function genUuid() {
  return require('crypto').randomUUID();
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err);
  process.exit(1);
});
