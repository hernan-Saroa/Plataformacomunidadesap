-- Vigencia del plan anual en biblioteca (plantillas) y listas de chequeo maestras
ALTER TABLE control_interno.documento
  ADD COLUMN IF NOT EXISTS plan_anual_vigencia INTEGER,
  ADD COLUMN IF NOT EXISTS plan_anual_id UUID;

ALTER TABLE control_interno.lista_chequeo
  ADD COLUMN IF NOT EXISTS plan_anual_vigencia INTEGER,
  ADD COLUMN IF NOT EXISTS plan_anual_id UUID;

COMMENT ON COLUMN control_interno.documento.plan_anual_vigencia IS 'Año de vigencia del plan anual (plantillas de biblioteca)';
COMMENT ON COLUMN control_interno.documento.plan_anual_id IS 'UUID del plan anual 5 roles asociado';
COMMENT ON COLUMN control_interno.lista_chequeo.plan_anual_vigencia IS 'Año de vigencia del plan anual';
COMMENT ON COLUMN control_interno.lista_chequeo.plan_anual_id IS 'UUID del plan anual 5 roles asociado';

CREATE INDEX IF NOT EXISTS idx_documento_plan_anual_vigencia
  ON control_interno.documento(plan_anual_vigencia)
  WHERE plan_anual_vigencia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lista_chequeo_plan_anual_vigencia
  ON control_interno.lista_chequeo(plan_anual_vigencia)
  WHERE plan_anual_vigencia IS NOT NULL;

-- Heredar vigencia desde auditoría vinculada
UPDATE control_interno.documento d
SET plan_anual_vigencia = COALESCE(d.plan_anual_vigencia, a.plan_anual_vigencia),
    plan_anual_id = COALESCE(d.plan_anual_id, a.plan_anual_id)
FROM control_interno.auditoria a
WHERE d.auditoria_id = a.id
  AND (d.plan_anual_vigencia IS NULL OR d.plan_anual_id IS NULL);

UPDATE control_interno.lista_chequeo lc
SET plan_anual_vigencia = COALESCE(lc.plan_anual_vigencia, a.plan_anual_vigencia),
    plan_anual_id = COALESCE(lc.plan_anual_id, a.plan_anual_id)
FROM control_interno.auditoria a
WHERE lc.auditoria_id = a.id
  AND (lc.plan_anual_vigencia IS NULL OR lc.plan_anual_id IS NULL);
