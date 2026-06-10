-- Migration 216: Seed official ESAP academic programs and base asignaturas.
-- La tabla ACTIVA es academic_work_plan.programas (creada en migración 300).
-- El endpoint GET /auth/api/v1/programas-academicos lee de esa tabla.
-- academic_work_plan."Asignatura" guarda el plan de estudios (FK programaId -> programas.id).

DO $$
BEGIN
  CREATE TEMP TABLE tmp_pta_programa_seed (
    id uuid PRIMARY KEY,
    codigo text NOT NULL,
    nombre text NOT NULL,
    nivel text NOT NULL,
    facultad text NOT NULL,
    modalidad text NOT NULL,
    jornada text NOT NULL,
    sede text NOT NULL,
    duracion integer,
    creditos integer,
    estado text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_pta_programa_seed (id, codigo, nombre, nivel, facultad, modalidad, jornada, sede, duracion, creditos, estado)
  VALUES
    ('055118cc-895e-4e9a-a64b-047c436c59f7'::uuid, 'AP_Diurno', 'Administración Pública - Diurno', 'Pregrado', 'Facultad de Pregrado', 'Presencial', 'Diurna', 'Bogotá', 10, 160, 'ACTIVO'),
    ('8dced35a-12c8-44a8-a1de-0ed60f882954'::uuid, 'AP_Nocturno', 'Administración Pública - Nocturno', 'Pregrado', 'Facultad de Pregrado', 'Presencial', 'Nocturna', 'Bogotá', 10, 160, 'ACTIVO'),
    ('cae0f4b2-fc47-4e45-a523-5a4e0d38c6bb'::uuid, 'APT', 'Administración Pública Territorial', 'Pregrado', 'Facultad de Pregrado', 'Presencial', 'Diurna', 'Nacional', 10, 160, 'ACTIVO'),
    ('65b32ee1-e935-4ea0-ad9f-75fd99ca4c37'::uuid, 'Economia_Publica', 'Economía Pública', 'Pregrado', 'Facultad de Pregrado', 'Presencial', 'Diurna', 'Bogotá', 10, 160, 'ACTIVO'),
    ('01e9aed0-fc97-48f1-a565-a03f22f9dc62'::uuid, 'Alta_Direccion_Estado_ESP', 'Especialización en Alta Dirección del Estado', 'Especialización', 'Facultad de Posgrados', 'Presencial', 'Mixta', 'Bogotá', 2, 28, 'ACTIVO'),
    ('95f81ef0-d4ac-4f80-ace0-7dd0cef586cd'::uuid, 'Derechos_Humanos_ESP', 'Especialización en Derechos Humanos', 'Especialización', 'Facultad de Posgrados', 'Presencial', 'Mixta', 'Bogotá', 2, 28, 'ACTIVO'),
    ('93a70719-9076-44e5-aa9f-9d1e00ba923d'::uuid, 'Finanzas_Publicas_ESP', 'Especialización en Finanzas Públicas', 'Especialización', 'Facultad de Posgrados', 'Presencial', 'Mixta', 'Bogotá', 2, 28, 'ACTIVO'),
    ('e9fc371e-2fc4-4505-a1e0-8b692fcbc8ce'::uuid, 'GEPUR_ESP', 'Especialización en Gestión y Planificación Urbana y Regional', 'Especialización', 'Facultad de Posgrados', 'Presencial', 'Mixta', 'Bogotá', 2, 28, 'ACTIVO'),
    ('780225e6-97a5-4cac-a76d-c75add01264a'::uuid, 'Gerencia_Social_ESP', 'Especialización en Gerencia Social', 'Especialización', 'Facultad de Posgrados', 'Presencial', 'Mixta', 'Bogotá', 2, 28, 'ACTIVO'),
    ('be3ff6ec-7b89-4a35-ab4e-6fdb4e30d9f3'::uuid, 'Gestion_Publica_ESP', 'Especialización en Gestión Pública', 'Especialización', 'Facultad de Posgrados', 'Presencial', 'Mixta', 'Bogotá', 2, 28, 'ACTIVO'),
    ('9fda5af6-0cf0-4c40-a5a9-b516946efe7c'::uuid, 'Proyectos_Desarrollo_ESP', 'Especialización en Proyectos de Desarrollo', 'Especialización', 'Facultad de Posgrados', 'Presencial', 'Mixta', 'Bogotá', 2, 28, 'ACTIVO'),
    ('99ac91a2-9593-4ec8-ae9d-78dea310d5cb'::uuid, 'MAP_Distancia', 'Maestría en Administración Pública - Distancia', 'Maestría', 'Facultad de Posgrados', 'Distancia', 'Mixta', 'Nacional', 4, 48, 'ACTIVO'),
    ('3a6a64c1-9478-4cb3-a1a9-a2d918375820'::uuid, 'MAP_Presencial', 'Maestría en Administración Pública - Presencial', 'Maestría', 'Facultad de Posgrados', 'Presencial', 'Mixta', 'Bogotá', 4, 48, 'ACTIVO'),
    ('7a737691-b084-4b67-abaf-1f82676b2ec2'::uuid, 'Maestria_DDHH', 'Maestría en Derechos Humanos, Gestión de la Transición y Posconflicto', 'Maestría', 'Facultad de Posgrados', 'Presencial', 'Mixta', 'Bogotá', 4, 48, 'ACTIVO'),
    ('37166c9b-4eaf-47db-ab94-971972c1c614'::uuid, 'DOC_AP', 'Doctorado en Administración Pública', 'Doctorado', 'Facultad de Posgrados', 'Presencial', 'Mixta', 'Bogotá', 8, 80, 'ACTIVO'),
    ('b1f5cb23-31b5-48b7-a7be-25279b2b4ae4'::uuid, 'TEC_GPC', 'Tecnología en Gestión Pública Contable', 'Pregrado', 'Facultad de Pregrado', 'Presencial', 'Diurna', 'Nacional', 6, 96, 'ACTIVO'),
    ('486fcbbc-2a0a-40dc-af11-8136c6605d6c'::uuid, 'APT_DIST', 'Administración Pública Territorial - Distancia', 'Pregrado', 'Facultad de Pregrado', 'Distancia', 'Mixta', 'Nacional', 10, 160, 'ACTIVO'),
    ('d7698dcd-3b0e-4f64-ac0c-e6ccec61bf52'::uuid, 'CPEL', 'Centro de Prácticas y Educación Continua', 'Extensión', 'CPEL', 'Mixta', 'Flexible', 'Nacional', 1, 0, 'ACTIVO');

  -- ============================================================
  -- Insertar/actualizar en la tabla ACTIVA: academic_work_plan.programas
  -- ============================================================
  INSERT INTO academic_work_plan.programas (
    id, codigo, nombre, nivel_formacion, facultad, modalidad, jornada, sede, duracion, creditos, estado, created_at, updated_at
  )
  SELECT id, codigo, nombre, nivel, facultad, modalidad, jornada, sede, duracion, creditos, estado, NOW(), NOW()
  FROM tmp_pta_programa_seed seed
  WHERE NOT EXISTS (
    SELECT 1 FROM academic_work_plan.programas p
    WHERE p.id = seed.id OR p.codigo = seed.codigo OR LOWER(p.nombre) = LOWER(seed.nombre)
  );

  UPDATE academic_work_plan.programas p
  SET codigo          = seed.codigo,
      nombre          = seed.nombre,
      nivel_formacion = seed.nivel,
      facultad        = seed.facultad,
      modalidad       = seed.modalidad,
      jornada         = seed.jornada,
      sede            = seed.sede,
      duracion        = seed.duracion,
      creditos        = seed.creditos,
      estado          = seed.estado,
      updated_at      = NOW()
  FROM tmp_pta_programa_seed seed
  WHERE p.id = seed.id;

END $$;

-- ============================================================
-- Asignaturas base (plan de estudios) — bloque independiente y tolerante.
-- Si la tabla "Asignatura" no existe en este entorno, no aborta los programas ya insertados.
-- ============================================================
DO $$
BEGIN
  IF to_regclass('academic_work_plan."Asignatura"') IS NULL THEN
    RAISE NOTICE 'Tabla academic_work_plan."Asignatura" no existe; se omiten asignaturas base.';
    RETURN;
  END IF;

  ALTER TABLE academic_work_plan."Asignatura" ADD COLUMN IF NOT EXISTS modalidad varchar;
  ALTER TABLE academic_work_plan."Asignatura" ADD COLUMN IF NOT EXISTS tipo varchar;

  INSERT INTO academic_work_plan."Asignatura" (
    id, "programaId", nombre, codigo, creditos, horas, "nucleoTematico", semestre, "createdAt", "updatedAt"
  )
  VALUES
    ('b4dfd616-23ee-4bc8-a799-d92770eab050', '37166c9b-4eaf-47db-ab94-971972c1c614', 'Seminario Doctoral I',                      'DOC_AP-BASE-001',  4, 192, 'Investigación Doctoral',          '1'),
    ('948f085d-b5f6-4490-aed0-8a356dd33c2c', '37166c9b-4eaf-47db-ab94-971972c1c614', 'Teoría Avanzada del Estado',                'DOC_AP-BASE-002',  4, 192, 'Estado y Poder',                  '1'),
    ('87c86311-2df4-41ae-aeef-c3932e943076', 'b1f5cb23-31b5-48b7-a7be-25279b2b4ae4', 'Fundamentos de Gestión Pública Contable',  'TEC_GPC-BASE-001', 3, 144, 'Gestión Contable Pública',        '1'),
    ('c13762ba-98c1-4138-a3cf-540ce1d00966', 'b1f5cb23-31b5-48b7-a7be-25279b2b4ae4', 'Presupuesto Público Territorial',           'TEC_GPC-BASE-002', 3, 144, 'Finanzas Públicas',               '2'),
    ('ec674d87-7700-4b52-af64-74a794ad6b7b', '486fcbbc-2a0a-40dc-af11-8136c6605d6c', 'Administración Pública Territorial I',      'APT_DIST-BASE-001',3, 144, 'Desarrollo y Gestión Territorial','1'),
    ('00a9f798-33e3-498a-ad7c-c70d49ff7bf2', '486fcbbc-2a0a-40dc-af11-8136c6605d6c', 'Gobierno Digital Territorial',              'APT_DIST-BASE-002',3, 144, 'Gestión Pública',                 '2'),
    ('f0253ceb-9418-4f81-a409-6e48dd1d6cdf', 'd7698dcd-3b0e-4f64-ac0c-e6ccec61bf52', 'Educación Continua para la Gestión Pública','CPEL-BASE-001',   1,  48, 'Extensión',                       '1'),
    ('c8d8df50-5e31-45b3-ad21-cb5467a7e385', 'd7698dcd-3b0e-4f64-ac0c-e6ccec61bf52', 'Práctica Institucional Aplicada',           'CPEL-BASE-002',   1,  48, 'Extensión',                       '1')
  ON CONFLICT (id) DO UPDATE
  SET "programaId" = EXCLUDED."programaId",
      nombre       = EXCLUDED.nombre,
      codigo       = EXCLUDED.codigo,
      creditos     = EXCLUDED.creditos,
      horas        = EXCLUDED.horas,
      "nucleoTematico" = EXCLUDED."nucleoTematico",
      semestre     = EXCLUDED.semestre,
      "updatedAt"  = NOW();
END $$;