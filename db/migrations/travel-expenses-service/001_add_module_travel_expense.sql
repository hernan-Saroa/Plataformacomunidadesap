-- ============================================================================
-- Migration: Seed auth.module for Viáticos / Travel Expenses
-- Description: Registrar y activar el módulo de Viáticos en la tabla auth.module (is_active = true)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.module WHERE code = 'viaticos') THEN
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
            'viaticos',
            'Viáticos y Gastos de Viaje',
            'Gestión de Comisiones y Tiquetes',
            'Plane',
            '#003DA5',
            22,
            'backoffice',
            false,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Módulo viaticos registrado exitosamente en auth.module';
    ELSE
        UPDATE auth.module SET is_active = true WHERE code = 'viaticos';
        RAISE NOTICE 'Módulo viaticos actualizado a is_active = true';
    END IF;

END $$;