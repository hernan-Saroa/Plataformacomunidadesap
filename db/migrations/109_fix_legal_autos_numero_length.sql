-- Migración: Aumentar longitud del campo numero en legal_autos
-- Fecha: 2024-01-23
-- Problema: El campo numero está limitado a 50 caracteres pero los títulos generados
-- como "Auto de Apertura de Investigación No. 001 - 2024-DISC-0001" superan ese límite

ALTER TABLE internal_disciplinary_control.legal_autos
ALTER COLUMN numero TYPE VARCHAR(150);
