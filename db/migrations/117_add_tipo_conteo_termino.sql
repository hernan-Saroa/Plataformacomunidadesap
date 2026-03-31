-- Migration: Add tipo_conteo_termino column to expedientes
-- Description: Adds column to track whether deadlines are calculated in business days (HABILES) or calendar days (CALENDARIO)
-- Date: 2026-02-04

ALTER TABLE legal_management.expedientes 
ADD COLUMN IF NOT EXISTS tipo_conteo_termino VARCHAR(20) DEFAULT 'HABILES';

-- Comment: Values can be 'HABILES' (business days - excludes weekends) or 'CALENDARIO' (calendar days)
