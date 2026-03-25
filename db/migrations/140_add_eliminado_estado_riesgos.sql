-- Migration: Add ELIMINADO to riesgos estado check constraint
-- This allows soft-deletion of riesgos with a distinct state from ARCHIVADO

-- Drop the existing CHECK constraint
ALTER TABLE legal_management.riesgos DROP CONSTRAINT IF EXISTS riesgos_estado_check;

-- Recreate with ELIMINADO included
ALTER TABLE legal_management.riesgos ADD CONSTRAINT riesgos_estado_check 
    CHECK (estado IN ('ACTIVO', 'ARCHIVADO', 'ELIMINADO', 'CERRADO'));
