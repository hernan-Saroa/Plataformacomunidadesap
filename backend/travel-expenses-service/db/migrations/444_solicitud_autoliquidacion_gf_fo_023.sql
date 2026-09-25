-- Migration 444: Agregar columnas de autoliquidación según formato GF-FO-023 Versión 07 (Decreto 314 de 2026)
-- Fecha: 2026-09-22

-- Días pernoctados
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS dias_pernoctados numeric(5,2) DEFAULT 0;

-- Tarifa día pernoctado
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS tarifa_dia_pernoctado numeric(14,2) DEFAULT 0;

-- Total pernoctados
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS total_pernoctados numeric(14,2) DEFAULT 0;

-- Días no pernoctados
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS dias_no_pernoctados numeric(5,2) DEFAULT 0;

-- Tarifa día no pernoctado
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS tarifa_dia_no_pernoctado numeric(14,2) DEFAULT 0;

-- Total no pernoctados
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS total_no_pernoctados numeric(14,2) DEFAULT 0;

-- Factor comisionado
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS factor_comisionado numeric(4,2) DEFAULT 1.0;

-- Factor pernocta
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS factor_pernocta numeric(4,2) DEFAULT 1.0;

-- Tarifa diaria base
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS tarifa_diaria_base numeric(14,2) DEFAULT 0;

-- Tarifa final aplicada día
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS tarifa_final_aplicada_dia numeric(14,2) DEFAULT 0;

-- Salario base aplicado
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS salario_base_aplicado numeric(14,2) DEFAULT 0;

-- Decreto aplicado
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS decreto_aplicado varchar(100) DEFAULT 'Decreto 314 de 2026';

-- Desglose cálculo (JSONB)
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS desglose_calculo jsonb;

-- Alertas liquidación (JSONB array de strings)
ALTER TABLE travel_expenses.solicitudes_comision 
ADD COLUMN IF NOT EXISTS alertas_liquidacion jsonb;