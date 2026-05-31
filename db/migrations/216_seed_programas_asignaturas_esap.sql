-- Migration 216: Seed official ESAP academic programs and base asignaturas.
-- The active table in this repo is academic_work_plan.programas (migration 300).
-- academic_work_plan."Asignatura" already has 430 seed rows from migration 190;
-- this migration adds/normalizes 18 official program rows and base subjects for programs absent from 190.

DO $$
BEGIN
  CREATE TEMP TABLE tmp_pta_programa_seed (
    id uuid PRIMARY KEY,
    codigo text NOT NULL,
    nombre text NOT NULL,
    nivel text NOT NULL,
    facultad text NOT NULL,
    modalidad text NOT NULL,
    duracion integer,
    creditos integer,
    estado text NOT NULL,
    public_id text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_pta_programa_seed (id, codigo, nombre, nivel, facultad, modalidad, duracion, creditos, estado, public_id)
  VALUES
    ('055118cc-895e-4e9a-a64b-047c436c59f7'::uuid, 'AP_Diurno', 'AP Diurno', 'PREGRADO', 'Facultad de Pregrado', 'PRESENCIAL', 10, 160, 'ACTIVO', 'ap-diurno'),
    ('8dced35a-12c8-44a8-a1de-0ed60f882954'::uuid, 'AP_Nocturno', 'AP Nocturno', 'PREGRADO', 'Facultad de Pregrado', 'PRESENCIAL', 10, 160, 'ACTIVO', 'ap-nocturno'),
    ('cae0f4b2-fc47-4e45-a523-5a4e0d38c6bb'::uuid, 'APT', 'Administracion Publica Territorial', 'PREGRADO', 'Facultad de Pregrado', 'PRESENCIAL', 10, 160, 'ACTIVO', 'apt'),
    ('65b32ee1-e935-4ea0-ad9f-75fd99ca4c37'::uuid, 'Economía_Pública', 'Economia Publica', 'PREGRADO', 'Facultad de Pregrado', 'PRESENCIAL', 10, 160, 'ACTIVO', 'ep'),
    ('01e9aed0-fc97-48f1-a565-a03f22f9dc62'::uuid, 'Alta_Dirección_Del_Estado_ESP', 'Especializacion en Alta Direccion del Estado', 'POSGRADO', 'Facultad de Posgrados', 'PRESENCIAL', 2, 28, 'ACTIVO', 'esp-ade'),
    ('95f81ef0-d4ac-4f80-ace0-7dd0cef586cd'::uuid, 'Derechos_Humanos_ESP', 'Especializacion en Derechos Humanos', 'POSGRADO', 'Facultad de Posgrados', 'PRESENCIAL', 2, 28, 'ACTIVO', 'esp-ddh'),
    ('93a70719-9076-44e5-aa9f-9d1e00ba923d'::uuid, 'Finanzas_Públicas_ESP', 'Especializacion en Finanzas Publicas', 'POSGRADO', 'Facultad de Posgrados', 'PRESENCIAL', 2, 28, 'ACTIVO', 'esp-fin'),
    ('e9fc371e-2fc4-4505-a1e0-8b692fcbc8ce'::uuid, 'GEPUR_ESP', 'Especializacion en Gestion y Planificacion Urbana y Regional', 'POSGRADO', 'Facultad de Posgrados', 'PRESENCIAL', 2, 28, 'ACTIVO', 'esp-gep'),
    ('780225e6-97a5-4cac-a76d-c75add01264a'::uuid, 'Gerencia_Social_ESP', 'Especializacion en Gerencia Social', 'POSGRADO', 'Facultad de Posgrados', 'PRESENCIAL', 2, 28, 'ACTIVO', 'esp-ger'),
    ('be3ff6ec-7b89-4a35-ab4e-6fdb4e30d9f3'::uuid, 'Gestión_Pública_ESP', 'Especializacion en Gestion Publica', 'POSGRADO', 'Facultad de Posgrados', 'PRESENCIAL', 2, 28, 'ACTIVO', 'esp-gp'),
    ('9fda5af6-0cf0-4c40-a5a9-b516946efe7c'::uuid, 'Proyectos_de_Desarrollo_ESP', 'Especializacion en Proyectos de Desarrollo', 'POSGRADO', 'Facultad de Posgrados', 'PRESENCIAL', 2, 28, 'ACTIVO', 'esp-pdd'),
    ('99ac91a2-9593-4ec8-ae9d-78dea310d5cb'::uuid, 'Maestria_AdministraciónPública_DISTANCIA', 'Maestria en Administracion Publica - Distancia', 'MAESTRIA', 'Facultad de Posgrados', 'DISTANCIA', 4, 48, 'ACTIVO', 'mae-dist'),
    ('3a6a64c1-9478-4cb3-a1a9-a2d918375820'::uuid, 'Maestria_AdministraciónPública_PRESENCIAL', 'Maestria en Administracion Publica - Presencial', 'MAESTRIA', 'Facultad de Posgrados', 'PRESENCIAL', 4, 48, 'ACTIVO', 'mae-pres'),
    ('7a737691-b084-4b67-abaf-1f82676b2ec2'::uuid, 'Maestria_DDHH_y_Posconflicto', 'Maestria en Derechos Humanos, Gestion de la Transicion y Posconflicto', 'MAESTRIA', 'Facultad de Posgrados', 'PRESENCIAL', 4, 48, 'ACTIVO', 'mae-ddhh'),
    ('37166c9b-4eaf-47db-ab94-971972c1c614'::uuid, 'DOC_AP', 'Doctorado en Administracion Publica', 'DOCTORADO', 'Facultad de Posgrados', 'PRESENCIAL', 8, 80, 'ACTIVO', 'doc-ap'),
    ('b1f5cb23-31b5-48b7-a7be-25279b2b4ae4'::uuid, 'TEC_GPC', 'Tecnologia en Gestion Publica Contable', 'PREGRADO', 'Facultad de Pregrado', 'PRESENCIAL', 6, 96, 'ACTIVO', 'tec-gpc'),
    ('486fcbbc-2a0a-40dc-af11-8136c6605d6c'::uuid, 'APT_DIST', 'Administracion Publica Territorial Distancia', 'PREGRADO', 'Facultad de Pregrado', 'DISTANCIA', 10, 160, 'ACTIVO', 'apt-dist'),
    ('d7698dcd-3b0e-4f64-ac0c-e6ccec61bf52'::uuid, 'CPEL', 'Centro de Practicas y Educacion Continua', 'EXTENSION', 'CPEL', 'MIXTA', 1, 0, 'ACTIVO', 'cpel');

  -- "Programa" solo tiene: id, nombre, descripcion, nivel, facultad, estado, createdAt, updatedAt
  -- Las columnas codigo/modalidad/duracion/creditos no existen en esta tabla; se agregan si faltan
  ALTER TABLE academic_work_plan."Programa" ADD COLUMN IF NOT EXISTS codigo text;
  ALTER TABLE academic_work_plan."Programa" ADD COLUMN IF NOT EXISTS modalidad text;
  ALTER TABLE academic_work_plan."Programa" ADD COLUMN IF NOT EXISTS duracion integer;
  ALTER TABLE academic_work_plan."Programa" ADD COLUMN IF NOT EXISTS creditos integer;

  INSERT INTO academic_work_plan."Programa" (
    id, codigo, nombre, nivel, facultad, modalidad, duracion, creditos, estado, "createdAt", "updatedAt"
  )
  SELECT id::text, codigo, nombre, nivel, facultad, modalidad, duracion, creditos, estado, NOW(), NOW()
  FROM tmp_pta_programa_seed seed
  WHERE NOT EXISTS (
    SELECT 1 FROM academic_work_plan."Programa" p
    WHERE p.id = seed.id::text OR p.codigo = seed.codigo OR LOWER(p.nombre) = LOWER(seed.nombre)
  );

  UPDATE academic_work_plan."Programa" p
  SET codigo    = seed.codigo,
      nombre    = seed.nombre,
      nivel     = seed.nivel,
      facultad  = seed.facultad,
      modalidad = seed.modalidad,
      duracion  = seed.duracion,
      creditos  = seed.creditos,
      estado    = seed.estado,
      "updatedAt" = NOW()
  FROM tmp_pta_programa_seed seed
  WHERE p.id = seed.id::text;

  ALTER TABLE academic_work_plan."Asignatura" ADD COLUMN IF NOT EXISTS modalidad varchar;
  ALTER TABLE academic_work_plan."Asignatura" ADD COLUMN IF NOT EXISTS tipo varchar;

  -- Asignaturas base para programas nuevos (DOC_AP, TEC_GPC, APT_DIST, CPEL)
  -- programaId usa el UUID definido arriba, no el código
  INSERT INTO academic_work_plan."Asignatura" (
    id, "programaId", nombre, codigo, creditos, horas, "nucleoTematico", semestre, "createdAt", "updatedAt"
  )
  VALUES
    ('b4dfd616-23ee-4bc8-a799-d92770eab050', '37166c9b-4eaf-47db-ab94-971972c1c614', 'Seminario Doctoral I',                     'DOC_AP-BASE-001',  4, 192, 'Investigacion Doctoral',           '1'),
    ('948f085d-b5f6-4490-aed0-8a356dd33c2c', '37166c9b-4eaf-47db-ab94-971972c1c614', 'Teoria Avanzada del Estado',                'DOC_AP-BASE-002',  4, 192, 'Estado y Poder',                    '1'),
    ('87c86311-2df4-41ae-aeef-c3932e943076', 'b1f5cb23-31b5-48b7-a7be-25279b2b4ae4', 'Fundamentos de Gestion Publica Contable',  'TEC_GPC-BASE-001', 3, 144, 'Gestion Contable Publica',          '1'),
    ('c13762ba-98c1-4138-a3cf-540ce1d00966', 'b1f5cb23-31b5-48b7-a7be-25279b2b4ae4', 'Presupuesto Publico Territorial',           'TEC_GPC-BASE-002', 3, 144, 'Finanzas Publicas',                 '2'),
    ('ec674d87-7700-4b52-af64-74a794ad6b7b', '486fcbbc-2a0a-40dc-af11-8136c6605d6c', 'Administracion Publica Territorial I',      'APT_DIST-BASE-001',3, 144, 'Desarrollo y Gestion Territorial',  '1'),
    ('00a9f798-33e3-498a-ad7c-c70d49ff7bf2', '486fcbbc-2a0a-40dc-af11-8136c6605d6c', 'Gobierno Digital Territorial',              'APT_DIST-BASE-002',3, 144, 'Gestion Publica',                   '2'),
    ('f0253ceb-9418-4f81-a409-6e48dd1d6cdf', 'd7698dcd-3b0e-4f64-ac0c-e6ccec61bf52', 'Educacion Continua para la Gestion Publica','CPEL-BASE-001',    1,  48, 'Extension',                        '1'),
    ('c8d8df50-5e31-45b3-ad21-cb5467a7e385', 'd7698dcd-3b0e-4f64-ac0c-e6ccec61bf52', 'Practica Institucional Aplicada',           'CPEL-BASE-002',    1,  48, 'Extension',                        '1')
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
