-- ============================================================================
-- Migration: 002_seed_chatbot_auth_module.sql
-- Description: Registrar y activar el módulo ChatBot en auth.module para visualización en el Sidebar
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.module WHERE code = 'chatbot') THEN
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
            'chatbot',
            'ChatBot Institucional',
            'Asistente virtual y consultas inteligentes ESAP',
            'Bot',
            '#003DA5',
            24,
            'backoffice',
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Módulo chatbot registrado exitosamente en auth.module';
    ELSE
        UPDATE auth.module 
        SET is_active = true,
            name = 'ChatBot Institucional',
            description = 'Asistente virtual y consultas inteligentes ESAP',
            updated_at = NOW()
        WHERE code = 'chatbot';
        RAISE NOTICE 'Módulo chatbot actualizado a is_active = true';
    END IF;
END $$;
