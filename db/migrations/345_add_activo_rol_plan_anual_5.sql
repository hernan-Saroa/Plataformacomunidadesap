-- Agrega soft delete/estado activo a los roles del Plan Anual 5 roles.
-- La entidad RolPlanAnual5 espera esta columna y TypeORM la selecciona en findAll().

ALTER TABLE control_interno.rol_plan_anual_5
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_rol_plan_anual_5_activo
ON control_interno.rol_plan_anual_5(activo);

COMMENT ON COLUMN control_interno.rol_plan_anual_5.activo IS
'Indica si el rol del plan anual está activo. Usado para soft delete/reactivación.';
