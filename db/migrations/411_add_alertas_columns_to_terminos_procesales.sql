-- Agrega a terminos_procesales:
-- - horas_anticipacion_alerta_personalizada: si está seteada, este término ignora
--   las reglas globales de terminos_reglas_alerta y usa solo este umbral.
-- - recordatorio_manual_horas_anticipacion: recordatorio programado por el usuario
--   (envío único; el scheduler lo limpia a NULL después de enviarlo).

ALTER TABLE legal_management.terminos_procesales
    ADD COLUMN IF NOT EXISTS horas_anticipacion_alerta_personalizada INT,
    ADD COLUMN IF NOT EXISTS recordatorio_manual_horas_anticipacion INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_terminos_procesales_horas_alerta_personalizada'
  ) THEN
    ALTER TABLE legal_management.terminos_procesales
        ADD CONSTRAINT chk_terminos_procesales_horas_alerta_personalizada
            CHECK (horas_anticipacion_alerta_personalizada IS NULL OR horas_anticipacion_alerta_personalizada > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_terminos_procesales_recordatorio_manual'
  ) THEN
    ALTER TABLE legal_management.terminos_procesales
        ADD CONSTRAINT chk_terminos_procesales_recordatorio_manual
            CHECK (recordatorio_manual_horas_anticipacion IS NULL OR recordatorio_manual_horas_anticipacion > 0);
  END IF;
END $$;
