-- ============================================
-- MIGRATION 655: "Enviar a Jurídica" pasa de Jefe OCID a Secretaria/Radicador
-- ============================================
-- Reemplaza la regla de la migración 419 (EFDS-1544): el permiso
-- control-disciplinario.procesos.send_to_juridica se revoca del Jefe de la
-- OCID y se asigna únicamente a SECRETARIA_RADICADOR. Nueva definición de
-- negocio: quien envía el Pliego de Cargos a la Oficina Jurídica es el
-- Radicador/Secretaría, no el Jefe.

DO $$
DECLARE
    v_permission_id uuid;
    v_secretaria_role_id uuid;
BEGIN
    SELECT id_permission INTO v_permission_id
    FROM auth.permission
    WHERE code = 'control-disciplinario.procesos.send_to_juridica';

    SELECT id INTO v_secretaria_role_id FROM auth.role WHERE code = 'SECRETARIA_RADICADOR';

    IF v_permission_id IS NULL THEN
        RAISE NOTICE 'Permiso control-disciplinario.procesos.send_to_juridica no existe; nada que hacer';
        RETURN;
    END IF;

    -- Revocar de todos los roles EXCEPTO Secretaria/Radicador (y super/admin globales)
    DELETE FROM auth.role_permissions rp
    USING auth.role r
    WHERE rp.id_permission = v_permission_id
      AND rp.id_rol = r.id
      AND r.code NOT IN ('SECRETARIA_RADICADOR', 'SUPER_ADMIN', 'ADMIN');

    -- Garantizar que Secretaria/Radicador sí lo tenga
    IF v_secretaria_role_id IS NOT NULL THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
        VALUES (v_secretaria_role_id, v_permission_id, true)
        ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
    END IF;

    RAISE NOTICE 'Permiso send_to_juridica restringido al rol SECRETARIA_RADICADOR';
END $$;
