-- Añadir columnas para Periodo Auditado y Presupuesto Estimado
-- Estas columnas no existían y se usaban datos de otras fuentes incorrectamente en el UI

ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS periodo_inicio DATE,
ADD COLUMN IF NOT EXISTS periodo_fin DATE,
ADD COLUMN IF NOT EXISTS presupuesto_estimado NUMERIC(15, 2);
