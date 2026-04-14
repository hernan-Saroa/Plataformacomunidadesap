-- Migration: Add CERRADO status and closure tracking columns for Auto Pliego de Cargos
-- Purpose: Support process closure flow with notification to Juridica

-- 1. Add CERRADO to the PostgreSQL enum (TypeORM created it as a real enum)
ALTER TYPE internal_disciplinary_control.disciplinary_processes_estado_enum ADD VALUE IF NOT EXISTS 'CERRADO';

-- 2. Add closure tracking columns
ALTER TABLE internal_disciplinary_control.disciplinary_processes
  ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS etapa_al_cierre VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS cerrado_por_id UUID NULL,
  ADD COLUMN IF NOT EXISTS correo_juridica_enviado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correo_juridica_fecha_envio TIMESTAMP NULL;
