-- Añade la dimensión "nivel" (pregrado/posgrado) a la aprobación parcial por
-- territorial de Docencia (ver migración 396). Antes una sola fila por
-- territorial cubría pregrado y posgrado juntos; ahora cada combinación
-- (territorial, nivel) es una unidad de aprobación independiente, en línea con
-- el split de permisos de la migración 397.
--
-- Backfill: cada fila existente representa una decisión que ya cubría ambos
-- niveles de esa territorial (se etiqueta 'pregrado' por el DEFAULT de la
-- columna nueva) y se duplica como 'posgrado' con el mismo estado/actor/
-- comentarios, para no perder aprobaciones ya otorgadas al momento del split.
--
-- Idempotente.

ALTER TABLE academic_work_plan."PtaTerritorialApproval"
    ADD COLUMN IF NOT EXISTS nivel VARCHAR(20) NOT NULL DEFAULT 'pregrado';

INSERT INTO academic_work_plan."PtaTerritorialApproval"
    (id, pta_id, territorial_id, territorial_nombre, estado, actor_id, actor_nombre, actor_rol,
     comentarios, fecha_decision, created_at, updated_at, nivel)
SELECT gen_random_uuid(), existing.pta_id, existing.territorial_id, existing.territorial_nombre, existing.estado,
       existing.actor_id, existing.actor_nombre, existing.actor_rol,
       existing.comentarios, existing.fecha_decision, existing.created_at, existing.updated_at, 'posgrado'
FROM academic_work_plan."PtaTerritorialApproval" existing
WHERE existing.nivel = 'pregrado'
  AND NOT EXISTS (
    SELECT 1 FROM academic_work_plan."PtaTerritorialApproval" dup
    WHERE dup.pta_id = existing.pta_id
      AND dup.territorial_id = existing.territorial_id
      AND dup.nivel = 'posgrado'
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_pta_territorial_nivel'
  ) THEN
    ALTER TABLE academic_work_plan."PtaTerritorialApproval"
        DROP CONSTRAINT IF EXISTS uq_pta_territorial;
    ALTER TABLE academic_work_plan."PtaTerritorialApproval"
        ADD CONSTRAINT uq_pta_territorial_nivel UNIQUE (pta_id, territorial_id, nivel);
  END IF;
END $$;
