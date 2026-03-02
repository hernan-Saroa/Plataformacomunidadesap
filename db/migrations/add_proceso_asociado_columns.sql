-- ============================================
-- Migration: Add proceso_asociado columns
-- Tables: disciplinary_news, disciplinary_processes
-- These columns were added to the TypeORM entities but never
-- migrated to the database (synchronize: false).
-- ============================================

-- Schema prefix (adjust if using a different schema)
SET search_path TO internal_disciplinary_control, public;

-- ============================================
-- 1. disciplinary_news: columns for associating a news item to a process
-- ============================================
ALTER TABLE disciplinary_news
  ADD COLUMN IF NOT EXISTS proceso_asociado_id UUID,
  ADD COLUMN IF NOT EXISTS proceso_asociado_numero VARCHAR(50),
  ADD COLUMN IF NOT EXISTS proceso_asociado_fecha TIMESTAMP,
  ADD COLUMN IF NOT EXISTS proceso_asociado_justificacion TEXT;

-- ============================================
-- 2. disciplinary_processes: columns for associating a process to another process
-- ============================================
ALTER TABLE disciplinary_processes
  ADD COLUMN IF NOT EXISTS proceso_asociado_id UUID,
  ADD COLUMN IF NOT EXISTS proceso_asociado_numero VARCHAR(50),
  ADD COLUMN IF NOT EXISTS proceso_asociado_tipo VARCHAR(20),
  ADD COLUMN IF NOT EXISTS proceso_asociado_fecha TIMESTAMP,
  ADD COLUMN IF NOT EXISTS proceso_asociado_justificacion TEXT;

-- ============================================
-- Verification
-- ============================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'internal_disciplinary_control'
  AND table_name IN ('disciplinary_news', 'disciplinary_processes')
  AND column_name LIKE 'proceso_asociado%'
ORDER BY table_name, column_name;
