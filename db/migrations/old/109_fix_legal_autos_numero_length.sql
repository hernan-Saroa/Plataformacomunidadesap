-- ============================================
-- Migración 109: Fix Legal Autos Numero Length
-- Fecha: 2026-01-23
-- Descripción: Aumenta longitud del campo numero de 50 a 150 caracteres
--              para permitir títulos largos como "Auto de Apertura de
--              Investigación No. 001 - 2024-DISC-0001"
-- ============================================

ALTER TABLE internal_disciplinary_control.legal_autos
ALTER COLUMN numero TYPE VARCHAR(150);
