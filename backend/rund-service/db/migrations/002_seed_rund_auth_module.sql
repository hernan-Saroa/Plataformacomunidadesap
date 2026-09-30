-- ============================================================================
-- Migration: 002_seed_rund_auth_module.sql
-- Description: Registrar el módulo RUND en auth.module con code 'rund' y configurar permisos y roles
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_super_admin_id UUID;
    v_admin_sistema_id UUID;
    v_gestion_profesoral_id UUID;
    v_talento_humano_id UUID;
BEGIN
    -- 1. Insertar o actualizar el módulo 'rund' en auth.module
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'rund';

    IF v_module_id IS NULL THEN
        v_module_id := gen_random_uuid();
        INSERT INTO auth.module (
            id_module,
            code,
            name,
            description,
            icon,
            color,
            display_order,
            category,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            v_module_id,
            'rund',
            'Registro Único Nacional Docente (RUND) V.2.0',
            'Gestión para el registro único nacional de docentes',
            'GraduationCap',
            '#0EA5E9',
            14,
            'backoffice',
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Módulo rund registrado exitosamente en auth.module con id: %', v_module_id;
    ELSE
        UPDATE auth.module SET
            name = 'Registro Único Nacional Docente (RUND) V.2.0',
            description = 'Gestión para el registro único nacional de docentes',
            icon = 'GraduationCap',
            color = '#0EA5E9',
            is_active = true,
            updated_at = NOW()
        WHERE code = 'rund';
        RAISE NOTICE 'Módulo rund actualizado en auth.module';
    END IF;

    -- 2. Registrar los permisos oficiales del módulo RUND
    INSERT INTO auth.permission (
        id_permission, code, name, description, id_module, is_active, created_at, updated_at
    ) VALUES
        (gen_random_uuid(), 'rund.view', 'Consultar RUND', 'Acceso para consultar el catálogo de docentes, hojas de vida y expedientes RUND.', v_module_id, TRUE, NOW(), NOW()),
        (gen_random_uuid(), 'rund.create', 'Registrar en RUND', 'Permiso para crear y registrar nuevos docentes en el sistema RUND.', v_module_id, TRUE, NOW(), NOW()),
        (gen_random_uuid(), 'rund.edit', 'Editar Docente RUND', 'Permite actualizar datos personales, formación académica y trayectoria.', v_module_id, TRUE, NOW(), NOW()),
        (gen_random_uuid(), 'rund.validate', 'Validar Soportes RUND', 'Aprobar, observar o rechazar documentos y méritos adjuntados.', v_module_id, TRUE, NOW(), NOW()),
        (gen_random_uuid(), 'rund.admin', 'Administrar RUND', 'Gestión avanzada, novedades administrativas, parámetros y estados del RUND.', v_module_id, TRUE, NOW(), NOW()),
        (gen_random_uuid(), 'rund.export', 'Exportar y Tarjeta RUND', 'Generar reportes oficiales, certificados y emisión de Tarjeta Digital RUND.', v_module_id, TRUE, NOW(), NOW())
    ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        id_module = v_module_id,
        is_active = TRUE,
        updated_at = NOW();

    -- 3. Asignar permisos a roles existentes
    -- Rol SUPER_ADMIN o SUPERADMIN
    FOR v_super_admin_id IN 
        SELECT id FROM auth.role WHERE UPPER(code) IN ('SUPER_ADMIN', 'SUPERADMIN', 'ADMIN_SISTEMA', 'ADMIN')
    LOOP
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
        SELECT v_super_admin_id, p.id_permission, TRUE, NOW(), NOW()
        FROM auth.permission p
        WHERE p.code LIKE 'rund.%'
        ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = TRUE, updated_at = NOW();
    END LOOP;

    -- Rol GESTION_PROFESORAL / TALENTO_HUMANO
    FOR v_gestion_profesoral_id IN 
        SELECT id FROM auth.role WHERE UPPER(code) IN ('GESTION_PROFESORAL', 'TALENTO_HUMANO', 'LIDER_GESTION_DOCENTE', 'DOCENCIA')
    LOOP
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
        SELECT v_gestion_profesoral_id, p.id_permission, TRUE, NOW(), NOW()
        FROM auth.permission p
        WHERE p.code LIKE 'rund.%'
        ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = TRUE, updated_at = NOW();
    END LOOP;

    RAISE NOTICE 'Permisos del módulo RUND asignados exitosamente a los roles correspondientes.';
END $$;
