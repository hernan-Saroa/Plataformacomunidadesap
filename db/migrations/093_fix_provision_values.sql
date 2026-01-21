-- Migración para recalcular provisiones de riesgos existentes
-- Corrige inconsistencias en datos creados antes de la implementación de la lógica automática

BEGIN;

-- 1. Actualizar porcentaje_provision basado en zona_residual
UPDATE legal_management.riesgos
SET porcentaje_provision = CASE
    WHEN zona_residual = 'EXTREMO' THEN 100
    WHEN zona_residual = 'ALTO' THEN 75
    WHEN zona_residual = 'MODERADO' THEN 50
    ELSE 25 -- BAJO
END
WHERE estado = 'ACTIVO';

-- 2. Calcular provision_contable basada en cuantia_estimada y el porcentaje recién actualizado
UPDATE legal_management.riesgos
SET 
    provision_contable = COALESCE(cuantia_estimada, 0) * (porcentaje_provision / 100.0),
    fecha_calculo_provision = NOW()
WHERE estado = 'ACTIVO' AND cuantia_estimada IS NOT NULL;

COMMIT;
