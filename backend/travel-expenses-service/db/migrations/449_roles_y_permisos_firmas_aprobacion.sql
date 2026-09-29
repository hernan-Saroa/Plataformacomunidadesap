SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 449_roles_y_permisos_firmas_aprobacion.sql
-- Objetivo: Crear roles y permisos oficiales para el flujo de firmas y aprobación
--           de solicitudes de comisión de servicios (Formato GF-FO-023 Versión 07).
--
-- Roles creados:
--   1. JEFE_DEPENDENCIA: Jefe de Dependencia o Supervisor del comisionado.
--   2. GERENTE_PROYECTO: Gerente de Proyecto o Supervisor de Convenio.
--
-- Permisos granulares e inmutables:
--   - travel_expenses:sign_approval (Firmar aprobación de solicitud de comisión)
--   - travel_expenses:read_approvals (Consultar bandeja de firmas de aprobación)
--   - travel_expenses:return_approval (Devolver al Enlace con observaciones)
--   - travel_expenses.general.es_jefe_dependencia (Identificador inmutable rol jefe)
--   - travel_expenses.general.es_gerente_proyecto (Identificador inmutable rol gerente)
--
-- Asignación a roles:
--   - JEFE_DEPENDENCIA
--   - GERENTE_PROYECTO
--   - SUBDIRECCION_GESTION_CORPORATIVA
--   - DIRECCION_NACIONAL
--   - SUPER_ADMIN
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_role_jefe_id UUID;
    v_role_gerente_id UUID;
    v_role_subdireccion_id UUID;
    v_role_direccion_id UUID;
    
    v_perm_sign UUID;
    v_perm_read UUID;
    v_perm_return UUID;
    v_perm_es_jefe UUID;
    v_perm_es_gerente UUID;
    v_perm_wildcard UUID;
BEGIN
    -- 1. Obtener ID del módulo viáticos en auth.module
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'module') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos' LIMIT 1;
        IF v_module_id IS NULL THEN
            SELECT id_module INTO v_module_id FROM auth.module WHERE code ILIKE '%viatico%' LIMIT 1;
        END IF;
    END IF;

    -- ========================================================================
    -- 2. Asegurar Roles en auth.role
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role') THEN

        -- 2.1 Rol: JEFE_DEPENDENCIA
        SELECT id INTO v_role_jefe_id FROM auth.role WHERE code = 'JEFE_DEPENDENCIA';
        IF v_role_jefe_id IS NULL THEN
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
                'JEFE_DEPENDENCIA',
                'Jefe de Dependencia / Supervisor',
                'Jefe de la dependencia solicitante facultado para la revisión técnica y firma de aprobación (Formato GF-FO-023) de la solicitud de comisión.',
                'directivo',
                'UserCheck',
                '#2563EB',
                'sistema',
                true,
                NOW(),
                NOW()
            )
            RETURNING id INTO v_role_jefe_id;
            RAISE NOTICE 'Rol JEFE_DEPENDENCIA creado exitosamente.';
        ELSE
            RAISE NOTICE 'Rol JEFE_DEPENDENCIA ya existe (id: %)', v_role_jefe_id;
        END IF;

        -- 2.2 Rol: GERENTE_PROYECTO
        SELECT id INTO v_role_gerente_id FROM auth.role WHERE code = 'GERENTE_PROYECTO';
        IF v_role_gerente_id IS NULL THEN
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
                'GERENTE_PROYECTO',
                'Gerente de Proyecto / Supervisor de Convenio',
                'Gerente de Proyecto o Supervisor de Convenio facultado para verificar la pertinencia y firmar la aprobación presupuestal del proyecto (Formato GF-FO-023).',
                'directivo',
                'Briefcase',
                '#059669',
                'sistema',
                true,
                NOW(),
                NOW()
            )
            RETURNING id INTO v_role_gerente_id;
            RAISE NOTICE 'Rol GERENTE_PROYECTO creado exitosamente.';
        ELSE
            RAISE NOTICE 'Rol GERENTE_PROYECTO ya existe (id: %)', v_role_gerente_id;
        END IF;

    END IF;

    -- ========================================================================
    -- 3. Asegurar Permisos en auth.permission
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN

        -- 3.1 Permiso: travel_expenses:sign_approval
        SELECT id_permission INTO v_perm_sign FROM auth.permission WHERE code = 'travel_expenses:sign_approval';
        IF v_perm_sign IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:sign_approval',
                'Firmar aprobación de solicitud de comisión (Formato 023)',
                'Permite a los jefes y directivos revisar la solicitud, emitir firma autógrafa o sello digital ESAP y aprobar la comisión en estado PENDIENTE_FIRMAS.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_sign;
            RAISE NOTICE 'Permiso travel_expenses:sign_approval creado.';
        END IF;

        -- 3.2 Permiso: travel_expenses:read_approvals
        SELECT id_permission INTO v_perm_read FROM auth.permission WHERE code = 'travel_expenses:read_approvals';
        IF v_perm_read IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_approvals',
                'Consultar bandeja de firmas de aprobación',
                'Permite a jefes y directivos consultar la bandeja de solicitudes de comisión pendientes de firmas y aprobación (Formato GF-FO-023).',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read;
            RAISE NOTICE 'Permiso travel_expenses:read_approvals creado.';
        END IF;

        -- 3.3 Permiso: travel_expenses:return_approval
        SELECT id_permission INTO v_perm_return FROM auth.permission WHERE code = 'travel_expenses:return_approval';
        IF v_perm_return IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:return_approval',
                'Devolver solicitud de comisión desde firmas de aprobación',
                'Permite a los jefes y directivos regresar la solicitud al Enlace con observaciones obligatorias en caso de requerir subsanación.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_return;
            RAISE NOTICE 'Permiso travel_expenses:return_approval creado.';
        END IF;

        -- 3.4 Permiso inmutable general: travel_expenses.general.es_jefe_dependencia
        SELECT id_permission INTO v_perm_es_jefe FROM auth.permission WHERE code = 'travel_expenses.general.es_jefe_dependencia';
        IF v_perm_es_jefe IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_jefe_dependencia',
                'Es Jefe de Dependencia / Supervisor',
                'Identifica a los usuarios con función de Jefe de Dependencia para la etapa de firmas de aprobación de comisiones.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_es_jefe;
            RAISE NOTICE 'Permiso travel_expenses.general.es_jefe_dependencia creado.';
        END IF;

        -- 3.5 Permiso inmutable general: travel_expenses.general.es_gerente_proyecto
        SELECT id_permission INTO v_perm_es_gerente FROM auth.permission WHERE code = 'travel_expenses.general.es_gerente_proyecto';
        IF v_perm_es_gerente IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_gerente_proyecto',
                'Es Gerente de Proyecto / Supervisor de Convenio',
                'Identifica a los usuarios con función de Gerente de Proyecto para la etapa de firmas de aprobación de comisiones.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_es_gerente;
            RAISE NOTICE 'Permiso travel_expenses.general.es_gerente_proyecto creado.';
        END IF;

    END IF;

    -- ========================================================================
    -- 4. Vincular Permisos a Roles en auth.role_permissions
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role_permissions') THEN

        -- 4.1 Asignar a JEFE_DEPENDENCIA y roles equivalentes de jefatura
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r
        CROSS JOIN (
            VALUES 
                (v_perm_sign),
                (v_perm_read),
                (v_perm_return),
                (v_perm_es_jefe)
        ) AS p(id_permission)
        WHERE (
            UPPER(r.code) IN ('JEFE_DEPENDENCIA', 'SUPERVISOR', 'JEFE', 'DIRECTOR_TERRITORIAL', 'LIDER_DEPENDENCIA')
            OR UPPER(r.name) ILIKE '%jefe%dependencia%'
            OR UPPER(r.name) ILIKE '%director%territorial%'
        )
        AND p.id_permission IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        -- 4.2 Asignar a GERENTE_PROYECTO y roles equivalentes de proyectos
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r
        CROSS JOIN (
            VALUES 
                (v_perm_sign),
                (v_perm_read),
                (v_perm_return),
                (v_perm_es_gerente)
        ) AS p(id_permission)
        WHERE (
            UPPER(r.code) IN ('GERENTE_PROYECTO', 'GERENTE', 'LIDER_PROYECTO', 'COORDINADOR_PROYECTO')
            OR UPPER(r.name) ILIKE '%gerente%proyecto%'
            OR UPPER(r.name) ILIKE '%supervisor%convenio%'
        )
        AND p.id_permission IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        -- 4.3 Asignar permisos de firma y lectura a SUBDIRECCION_GESTION_CORPORATIVA
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r
        CROSS JOIN (
            VALUES 
                (v_perm_sign),
                (v_perm_read),
                (v_perm_return)
        ) AS p(id_permission)
        WHERE UPPER(r.code) IN ('SUBDIRECCION_GESTION_CORPORATIVA', 'SUBDIRECCION_CORPORATIVA', 'ORDENADOR_GASTO')
          AND p.id_permission IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        -- 4.4 Asignar permisos de firma y lectura a DIRECCION_NACIONAL
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r
        CROSS JOIN (
            VALUES 
                (v_perm_sign),
                (v_perm_read),
                (v_perm_return)
        ) AS p(id_permission)
        WHERE UPPER(r.code) IN ('DIRECCION_NACIONAL', 'DIRECTOR_NACIONAL', 'DIRECCION_GENERAL')
          AND p.id_permission IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        -- 4.5 Asignar todos a SUPER_ADMIN / ADMIN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r
        CROSS JOIN (
            VALUES 
                (v_perm_sign),
                (v_perm_read),
                (v_perm_return),
                (v_perm_es_jefe),
                (v_perm_es_gerente)
        ) AS p(id_permission)
        WHERE UPPER(r.code) IN ('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATIVO', 'SUPER_ADMINISTRADOR', 'SUPERUSER')
          AND p.id_permission IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        RAISE NOTICE 'Permisos asociados en auth.role_permissions correctamente.';
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
                (v_perm_sign),
                (v_perm_read),
                (v_perm_return),
                (v_perm_es_jefe),
                (v_perm_es_gerente)
        ) AS p(id_permission)
        WHERE UPPER(r.code) IN ('JEFE_DEPENDENCIA', 'GERENTE_PROYECTO', 'SUPER_ADMIN')
          AND p.id_permission IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM auth.role_permission rp 
              WHERE rp.id_role = r.id AND rp.id_permission = p.id_permission
          );
    END IF;

    RAISE NOTICE 'Migración 449_roles_y_permisos_firmas_aprobacion ejecutada con éxito.';
END $$;
