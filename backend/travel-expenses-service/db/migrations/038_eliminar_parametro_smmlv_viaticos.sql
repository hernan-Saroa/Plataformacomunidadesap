-- Migración 038: Eliminar parámetro SMMLV de travel_expenses.liquidation_params
-- Motivo: El Salario Mínimo Legal Vigente es dato maestro centralizado en auth.system_settings ('SALARIO_MINIMO_MENSUAL').
-- Viáticos no debe almacenar ni permitir edición local de este parámetro.

DELETE FROM travel_expenses.liquidation_params WHERE clave = 'SMMLV_2026';
