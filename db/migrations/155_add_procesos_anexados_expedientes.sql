-- ============================================
-- Migration: Add procesos_anexados relation to Expedientes
-- Description: Agrega la columna proceso_principal_id para vincular procesos
-- Date: 2026-03-07
-- ============================================

SET search_path TO legal_management;

ALTER TABLE legal_management.expedientes
  ADD COLUMN IF NOT EXISTS proceso_principal_id UUID;

-- Agregar llave foranea a si misma
ALTER TABLE legal_management.expedientes
  ADD CONSTRAINT fk_expedientes_proceso_principal
  FOREIGN KEY (proceso_principal_id)
  REFERENCES legal_management.expedientes(id)
  ON DELETE SET NULL;

-- Crear indice para mejorar la velocidad al buscar expedientes anexados
CREATE INDEX IF NOT EXISTS idx_expedientes_proceso_principal_id 
  ON legal_management.expedientes(proceso_principal_id);
