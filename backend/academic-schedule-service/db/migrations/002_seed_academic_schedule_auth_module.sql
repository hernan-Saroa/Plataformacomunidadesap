-- ============================================================================
-- Migration: Seed auth.module for Programación Académica
-- Description: Registrar y activar el módulo de Programación Académica en auth.module para visualización en el Sidebar
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.module WHERE code = 'programacion-academica') THEN
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
            'programacion-academica',
            'Programación Académica',
            'Gestión de franjas horarias, aulas y programación docente',
            'Calendar',
            '#003DA5',
            23,
            'backoffice',
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Módulo programacion-academica registrado exitosamente en auth.module';
    ELSE
        UPDATE auth.module 
        SET is_active = true,
            name = 'Programación Académica',
            description = 'Gestión de franjas horarias, aulas y programación docente',
            updated_at = NOW()
        WHERE code = 'programacion-academica';
        RAISE NOTICE 'Módulo programacion-academica actualizado a is_active = true';
    END IF;
END $$;
