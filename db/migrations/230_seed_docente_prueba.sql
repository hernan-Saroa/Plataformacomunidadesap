-- Migration 230: Docente de prueba "Docente Prueba".
-- Email institucional (login y visible): tmfattal@esap.edu.co
-- Correo real de notificaciones (auth.personas.dir_email, usado por el mailer): tmfattal@gmail.com
-- Se comporta como usuario válido: auth.personas + auth."user" + rol DOCENTE + academic_work_plan."Docente".
-- Idempotente. Contraseña inicial '123456'.

DO $$
DECLARE
  v_docente_role uuid;
  v_person_id uuid;
  v_user_id uuid;
  v_seccional bigint;
  v_pwd text := '$2b$10$lWsenGxE2s8d4IxweYD2Jue13J6V6vPUP3vS1sx9TeRcwVcaCxjD2';
  v_num text := '1090000000';
  v_username text := 'tmfattal@esap.edu.co';
  v_email_notif text := 'tmfattal@gmail.com';
  v_email_inst text := 'tmfattal@esap.edu.co';
BEGIN
  SELECT id INTO v_docente_role FROM auth.role WHERE UPPER(code) = 'DOCENTE' OR UPPER(name) = 'DOCENTE' LIMIT 1;
  IF v_docente_role IS NULL THEN
    RAISE EXCEPTION 'No existe rol DOCENTE en auth.role';
  END IF;

  -- Seccional Sede Central (o la primera disponible)
  SELECT id_seccional INTO v_seccional FROM auth.seccionales
  WHERE UPPER(NULLIF(BTRIM(cod_seccional), '')) = 'SC' ORDER BY id_seccional LIMIT 1;
  IF v_seccional IS NULL THEN
    SELECT id_seccional INTO v_seccional FROM auth.seccionales ORDER BY id_seccional LIMIT 1;
  END IF;

  -- 1) auth.personas (dir_email = correo de notificación real → gmail)
  SELECT id_person INTO v_person_id FROM auth.personas WHERE num_identificacion = v_num LIMIT 1;
  IF v_person_id IS NULL THEN
    SELECT id_person INTO v_person_id FROM auth.personas WHERE LOWER(dir_email) = LOWER(v_email_notif) LIMIT 1;
  END IF;
  IF v_person_id IS NULL THEN
    v_person_id := gen_random_uuid();
    INSERT INTO auth.personas (
      id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero,
      pri_apellido, seg_apellido, gen_tercero, dir_email, id_seccional,
      fec_creacion, fec_modificacion, usu_creacion, usu_modificacion
    ) VALUES (
      v_person_id, v_num, 'CC', 'Docente Prueba', 'Docente',
      'Prueba', NULL, 'N', v_email_notif, v_seccional,
      NOW(), NOW(), 'migration_230', 'migration_230'
    );
  ELSE
    UPDATE auth.personas
    SET dir_email = v_email_notif, nom_largo = 'Docente Prueba', id_seccional = COALESCE(id_seccional, v_seccional),
        fec_modificacion = NOW(), usu_modificacion = 'migration_230'
    WHERE id_person = v_person_id;
  END IF;

  -- 2) auth."user" (username = email institucional → login)
  SELECT id_user INTO v_user_id FROM auth."user"
  WHERE LOWER(username) = LOWER(v_username) OR id_person = v_person_id LIMIT 1;
  IF v_user_id IS NULL THEN
    INSERT INTO auth."user" (id_user, username, password_hash, id_person, is_active, password_temp, created_at, updated_at)
    VALUES (gen_random_uuid(), v_username, v_pwd, v_person_id, true, true, NOW(), NOW())
    RETURNING id_user INTO v_user_id;
  ELSE
    UPDATE auth."user"
    SET id_person = v_person_id, password_hash = v_pwd, is_active = true, updated_at = NOW()
    WHERE id_user = v_user_id;
  END IF;

  -- 3) rol DOCENTE
  IF NOT EXISTS (SELECT 1 FROM auth.user_roles WHERE id_user = v_user_id AND id_rol = v_docente_role) THEN
    INSERT INTO auth.user_roles (id_user, id_rol) VALUES (v_user_id, v_docente_role);
  END IF;

  -- 4) academic_work_plan."Docente" (correoInstitucional = email institucional visible)
  IF NOT EXISTS (SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = v_person_id OR d.id = v_person_id::text) THEN
    INSERT INTO academic_work_plan."Docente" (
      id, "personaId", "territorialId", "tipoVinculacion", dedicacion, estado,
      "horasAsignables", "correoInstitucional", "createdAt", "updatedAt"
    ) VALUES (
      v_person_id::text, v_person_id, v_seccional::text, 'CARRERA_003', 'Tiempo Completo', 'ACTIVO',
      800, v_email_inst, NOW(), NOW()
    );
  ELSE
    UPDATE academic_work_plan."Docente"
    SET "correoInstitucional" = v_email_inst, estado = 'ACTIVO', "updatedAt" = NOW()
    WHERE "personaId" = v_person_id;
  END IF;
END $$;