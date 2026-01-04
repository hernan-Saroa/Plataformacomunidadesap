-- ============================================
-- Migración: Agregar estado 'en-revision' a plan_anual_5_roles
-- ============================================
-- Fecha: 2025-01-XX
-- Descripción: Agrega el estado 'en-revision' a la tabla plan_anual_5_roles
--              para permitir que los planes estén en estado de revisión
--              antes de ser aprobados.

-- Paso 1: Eliminar la restricción CHECK existente
ALTER TABLE control_interno.plan_anual_5_roles
DROP CONSTRAINT IF EXISTS plan_anual_5_roles_estado_check;

-- Paso 2: Agregar la nueva restricción CHECK con 'en-revision'
ALTER TABLE control_interno.plan_anual_5_roles
ADD CONSTRAINT plan_anual_5_roles_estado_check 
CHECK (estado IN ('borrador', 'en-revision', 'aprobado', 'en-ejecucion', 'completado'));

-- Verificar que la migración se aplicó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'plan_anual_5_roles_estado_check'
        AND table_schema = 'control_interno'
        AND table_name = 'plan_anual_5_roles'
    ) THEN
        RAISE NOTICE '✅ Migración aplicada correctamente: estado ''en-revision'' agregado';
    ELSE
        RAISE EXCEPTION '❌ Error: La restricción CHECK no se creó correctamente';
    END IF;
END $$;

