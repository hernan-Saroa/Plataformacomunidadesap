-- Migration 172: Add consolidation fields to disciplinary_processes
-- Date: 2026-03-25
-- Description: Agregar campos para trazabilidad de consolidación de procesos
-- Database: PostgreSQL

ALTER TABLE internal_disciplinary_control.disciplinary_processes 
  ADD COLUMN procesos_consolidados TEXT[] NULL;

ALTER TABLE internal_disciplinary_control.disciplinary_processes 
  ADD COLUMN proceso_consolidado_principal UUID NULL;

ALTER TABLE internal_disciplinary_control.disciplinary_processes 
  ADD COLUMN informacion_consolidada JSONB NULL;

-- Create index for consolidation queries
CREATE INDEX idx_proceso_consolidado_principal 
  ON internal_disciplinary_control.disciplinary_processes(proceso_consolidado_principal);
