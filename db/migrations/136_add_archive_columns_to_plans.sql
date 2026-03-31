-- Migration: Add Soft Archive columns to PEI and Planes Mejoramiento
-- Description: Adds archived_at, archived_by, and archive_reason to enable soft delete/archive without losing state.

-- 1. Add columns to pei_indicadores
ALTER TABLE legal_management.pei_indicadores
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS archived_by VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS archive_reason TEXT NULL;

-- 2. Add columns to planes_mejoramiento
ALTER TABLE legal_management.planes_mejoramiento
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS archived_by VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS archive_reason TEXT NULL;

-- 3. Create index for faster filtering of non-archived items
CREATE INDEX IF NOT EXISTS idx_pei_archived_at ON legal_management.pei_indicadores(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_planes_archived_at ON legal_management.planes_mejoramiento(archived_at) WHERE archived_at IS NULL;
