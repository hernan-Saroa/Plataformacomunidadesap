-- ============================================================================
-- Migration: Seed auth.module for Contratación / Hiring
-- Description: Registrar el módulo de Contratación en la tabla auth.module con status is_active = false
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.module WHERE code = 'contratacion') THEN
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
            gen_random_uuid(),
            'contratacion',
            'Contratación',
            'Módulo de Gestión de Procesos Contractuales y Contratación',
            'FileText',
            '#003DA5',
            22,
            'backoffice',
            false,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Módulo contratacion registrado exitosamente en auth.module';
    ELSE
        UPDATE auth.module SET is_active = true WHERE code = 'contratacion';
        RAISE NOTICE 'Módulo contratacion actualizado a is_active = true';
    END IF;
    
    UPDATE auth.module SET name = 'Registro Único Nacional Docente (RUND)', description = 'Gestión y carga masiva' WHERE code = 'gestion-profesoral';

    UPDATE auth.module SET name = 'Personas', description = 'Gestión de Usuarios' WHERE code = 'users-management';
    UPDATE auth.module SET name = 'Carpeta Digital', description = 'Documentos del usuario' WHERE code = 'carpeta-digital';
    UPDATE auth.module SET name = 'Estructura Organizacional', description = 'Sedes y territoriales' WHERE code = 'estructura-organizacional';
    UPDATE auth.module SET name = 'Programas Académicos', description = 'Gestión de programas' WHERE code = 'programas-academicos';
    UPDATE auth.module SET name = 'Auditoría', description = 'Auditoría de Cambios' WHERE code = 'audit';
    UPDATE auth.module SET name = 'Reportes', description = 'Analítica avanzada' WHERE code = 'reportes';
    UPDATE auth.module SET name = 'Plan de Trabajo Académico', description = 'Gestión y aprobación de PTAs' WHERE code = 'pta';
    UPDATE auth.module SET name = 'Certificados Laborales', description = 'Certificación laboral' WHERE code = 'certificados-laborales';
    UPDATE auth.module SET name = 'Firma Electrónica', description = 'Firma de documentos' WHERE code = 'firma-electronica';
    UPDATE auth.module SET name = 'Control Interno Gestión', description = 'Auditorías y Hallazgos' WHERE code = 'control-interno';
    UPDATE auth.module SET name = 'Control Interno Disciplinario', description = 'Procesos desciplinarios' WHERE code = 'control-disciplinario';
    UPDATE auth.module SET name = 'Gestión Legal', description = 'Sistema integrado legal' WHERE code = 'gestion-legal';
    UPDATE auth.module SET name = 'Verificación de Títulos', description = 'Verificación y solicitudes' WHERE code = 'graduates-certificates';

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
        gen_random_uuid(),
        'dashboard',
        'Dashboard Ejecutivo',
        'Nivel gerencial',
        'TrendingUp',
        '#003DA5',
        0,
        'backoffice',
        true,
        NOW(),
        NOW()
    );

END $$;
