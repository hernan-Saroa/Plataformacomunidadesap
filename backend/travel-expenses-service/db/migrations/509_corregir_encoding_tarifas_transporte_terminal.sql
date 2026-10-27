-- Migration 509: Corregir encoding y asegurar consistencia de nombres en tarifas_transporte_terminal
-- Fecha: 2026-10-27

UPDATE travel_expenses.tarifas_transporte_terminal
SET departamento = 'Atlántico', ciudad = 'ATLÁNTICO'
WHERE departamento ILIKE '%atl%ntico%' OR departamento_id = 8;

UPDATE travel_expenses.tarifas_transporte_terminal
SET departamento = 'Córdoba', ciudad = 'CÓRDOBA'
WHERE departamento ILIKE '%c%rdoba%' OR departamento_id = 23;

UPDATE travel_expenses.tarifas_transporte_terminal
SET departamento = 'Nariño', ciudad = 'NARIÑO', ciudad_aeropuerto = 'NARIÑO (Chachagüí)'
WHERE departamento ILIKE '%nari%' OR departamento_id = 52;

UPDATE travel_expenses.tarifas_transporte_terminal
SET ciudad_aeropuerto = 'PUTUMAYO (Puerto Asís)'
WHERE departamento_id = 86 OR ciudad_aeropuerto ILIKE '%puerto as%';

UPDATE travel_expenses.tarifas_transporte_terminal
SET departamento = 'Quindío', ciudad = 'QUINDÍO (ARMENIA)', ciudad_aeropuerto = 'QUINDÍO (La Tebaida)'
WHERE departamento ILIKE '%quindi%' OR departamento_id = 63;
