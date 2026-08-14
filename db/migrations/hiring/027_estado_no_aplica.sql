-- ============================================================================
-- 016 · Estado NO_APLICA para actividades que no corresponden a la modalidad
--
-- instanciarActividades() crea las 63 actividades del proceso y marca en
-- NO_APLICA las que la matriz excluye para su modalidad, en vez de omitirlas:
-- así el expediente deja constancia de por qué el proceso tuvo menos pasos.
-- El check de 005 solo contemplaba el ciclo de vida del estudio previo y
-- bloqueaba ese estado.
-- ============================================================================

ALTER TABLE hiring.proceso_actividades
  DROP CONSTRAINT IF EXISTS ck_pa_estado;

ALTER TABLE hiring.proceso_actividades
  ADD CONSTRAINT ck_pa_estado
  CHECK (estado IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'DEVUELTO', 'NO_APLICA'));
