-- Habilita 'HORAS' como tercer valor válido de tipo_dias en terminos_procesales
-- (además de 'HABILES' y 'CALENDARIO'), consistente con el patrón ya usado en
-- Expediente.tipoConteoTermino y RequerimientoOC.unidadTiempo.
--
-- Normaliza primero cualquier valor legado/inesperado para que el CHECK nuevo
-- no falle sobre filas existentes. Idempotente.

UPDATE legal_management.terminos_procesales
    SET tipo_dias = 'CALENDARIO'
    WHERE tipo_dias IS NULL OR tipo_dias NOT IN ('HABILES', 'CALENDARIO', 'HORAS');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_terminos_procesales_tipo_dias'
  ) THEN
    ALTER TABLE legal_management.terminos_procesales
        ADD CONSTRAINT chk_terminos_procesales_tipo_dias
            CHECK (tipo_dias IN ('HABILES', 'CALENDARIO', 'HORAS'));
  END IF;
END $$;
