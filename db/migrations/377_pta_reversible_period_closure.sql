-- Conserva el estado real de cada PTA cuando su periodo deja de estar activo.
-- Permite restaurar Borrador/aprobación/concertación/seguimiento al reactivarlo.
ALTER TABLE academic_work_plan."PlanTrabajoAcademico"
  ADD COLUMN IF NOT EXISTS "estadoAntesCierrePeriodo" TEXT,
  ADD COLUMN IF NOT EXISTS "cerradoPorPeriodo" TEXT;

-- Reparación de PTAs afectados por la lógica anterior. El cierre masivo no
-- generaba historial: el último estado trazado es, por tanto, el estado previo
-- más confiable. Para borradores sin transición se usa el JSON como fallback.
WITH estados_previos AS (
  SELECT p.id,
    COALESCE(
      (
        SELECT NULLIF(h."estadoNuevo", '')
        FROM academic_work_plan."HistorialEstadoPTA" h
        WHERE h."ptaId" = p.id
        ORDER BY h."createdAt" DESC
        LIMIT 1
      ),
      NULLIF(p."datosEstructurados"->>'estado', '')
    ) AS estado_previo
  FROM academic_work_plan."PlanTrabajoAcademico" p
  WHERE p.estado IN ('Terminado', 'TERMINADO')
    AND p."estadoAntesCierrePeriodo" IS NULL
)
UPDATE academic_work_plan."PlanTrabajoAcademico" p
SET "estadoAntesCierrePeriodo" = e.estado_previo,
    "cerradoPorPeriodo" = COALESCE(p."cerradoPorPeriodo", 'LEGACY')
FROM estados_previos e
WHERE p.id = e.id
  AND e.estado_previo IS NOT NULL
  AND e.estado_previo NOT IN (
    'Terminado', 'TERMINADO', 'Finalizado', 'FINALIZADO', 'Rechazado', 'RECHAZADO'
  );

-- Si al desplegar la corrección el periodo ya fue reactivado, se reparan sus
-- PTAs inmediatamente; no se obliga al usuario a cambiar de periodo otra vez.
UPDATE academic_work_plan."PlanTrabajoAcademico" p
SET estado = p."estadoAntesCierrePeriodo",
    "estadoAntesCierrePeriodo" = NULL,
    "cerradoPorPeriodo" = NULL
WHERE p.estado IN ('Terminado', 'TERMINADO')
  AND p."estadoAntesCierrePeriodo" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM academic_work_plan.periodo_academico pa
    WHERE pa.codigo = p.periodo
      AND pa.estado = 'en_curso'
  );

COMMENT ON COLUMN academic_work_plan."PlanTrabajoAcademico"."estadoAntesCierrePeriodo"
  IS 'Estado funcional del PTA antes del cierre reversible causado por cambio de periodo.';
COMMENT ON COLUMN academic_work_plan."PlanTrabajoAcademico"."cerradoPorPeriodo"
  IS 'Código del periodo cuya activación puso temporalmente el PTA en Terminado.';
