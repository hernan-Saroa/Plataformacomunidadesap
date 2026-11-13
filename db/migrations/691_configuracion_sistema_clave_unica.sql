-- ============================================================================
-- 691 · EFDS-2435 — academic_work_plan."ConfiguracionSistema": clave única.
--
-- La migración 190 la declara con llave primaria (clave), pero hay ambientes restaurados que la
-- perdieron. El interruptor de interoperabilidad (y la configuración del PTA) asumen una fila por
-- clave. Aquí se repone SOLO si falta y no hay claves repetidas (si las hubiera, no se toca nada:
-- se avisa y se resuelve a mano). Forward-only e idempotente.
-- ============================================================================
DO $$
BEGIN
  IF to_regclass('academic_work_plan."ConfiguracionSistema"') IS NULL THEN
    RAISE NOTICE '691: no existe ConfiguracionSistema; nada que hacer.';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conrelid = 'academic_work_plan."ConfiguracionSistema"'::regclass AND contype IN ('p', 'u')) THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM academic_work_plan."ConfiguracionSistema" GROUP BY clave HAVING COUNT(*) > 1) THEN
    RAISE NOTICE '691: hay claves repetidas en ConfiguracionSistema; no se crea el índice único.';
    RETURN;
  END IF;
  CREATE UNIQUE INDEX IF NOT EXISTS ux_configuracion_sistema_clave ON academic_work_plan."ConfiguracionSistema" (clave);
END $$;
