-- =============================================================================
-- EFDS-1736 / Migración 016 · Seed idempotente usuarios técnicos DEV / QA
-- Ambientes: esap-dev.fabricasoftware.co / local
-- Propósito: Crea y vincula los 2 técnicos de prueba con USER rol auth +
--            metadata en catalogo TECNICO_MANTENIMIENTO infrastructure-management.
--
-- Técnicos que crea este script:
--   1. Daniel Porky        (porky@esap.edu.co)       → TEC-ELC-001 + TEC-GEN-001
--   2. Hernando A. Prieto  (hernando.prieto@esap.edu.co) → TEC-CAR-001
--
-- Contraseña común para ambos (bcrypt rounds=10 · estándar repo): Esap2026*
--
-- Idempotencia:  Usa INSERT ... ON CONFLICT DO NOTHING; no rompe si los
--                registros ya existen. Actualiza metadata TECNICO_MANTENIMIENTO
--                vía jsonb_set (upsert parcial).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- BLOQUE 1 · auth schema: personas + user + user_roles (Porky + Hernando)
-- ---------------------------------------------------------------------------
SET LOCAL search_path = auth, public;

DO $$
DECLARE
  v_rol_user_id UUID;
  v_password_hash CONSTANT TEXT :=
    '$2b$10$0hAnE/dXPJvVpIFJ48W0yOHy/s1EdCEb1IT/AScUsKmVuYY7BFfJS';
BEGIN
  -- 1. Asegurar el rol USER (debe existir en cualquier ambiente)
  SELECT id INTO STRICT v_rol_user_id FROM role WHERE code = 'USER';

  -- -------------------------------------------------------------
  -- TÉCNICO 1 · Daniel Porky · porky@esap.edu.co
  -- -------------------------------------------------------------
  -- 1a. Persona (id_tercero 123456790 es conocido por reset_all_pwd.js)
  INSERT INTO personas (
    id_tercero, num_identificacion, tip_identificacion,
    nom_largo, nom_tercero, pri_apellido, seg_apellido,
    gen_tercero, fec_nacimiento, dir_residencia,
    dir_email, tel_celular, usu_creacion
  ) VALUES (
    123456790, '123456790', 'CC',
    'Daniel Porky', 'Daniel', 'Porky', NULL,
    'M', '1995-04-15', 'Calle 72 # 9-45, Bogotá',
    'porky@esap.edu.co', '3105550189', 'seed_tec_um016'
  ) ON CONFLICT (id_tercero) DO NOTHING;

  -- 1b. Usuario auth (id_user conocido del ambiente local)
  INSERT INTO "user" (
    id_user, public_id, username, password_hash, is_active,
    id_person, password_temp
  ) SELECT
    '07a01272-5bb0-4de3-83de-f95f31139448',
    COALESCE(NULL, gen_random_uuid()),
    'porky@esap.edu.co',
    v_password_hash,
    true,
    p.id_person,
    false
  FROM personas p WHERE p.id_tercero = 123456790
  ON CONFLICT (id_user) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active
  WHERE "user".username <> EXCLUDED.username
     OR "user".password_hash <> EXCLUDED.password_hash;

  -- 1c. Vinculación USER rol
  INSERT INTO user_roles (id_user, id_rol, is_active, created_at, updated_at)
  SELECT u.id_user, v_rol_user_id, true, NOW(), NOW()
  FROM "user" u
  WHERE u.username = 'porky@esap.edu.co'
  ON CONFLICT DO NOTHING;

  -- -------------------------------------------------------------
  -- TÉCNICO 2 · Hernando Alfonso Prieto · hernando.prieto@esap.edu.co
  -- -------------------------------------------------------------
  -- 2a. Persona
  INSERT INTO personas (
    id_tercero, num_identificacion, tip_identificacion,
    nom_largo, nom_tercero, pri_apellido, seg_apellido,
    gen_tercero, dir_email, tel_celular, usu_creacion
  ) VALUES (
    246801357, '246801357', 'CC',
    'Hernando Alfonso Prieto Martinez', 'Hernando Alfonso', 'Prieto', 'Martinez',
    'M', 'hernando.prieto@esap.edu.co', '+57 310 000 0005', 'seed_tec_um016'
  ) ON CONFLICT (id_tercero) DO NOTHING;

  -- 2b. Usuario auth
  INSERT INTO "user" (
    id_user, public_id, username, password_hash, is_active,
    id_person, password_temp
  ) SELECT
    'f943ee2c-c64d-4928-b927-bd09952a07ef',
    gen_random_uuid(),
    'hernando.prieto@esap.edu.co',
    v_password_hash,
    true,
    p.id_person,
    false
  FROM personas p WHERE p.id_tercero = 246801357
  ON CONFLICT (id_user) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active
  WHERE "user".username <> EXCLUDED.username
     OR "user".password_hash <> EXCLUDED.password_hash;

  -- 2c. Vinculación USER rol
  INSERT INTO user_roles (id_user, id_rol, is_active, created_at, updated_at)
  SELECT u.id_user, v_rol_user_id, true, NOW(), NOW()
  FROM "user" u
  WHERE u.username = 'hernando.prieto@esap.edu.co'
  ON CONFLICT DO NOTHING;

END $$;


-- ---------------------------------------------------------------------------
-- BLOQUE 2 · infrastructure-management schema: TECNICO_MANTENIMIENTO metadata
-- ---------------------------------------------------------------------------
SET LOCAL search_path = "infrastructure-management", public;

-- TEC-ELC-001 · Daniel Porky → correo porky + userid porky (+ carlos.ramirez como secundario histórico)
UPDATE catalogo_item
SET metadata = jsonb_set(
  jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{correos}',
    '["porky@esap.edu.co","carlos.ramirez@esap.edu.co"]'::jsonb,
    true
  ),
  '{usuarioIdsAutorizados}',
  '["07a01272-5bb0-4de3-83de-f95f31139448"]'::jsonb,
  true
)
WHERE catalogo = 'TECNICO_MANTENIMIENTO' AND codigo = 'TEC-ELC-001';

-- TEC-GEN-001 · Jorge Armando Cerón → correo porky + userid porky (hoy el usuario Porky opera como multipropósito por esta vinculación)
UPDATE catalogo_item
SET metadata = jsonb_set(
  jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{correos}',
    '["porky@esap.edu.co"]'::jsonb,
    true
  ),
  '{usuarioIdsAutorizados}',
  '["07a01272-5bb0-4de3-83de-f95f31139448"]'::jsonb,
  true
)
WHERE catalogo = 'TECNICO_MANTENIMIENTO' AND codigo = 'TEC-GEN-001';

-- TEC-CAR-001 · Hernando Alfonso Prieto → correo hernando + userid hernando
UPDATE catalogo_item
SET metadata = jsonb_set(
  jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{correos}',
    '["hernando.prieto@esap.edu.co"]'::jsonb,
    true
  ),
  '{usuarioIdsAutorizados}',
  '["f943ee2c-c64d-4928-b927-bd09952a07ef"]'::jsonb,
  true
)
WHERE catalogo = 'TECNICO_MANTENIMIENTO' AND codigo = 'TEC-CAR-001';


-- ---------------------------------------------------------------------------
-- BLOQUE 3 · Guardia rápida (sanity check): devolver confirmación para log
-- ---------------------------------------------------------------------------
SET LOCAL search_path = "infrastructure-management", public;

SELECT codigo,
       nombre,
       metadata->>'correos'                AS correos_vinculados,
       metadata->>'usuarioIdsAutorizados'  AS userids_vinculados
FROM catalogo_item
WHERE catalogo = 'TECNICO_MANTENIMIENTO'
  AND codigo IN ('TEC-ELC-001','TEC-GEN-001','TEC-CAR-001')
ORDER BY codigo;
