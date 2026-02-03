-- Migration 112: Fix confianza_clasificacion type to allow floats
-- Was created as INTEGER by mistake, needs to be FLOAT / DOUBLE PRECISION

ALTER TABLE legal_management.correos_juridicos
ALTER COLUMN confianza_clasificacion TYPE DOUBLE PRECISION USING confianza_clasificacion::DOUBLE PRECISION;
