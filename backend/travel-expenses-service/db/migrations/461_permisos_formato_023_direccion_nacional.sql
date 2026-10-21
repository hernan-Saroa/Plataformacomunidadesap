SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 461_permisos_formato_023_direccion_nacional.sql
-- Objetivo: Asignar permisos de consulta, lectura de solicitudes y formatos (Formato 023)
--           tanto a la DIRECCIÓN NACIONAL como a la SUBDIRECCIÓN DE GESTIÓN CORPORATIVA
--           y sus variantes para permitir la visualización, validación, firma y descarga
--           oficial de documentos generados (Formato 023, tiquetes, solicitudes).
--
-- Roles afectados:
--   1. DIRECCIÓN NACIONAL:
--      - DIRECCION_NACIONAL, ROL_DIRECCION_NACIONAL, DIRECTOR_NACIONAL,
--        ROL_DIRECTOR_NACIONAL, DELEGADO_DIRECCION_NACIONAL, DIRECCION_GENERAL,
--        'Dirección Nacional o Delegado'
--   2. SUBDIRECCIÓN DE GESTIÓN CORPORATIVA:
--      - SUBDIRECCION_GESTION_CORPORATIVA, ROL_SUBDIRECCION_GESTION_CORPORATIVA,
--        SUBDIRECCION_DE_GESTION_CORPORATIVA, SUBDIRECCION, ROL_SUBDIRECCION,
--        SUBDIRECTOR, ROL_SUBDIRECTOR, ORDENADOR_GASTO, ORDENADOR_DEL_GASTO,
--        'Subdirección de Gestión Corporativa', 'Ordenador del Gasto'
--
-- Permisos asegurados:
--   - travel_expenses:read_requests
--   - travel_expenses:read_approvals
--   - travel_expenses:sign_approval
--   - travel_expenses:read_authorizations
--   - travel_expenses:authorize_expense
--   - travel_expenses:return_authorization
--   - travel_expenses:read_extemporaneous_authorizations
--   - travel_expenses:authorize_extemporaneous
--   - travel_expenses:reject_extemporaneous
--   - travel_expenses.general.es_subdireccion_corporativa
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_perm_read_req_id UUID;
    v_perm_read_appr_id UUID;
    v_perm_sign_appr_id UUID;
    v_perm_read_auth_id UUID;
    v_perm_auth_exp_id UUID;
    v_perm_ret_auth_id UUID;
    v_perm_read_extemp_id UUID;
    v_perm_auth_extemp_id UUID;
    v_perm_reject_extemp_id UUID;
    v_perm_es_subdir_id UUID;
BEGIN
    -- 1. Obtener ID del módulo viáticos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'module') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos' LIMIT 1;
        IF v_module_id IS NULL THEN
            SELECT id_module INTO v_module_id FROM auth.module WHERE code ILIKE '%viatico%' LIMIT 1;
        END IF;
    END IF;

    -- 2. Asegurar existencia de permisos requeridos en auth.permission
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN

        -- 2.1 travel_expenses:read_requests
        SELECT id_permission INTO v_perm_read_req_id FROM auth.permission WHERE code = 'travel_expenses:read_requests';
        IF v_perm_read_req_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_requests',
                'Consultar Solicitudes de Viáticos y Formatos Oficiales',
                'Permite consultar información de solicitudes de comisión y descargar formatos oficiales como el 023',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read_req_id;
        END IF;

        -- 2.2 travel_expenses:read_approvals
        SELECT id_permission INTO v_perm_read_appr_id FROM auth.permission WHERE code = 'travel_expenses:read_approvals';

        -- 2.3 travel_expenses:sign_approval
        SELECT id_permission INTO v_perm_sign_appr_id FROM auth.permission WHERE code = 'travel_expenses:sign_approval';

        -- 2.4 travel_expenses:read_authorizations
        SELECT id_permission INTO v_perm_read_auth_id FROM auth.permission WHERE code = 'travel_expenses:read_authorizations';

        -- 2.5 travel_expenses:authorize_expense
        SELECT id_permission INTO v_perm_auth_exp_id FROM auth.permission WHERE code = 'travel_expenses:authorize_expense';

        -- 2.6 travel_expenses:return_authorization
        SELECT id_permission INTO v_perm_ret_auth_id FROM auth.permission WHERE code = 'travel_expenses:return_authorization';

        -- 2.7 travel_expenses:read_extemporaneous_authorizations
        SELECT id_permission INTO v_perm_read_extemp_id FROM auth.permission WHERE code = 'travel_expenses:read_extemporaneous_authorizations';

        -- 2.8 travel_expenses:authorize_extemporaneous
        SELECT id_permission INTO v_perm_auth_extemp_id FROM auth.permission WHERE code = 'travel_expenses:authorize_extemporaneous';

        -- 2.9 travel_expenses:reject_extemporaneous
        SELECT id_permission INTO v_perm_reject_extemp_id FROM auth.permission WHERE code = 'travel_expenses:reject_extemporaneous';

        -- 2.10 travel_expenses.general.es_subdireccion_corporativa
        SELECT id_permission INTO v_perm_es_subdir_id FROM auth.permission WHERE code = 'travel_expenses.general.es_subdireccion_corporativa';
        IF v_perm_es_subdir_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_subdireccion_corporativa',
                'Es Subdirección de Gestión Corporativa',
                'Habilita capacidades de aprobación final y visualización documental para la Subdirección',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_es_subdir_id;
        END IF;

        -- 3. Vincular permisos a auth.role_permissions
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role_permissions') THEN

            -- 3.1 Permisos para el rol de Dirección Nacional
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, p_id
            FROM auth.role r
            CROSS JOIN (
                VALUES 
                    (v_perm_read_req_id),
                    (v_perm_read_appr_id),
                    (v_perm_sign_appr_id),
                    (v_perm_read_extemp_id),
                    (v_perm_auth_extemp_id),
                    (v_perm_reject_extemp_id)
            ) AS p(p_id)
            WHERE (
                UPPER(r.code) IN (
                    'DIRECCION_NACIONAL',
                    'ROL_DIRECCION_NACIONAL',
                    'DIRECTOR_NACIONAL',
                    'ROL_DIRECTOR_NACIONAL',
                    'DELEGADO_DIRECCION_NACIONAL',
                    'DIRECCION_GENERAL',
                    'DIRECTOR_GENERAL'
                )
                OR UPPER(r.name) ILIKE '%direccion nacional%'
                OR UPPER(r.name) ILIKE '%director nacional%'
            )
            AND p_id IS NOT NULL
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.2 Limpieza estricta: Dirección Nacional NO debe tener permisos de Subdirección (read_authorizations, authorize_expense, return_authorization)
            DELETE FROM auth.role_permissions
            WHERE id_permission IN (v_perm_read_auth_id, v_perm_auth_exp_id, v_perm_ret_auth_id)
            AND id_rol IN (
                SELECT id FROM auth.role
                WHERE (
                    UPPER(code) IN (
                        'DIRECCION_NACIONAL',
                        'ROL_DIRECCION_NACIONAL',
                        'DIRECTOR_NACIONAL',
                        'ROL_DIRECTOR_NACIONAL',
                        'DELEGADO_DIRECCION_NACIONAL',
                        'DIRECCION_GENERAL',
                        'DIRECTOR_GENERAL'
                    )
                    OR UPPER(name) ILIKE '%direccion nacional%'
                    OR UPPER(name) ILIKE '%director nacional%'
                )
            );

            -- 3.3 Permisos para el rol de Subdirección de Gestión Corporativa (Ordenador del Gasto)
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, p_id
            FROM auth.role r
            CROSS JOIN (
                VALUES 
                    (v_perm_read_req_id),
                    (v_perm_read_appr_id),
                    (v_perm_sign_appr_id),
                    (v_perm_read_auth_id),
                    (v_perm_auth_exp_id),
                    (v_perm_ret_auth_id),
                    (v_perm_es_subdir_id)
            ) AS p(p_id)
            WHERE (
                UPPER(r.code) IN (
                    'SUBDIRECCION_GESTION_CORPORATIVA',
                    'ROL_SUBDIRECCION_GESTION_CORPORATIVA',
                    'SUBDIRECCION_DE_GESTION_CORPORATIVA',
                    'SUBDIRECCION',
                    'ROL_SUBDIRECCION',
                    'SUBDIRECTOR',
                    'ROL_SUBDIRECTOR',
                    'SUBDIRECTOR_GESTION_CORPORATIVA',
                    'ORDENADOR_GASTO',
                    'ORDENADOR_DEL_GASTO',
                    'ROL_ORDENADOR_GASTO'
                )
                OR UPPER(r.name) ILIKE '%subdireccion%gestion%corporativa%'
                OR UPPER(r.name) ILIKE '%subdirección%gestión%corporativa%'
                OR UPPER(r.name) ILIKE '%ordenador%gasto%'
            )
            AND p_id IS NOT NULL
            ON CONFLICT (id_rol, id_permission) DO NOTHING;

            -- 3.4 Limpieza estricta: Subdirección NO debe tener permisos de Dirección Nacional (extemporáneas)
            DELETE FROM auth.role_permissions
            WHERE id_permission IN (v_perm_read_extemp_id, v_perm_auth_extemp_id, v_perm_reject_extemp_id)
            AND id_rol IN (
                SELECT id FROM auth.role
                WHERE (
                    UPPER(code) IN (
                        'SUBDIRECCION_GESTION_CORPORATIVA',
                        'ROL_SUBDIRECCION_GESTION_CORPORATIVA',
                        'SUBDIRECCION_DE_GESTION_CORPORATIVA',
                        'SUBDIRECCION',
                        'ROL_SUBDIRECCION',
                        'SUBDIRECTOR',
                        'ROL_SUBDIRECTOR',
                        'SUBDIRECTOR_GESTION_CORPORATIVA',
                        'ORDENADOR_GASTO',
                        'ORDENADOR_DEL_GASTO',
                        'ROL_ORDENADOR_GASTO'
                    )
                    OR UPPER(name) ILIKE '%subdireccion%gestion%corporativa%'
                    OR UPPER(name) ILIKE '%subdirección%gestión%corporativa%'
                    OR UPPER(name) ILIKE '%ordenador%gasto%'
                )
            );

        END IF;

    END IF;

    RAISE NOTICE 'Migración 461 completada: permisos de Formato 023 y consulta asignados a Dirección Nacional y Subdirección';
END $$;
