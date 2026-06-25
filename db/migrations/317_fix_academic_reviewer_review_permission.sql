-- MIGRATION 317: Asegurar permiso de trabajo de revision para el rol Revisor de Verificación de títulos.

BEGIN;

DO $$
DECLARE
  v_reviewer_role_id uuid;
  v_permission_id uuid;
  v_certificates_module_id uuid;
BEGIN
  SELECT id INTO v_reviewer_role_id
  FROM auth.role
  WHERE code = 'REGISTRO_ACADEMICO_REVISOR_TITULOS';

  SELECT id_permission INTO v_permission_id
  FROM auth.permission
  WHERE code = 'graduates-certificates.solicitude.review';

  IF v_permission_id IS NULL THEN
    SELECT id_module INTO v_certificates_module_id
    FROM auth.module
    WHERE code = 'graduates-certificates';

    IF v_certificates_module_id IS NOT NULL THEN
      INSERT INTO auth.permission (
        id_permission,
        code,
        name,
        description,
        id_module,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        'graduates-certificates.solicitude.review',
        'Enviar a Revision',
        'Permite enviar solicitudes de revision',
        v_certificates_module_id,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO UPDATE
        SET is_active = true,
            updated_at = NOW()
      RETURNING id_permission INTO v_permission_id;
    END IF;
  END IF;

  IF v_permission_id IS NOT NULL THEN
    UPDATE auth.permission
    SET is_active = true,
        updated_at = NOW()
    WHERE id_permission = v_permission_id;
  END IF;

  IF v_reviewer_role_id IS NOT NULL AND v_permission_id IS NOT NULL THEN
    INSERT INTO auth.role_permissions (
      id_rol,
      id_permission,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      v_reviewer_role_id,
      v_permission_id,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id_rol, id_permission) DO UPDATE
      SET is_active = true,
          updated_at = NOW();
  END IF;
END $$;

COMMIT;
