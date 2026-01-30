-- Migration: Add provision contable fields to riesgos table
-- For HU: Calcular riesgo para informar contabilidad

SET search_path TO legal_management, public;

-- Add new columns for accounting provision calculation
ALTER TABLE legal_management.riesgos 
ADD COLUMN IF NOT EXISTS cuantia_estimada DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS provision_contable DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS porcentaje_provision INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fecha_calculo_provision TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN legal_management.riesgos.cuantia_estimada IS 'Valor monetario estimado del riesgo';
COMMENT ON COLUMN legal_management.riesgos.provision_contable IS 'Provisión contable calculada = cuantía × porcentaje';
COMMENT ON COLUMN legal_management.riesgos.porcentaje_provision IS 'Porcentaje aplicado según zona: EXTREMO=100, ALTO=75, MODERADO=50, BAJO=25';
COMMENT ON COLUMN legal_management.riesgos.fecha_calculo_provision IS 'Fecha del último cálculo de provisión';

-- Update existing risks with default provision based on their zone
UPDATE legal_management.riesgos 
SET porcentaje_provision = CASE zona_residual
    WHEN 'EXTREMO' THEN 100
    WHEN 'ALTO' THEN 75
    WHEN 'MODERADO' THEN 50
    WHEN 'BAJO' THEN 25
    ELSE 50
END,
fecha_calculo_provision = NOW()
WHERE porcentaje_provision = 0 OR porcentaje_provision IS NULL;
