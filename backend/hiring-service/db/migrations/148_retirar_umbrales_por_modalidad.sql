-- ============================================================================
-- 148 · Se retiran los umbrales de cuantía por modalidad (EFDS-XXXX)
--
-- La tabla venía de la 009: rangos en SMMLV o en pesos que sugerían la
-- modalidad mientras se digitaba el valor y vetaban las de menor cuantía por
-- encima del piso de licitación. Desde que el proceso nace de una línea del
-- PAA, la modalidad y el valor llegan hechos y el formulario que consultaba la
-- sugerencia ya no existe. La última regla que la leía —el veto al crear el
-- proceso y al aplicar una versión nueva del PAA— se quitó con esta misma
-- entrega: si el PAA trae una combinación indebida, se corrige en el PAA.
--
-- hiring.smmlv NO se toca: lo siguen usando la cuantía del Comité, el tope
-- MiPyme y el margen de adición, y se administra en Configuración › Salario
-- mínimo.
--
-- Idempotente.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS hiring.umbrales_modalidad;

COMMENT ON TABLE hiring.smmlv IS
  'Salario mínimo mensual legal vigente por año; lleva a pesos lo que la norma fija en SMMLV (Comité, MiPyme, adiciones)';

COMMIT;
