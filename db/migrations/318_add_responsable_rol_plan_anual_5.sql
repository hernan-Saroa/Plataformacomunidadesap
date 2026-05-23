-- Responsable principal por rol (Decreto 648), independiente del responsable de cada actividad
ALTER TABLE control_interno.rol_plan_anual_5
ADD COLUMN IF NOT EXISTS responsable VARCHAR(255);

ALTER TABLE control_interno.rol_plan_anual_5
ADD COLUMN IF NOT EXISTS responsable_id UUID;

ALTER TABLE control_interno.rol_plan_anual_5
ADD COLUMN IF NOT EXISTS responsables JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN control_interno.rol_plan_anual_5.responsable IS 'Nombre del responsable principal del rol en el plan anual';
COMMENT ON COLUMN control_interno.rol_plan_anual_5.responsable_id IS 'UUID del profesional OCI (id_person) responsable del rol';
COMMENT ON COLUMN control_interno.rol_plan_anual_5.responsables IS 'Detalle del responsable del rol [{id,nombre,cargo,email}]';

CREATE INDEX IF NOT EXISTS idx_rol_plan_anual_5_responsable_id
ON control_interno.rol_plan_anual_5(responsable_id);
