-- ============================================================================
-- 118 · La 6.1 se llama como en la metodología
--
-- La revisión de QA (EFDS-1155): el nombre de la actividad no coincidía con el
-- término de la metodología. Pasa a «Cierre del proceso y recepción de
-- ofertas». Solo cambia el nombre: el numeral y todo lo que cuelga de él
-- siguen igual.
-- ============================================================================

BEGIN;

UPDATE hiring.actividades
   SET nombre = 'Cierre del proceso y recepción de ofertas'
 WHERE numeral = '6.1';

COMMIT;
