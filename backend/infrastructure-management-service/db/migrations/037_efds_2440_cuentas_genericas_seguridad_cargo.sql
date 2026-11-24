-- ============================================================================
-- Migración 037: EFDS-2440 (RF-INF-015)
-- Seguridad y Gestión de Accesos por Cargo (Cuentas Genéricas Institucionales)
--
-- Exigencia del ERS v0.2 Numeral 5.2 y 5.3:
-- 1. Roles, accesos y responsabilidades se definen por cargo y no por persona natural.
-- 2. Cuentas de acceso genéricas por cargo institucional (rotación de contratistas).
-- 3. Coordinador GIM como único administrador funcional y custodio de credenciales.
-- 4. Exigencia de cambio periódico de contraseñas (política 90 días).
-- 5. Registro riguroso en bitácora de acciones por cuenta (auditoría inmutable).
-- ============================================================================

DO $$
DECLARE
  v_hash VARCHAR := '$2b$10$QW1WKkucfvXNAtl/ppEf/OLx9IH/ieKD/tmkG84f7DPsz5CFoGUdW'; -- Esap2026*
  v_role_p5_id UUID;
  v_role_p2_id UUID;
  v_role_p3_id UUID;
  v_role_p4_id UUID;
  v_role_p1_id UUID;
  v_role_p7_id UUID;
  v_role_dt_id UUID;
  v_role_cetap_id UUID;

  v_cargo_coord_gim BIGINT;
  v_cargo_asig_umi BIGINT;
  v_cargo_tec_elec BIGINT;
  v_cargo_tec_multi BIGINT;
  v_cargo_radic_infra BIGINT;
  v_cargo_calidad BIGINT;
  v_cargo_coord_dt BIGINT;
  v_cargo_resp_cetap BIGINT;

  v_user_id UUID;
  v_person_id UUID;
BEGIN
  -- 1. Agregar columna de control de caducidad periódica de contraseñas en auth.user
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'user') THEN
    ALTER TABLE auth."user" ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- 2. Asegurar cargos de Infraestructura en auth.cargos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'cargos') THEN
    INSERT INTO auth.cargos (cod_cargo, nom_cargo, descripcion, nivel_jerarquico, activo, creado_en, actualizado_en)
    VALUES
      ('COORD-GIM', 'Coordinador Grupo Infraestructura y Mantenimiento', 'Administrador funcional y custodio del módulo de Infraestructura (ERS 5.2)', 'DIRECTIVO', true, now(), now()),
      ('ANAL-ASIG-UMI', 'Analista Asignador UMI', 'Encargado UMI / Asignador y analista de solicitudes centrales (ERS 5.2)', 'PROFESIONAL', true, now(), now()),
      ('TEC-ELEC-UMI', 'Técnico Electricista UMI', 'Técnico especialista categoría CS_002 y redes eléctricas (ERS 5.2)', 'TECNICO', true, now(), now()),
      ('TEC-MULTI-UMI', 'Técnico Multipropósito UMI', 'Técnico UMI de mantenimiento locativo y obras menores (ERS 5.2)', 'TECNICO', true, now(), now()),
      ('RADIC-INFRA', 'Radicador de Infraestructura', 'Radica solicitudes institucionales en nombre de áreas (ERS 5.2)', 'ASISTENCIAL', true, now(), now()),
      ('AUD-CAL-UMI', 'Auditor de Calidad UMI', 'Seguimiento de auditoría, calidad e indicadores consolidados (ERS 5.2)', 'PROFESIONAL', true, now(), now()),
      ('COORD-ADM-DT', 'Coordinador Administrativo y Financiero DT', 'Enlace territorial / Asignador y validador de solicitudes de la DT (ERS 5.2)', 'DIRECTIVO', true, now(), now()),
      ('RESP-CETAP', 'Responsable CETAP', 'Radica y hace seguimiento a requerimientos del CETAP municipal (ERS 5.2)', 'ASISTENCIAL', true, now(), now())
    ON CONFLICT (cod_cargo) DO UPDATE
      SET nom_cargo = EXCLUDED.nom_cargo, activo = true, actualizado_en = now();
  END IF;

  -- Obtener IDs de roles
  SELECT id INTO v_role_p5_id FROM auth.role WHERE code = 'ADMINISTRADOR_FUNCIONAL_INFRA' LIMIT 1;
  SELECT id INTO v_role_p2_id FROM auth.role WHERE code = 'ANALISTA_ASIGNADOR_UMI' LIMIT 1;
  SELECT id INTO v_role_p3_id FROM auth.role WHERE code = 'TECNICO_ELECTRICO_ESPECIALIZADO' LIMIT 1;
  SELECT id INTO v_role_p4_id FROM auth.role WHERE code = 'TECNICO_UMI_MULTIPROPOSITO' LIMIT 1;
  SELECT id INTO v_role_p1_id FROM auth.role WHERE code = 'RADICADOR_INFRA' LIMIT 1;
  SELECT id INTO v_role_p7_id FROM auth.role WHERE code = 'CONSULTA_CALIDAD_INFRA' LIMIT 1;
  SELECT id INTO v_role_dt_id FROM auth.role WHERE code = 'COORDINADOR_ADMINISTRATIVO_DT' LIMIT 1;
  SELECT id INTO v_role_cetap_id FROM auth.role WHERE code = 'RESPONSABLE_CETAP' LIMIT 1;

  -- Obtener IDs de cargos
  SELECT id_cargo INTO v_cargo_coord_gim FROM auth.cargos WHERE cod_cargo = 'COORD-GIM' LIMIT 1;
  SELECT id_cargo INTO v_cargo_asig_umi FROM auth.cargos WHERE cod_cargo = 'ANAL-ASIG-UMI' LIMIT 1;
  SELECT id_cargo INTO v_cargo_tec_elec FROM auth.cargos WHERE cod_cargo = 'TEC-ELEC-UMI' LIMIT 1;
  SELECT id_cargo INTO v_cargo_tec_multi FROM auth.cargos WHERE cod_cargo = 'TEC-MULTI-UMI' LIMIT 1;
  SELECT id_cargo INTO v_cargo_radic_infra FROM auth.cargos WHERE cod_cargo = 'RADIC-INFRA' LIMIT 1;
  SELECT id_cargo INTO v_cargo_calidad FROM auth.cargos WHERE cod_cargo = 'AUD-CAL-UMI' LIMIT 1;
  SELECT id_cargo INTO v_cargo_coord_dt FROM auth.cargos WHERE cod_cargo = 'COORD-ADM-DT' LIMIT 1;
  SELECT id_cargo INTO v_cargo_resp_cetap FROM auth.cargos WHERE cod_cargo = 'RESP-CETAP' LIMIT 1;

  -- ==========================================================================
  -- 3. Aprovisionamiento de Cuentas Genéricas Institucionales (10 Cuentas Base)
  -- ==========================================================================

  -- Cuenta 1: Coordinación GIM (Central - Administrador Único)
  SELECT u.id_user, p.id_person INTO v_user_id, v_person_id
    FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
   WHERE p.dir_email = 'coordinacion.infraestructura@esap.edu.co' LIMIT 1;
  IF v_user_id IS NULL THEN
    v_person_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, id_cargo, id_seccional, fec_creacion, fec_modificacion)
    VALUES (v_person_id, 'GEN-GIM-001', 'CC', 'Coordinación GIM Institucional', 'Coordinación GIM', 'Institucional', 'O', 'coordinacion.infraestructura@esap.edu.co', v_cargo_coord_gim, 1, now(), now());
    INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active, password_temp, password_changed_at, id_person, created_at, updated_at)
    VALUES (v_user_id, gen_random_uuid(), 'coordinacion.infraestructura@esap.edu.co', v_hash, true, false, now(), v_person_id, now(), now());
  ELSE
    UPDATE auth."user" SET password_hash = v_hash, is_active = true, password_temp = false, password_changed_at = now() WHERE id_user = v_user_id;
    UPDATE auth.personas SET id_cargo = v_cargo_coord_gim, id_seccional = 1 WHERE id_person = v_person_id;
  END IF;
  IF v_role_p5_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at) VALUES (v_user_id, v_role_p5_id, true, now(), now()) ON CONFLICT DO NOTHING;
  END IF;

  -- Cuenta 2: Asignación UMI Central (P2 Analista Asignador)
  SELECT u.id_user, p.id_person INTO v_user_id, v_person_id
    FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
   WHERE p.dir_email = 'asignacion.umi@esap.edu.co' LIMIT 1;
  IF v_user_id IS NULL THEN
    v_person_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, id_cargo, id_seccional, fec_creacion, fec_modificacion)
    VALUES (v_person_id, 'GEN-UMI-002', 'CC', 'Asignador UMI Central', 'Asignación UMI', 'Central', 'O', 'asignacion.umi@esap.edu.co', v_cargo_asig_umi, 1, now(), now());
    INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active, password_temp, password_changed_at, id_person, created_at, updated_at)
    VALUES (v_user_id, gen_random_uuid(), 'asignacion.umi@esap.edu.co', v_hash, true, false, now(), v_person_id, now(), now());
  ELSE
    UPDATE auth."user" SET password_hash = v_hash, is_active = true, password_temp = false, password_changed_at = now() WHERE id_user = v_user_id;
    UPDATE auth.personas SET id_cargo = v_cargo_asig_umi, id_seccional = 1 WHERE id_person = v_person_id;
  END IF;
  IF v_role_p2_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at) VALUES (v_user_id, v_role_p2_id, true, now(), now()) ON CONFLICT DO NOTHING;
  END IF;

  -- Cuenta 3: Técnico Eléctrico Central (P3 Electricista)
  SELECT u.id_user, p.id_person INTO v_user_id, v_person_id
    FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
   WHERE p.dir_email = 'tecnico.electrico@esap.edu.co' LIMIT 1;
  IF v_user_id IS NULL THEN
    v_person_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, id_cargo, id_seccional, fec_creacion, fec_modificacion)
    VALUES (v_person_id, 'GEN-TEC-003', 'CC', 'Técnico Eléctrico UMI', 'Técnico Eléctrico', 'Especializado', 'M', 'tecnico.electrico@esap.edu.co', v_cargo_tec_elec, 1, now(), now());
    INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active, password_temp, password_changed_at, id_person, created_at, updated_at)
    VALUES (v_user_id, gen_random_uuid(), 'tecnico.electrico@esap.edu.co', v_hash, true, false, now(), v_person_id, now(), now());
  ELSE
    UPDATE auth."user" SET password_hash = v_hash, is_active = true, password_temp = false, password_changed_at = now() WHERE id_user = v_user_id;
    UPDATE auth.personas SET id_cargo = v_cargo_tec_elec, id_seccional = 1 WHERE id_person = v_person_id;
  END IF;
  IF v_role_p3_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at) VALUES (v_user_id, v_role_p3_id, true, now(), now()) ON CONFLICT DO NOTHING;
  END IF;

  -- Cuenta 4: Técnico Multipropósito Central (P4)
  SELECT u.id_user, p.id_person INTO v_user_id, v_person_id
    FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
   WHERE p.dir_email = 'tecnico.multiproposito@esap.edu.co' LIMIT 1;
  IF v_user_id IS NULL THEN
    v_person_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, id_cargo, id_seccional, fec_creacion, fec_modificacion)
    VALUES (v_person_id, 'GEN-TEC-004', 'CC', 'Técnico Multipropósito UMI', 'Técnico Multipropósito', 'UMI', 'M', 'tecnico.multiproposito@esap.edu.co', v_cargo_tec_multi, 1, now(), now());
    INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active, password_temp, password_changed_at, id_person, created_at, updated_at)
    VALUES (v_user_id, gen_random_uuid(), 'tecnico.multiproposito@esap.edu.co', v_hash, true, false, now(), v_person_id, now(), now());
  ELSE
    UPDATE auth."user" SET password_hash = v_hash, is_active = true, password_temp = false, password_changed_at = now() WHERE id_user = v_user_id;
    UPDATE auth.personas SET id_cargo = v_cargo_tec_multi, id_seccional = 1 WHERE id_person = v_person_id;
  END IF;
  IF v_role_p4_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at) VALUES (v_user_id, v_role_p4_id, true, now(), now()) ON CONFLICT DO NOTHING;
  END IF;

  -- Cuenta 5: Radicador General Central (P1)
  SELECT u.id_user, p.id_person INTO v_user_id, v_person_id
    FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
   WHERE p.dir_email = 'radicador.central@esap.edu.co' LIMIT 1;
  IF v_user_id IS NULL THEN
    v_person_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, id_cargo, id_seccional, fec_creacion, fec_modificacion)
    VALUES (v_person_id, 'GEN-RAD-005', 'CC', 'Radicador General UMI', 'Radicador General', 'Central', 'O', 'radicador.central@esap.edu.co', v_cargo_radic_infra, 1, now(), now());
    INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active, password_temp, password_changed_at, id_person, created_at, updated_at)
    VALUES (v_user_id, gen_random_uuid(), 'radicador.central@esap.edu.co', v_hash, true, false, now(), v_person_id, now(), now());
  ELSE
    UPDATE auth."user" SET password_hash = v_hash, is_active = true, password_temp = false, password_changed_at = now() WHERE id_user = v_user_id;
    UPDATE auth.personas SET id_cargo = v_cargo_radic_infra, id_seccional = 1 WHERE id_person = v_person_id;
  END IF;
  IF v_role_p1_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at) VALUES (v_user_id, v_role_p1_id, true, now(), now()) ON CONFLICT DO NOTHING;
  END IF;

  -- Cuenta 6: Gestión de Calidad (P7)
  SELECT u.id_user, p.id_person INTO v_user_id, v_person_id
    FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
   WHERE p.dir_email = 'gestion.calidad@esap.edu.co' LIMIT 1;
  IF v_user_id IS NULL THEN
    v_person_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, id_cargo, id_seccional, fec_creacion, fec_modificacion)
    VALUES (v_person_id, 'GEN-CAL-006', 'CC', 'Gestión de Calidad UMI', 'Gestión Calidad', 'Auditoría', 'O', 'gestion.calidad@esap.edu.co', v_cargo_calidad, 1, now(), now());
    INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active, password_temp, password_changed_at, id_person, created_at, updated_at)
    VALUES (v_user_id, gen_random_uuid(), 'gestion.calidad@esap.edu.co', v_hash, true, false, now(), v_person_id, now(), now());
  ELSE
    UPDATE auth."user" SET password_hash = v_hash, is_active = true, password_temp = false, password_changed_at = now() WHERE id_user = v_user_id;
    UPDATE auth.personas SET id_cargo = v_cargo_calidad, id_seccional = 1 WHERE id_person = v_person_id;
  END IF;
  IF v_role_p7_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at) VALUES (v_user_id, v_role_p7_id, true, now(), now()) ON CONFLICT DO NOTHING;
  END IF;

  -- Cuenta 7: Coordinador Administrativo DT Antioquia
  SELECT u.id_user, p.id_person INTO v_user_id, v_person_id
    FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
   WHERE p.dir_email = 'coordinacion.dtantioquia@esap.edu.co' LIMIT 1;
  IF v_user_id IS NULL THEN
    v_person_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, id_cargo, id_seccional, fec_creacion, fec_modificacion)
    VALUES (v_person_id, 'GEN-DTA-007', 'CC', 'Coordinación DT Antioquia', 'Coordinación DT', 'Antioquia', 'O', 'coordinacion.dtantioquia@esap.edu.co', v_cargo_coord_dt, 2, now(), now());
    INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active, password_temp, password_changed_at, id_person, created_at, updated_at)
    VALUES (v_user_id, gen_random_uuid(), 'coordinacion.dtantioquia@esap.edu.co', v_hash, true, false, now(), v_person_id, now(), now());
  ELSE
    UPDATE auth."user" SET password_hash = v_hash, is_active = true, password_temp = false, password_changed_at = now() WHERE id_user = v_user_id;
    UPDATE auth.personas SET id_cargo = v_cargo_coord_dt, id_seccional = 2 WHERE id_person = v_person_id;
  END IF;
  IF v_role_dt_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at) VALUES (v_user_id, v_role_dt_id, true, now(), now()) ON CONFLICT DO NOTHING;
  END IF;

  -- Cuenta 8: Coordinador Administrativo DT Atlántico
  SELECT u.id_user, p.id_person INTO v_user_id, v_person_id
    FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
   WHERE p.dir_email = 'coordinacion.dtatlantico@esap.edu.co' LIMIT 1;
  IF v_user_id IS NULL THEN
    v_person_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, id_cargo, id_seccional, fec_creacion, fec_modificacion)
    VALUES (v_person_id, 'GEN-DTATL-008', 'CC', 'Coordinación DT Atlántico', 'Coordinación DT', 'Atlántico', 'O', 'coordinacion.dtatlantico@esap.edu.co', v_cargo_coord_dt, 3, now(), now());
    INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active, password_temp, password_changed_at, id_person, created_at, updated_at)
    VALUES (v_user_id, gen_random_uuid(), 'coordinacion.dtatlantico@esap.edu.co', v_hash, true, false, now(), v_person_id, now(), now());
  ELSE
    UPDATE auth."user" SET password_hash = v_hash, is_active = true, password_temp = false, password_changed_at = now() WHERE id_user = v_user_id;
    UPDATE auth.personas SET id_cargo = v_cargo_coord_dt, id_seccional = 3 WHERE id_person = v_person_id;
  END IF;
  IF v_role_dt_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at) VALUES (v_user_id, v_role_dt_id, true, now(), now()) ON CONFLICT DO NOTHING;
  END IF;

  -- Cuenta 9: Responsable CETAP Apartadó (Antioquia)
  SELECT u.id_user, p.id_person INTO v_user_id, v_person_id
    FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
   WHERE p.dir_email = 'cetap.apartado@esap.edu.co' LIMIT 1;
  IF v_user_id IS NULL THEN
    v_person_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, id_cargo, id_seccional, id_sede, fec_creacion, fec_modificacion)
    VALUES (v_person_id, 'GEN-CETAP-009', 'CC', 'Responsable CETAP Apartadó', 'Responsable CETAP', 'Apartadó', 'O', 'cetap.apartado@esap.edu.co', v_cargo_resp_cetap, 2, 910005, now(), now());
    INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active, password_temp, password_changed_at, id_person, created_at, updated_at)
    VALUES (v_user_id, gen_random_uuid(), 'cetap.apartado@esap.edu.co', v_hash, true, false, now(), v_person_id, now(), now());
  ELSE
    UPDATE auth."user" SET password_hash = v_hash, is_active = true, password_temp = false, password_changed_at = now() WHERE id_user = v_user_id;
    UPDATE auth.personas SET id_cargo = v_cargo_resp_cetap, id_seccional = 2, id_sede = 910005 WHERE id_person = v_person_id;
  END IF;
  IF v_role_cetap_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at) VALUES (v_user_id, v_role_cetap_id, true, now(), now()) ON CONFLICT DO NOTHING;
  END IF;

  -- Cuenta 10: Responsable CETAP Turbo (Antioquia)
  SELECT u.id_user, p.id_person INTO v_user_id, v_person_id
    FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
   WHERE p.dir_email = 'cetap.turbo@esap.edu.co' LIMIT 1;
  IF v_user_id IS NULL THEN
    v_person_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    INSERT INTO auth.personas (id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email, id_cargo, id_seccional, id_sede, fec_creacion, fec_modificacion)
    VALUES (v_person_id, 'GEN-CETAP-010', 'CC', 'Responsable CETAP Turbo', 'Responsable CETAP', 'Turbo', 'O', 'cetap.turbo@esap.edu.co', v_cargo_resp_cetap, 2, 910032, now(), now());
    INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active, password_temp, password_changed_at, id_person, created_at, updated_at)
    VALUES (v_user_id, gen_random_uuid(), 'cetap.turbo@esap.edu.co', v_hash, true, false, now(), v_person_id, now(), now());
  ELSE
    UPDATE auth."user" SET password_hash = v_hash, is_active = true, password_temp = false, password_changed_at = now() WHERE id_user = v_user_id;
    UPDATE auth.personas SET id_cargo = v_cargo_resp_cetap, id_seccional = 2, id_sede = 910032 WHERE id_person = v_person_id;
  END IF;
  IF v_role_cetap_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at) VALUES (v_user_id, v_role_cetap_id, true, now(), now()) ON CONFLICT DO NOTHING;
  END IF;

END $$;
