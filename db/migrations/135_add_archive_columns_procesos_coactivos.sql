-- Migration: Add archive columns to procesos_coactivos
-- Date: 2026-02-20
-- Description: Adds columns to support soft delete and archive functionality for coactive processes

DO $$ 
BEGIN 
    -- Add estado_archivo if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'legal_management' AND table_name = 'procesos_coactivos' AND column_name = 'estado_archivo') THEN
        ALTER TABLE legal_management.procesos_coactivos ADD COLUMN estado_archivo VARCHAR(20) DEFAULT 'ACTIVO';
    END IF;

    -- Add fecha_archivo if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'legal_management' AND table_name = 'procesos_coactivos' AND column_name = 'fecha_archivo') THEN
        ALTER TABLE legal_management.procesos_coactivos ADD COLUMN fecha_archivo TIMESTAMP;
    END IF;

    -- Add usuario_archivo if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'legal_management' AND table_name = 'procesos_coactivos' AND column_name = 'usuario_archivo') THEN
        ALTER TABLE legal_management.procesos_coactivos ADD COLUMN usuario_archivo VARCHAR(150);
    END IF;

    -- Add motivo_archivo if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'legal_management' AND table_name = 'procesos_coactivos' AND column_name = 'motivo_archivo') THEN
        ALTER TABLE legal_management.procesos_coactivos ADD COLUMN motivo_archivo TEXT;
    END IF;

END $$;
