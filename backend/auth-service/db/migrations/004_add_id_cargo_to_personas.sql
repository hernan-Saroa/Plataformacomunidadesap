SET client_encoding = 'UTF8';

-- ============================================================================
-- MIGRACIÓN: 004_add_id_cargo_to_personas.sql
-- Objetivo: Añadir id_cargo (FK a auth.cargos) en auth.personas para
--           asignar formalmente el cargo institucional al usuario/persona.
-- Idempotente.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
      AND table_name = 'personas' 
      AND column_name = 'id_cargo'
  ) THEN
    ALTER TABLE auth.personas 
      ADD COLUMN id_cargo BIGINT NULL;
    
    ALTER TABLE auth.personas
      ADD CONSTRAINT fk_personas_cargo
      FOREIGN KEY (id_cargo) REFERENCES auth.cargos(id_cargo)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_personas_cargo ON auth.personas (id_cargo);
