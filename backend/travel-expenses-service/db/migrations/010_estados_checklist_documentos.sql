-- ============================================================================
-- 010_estados_checklist_documentos.sql
-- Description: Soporte para el flujo de guardado parcial (PENDIENTE) y el
--              checklist de soportes por rol.
--              - Agrega `tipo_mime` a documentos_soporte para validar PDF.
--              - Agrega `tipo_comision` a solicitudes_comision para
--                comisiones especiales (internacional / acto administrativo).
--              Idempotent (ADD COLUMN IF NOT EXISTS).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS travel_expenses;
SET search_path TO travel_expenses, public;

BEGIN;

-- Tipo MIME del archivo de soporte (p. ej. application/pdf).
ALTER TABLE travel_expenses.documentos_soporte
  ADD COLUMN IF NOT EXISTS tipo_mime VARCHAR(100) DEFAULT 'application/pdf';

-- Clasificación de la comisión (TERRESTRE / INTERNACIONAL / ACTO_ADMINISTRATIVO).
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS tipo_comision VARCHAR(50) DEFAULT 'TERRESTRE';

COMMIT;

RESET search_path;
