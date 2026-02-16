-- ============================================
-- Migración 046: Corregir Foreign Key de documento.auditoria_id
-- Fecha: 2025-12-27
-- Descripción: Corrige la foreign key fk_documento_auditoria que apunta
--              incorrectamente a auditoria_programada en lugar de auditoria
-- ============================================

-- Verificar si existe la constraint incorrecta y eliminarla
DO $$ 
BEGIN
    -- Eliminar la constraint incorrecta si existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'control_interno' 
        AND constraint_name = 'fk_documento_auditoria'
        AND table_name = 'documento'
    ) THEN
        ALTER TABLE control_interno.documento 
        DROP CONSTRAINT IF EXISTS fk_documento_auditoria;
        
        RAISE NOTICE 'Constraint fk_documento_auditoria eliminada';
    END IF;
END $$;

-- Crear la constraint correcta apuntando a control_interno.auditoria
DO $$ 
BEGIN
    -- Verificar que la tabla auditoria existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria'
    ) THEN
        -- Crear la constraint correcta
        ALTER TABLE control_interno.documento 
        ADD CONSTRAINT fk_documento_auditoria 
        FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Constraint fk_documento_auditoria creada correctamente apuntando a control_interno.auditoria';
    ELSE
        RAISE EXCEPTION 'La tabla control_interno.auditoria no existe';
    END IF;
END $$;

-- Agregar comentario
COMMENT ON CONSTRAINT fk_documento_auditoria ON control_interno.documento IS 
'Foreign key que relaciona el documento con la auditoría. Permite NULL para documentos que no están asociados a una auditoría específica.';

