SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 428_columnas_trazabilidad_siif_etapa5.sql
-- Created: 2026-09-08
-- Description: Etapa 5 (Verificar y crear comision en SIIF Nacion).
--              Agrega columnas de trazabilidad para exportacion SIIF a la tabla
--              de solicitudes de comision.
-- ============================================================================

-- ==========================================================================
-- 1. Agregar columna siif_exportado
-- ==========================================================================

ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS siif_exportado BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.siif_exportado IS 'Indica si la solicitud ya fue exportada a SIIF Nacion.';

-- ==========================================================================
-- 2. Agregar columna fecha_exportacion_siif
-- ==========================================================================

ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS fecha_exportacion_siif TIMESTAMP NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.fecha_exportacion_siif IS 'Marca temporal en que se exporto la solicitud a SIIF.';

-- ==========================================================================
-- 3. Agregar columna usuario_exportador_id
-- ==========================================================================

ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS usuario_exportador_id UUID NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.usuario_exportador_id IS 'ID del usuario que exporto la solicitud a SIIF.';

-- ==========================================================================
-- 4. Agregar columna consulta_rut_facturador
-- ==========================================================================

ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS consulta_rut_facturador BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.consulta_rut_facturador IS 'Indica si el analista consulto el RUT del comisionado durante la verificacion.';

-- ==========================================================================
-- 5. Crear indice sobre siif_exportado
-- ==========================================================================

CREATE INDEX IF NOT EXISTS idx_solicitudes_siif_exportado
  ON travel_expenses.solicitudes_comision (siif_exportado);
