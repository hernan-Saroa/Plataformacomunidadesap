-- ============================================================================
-- 080 · La firma de la actividad entra al motor de reglas
--
-- El mismo caso de la 061 (EXIGE_APROBACION), pero para la firma con el
-- token institucional: `ck_regla_tipo` solo admitía los tipos originales, así
-- que guardar una regla EXIGE_FIRMA violaba el constraint.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_regla_tipo'
      AND pg_get_constraintdef(oid) LIKE '%EXIGE_FIRMA%'
  ) THEN
    ALTER TABLE hiring.reglas_actividad DROP CONSTRAINT IF EXISTS ck_regla_tipo;
    ALTER TABLE hiring.reglas_actividad ADD CONSTRAINT ck_regla_tipo CHECK (tipo IN (
      'CAMPO_OBLIGATORIO',
      'DOCUMENTO_REQUERIDO',
      'RANGO_VALOR',
      'PLAZO_MINIMO',
      'BLOQUEA_AVANCE',
      'REGLA_DERIVADA',
      'EXIGE_APROBACION',
      'EXIGE_FIRMA'
    ));
  END IF;
END $$;
