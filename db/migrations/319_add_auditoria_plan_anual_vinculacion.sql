-- Vinculación explícita de auditorías al Plan Anual 5 roles (vigencia + plan)
-- Compatible con columna legacy plan_anual_ano (migración 036 / init DDL)

ALTER TABLE control_interno.auditoria
ADD COLUMN IF NOT EXISTS plan_anual_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'control_interno'
      AND table_name = 'auditoria'
      AND column_name = 'plan_anual_ano'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'control_interno'
      AND table_name = 'auditoria'
      AND column_name = 'plan_anual_vigencia'
  ) THEN
    ALTER TABLE control_interno.auditoria
      RENAME COLUMN plan_anual_ano TO plan_anual_vigencia;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'control_interno'
      AND table_name = 'auditoria'
      AND column_name = 'plan_anual_vigencia'
  ) THEN
    ALTER TABLE control_interno.auditoria
      ADD COLUMN plan_anual_vigencia INTEGER;
  END IF;
END $$;

ALTER TABLE control_interno.auditoria
ADD COLUMN IF NOT EXISTS vinculada_plan_anual BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE control_interno.auditoria
ADD COLUMN IF NOT EXISTS rol_decreto_asociado VARCHAR(255);

COMMENT ON COLUMN control_interno.auditoria.plan_anual_id IS 'FK al plan anual 5 roles (control_interno.plan_anual_5_roles)';
COMMENT ON COLUMN control_interno.auditoria.plan_anual_vigencia IS 'Año de vigencia del plan anual (ej. 2026)';
COMMENT ON COLUMN control_interno.auditoria.vinculada_plan_anual IS 'Indica si la auditoría pertenece al programa/plan anual OCI';
COMMENT ON COLUMN control_interno.auditoria.rol_decreto_asociado IS 'Rol Decreto 648/2017 asociado en la programación';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_auditoria_plan_anual_id'
  ) THEN
    ALTER TABLE control_interno.auditoria
    ADD CONSTRAINT fk_auditoria_plan_anual_id
    FOREIGN KEY (plan_anual_id)
    REFERENCES control_interno.plan_anual_5_roles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auditoria_plan_anual_id
  ON control_interno.auditoria(plan_anual_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_plan_anual_vigencia
  ON control_interno.auditoria(plan_anual_vigencia);

CREATE INDEX IF NOT EXISTS idx_auditoria_vinculada_plan_anual
  ON control_interno.auditoria(vinculada_plan_anual)
  WHERE vinculada_plan_anual = TRUE;

UPDATE control_interno.auditoria a
SET
  vinculada_plan_anual = COALESCE(
    (a.programa_anual_metadata->>'vinculado')::boolean,
    (a.programa_anual_metadata->>'vinculada')::boolean,
    FALSE
  ),
  plan_anual_vigencia = COALESCE(
    a.plan_anual_vigencia,
    NULLIF(a.programa_anual_metadata->>'año', '')::integer,
    NULLIF(a.programa_anual_metadata->>'ano', '')::integer,
    NULLIF(a.programa_anual_metadata->>'vigencia', '')::integer
  ),
  rol_decreto_asociado = COALESCE(
    NULLIF(TRIM(a.rol_decreto_asociado), ''),
    NULLIF(TRIM(a.programa_anual_metadata->>'rol'), '')
  ),
  plan_anual_id = COALESCE(
    a.plan_anual_id,
    CASE
      WHEN (a.programa_anual_metadata->>'planAnualId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (a.programa_anual_metadata->>'planAnualId')::uuid
      ELSE NULL
    END
  )
WHERE a.programa_anual_metadata IS NOT NULL
   OR a.plan_anual_vigencia IS NOT NULL
   OR a.vinculada_plan_anual = TRUE;

UPDATE control_interno.auditoria a
SET plan_anual_id = p.id
FROM control_interno.plan_anual_5_roles p
WHERE a.plan_anual_id IS NULL
  AND a.plan_anual_vigencia IS NOT NULL
  AND a.plan_anual_vigencia = p.ano
  AND (a.vinculada_plan_anual = TRUE OR a.programa_anual_metadata IS NOT NULL);
