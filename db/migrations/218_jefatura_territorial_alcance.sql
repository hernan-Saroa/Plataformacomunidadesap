-- Migration 218: Territorial scope support for JEFATURA_TERRITORIAL.
-- One global role is kept; effective scope is resolved from auth.personas.id_seccional.

ALTER TABLE auth.role
ADD COLUMN IF NOT EXISTS alcance jsonb DEFAULT NULL;

UPDATE auth.role
SET alcance = jsonb_build_object(
      'tipo', 'territorial_por_persona',
      'source', 'auth.personas.id_seccional',
      'description', 'El rol JEFATURA_TERRITORIAL se filtra por la seccional asignada a la persona, no por roles separados.'
    ),
    updated_at = NOW()
WHERE code = 'JEFATURA_TERRITORIAL'
  AND alcance IS NULL;
