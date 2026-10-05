SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 452_rol_comisionado_y_permisos.sql
-- Objetivo: Crear rol COMISIONADO con permiso general es_comisionado y permiso
--           para consultar solicitudes radicadas para él (Formato GF-FO-023).
--
-- Roles:
--   - COMISIONADO: Funcionario o contratista que realiza comisiones de servicios.
--
-- Permisos:
--   - travel_expenses.general.es_comisionado (Permiso general inmutable)
--   - es_comisionado (Alias inmutable)
--   - travel_expenses:read_own_requests (Consultar solicitudes radicadas para el comisionado)
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_role_comisionado_id UUID;
    
    v_perm_es_comisionado UUID;
    v_perm_es_comisionado_alias UUID;
    v_perm_read_own UUID;
BEGIN
    -- 1. Obtener ID del módulo viáticos en auth.module
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'module') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos' LIMIT 1;
        IF v_module_id IS NULL THEN
            SELECT id_module INTO v_module_id FROM auth.module WHERE code ILIKE '%viatico%' LIMIT 1;
        END IF;
    END IF;

    -- ========================================================================
    -- 2. Asegurar Rol COMISIONADO en auth.role
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role') THEN
        SELECT id INTO v_role_comisionado_id FROM auth.role WHERE code = 'COMISIONADO';
        IF v_role_comisionado_id IS NULL THEN
            INSERT INTO auth.role (
                id,
                code,
                name,
                description,
                category,
                icon,
                color,
                type,
                is_active,
                created_at,
                updated_at
            )
            VALUES (
                gen_random_uuid(),
                'COMISIONADO',
                'Comisionado',
                'Servidor público o contratista que cumple comisiones de servicios institucionales y consulta sus solicitudes (Formato GF-FO-023).',
                'operativo',
                'UserCheck',
                '#003DA5',
                'sistema',
                true,
                NOW(),
                NOW()
            )
            RETURNING id INTO v_role_comisionado_id;
            RAISE NOTICE 'Rol COMISIONADO creado exitosamente (id: %)', v_role_comisionado_id;
        ELSE
            RAISE NOTICE 'Rol COMISIONADO ya existe (id: %)', v_role_comisionado_id;
        END IF;
    END IF;

    -- ========================================================================
    -- 3. Asegurar Permisos en auth.permission
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN

        -- 3.1 Permiso general inmutable: travel_expenses.general.es_comisionado
        SELECT id_permission INTO v_perm_es_comisionado FROM auth.permission WHERE code = 'travel_expenses.general.es_comisionado';
        IF v_perm_es_comisionado IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_comisionado',
                'Es Comisionado (General)',
                'Identificador inmutable general para funcionarios y contratistas en calidad de comisionados dentro de la plataforma.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_es_comisionado;
            RAISE NOTICE 'Permiso travel_expenses.general.es_comisionado creado.';
        END IF;

        -- 3.2 Permiso alias: es_comisionado
        SELECT id_permission INTO v_perm_es_comisionado_alias FROM auth.permission WHERE code = 'es_comisionado';
        IF v_perm_es_comisionado_alias IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'es_comisionado',
                'Es Comisionado',
                'Permiso general de comisionado institucional para consultar sus solicitudes radicadas y estado de firmas.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_es_comisionado_alias;
            RAISE NOTICE 'Permiso es_comisionado creado.';
        END IF;

        -- 3.3 Permiso: travel_expenses:read_own_requests
        SELECT id_permission INTO v_perm_read_own FROM auth.permission WHERE code = 'travel_expenses:read_own_requests';
        IF v_perm_read_own IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_own_requests',
                'Consultar solicitudes radicadas para el comisionado',
                'Permite al comisionado consultar en la plataforma el estado, itinerario, liquidación y firmas de las solicitudes radicadas a su nombre (Formato GF-FO-023).',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read_own;
            RAISE NOTICE 'Permiso travel_expenses:read_own_requests creado.';
        END IF;

    END IF;

    -- ========================================================================
    -- 4. Asociar Permisos al Rol COMISIONADO en auth.role_permissions
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role_permissions') THEN

        -- Asignar al rol COMISIONADO
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r
        CROSS JOIN (
            VALUES 
                (v_perm_es_comisionado),
                (v_perm_es_comisionado_alias),
                (v_perm_read_own)
        ) AS p(id_permission)
        WHERE (UPPER(r.code) IN ('COMISIONADO', 'FUNCIONARIO_COMISIONADO') OR UPPER(r.name) ILIKE '%comisionado%')
          AND p.id_permission IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        -- Asignar también al SUPER_ADMIN / ADMIN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r
        CROSS JOIN (
            VALUES 
                (v_perm_es_comisionado),
                (v_perm_es_comisionado_alias),
                (v_perm_read_own)
        ) AS p(id_permission)
        WHERE UPPER(r.code) IN ('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATIVO', 'SUPER_ADMINISTRADOR', 'SUPERUSER')
          AND p.id_permission IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        RAISE NOTICE 'Permisos asociados a COMISIONADO y SUPER_ADMIN en auth.role_permissions correctamente.';
    END IF;

    -- ========================================================================
    -- 5. Compatibilidad si la tabla se llama auth.role_permission (singular)
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role_permission') THEN
        INSERT INTO auth.role_permission (id, id_role, id_permission)
        SELECT gen_random_uuid(), r.id, p.id_permission
        FROM auth.role r
        CROSS JOIN (
            VALUES 
                (v_perm_es_comisionado),
                (v_perm_es_comisionado_alias),
                (v_perm_read_own)
        ) AS p(id_permission)
        WHERE UPPER(r.code) IN ('COMISIONADO', 'SUPER_ADMIN')
          AND p.id_permission IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM auth.role_permission rp 
              WHERE rp.id_role = r.id AND rp.id_permission = p.id_permission
          );
    END IF;

    RAISE NOTICE 'Migración 452_rol_comisionado_y_permisos ejecutada con éxito.';
END $$;
