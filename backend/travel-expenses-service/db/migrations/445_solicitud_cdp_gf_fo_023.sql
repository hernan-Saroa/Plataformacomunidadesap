-- Migration 445: Agregar columnas numero_cdp y fecha_cdp según formato GF-FO-023 Versión 07
-- Fecha: 2026-09-24

ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS numero_cdp varchar(100);

ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS fecha_cdp varchar(50);
