SET client_encoding = 'UTF8';

-- ============================================================================
-- Migracion: 507_rol_coordinador_comisiones_administrador.sql
-- Objetivo: Configurar el rol de Coordinador(a) del Grupo de Comisiones como
--           rol de Administrador del Modulo de Viaticos.
--           Permite:
--           1. Ver las solicitudes de comision (alcance institucional)
--           2. Cancelar solicitudes con trazabilidad completa (RF-AUT-003)
--           3. Ver las configuraciones del modulo
--           4. Gestionar / parametrizar configuraciones (travel_expenses:manage_config)
--           5. Emitir paz y salvo institucional
--
-- NOTA DE COMPATIBILIDAD Y ENCODING:
-- Se utilizan literales de escape Unicode estandar de PostgreSQL: U&'...'
-- (\00e1 = a con tilde, \00f3 = o con tilde, \00ed = i con tilde, etc.)
-- para garantizar compatibilidad universal 100% ASCII (7-bit) y prevenir que
-- terminales, pipes de PowerShell o clientes de BD corrompan caracteres a '??'
-- o mojibake (UTF-8 mal decodificado).
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_perm_coord UUID;
    v_perm_config UUID;
    v_perm_cancel UUID;
    v_role_id UUID;
    v_role RECORD;
    v_code TEXT;
    v_permission_id UUID;
BEGIN
    -- 1. Obtener ID del modulo viaticos en auth.module
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'module') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos' LIMIT 1;
        IF v_module_id IS NULL THEN
            SELECT id_module INTO v_module_id FROM auth.module WHERE code ILIKE '%viatico%' LIMIT 1;
        END IF;
    END IF;

    -- 2. Asegurar existencia y textos limpios de permisos esenciales en auth.permission
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN

        -- 2.1 Permiso general inmutable: es_coordinador_comisiones
        SELECT id_permission INTO v_perm_coord FROM auth.permission WHERE code = 'travel_expenses.general.es_coordinador_comisiones';
        IF v_perm_coord IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_coordinador_comisiones',
                'Es Coordinador(a) del Grupo de Comisiones (Administrador)',
                U&'Identifica a los usuarios con rol de administrador del m\00f3dulo de vi\00e1ticos (Coordinaci\00f3n de Comisiones)',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_coord;
        ELSE
            UPDATE auth.permission
            SET name = 'Es Coordinador(a) del Grupo de Comisiones (Administrador)',
                description = U&'Identifica a los usuarios con rol de administrador del m\00f3dulo de vi\00e1ticos (Coordinaci\00f3n de Comisiones)',
                updated_at = NOW()
            WHERE id_permission = v_perm_coord;
        END IF;

        -- 2.2 Permiso granular: travel_expenses:manage_config
        SELECT id_permission INTO v_perm_config FROM auth.permission WHERE code = 'travel_expenses:manage_config';
        IF v_perm_config IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:manage_config',
                U&'Gestionar Configuraciones y Parametrizaci\00f3n de Vi\00e1ticos',
                U&'Permite consultar, crear, modificar y activar configuraciones institucionales del m\00f3dulo de vi\00e1ticos',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_config;
        ELSE
            UPDATE auth.permission
            SET name = U&'Gestionar Configuraciones y Parametrizaci\00f3n de Vi\00e1ticos',
                description = U&'Permite consultar, crear, modificar y activar configuraciones institucionales del m\00f3dulo de vi\00e1ticos',
                updated_at = NOW()
            WHERE id_permission = v_perm_config;
        END IF;

        -- 2.3 Permiso granular: travel_expenses:cancel_request
        SELECT id_permission INTO v_perm_cancel FROM auth.permission WHERE code = 'travel_expenses:cancel_request';
        IF v_perm_cancel IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:cancel_request',
                U&'Cancelar Solicitudes de Comisi\00f3n',
                U&'Permite cancelar solicitudes de vi\00e1ticos con trazabilidad, motivo y responsable registrado',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_cancel;
        ELSE
            UPDATE auth.permission
            SET name = U&'Cancelar Solicitudes de Comisi\00f3n',
                description = U&'Permite cancelar solicitudes de vi\00e1ticos con trazabilidad, motivo y responsable registrado',
                updated_at = NOW()
            WHERE id_permission = v_perm_cancel;
        END IF;

        -- 2.4 Sanear permisos de viaticos preexistentes con mojibake previo si existieran
        UPDATE auth.permission
        SET name = U&'Radicar solicitud de comisi\00f3n',
            description = U&'Permite radicar nuevas solicitudes de comisi\00f3n (Formato 023) en el m\00f3dulo de vi\00e1ticos.'
        WHERE code = 'travel_expenses:create_request' AND (name LIKE '%Ã%' OR name LIKE '%?%');

        UPDATE auth.permission
        SET name = U&'Emitir paz y salvo de Vi\00e1ticos'
        WHERE code = 'travel_expenses:paz_y_salvo.manage' AND (name LIKE '%Ã%' OR name LIKE '%?%');

        UPDATE auth.permission
        SET name = U&'Aprobar reversiones de revisi\00f3n de legalizaciones',
            description = U&'Aprobar o rechazar la solicitud de un analista para revertir una revisi\00f3n de legalizaci\00f3n aprobada, antes del registro en SIIF (EFDS-1310).'
        WHERE code = 'travel_expenses:legalizations.revert_approval' AND (name LIKE '%Ã%' OR name LIKE '%?%');

    END IF;

    -- 3. Crear o actualizar roles de Coordinador / Administrador en auth.role
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role') THEN

        FOR v_role IN SELECT * FROM (VALUES
            ('COORDINADOR_COMISIONES_VIATICOS', U&'Coordinador(a) del Grupo de Comisiones y Vi\00e1ticos', U&'Administrador del m\00f3dulo de vi\00e1ticos. Puede ver solicitudes, cancelarlas, consultar y parametrizar configuraciones institucionales y emitir paz y salvo.'),
            ('COORDINADOR_GRUPO_COMISIONES', 'Coordinador(a) Grupo de Comisiones', U&'Rol de administrador del grupo de comisiones y vi\00e1ticos.')
        ) AS r(code, name, description)
        LOOP
            SELECT id INTO v_role_id FROM auth.role WHERE code = v_role.code;
            IF v_role_id IS NULL THEN
                INSERT INTO auth.role (id, code, name, description, icon, color, type, sistema_destino, category, is_active, created_at, updated_at)
                VALUES (
                    gen_random_uuid(),
                    v_role.code,
                    v_role.name,
                    v_role.description,
                    'Settings',
                    '#003DA5',
                    'sistema',
                    'backoffice',
                    'backoffice',
                    true,
                    NOW(),
                    NOW()
                )
                RETURNING id INTO v_role_id;
                RAISE NOTICE 'Rol % creado con exito.', v_role.code;
            ELSE
                UPDATE auth.role
                SET name = v_role.name,
                    description = v_role.description,
                    updated_at = NOW()
                WHERE id = v_role_id;
                RAISE NOTICE 'Rol % actualizado con exito.', v_role.code;
            END IF;

            -- 4. Asociar permisos al rol en auth.role_permissions
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role_permissions') THEN
                FOREACH v_code IN ARRAY ARRAY[
                    'travel_expenses.general.es_coordinador_comisiones',
                    'travel_expenses:manage_config',
                    'travel_expenses:cancel_request',
                    'travel_expenses:read_requests',
                    'travel_expenses:read_inbox',
                    'travel_expenses:paz_y_salvo.manage',
                    'travel_expenses:tickets.view',
                    'travel_expenses:tickets.manage',
                    'travel_expenses:legalizations.view',
                    'travel_expenses:legalizations.manage',
                    'travel_expenses:resolutions.view',
                    'travel_expenses:resolutions.manage',
                    'travel_expenses:read_authorizations',
                    'travel_expenses:read_budget',
                    'travel_expenses:read_payments'
                ]
                LOOP
                    SELECT id_permission INTO v_permission_id FROM auth.permission WHERE code = v_code;
                    IF v_permission_id IS NOT NULL THEN
                        IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role_id AND id_permission = v_permission_id) THEN
                            INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (v_role_id, v_permission_id);
                            RAISE NOTICE 'Permiso % asociado al rol %', v_code, v_role.code;
                        END IF;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;

    END IF;

END $$;
