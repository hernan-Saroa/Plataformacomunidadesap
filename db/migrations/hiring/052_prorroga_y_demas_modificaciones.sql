-- ============================================================================
-- 052 · Prórroga, cesión, aclaratorio y suspensión/reanudación
--
-- EFDS-1177 (RF-MOD-02): la prórroga extiende el plazo con justificación
-- técnica y **sin tocar el presupuesto**.
-- EFDS-1178 (RF-MOD-03, RF-MOD-05, RF-SIS-01): cesión, aclaratorio y
-- suspensión/reanudación por acto administrativo o acta motivada, actualizando
-- el estado del contrato donde aplique.
--
-- No hay tabla nueva: `modificaciones_contrato` se creó genérica en la 049
-- justamente para esto. Lo propio de cada tipo entra como columnas con CHECK
-- —no en jsonb— por el mismo criterio de la adición: son datos que se consultan
-- y que en el caso de la reanudación llevan llave foránea.
--
-- **La terminación anticipada NO entra.** EFDS-1178 la nombra en el bloque de
-- la matriz pero su propia línea de dependencias pide confirmar «si se maneja
-- en esta misma HU o requiere una aparte». El tipo ya existe en el CHECK desde
-- la 049; lo que no existe es su trámite, y con él tendría que llegar el estado
-- TERMINADO. Queda anotado, no decidido por cuenta propia.
-- ============================================================================

-- --------------------------------------------- el contrato puede suspenderse --
/*
 * RF-SIS-01 pedía «suscrito, en ejecución, suspendido, terminado, liquidado y
 * cerrado». La 048 dejó fuera SUSPENDIDO y TERMINADO porque nadie los escribía.
 * La suspensión ya tiene quien la escriba; la terminación no, y sigue fuera.
 *
 * Se recrea el CHECK entero: `ADD CONSTRAINT` no acepta IF NOT EXISTS, así que
 * se borra primero para que volver a correr la migración no falle.
 */
ALTER TABLE hiring.contratos
  DROP CONSTRAINT IF EXISTS ck_contrato_estado;

ALTER TABLE hiring.contratos
  ADD CONSTRAINT ck_contrato_estado CHECK (
    estado IN (
      'GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO',
      'LEGALIZADO', 'EJECUCION', 'SUSPENDIDO', 'LIQUIDADO', 'CERRADO'
    )
  );

COMMENT ON COLUMN hiring.contratos.estado IS
  'Ciclo del contrato (RF-SIS-01). SUSPENDIDO es ejecución en pausa: no admite pagos ni liquidación hasta que se reanude.';

-- ------------------------------------------------- lo propio de cada tipo --
/*
 * El plazo, en días, antes y después de la modificación.
 *
 * Se guardan los dos por lo mismo que el valor en la adición: `contratos.
 * plazo_dias` dice cuánto es el plazo hoy, y esto dice qué hizo cada
 * modificación. Sin el «antes» no se puede revocar sin adivinar.
 */
ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS dias_prorroga      int,
  ADD COLUMN IF NOT EXISTS plazo_dias_antes   int,
  ADD COLUMN IF NOT EXISTS plazo_dias_despues int;

COMMENT ON COLUMN hiring.modificaciones_contrato.dias_prorroga IS
  'Días que la prórroga añade al plazo. La reanudación no lo usa: los suyos se derivan de las fechas.';

/*
 * La suspensión y su levantamiento.
 *
 * `suspension_hasta` es la fecha **prevista** y puede faltar: hay suspensiones
 * indefinidas, que terminan cuando desaparece la causa. La fecha real es la
 * `reanudada_el` de la reanudación que la levanta, y por eso la reanudación
 * apunta a su suspensión en vez de que la suspensión se marque a sí misma:
 * quién levanta a quién es un hecho con su propio acto administrativo.
 */
ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS suspension_desde        date,
  ADD COLUMN IF NOT EXISTS suspension_hasta        date,
  ADD COLUMN IF NOT EXISTS reanuda_modificacion_id uuid
    REFERENCES hiring.modificaciones_contrato(id),
  ADD COLUMN IF NOT EXISTS reanudada_el            date;

/*
 * La cesión.
 *
 * Se guarda también el cedente, que es el contratista que había: `contratos`
 * queda con el cesionario y sin él no habría forma de saber a quién sustituyó.
 */
ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS cedente_documento    varchar(40),
  ADD COLUMN IF NOT EXISTS cedente_nombre       varchar(300),
  -- El tipo de persona tambien: de el depende la ARL (EFDS-1164), asi que
  -- revocar la cesion sin devolverlo dejaria al contrato exigiendo o eximiendo
  -- una afiliacion que no corresponde.
  ADD COLUMN IF NOT EXISTS cedente_tipo         varchar(20),
  ADD COLUMN IF NOT EXISTS cesionario_documento varchar(40),
  ADD COLUMN IF NOT EXISTS cesionario_nombre    varchar(300),
  ADD COLUMN IF NOT EXISTS cesionario_tipo      varchar(20);

-- ------------------------------------------------------ reglas por tipo --
/*
 * Cada tipo exige lo suyo y nada más. Se recrean los CHECK en vez de añadirlos
 * con IF NOT EXISTS, que Postgres no admite para constraints.
 */
ALTER TABLE hiring.modificaciones_contrato
  DROP CONSTRAINT IF EXISTS ck_modificacion_prorroga,
  DROP CONSTRAINT IF EXISTS ck_modificacion_suspension,
  DROP CONSTRAINT IF EXISTS ck_modificacion_reanudacion,
  DROP CONSTRAINT IF EXISTS ck_modificacion_cesion;

-- Una prórroga sin días no prorroga nada. Y no toca el presupuesto (RF-MOD-02):
-- si trae valor adicionado es una adición mal clasificada.
ALTER TABLE hiring.modificaciones_contrato
  ADD CONSTRAINT ck_modificacion_prorroga CHECK (
    tipo <> 'PRORROGA'
    OR (dias_prorroga IS NOT NULL AND dias_prorroga > 0 AND valor_adicionado IS NULL)
  );

-- La suspensión dice desde cuándo. El «hasta» es opcional a propósito.
ALTER TABLE hiring.modificaciones_contrato
  ADD CONSTRAINT ck_modificacion_suspension CHECK (
    tipo <> 'SUSPENSION'
    OR (
      suspension_desde IS NOT NULL
      AND (suspension_hasta IS NULL OR suspension_hasta >= suspension_desde)
    )
  );

-- La reanudación dice qué suspensión levanta y desde cuándo se vuelve a correr.
ALTER TABLE hiring.modificaciones_contrato
  ADD CONSTRAINT ck_modificacion_reanudacion CHECK (
    tipo <> 'REANUDACION'
    OR (reanuda_modificacion_id IS NOT NULL AND reanudada_el IS NOT NULL)
  );

-- La cesión dice a quién se cede. El cedente lo escribe el sistema al aprobar.
ALTER TABLE hiring.modificaciones_contrato
  ADD CONSTRAINT ck_modificacion_cesion CHECK (
    tipo <> 'CESION'
    OR (
      cesionario_documento IS NOT NULL
      AND cesionario_nombre IS NOT NULL
      AND cesionario_tipo IN ('NATURAL', 'JURIDICA')
    )
  );

/*
 * Una suspensión se levanta una sola vez.
 *
 * Parcial sobre las que no están revocadas: revocar una reanudación devuelve el
 * contrato a suspendido, y entonces tiene que poder reanudarse otra vez.
 */
CREATE UNIQUE INDEX IF NOT EXISTS uq_reanudacion_por_suspension
  ON hiring.modificaciones_contrato (reanuda_modificacion_id)
  WHERE reanuda_modificacion_id IS NOT NULL AND estado <> 'REVOCADA';

CREATE INDEX IF NOT EXISTS ix_modificaciones_tipo_estado
  ON hiring.modificaciones_contrato (contrato_id, tipo, estado);
