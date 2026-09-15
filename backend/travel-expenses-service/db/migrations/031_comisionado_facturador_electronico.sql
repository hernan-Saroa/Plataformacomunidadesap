SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 031_comisionado_facturador_electronico.sql
-- Created: 2026-09-11
-- Description: Etapa 5 — RF-REV-003.
--              1. Agrega la columna es_facturador_electronico a travel_expenses.comisionados.
--              2. Asegura la existencia del tipo de soporte FACTURA en tipos_documento_soporte.
-- ============================================================================

-- 1. Agregar columna es_facturador_electronico en comisionados
ALTER TABLE travel_expenses.comisionados
  ADD COLUMN IF NOT EXISTS es_facturador_electronico BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN travel_expenses.comisionados.es_facturador_electronico IS
  'Indica si el comisionado contratista es facturador electrónico registrado ante la DIAN.';

-- 2. Asegurar tipo de documento de soporte FACTURA
INSERT INTO travel_expenses.tipos_documento_soporte (codigo, nombre, descripcion, activo)
VALUES
  ('FACTURA', 'Factura Electrónica', 'Factura electrónica para comisionados contratistas facturadores electrónicos.', TRUE)
ON CONFLICT (codigo) DO NOTHING;
