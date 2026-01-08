-- ============================================
-- Migración 069: Corregir tipo de columna persona_id en equipo_auditor
-- Fecha: 2026-01-08
-- Descripción: Cambia la columna persona_id de UUID a BIGINT si está como UUID
--              para que coincida con la definición de la entidad y las referencias a auth.personas
-- ============================================

-- Verificar y alterar la columna persona_id si existe y tiene tipo incorrecto
DO $$ 
BEGIN
    -- Verificar si la columna existe y tiene tipo UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'equipo_auditor' 
        AND column_name = 'persona_id'
        AND data_type = 'uuid'
    ) THEN
        -- Primero, eliminar cualquier constraint que pueda existir
        ALTER TABLE control_interno.equipo_auditor 
        DROP CONSTRAINT IF EXISTS fk_equipo_persona;
        
        -- Eliminar los datos existentes ya que no podemos convertir UUID a BIGINT
        IF EXISTS (SELECT 1 FROM control_interno.equipo_auditor LIMIT 1) THEN
            RAISE NOTICE 'Eliminando datos existentes en equipo_auditor para cambiar tipo de persona_id';
            DELETE FROM control_interno.equipo_auditor;
        END IF;
        
        -- Eliminar la columna persona_id (UUID) y recrearla como BIGINT
        -- Esto es necesario porque PostgreSQL no puede convertir UUID a BIGINT automáticamente
        ALTER TABLE control_interno.equipo_auditor 
        DROP COLUMN persona_id;
        
        -- Recrear la columna con el tipo correcto
        ALTER TABLE control_interno.equipo_auditor 
        ADD COLUMN persona_id BIGINT NOT NULL;
        
        -- Recrear el índice en persona_id si no existe
        CREATE INDEX IF NOT EXISTS idx_equipo_auditor_persona 
        ON control_interno.equipo_auditor(persona_id);
        
        -- Recrear el constraint si es necesario
        -- (Comentado porque puede que no exista la tabla auth.personas o la columna id_tercero)
        -- ALTER TABLE control_interno.equipo_auditor 
        -- ADD CONSTRAINT fk_equipo_persona FOREIGN KEY (persona_id) 
        --     REFERENCES auth.personas(id_tercero) ON DELETE RESTRICT;
        
        RAISE NOTICE 'Columna persona_id actualizada de UUID a BIGINT en equipo_auditor';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'equipo_auditor' 
        AND column_name = 'persona_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE NOTICE 'La columna persona_id ya tiene el tipo correcto (BIGINT)';
    ELSIF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'equipo_auditor' 
        AND column_name = 'persona_id'
    ) THEN
        -- Si la columna no existe, crearla con el tipo correcto
        ALTER TABLE control_interno.equipo_auditor 
        ADD COLUMN persona_id BIGINT NOT NULL;
        
        RAISE NOTICE 'Columna persona_id creada con tipo BIGINT';
    ELSE
        RAISE NOTICE 'La columna persona_id existe pero no necesita cambios';
    END IF;
END $$;

