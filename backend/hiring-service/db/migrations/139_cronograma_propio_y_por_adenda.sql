-- ============================================================================
-- 139 · Cronograma: actividades propias y cambios por adenda (EFDS-1152)
--
-- Sobre el cronograma por actividad de la 138:
--
--   1. Actividades propias del proceso. Además de las del flujo, el abogado
--      programa las que el flujo no tiene (una visita técnica, una mesa con
--      los interesados…). No tienen numeral: llevan nombre y etapa. Como no
--      hay actividad del flujo que aprobar, su cumplimiento se marca a mano
--      (cumplida_at); las del flujo lo siguen derivando.
--
--   2. El historial guarda el nombre de lo que cambió: la clave de una propia
--      es su id, que no le dice nada a quien lee.
--
--   3. Una adenda de cronograma lleva las fechas que mueve. Se fijan al
--      emitirla, como el nuevo cierre, y se aplican al cronograma cuando se
--      publica; ahí quedan con la fecha anterior, para el historial.
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- ================================================= 1. actividades propias --

ALTER TABLE hiring.cronograma_actividades
  ALTER COLUMN numeral DROP NOT NULL;

ALTER TABLE hiring.cronograma_actividades
  ADD COLUMN IF NOT EXISTS nombre       varchar(200),
  ADD COLUMN IF NOT EXISTS etapa        smallint,
  ADD COLUMN IF NOT EXISTS cumplida_at  timestamptz,
  ADD COLUMN IF NOT EXISTS cumplida_por varchar(200);

ALTER TABLE hiring.cronograma_actividades DROP CONSTRAINT IF EXISTS ck_cronograma_actividad_origen;
ALTER TABLE hiring.cronograma_actividades
  ADD CONSTRAINT ck_cronograma_actividad_origen CHECK (
    (numeral IS NOT NULL AND nombre IS NULL)
    OR (numeral IS NULL AND nombre IS NOT NULL AND etapa IS NOT NULL AND etapa BETWEEN 5 AND 10)
  );

COMMENT ON COLUMN hiring.cronograma_actividades.nombre IS
  'Solo en las actividades propias del proceso (sin numeral del flujo) (139).';
COMMENT ON COLUMN hiring.cronograma_actividades.etapa IS
  'Etapa (5 a 10) en la que va una actividad propia (139).';
COMMENT ON COLUMN hiring.cronograma_actividades.cumplida_at IS
  'Cuándo se marcó cumplida una actividad propia; las del flujo derivan su cumplimiento (139).';

-- ============================================================ 2. historial --

ALTER TABLE hiring.cronograma_cambios
  ALTER COLUMN clave TYPE varchar(60);

ALTER TABLE hiring.cronograma_cambios
  ADD COLUMN IF NOT EXISTS nombre varchar(200);

COMMENT ON COLUMN hiring.cronograma_cambios.nombre IS
  'Nombre de la etapa o actividad al momento del cambio; la clave de una propia es su id (139).';

-- ================================================ 3. fechas de la adenda --

ALTER TABLE hiring.adendas
  ADD COLUMN IF NOT EXISTS cambios_cronograma jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN hiring.adendas.cambios_cronograma IS
  'Fechas del cronograma (5.2) que mueve una adenda de cronograma: [{ambito, clave, nombre, fechaInicio, fechaFin, antes}]. Se aplican al publicarla (139).';

COMMIT;
