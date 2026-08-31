-- ============================================================================
-- 045 · Modificaciones contractuales (actividad 9.5)
--
-- EFDS-1177 (RF-MOD-02): el Gestor de Contratación tramita la prórroga en
-- tiempo con justificación técnica, y el sistema la registra extendiendo el
-- plazo sin modificar el presupuesto.
--
-- La tabla nace con todos los tipos de modificación y no solo con la prórroga.
-- La matriz los agrupa en una sola actividad —«modificaciones contractuales,
-- mismo trámite del proceso en versión más corta»— y comparten el flujo:
-- solicitud, justificación, aprobación, acto administrativo y publicación en
-- SECOP II. Lo que cambia es qué campo mueve cada una, y eso lo valida el
-- servicio, no la tabla. Declarar solo PRORROGA obligaría a reescribir el
-- CHECK en EFDS-1176 y otra vez en EFDS-1178, sin ganar nada a cambio.
--
-- Lo que sí es de esta historia es la regla de que la prórroga no toca el
-- presupuesto: `dias_prorroga` existe y no hay ninguna columna de valor. La
-- adición en dinero (EFDS-1176) traerá la suya, y el CHECK que la exija.
--
-- Ninguna modificación se borra. Una prórroga rechazada explica por qué un
-- contrato venció sin extenderse, igual que la minuta rechazada de EFDS-1161 y
-- el supervisor relevado de EFDS-1165.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.modificaciones_contrato (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id         uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  tipo                varchar(30)  NOT NULL,

  -- La «justificación técnica» que pide la historia. Es lo que lee quien
  -- aprueba y lo que queda explicando por qué el contrato duró más de lo
  -- pactado, así que se pide con holgura.
  justificacion       text         NOT NULL,

  -- Días que se agregan al plazo. Solo la prórroga los usa.
  --
  -- Se guardan días y no una fecha final porque el plazo del contrato está en
  -- días: una fecha habría que recalcularla cada vez que el contrato se
  -- suspende, que es lo que hará EFDS-1178.
  dias_prorroga       int,

  -- Desde cuándo rige la modificación.
  fecha_efecto        date         NOT NULL,

  -- El acto administrativo que la soporta. Nulo mientras solo está solicitada:
  -- el acto lo produce quien aprueba, no quien pide.
  documento_id        uuid         REFERENCES hiring.documentos(id),

  estado              varchar(20)  NOT NULL DEFAULT 'SOLICITADA',

  -- El plazo que tenía el contrato al aprobarla, congelado: sin esto no habría
  -- cómo saber de cuánto a cuánto se extendió, porque el contrato ya guarda el
  -- plazo con esta prórroga y las anteriores sumadas.
  plazo_anterior_dias int,

  solicitada_por      varchar(200),
  resuelta_por        varchar(200),
  resuelta_at         timestamptz,
  motivo_rechazo      text,

  -- Publicación en SECOP II (RF-MOD-05): ocurre por fuera y aquí se transcribe
  -- con su soporte, como la del contrato (EFDS-1166).
  publicada_at        date,
  publicacion_documento_id uuid    REFERENCES hiring.documentos(id),

  created_at          timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_modificacion_tipo CHECK (tipo IN (
    'PRORROGA', 'ADICION', 'CESION', 'ACLARACION',
    'SUSPENSION', 'REANUDACION', 'TERMINACION_ANTICIPADA'
  )),
  CONSTRAINT ck_modificacion_estado CHECK (estado IN ('SOLICITADA', 'APROBADA', 'RECHAZADA')),

  -- Una justificación de tres palabras no justifica nada.
  CONSTRAINT ck_modificacion_justificacion CHECK (length(trim(justificacion)) >= 20),

  -- La prórroga extiende el plazo: sin días no extiende nada. Y los días solo
  -- tienen sentido en la prórroga —una cesión no alarga el contrato—.
  CONSTRAINT ck_modificacion_dias CHECK (
    (tipo = 'PRORROGA' AND dias_prorroga IS NOT NULL AND dias_prorroga > 0)
    OR (tipo <> 'PRORROGA' AND dias_prorroga IS NULL)
  ),

  -- Aprobar sin acto administrativo dejaría el contrato modificado por un
  -- acuerdo verbal. Mientras está solicitada todavía no hay acto que exigir.
  CONSTRAINT ck_modificacion_acto CHECK (
    estado <> 'APROBADA' OR documento_id IS NOT NULL
  ),

  -- Negar sin decir por qué no le sirve a quien tiene que corregir y volver a
  -- pedirla.
  CONSTRAINT ck_modificacion_rechazo CHECK (
    estado <> 'RECHAZADA' OR length(trim(coalesce(motivo_rechazo, ''))) >= 10
  ),

  -- La publicación va entera o no va: una fecha sin soporte afirma que se
  -- publicó sin poder probarlo.
  CONSTRAINT ck_modificacion_publicacion CHECK (
    (publicada_at IS NULL) = (publicacion_documento_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS ix_modificaciones_contrato
  ON hiring.modificaciones_contrato (contrato_id, created_at DESC);

COMMENT ON TABLE hiring.modificaciones_contrato IS
  'Modificaciones contractuales de la actividad 9.5: prórroga (EFDS-1177), adición (EFDS-1176) y las de RF-MOD-03 (EFDS-1178).';
