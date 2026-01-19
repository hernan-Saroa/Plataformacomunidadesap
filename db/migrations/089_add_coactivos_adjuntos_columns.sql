-- Migración: Agregar columnas tipo y archivo_url a procesos_coactivos_adjuntos
-- Fecha: 2026-01-17

SET search_path TO legal_management, public;

-- Agregar columna tipo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'legal_management' 
        AND table_name = 'procesos_coactivos_adjuntos' 
        AND column_name = 'tipo'
    ) THEN
        ALTER TABLE legal_management.procesos_coactivos_adjuntos
        ADD COLUMN tipo VARCHAR(100);
    END IF;
END $$;

-- Agregar columna archivo_url si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'legal_management' 
        AND table_name = 'procesos_coactivos_adjuntos' 
        AND column_name = 'archivo_url'
    ) THEN
        ALTER TABLE legal_management.procesos_coactivos_adjuntos
        ADD COLUMN archivo_url VARCHAR(500);
    END IF;
END $$;

-- Actualizar registros existentes con valores por defecto
UPDATE legal_management.procesos_coactivos_adjuntos 
SET tipo = 'DOCUMENTO' 
WHERE tipo IS NULL;

UPDATE legal_management.procesos_coactivos_adjuntos 
SET archivo_url = '/files/' || nombre_archivo 
WHERE archivo_url IS NULL AND nombre_archivo IS NOT NULL;
