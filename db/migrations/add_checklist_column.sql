-- Script rápido para agregar columna checklist_completados
-- Ejecutar con: psql -U postgres -d esap_db -f add_checklist_column.sql

-- Agregar columna checklist_completados (JSONB para almacenar estado de checkboxes)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'checklist_completados'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN checklist_completados JSONB;
        
        COMMENT ON COLUMN control_interno.auditoria.checklist_completados IS 
        'Estado de los checkboxes de actividades de auditoría. Formato: {"ep1": true, "ep2": false, ...}';
        
        RAISE NOTICE 'Columna checklist_completados agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna checklist_completados ya existe';
    END IF;
END $$;

