-- ============================================================================
-- 152 · Uno o más CDP por proceso (EFDS-XXXX)
--
-- Decisión de Juan (27/11/2026): un proceso puede quedar respaldado por más de
-- un CDP —por ejemplo, uno por rubro o por fuente—, cargados en la 3.1 o en la
-- 4.2.
--
-- Hasta aquí `idx_cdp_vigente_por_proceso` dejaba uno solo en curso por
-- proceso (fuera de las adiciones). Se reemplaza por uno que impide lo que sí
-- es un error: cargar dos veces el mismo número de CDP en el mismo proceso.
--
-- Idempotente.
-- ============================================================================

BEGIN;

DROP INDEX IF EXISTS hiring.idx_cdp_vigente_por_proceso;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cdp_numero_por_proceso
  ON hiring.cdp (proceso_id, upper(btrim(numero)))
  WHERE estado IN ('SOLICITADO', 'VERIFICADO', 'EXPEDIDO')
    AND modificacion_id IS NULL
    AND numero IS NOT NULL;

COMMIT;
