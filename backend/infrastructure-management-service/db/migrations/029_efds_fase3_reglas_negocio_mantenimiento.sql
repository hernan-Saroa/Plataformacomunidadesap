-- =============================================================================
-- EFDS-1735..1739 / Migración 029 · Reglas de Negocio Fase 3 Mantenimiento
-- Ambientes: todos
-- Propósito:
--   1. Clasificación Mantenimiento: MENOR (directo UMI) vs MAYOR (coordinación)
--   2. Bandera requiere_contratacion (trámite precontractual/compras centralizadas)
--   3. Validación de bien asignado a funcionario (P1 Radicación)
--   4. Visto Bueno (VoBo) configurable en Valoración Técnica (P2 / P5)
-- =============================================================================

BEGIN;

SET search_path TO "infrastructure-management", public;

-- 1. Clasificación Mantenimiento: MENOR o MAYOR
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS clasificacion_mantenimiento VARCHAR(20) NOT NULL DEFAULT 'MENOR';

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  DROP CONSTRAINT IF EXISTS ck_solicitud_clasificacion_mantenimiento;
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD CONSTRAINT ck_solicitud_clasificacion_mantenimiento
  CHECK (clasificacion_mantenimiento IN ('MENOR', 'MAYOR'));

-- 2. Bandera requiere contratación
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS requiere_contratacion BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Validación de bien asignado a funcionario
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS es_bien_asignado_funcionario BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS nombre_funcionario_bien_asignado VARCHAR(200) NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS placa_inventario_bien VARCHAR(100) NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS soporte_bien_asignado_url TEXT NULL;

-- 4. Visto Bueno (VoBo) en Valoración Técnica
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS requiere_vobo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS vobo_aprobado BOOLEAN NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS vobo_observaciones TEXT NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS vobo_usuario_id UUID NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS vobo_fecha TIMESTAMPTZ NULL;

COMMIT;
