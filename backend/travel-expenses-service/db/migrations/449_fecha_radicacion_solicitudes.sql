SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 449_fecha_radicacion_solicitudes.sql
-- Created: 2026-09-28
-- Description: EFDS-1287 (Etapa 2 — Radicar solicitud y publicar en bandeja del grupo).
--              Agrega la fecha de radicación de la solicitud para mostrarla en la
--              bandeja del Grupo de Viáticos. Se fija la primera vez que el
--              expediente ingresa a la bandeja y no cambia con las devoluciones.
-- ============================================================================

ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS fecha_radicacion TIMESTAMP NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.fecha_radicacion
  IS 'Marca temporal en la que la solicitud se radicó e ingresó por primera vez a la bandeja del Grupo de Viáticos.';

-- Fin de migración 449
