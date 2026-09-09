-- ============================================================================
-- 066 · Negar, que no es devolver
--
-- EFDS-1183. Una revisión solo admitía dos desenlaces: aprobado o devuelto.
-- Devolver es «corrígelo y vuelve»: el trabajo regresa a quien lo hizo y el
-- proceso sigue vivo. Negar es «esto no procede»: no hay nada que corregir y el
-- proceso termina ahí.
--
-- Sin la segunda, un proceso que la Dirección rechaza de plano no tenía cómo
-- terminar. Se devolvía —que es mentira, porque nadie espera una corrección— o
-- se quedaba en revisión para siempre. Las dos salidas dejan el listado
-- diciendo algo falso sobre en qué va el expediente.
--
-- Se amplían tres restricciones, ninguna tabla nueva:
--
--   revisiones.decision          · la decisión que se tomó
--   proceso_actividades.estado   · en qué quedó la actividad
--   procesos.estado              · cómo terminó el proceso
--
-- El desenlace es del proceso y no solo de la actividad. Un estudio previo
-- negado no deja un proceso «en curso» con una actividad muerta: si la
-- Dirección dice que la contratación no procede, lo que termina es la
-- contratación.
-- ============================================================================

-- ------------------------------------------------- la decisión que se toma --
--
-- Las restricciones se recrean con su nombre original. La primera versión de
-- esta migración inventó los nombres que Postgres habría generado por defecto y
-- no acertó ninguno: las de este esquema se llaman `ck_*` porque las escribió
-- una migración a mano. Dejar la vieja en pie no daba error al aplicar —se
-- suman, no se reemplazan— y seguía rechazando NEGADO en silencio.
ALTER TABLE hiring.revisiones DROP CONSTRAINT IF EXISTS ck_revision_decision;
ALTER TABLE hiring.revisiones DROP CONSTRAINT IF EXISTS revisiones_decision_check;

ALTER TABLE hiring.revisiones
  ADD CONSTRAINT ck_revision_decision
  CHECK (decision IN ('APROBADO', 'DEVUELTO', 'NEGADO'));

-- La regla que ya exigía motivo al devolver se extiende a negar: a quien le
-- niegan un proceso hay que decirle por qué, y con más razón que al devolver,
-- porque no va a tener ocasión de preguntarlo corrigiendo.
--
-- La original se llamaba distinto en cada base según cuándo se creara, así que
-- se localiza por su definición en vez de por su nombre.
DO $$
DECLARE
  vieja text;
BEGIN
  SELECT conname INTO vieja
    FROM pg_constraint
   WHERE conrelid = 'hiring.revisiones'::regclass
     AND contype = 'c'
     AND conname <> 'ck_revision_motivo_obligatorio'
     AND pg_get_constraintdef(oid) ILIKE '%observaciones%'
   LIMIT 1;

  IF vieja IS NOT NULL THEN
    EXECUTE 'ALTER TABLE hiring.revisiones DROP CONSTRAINT ' || quote_ident(vieja);
  END IF;
END $$;

ALTER TABLE hiring.revisiones DROP CONSTRAINT IF EXISTS ck_revision_motivo_obligatorio;

ALTER TABLE hiring.revisiones
  ADD CONSTRAINT ck_revision_motivo_obligatorio
  CHECK (
    decision = 'APROBADO'
    OR (observaciones IS NOT NULL AND length(trim(observaciones)) > 0)
  );

-- ----------------------------------------------- en qué queda la actividad --
--
-- NEGADO y no reuso de DEVUELTO: devuelta, la actividad vuelve a BORRADOR y se
-- puede reenviar; negada, no se toca más. Con un solo estado el riel ofrecería
-- editar y reenviar algo que ya nadie va a mirar.
ALTER TABLE hiring.proceso_actividades DROP CONSTRAINT IF EXISTS ck_pa_estado;
ALTER TABLE hiring.proceso_actividades DROP CONSTRAINT IF EXISTS proceso_actividades_estado_check;

ALTER TABLE hiring.proceso_actividades
  ADD CONSTRAINT ck_pa_estado
  CHECK (estado IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'DEVUELTO', 'NO_APLICA', 'NEGADO'));

-- -------------------------------------------------- cómo terminó el proceso --
--
-- La etapa 7 tenía dos desenlaces —adjudicado o desierto— y los dos suponen que
-- el proceso llegó hasta allá. Este es un tercero y ocurre mucho antes: la
-- Dirección revisa lo que el área radicó y dice que la contratación no procede.
--
-- No es «desierto»: desierto es que el proceso salió al mercado y no hubo con
-- quién contratar. Aquí no salió.
ALTER TABLE hiring.procesos
  DROP CONSTRAINT IF EXISTS ck_proceso_estado;

ALTER TABLE hiring.procesos
  ADD CONSTRAINT ck_proceso_estado
  CHECK (estado IN ('EN_CURSO', 'ADJUDICADO', 'DESIERTO', 'NEGADO'));

COMMENT ON COLUMN hiring.procesos.estado IS
  'Desenlace del proceso: en curso, adjudicado, desierto o negado en la revisión (EFDS-1183).';

-- ------------------------------------------------ nota para quien venga después
--
-- Negar no se puede deshacer, y es deliberado mientras la Dirección de
-- Contratación no diga lo contrario: reabrir un proceso negado es una actuación
-- con su propia justificación, no un botón de «me equivoqué». Si la entidad la
-- necesita, es otra actividad con su acto y su traza, no una excepción aquí.
