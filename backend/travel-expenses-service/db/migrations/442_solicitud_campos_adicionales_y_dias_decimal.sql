SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 442_solicitud_campos_adicionales_y_dias_decimal.sql
-- Created: 2026-09-22
-- Description: 
--   1. Permite campos configurables/dinámicos mediante JSONB en solicitudes_comision.
--   2. Modifica dias_comision a tipo NUMERIC(5,2) decimal para permitir fracciones
--      de días (0.5, 1.5, etc.) de forma precisa y robusta.
--   3. Crea índice GIN para búsquedas eficientes en campos_adicionales.
-- ============================================================================

-- 1. Agregar columna campos_adicionales si no existe
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS campos_adicionales JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Asegurar que dias_comision sea NUMERIC(5,2) decimal en lugar de entero
DO $$
BEGIN
  -- Verificar tipo actual de la columna dias_comision
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'travel_expenses' 
      AND table_name = 'solicitudes_comision' 
      AND column_name = 'dias_comision'
  ) THEN
    -- Modificar tipo de columna asegurando conversión segura
    ALTER TABLE travel_expenses.solicitudes_comision
      ALTER COLUMN dias_comision TYPE NUMERIC(5,2) USING dias_comision::numeric(5,2),
      ALTER COLUMN dias_comision SET DEFAULT 1.00;
  ELSE
    ALTER TABLE travel_expenses.solicitudes_comision
      ADD COLUMN dias_comision NUMERIC(5,2) NOT NULL DEFAULT 1.00;
  END IF;
END $$;

-- 3. Crear índice GIN sobre campos_adicionales para optimizar consultas por clave/valor
CREATE INDEX IF NOT EXISTS idx_solicitudes_campos_adicionales 
  ON travel_expenses.solicitudes_comision USING gin (campos_adicionales);

-- 4. Comentarios de documentación en catálogo de base de datos
COMMENT ON COLUMN travel_expenses.solicitudes_comision.campos_adicionales IS 
  'Metadatos y campos dinámicos configurables gobernados por travel_expenses.config_campos_formulario (JSONB).';

COMMENT ON COLUMN travel_expenses.solicitudes_comision.dias_comision IS 
  'Número de días de la comisión con soporte decimal (ej: 0.5, 1.5, 2.0).';

RESET search_path;
