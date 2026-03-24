-- 154_add_risk_and_provision_columns.sql
-- Añadir campos de Valoración de Riesgo y Provisión Contable en modulo legal

ALTER TABLE legal_management.expedientes
ADD COLUMN nivel_riesgo VARCHAR(255) NULL,
ADD COLUMN provision_contable NUMERIC(15, 2) NULL,
ADD COLUMN fecha_estimacion_provision TIMESTAMP NULL,
ADD COLUMN observacion_provision TEXT NULL;
