-- 168_sync_tipo_auditoria_schema.sql
-- Sincronizar tabla tipo_auditoria con su entidad en NestJS

-- 1. Renombrar activo a activa
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'tipo_auditoria' 
        AND column_name = 'activo'
    ) THEN
        ALTER TABLE control_interno.tipo_auditoria RENAME COLUMN activo TO activa;
    END IF;
END $$;

-- 2. Añadir columnas faltantes
ALTER TABLE control_interno.tipo_auditoria
  ADD COLUMN IF NOT EXISTS alcance TEXT,
  ADD COLUMN IF NOT EXISTS duracion_promedio INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS equipo_promedio INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS auditorias_programadas INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;

-- 3. Crear índices declarados en la entidad
CREATE INDEX IF NOT EXISTS idx_tipo_auditoria_activa ON control_interno.tipo_auditoria(activa);
CREATE INDEX IF NOT EXISTS idx_tipo_auditoria_deleted_at ON control_interno.tipo_auditoria(deleted_at) WHERE deleted_at IS NULL;
