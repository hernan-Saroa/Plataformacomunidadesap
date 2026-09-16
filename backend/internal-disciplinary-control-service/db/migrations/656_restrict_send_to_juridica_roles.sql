-- ============================================
-- MIGRATION 656: Restringir "Enviar a Jurídica" exclusivamente a roles Radicador / Secretario
-- ============================================
-- Reemplaza y asegura la regla de negocio: el permiso
-- control-disciplinario.procesos.send_to_juridica se revoca del Jefe de la OCID
-- (JEFE_DE_LA_OCID) y de cualquier otro rol operativo, y se asigna exclusivamente
-- a SECRETARIA_RADICADOR y RADICADOR_DISCIPLINARIO (junto con SUPER_ADMIN y ADMIN).

DO $$
DECLARE
    v_permission_id uuid;
    v_secretaria_role_id uuid;
    v_radicador_role_id uuid;
BEGIN
    SELECT id_permission INTO v_permission_id
    FROM auth.permission
    WHERE code = 'control-disciplinario.procesos.send_to_juridica';

    -- Si el permiso no existe, crearlo bajo el módulo control-disciplinario
    IF v_permission_id IS NULL THEN
        DECLARE
            v_module_id uuid;
        BEGIN
            SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';
            IF v_module_id IS NOT NULL THEN
                INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
                VALUES (
                    gen_random_uuid(),
                    'control-disciplinario.procesos.send_to_juridica',
                    'Enviar Pliego a Jurídica',
                    'Permite enviar el pliego de cargos aprobado a la Oficina Jurídica y cerrar el proceso',
                    v_module_id,
                    true
                ) RETURNING id_permission INTO v_permission_id;
            END IF;
        END;
    END IF;

    IF v_permission_id IS NULL THEN
        RAISE NOTICE 'No se pudo encontrar ni crear el permiso control-disciplinario.procesos.send_to_juridica';
        RETURN;
    END IF;

    -- 1. Revocar de todos los roles EXCEPTO Secretaria/Radicador y administradores globales
    DELETE FROM auth.role_permissions rp
    USING auth.role r
    WHERE rp.id_permission = v_permission_id
      AND rp.id_rol = r.id
      AND r.code NOT IN ('SECRETARIA_RADICADOR', 'RADICADOR_DISCIPLINARIO', 'SUPER_ADMIN', 'ADMIN');

    -- 2. Asegurar asignación a SECRETARIA_RADICADOR
    SELECT id INTO v_secretaria_role_id FROM auth.role WHERE code = 'SECRETARIA_RADICADOR';
    IF v_secretaria_role_id IS NOT NULL THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
        VALUES (v_secretaria_role_id, v_permission_id, true)
        ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
    END IF;

    -- 3. Asegurar asignación a RADICADOR_DISCIPLINARIO (si existe)
    SELECT id INTO v_radicador_role_id FROM auth.role WHERE code = 'RADICADOR_DISCIPLINARIO';
    IF v_radicador_role_id IS NOT NULL THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
        VALUES (v_radicador_role_id, v_permission_id, true)
        ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
    END IF;

    RAISE NOTICE 'Permiso control-disciplinario.procesos.send_to_juridica restringido a SECRETARIA_RADICADOR y RADICADOR_DISCIPLINARIO (revocado de JEFE_DE_LA_OCID)';
END $$;
