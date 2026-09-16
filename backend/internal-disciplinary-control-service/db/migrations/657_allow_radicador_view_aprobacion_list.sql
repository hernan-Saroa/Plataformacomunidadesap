-- ============================================
-- MIGRATION 657: Permitir a roles Radicador/Secretario visualizar listado de envío a Jurídica
-- ============================================
-- Permite que los roles SECRETARIA_RADICADOR y RADICADOR_DISCIPLINARIO puedan
-- acceder a la vista de autos para realizar la remisión a la Oficina Jurídica,
-- sin otorgar permisos de aprobación ni devolución (exclusivos del Jefe de la OCID).

DO $$
DECLARE
    v_manage_perm_id uuid;
    v_view_docs_perm_id uuid;
    v_aprobar_perm_id uuid;
    v_devolver_perm_id uuid;
    v_secretaria_role_id uuid;
    v_radicador_role_id uuid;
BEGIN
    -- Obtener IDs de permisos
    SELECT id_permission INTO v_manage_perm_id
    FROM auth.permission
    WHERE code = 'control-disciplinario.revision-aprobacion.manage';

    SELECT id_permission INTO v_view_docs_perm_id
    FROM auth.permission
    WHERE code = 'control-disciplinario.revision-aprobacion.view_docs';

    SELECT id_permission INTO v_aprobar_perm_id
    FROM auth.permission
    WHERE code = 'control-disciplinario.revision-aprobacion.aprobar';

    SELECT id_permission INTO v_devolver_perm_id
    FROM auth.permission
    WHERE code = 'control-disciplinario.revision-aprobacion.devolver';

    -- Obtener roles
    SELECT id INTO v_secretaria_role_id FROM auth.role WHERE code = 'SECRETARIA_RADICADOR';
    SELECT id INTO v_radicador_role_id FROM auth.role WHERE code = 'RADICADOR_DISCIPLINARIO';

    -- 1. Asignar 'manage' y 'view_docs' a SECRETARIA_RADICADOR si existe
    IF v_secretaria_role_id IS NOT NULL THEN
        IF v_manage_perm_id IS NOT NULL THEN
            INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
            VALUES (v_secretaria_role_id, v_manage_perm_id, true)
            ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
        END IF;

        IF v_view_docs_perm_id IS NOT NULL THEN
            INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
            VALUES (v_secretaria_role_id, v_view_docs_perm_id, true)
            ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
        END IF;

        -- Revocar aprobar y devolver si por error estuvieran asignados
        IF v_aprobar_perm_id IS NOT NULL THEN
            DELETE FROM auth.role_permissions
            WHERE id_rol = v_secretaria_role_id AND id_permission = v_aprobar_perm_id;
        END IF;
        IF v_devolver_perm_id IS NOT NULL THEN
            DELETE FROM auth.role_permissions
            WHERE id_rol = v_secretaria_role_id AND id_permission = v_devolver_perm_id;
        END IF;
    END IF;

    -- 2. Asignar 'manage' y 'view_docs' a RADICADOR_DISCIPLINARIO si existe
    IF v_radicador_role_id IS NOT NULL THEN
        IF v_manage_perm_id IS NOT NULL THEN
            INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
            VALUES (v_radicador_role_id, v_manage_perm_id, true)
            ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
        END IF;

        IF v_view_docs_perm_id IS NOT NULL THEN
            INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
            VALUES (v_radicador_role_id, v_view_docs_perm_id, true)
            ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
        END IF;

        -- Revocar aprobar y devolver si por error estuvieran asignados
        IF v_aprobar_perm_id IS NOT NULL THEN
            DELETE FROM auth.role_permissions
            WHERE id_rol = v_radicador_role_id AND id_permission = v_aprobar_perm_id;
        END IF;
        IF v_devolver_perm_id IS NOT NULL THEN
            DELETE FROM auth.role_permissions
            WHERE id_rol = v_radicador_role_id AND id_permission = v_devolver_perm_id;
        END IF;
    END IF;

    RAISE NOTICE 'Permisos de visualización de listado de autos otorgados a roles Radicador/Secretario (sin permisos de aprobación/devolución)';
END $$;
