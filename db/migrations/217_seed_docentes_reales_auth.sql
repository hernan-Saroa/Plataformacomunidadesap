-- Migration 217: Seed real auth-linked docentes for PTA.
-- Read-only inspection found 3 docentes currently joinable to auth.personas/auth."user".
-- Historical orphan Docente rows without matching auth.personas are intentionally not invented here.

DO $$
DECLARE
  v_docente_role_id uuid;
  rec record;
  v_person_id uuid;
  v_user_id uuid;
BEGIN
  SELECT id INTO v_docente_role_id
  FROM auth.role
  WHERE UPPER(code) = 'DOCENTE' OR UPPER(name) = 'DOCENTE'
  LIMIT 1;

  IF v_docente_role_id IS NULL THEN
    RAISE EXCEPTION 'No existe rol DOCENTE en auth.role';
  END IF;

  FOR rec IN
    SELECT *
    FROM (VALUES
    ('e4457e86-2bf7-4df9-9ba7-3045565bf54f', '123456792', 'CC', 'Diana Patricia Torres Vega', 'Docente', 'Cátedra', NULL, 'diana.torres@esap.edu.co', NULL, 'catedra@esap.edu.co', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', NULL, 'CARRERA_003', 'Tiempo Completo', 800),
    ('d4e58285-e7ec-4006-8d74-83b1563e7232', '123456791', 'CC', 'Juan Carlos Mendoza García', 'Docente', 'Planta', NULL, 'juan.mendoza@esap.edu.co', NULL, 'planta@esap.edu.co', 'f1fcd15e-adf7-4069-be40-2dc069823265', NULL, 'CARRERA_003', 'Tiempo Completo', 800),
    ('11391602-8120-4d19-a410-097e01a6f6cf', '1014980911', 'CC', 'Tomas Gutierrez', 'Tomas', 'Gutierrez', NULL, 'tomas@esap.edu.co', '3234229335', 'tomas@esap.edu.co', 'f1fcd15e-adf7-4069-be40-2dc069823265', NULL, 'CARRERA_003', 'Tiempo Completo', 800)
    ) AS seed (
      persona_id,
      num_identificacion,
      tip_identificacion,
      nom_largo,
      nom_tercero,
      pri_apellido,
      seg_apellido,
      dir_email,
      tel_celular,
      username,
      territorial_id,
      sede_id,
      tipo_vinculacion,
      dedicacion,
      horas_asignables
    )
  LOOP
    v_person_id := rec.persona_id::uuid;

    INSERT INTO auth.personas (
      id_person,
      num_identificacion,
      tip_identificacion,
      nom_largo,
      nom_tercero,
      pri_apellido,
      seg_apellido,
      gen_tercero,
      dir_email,
      tel_celular,
      fec_creacion,
      fec_modificacion,
      usu_creacion,
      usu_modificacion
    )
    VALUES (
      v_person_id,
      rec.num_identificacion,
      rec.tip_identificacion,
      rec.nom_largo,
      rec.nom_tercero,
      rec.pri_apellido,
      rec.seg_apellido,
      'N',
      rec.dir_email,
      rec.tel_celular,
      NOW(),
      NOW(),
      'migration_217',
      'migration_217'
    )
    ON CONFLICT (id_person) DO UPDATE
    SET num_identificacion = EXCLUDED.num_identificacion,
        tip_identificacion = EXCLUDED.tip_identificacion,
        nom_largo = EXCLUDED.nom_largo,
        nom_tercero = EXCLUDED.nom_tercero,
        pri_apellido = EXCLUDED.pri_apellido,
        seg_apellido = EXCLUDED.seg_apellido,
        dir_email = EXCLUDED.dir_email,
        tel_celular = EXCLUDED.tel_celular,
        fec_modificacion = NOW(),
        usu_modificacion = 'migration_217';

    -- auth."user" no tiene constraint UNIQUE en username; no se puede usar ON CONFLICT.
    SELECT id_user INTO v_user_id
    FROM auth."user"
    WHERE LOWER(username) = LOWER(rec.username) OR id_person = v_person_id
    LIMIT 1;

    IF v_user_id IS NULL THEN
      INSERT INTO auth."user" (
        id_user, username, password_hash, id_person, is_active, password_temp, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        rec.username,
        '$2b$10$lWsenGxE2s8d4IxweYD2Jue13J6V6vPUP3vS1sx9TeRcwVcaCxjD2',
        v_person_id,
        true,
        true,
        NOW(),
        NOW()
      )
      RETURNING id_user INTO v_user_id;
    ELSE
      UPDATE auth."user"
      SET id_person = v_person_id, is_active = true, updated_at = NOW()
      WHERE id_user = v_user_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.user_roles WHERE id_user = v_user_id AND id_rol = v_docente_role_id) THEN
      INSERT INTO auth.user_roles (id_user, id_rol) VALUES (v_user_id, v_docente_role_id);
    END IF;

    INSERT INTO academic_work_plan."Docente" (
      id,
      "personaId",
      "territorialId",
      "sedeId",
      "tipoVinculacion",
      dedicacion,
      estado,
      "horasAsignables",
      "correoInstitucional",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      v_person_id::text,
      v_person_id,
      COALESCE(
        (SELECT p.id_seccional::text FROM auth.personas p WHERE p.id_person = v_person_id AND p.id_seccional IS NOT NULL),
        (SELECT id_seccional::text FROM auth.seccionales ORDER BY id_seccional LIMIT 1)
      ),
      rec.sede_id,
      rec.tipo_vinculacion,
      rec.dedicacion,
      'ACTIVO',
      rec.horas_asignables,
      rec.dir_email,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET "personaId" = EXCLUDED."personaId",
        "territorialId" = EXCLUDED."territorialId",
        "sedeId" = EXCLUDED."sedeId",
        "tipoVinculacion" = EXCLUDED."tipoVinculacion",
        dedicacion = EXCLUDED.dedicacion,
        estado = EXCLUDED.estado,
        "horasAsignables" = EXCLUDED."horasAsignables",
        "correoInstitucional" = EXCLUDED."correoInstitucional",
        "updatedAt" = NOW();
  END LOOP;
END $$;
