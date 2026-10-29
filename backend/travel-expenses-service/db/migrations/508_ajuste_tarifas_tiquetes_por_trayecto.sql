SET client_encoding = 'UTF8';

-- Migration 508: Ajuste de tarifas de referencia de tiquetes aéreos a valor unitario por trayecto (solo ida)
-- Fecha: 2026-10-27
-- Descripción:
--   Las tarifas iniciales se encontraban parametrizadas con valores equivalentes a pasajes de ida y vuelta
--   (ej. BOG-MDE a $380.000). Dado que el modelo de itinerario de comisiones registra cada tramo
--   de forma individual por trayecto (SOLO_IDA), se ajustan las tarifas de la matriz para que reflejen
--   con precisión el costo unitario por trayecto. Al sumar o multiplicar los tramos aéreos del viaje,
--   el cálculo resultará en el costo total exacto de la comisión sin duplicación.

COMMENT ON COLUMN travel_expenses.tarifas_referencia_tiquetes.tarifa_estimada 
  IS 'Tarifa de referencia institucional por trayecto (solo ida) en pesos COP.';

COMMENT ON COLUMN travel_expenses.tarifas_referencia_tiquetes.tarifa_minima 
  IS 'Tarifa mínima observada en el mercado por trayecto (solo ida) en pesos COP.';

COMMENT ON COLUMN travel_expenses.tarifas_referencia_tiquetes.tarifa_maxima 
  IS 'Tarifa máxima observada en el mercado por trayecto (solo ida) en pesos COP.';

-- Actualizar tarifas existentes que estaban en valores de ida y vuelta (>= 240.000 para rutas troncales continentales)
UPDATE travel_expenses.tarifas_referencia_tiquetes
SET 
  tarifa_estimada = ROUND(tarifa_estimada / 2, 2),
  tarifa_minima = CASE WHEN tarifa_minima IS NOT NULL THEN ROUND(tarifa_minima / 2, 2) ELSE NULL END,
  tarifa_maxima = CASE WHEN tarifa_maxima IS NOT NULL THEN ROUND(tarifa_maxima / 2, 2) ELSE NULL END,
  notas = REPLACE(COALESCE(notas, ''), 'Ruta troncal', 'Ruta por trayecto'),
  actualizado_en = NOW()
WHERE tarifa_estimada >= 240000;
