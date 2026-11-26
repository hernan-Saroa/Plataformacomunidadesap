-- ---------------------------------------------------------------------------
-- Migracion 035 · Ajuste nullable para solicitud_valoracion al iniciar visita
-- Fecha: 2026-11-19
-- Objetivo:
--   Permitir que las columnas estado_al_finalizar, diagnostico, alcance_identificado
--   y fecha_fin_valoracion sean NULL en el momento de iniciar la valoración en campo
--   (iniciarValoracion), ya que estos valores se definen formalmente al culminar
--   la inspección y registrar el diagnóstico final con sus insumos.
-- ---------------------------------------------------------------------------

BEGIN;

SET LOCAL search_path TO "infrastructure-management", public;

ALTER TABLE "infrastructure-management".solicitud_valoracion
  ALTER COLUMN estado_al_finalizar DROP NOT NULL;

ALTER TABLE "infrastructure-management".solicitud_valoracion
  ALTER COLUMN diagnostico DROP NOT NULL;

ALTER TABLE "infrastructure-management".solicitud_valoracion
  ALTER COLUMN alcance_identificado DROP NOT NULL;

ALTER TABLE "infrastructure-management".solicitud_valoracion
  ALTER COLUMN fecha_fin_valoracion DROP NOT NULL;

COMMIT;
