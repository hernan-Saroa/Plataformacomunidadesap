-- ============================================================================
-- 042 · Reunión y acta de inicio del contrato (actividad 9.1)
--
-- EFDS-1167 (RF-EJE-01): legalizado el contrato y designado su supervisor, se
-- socializa el alcance con el contratista y se suscribe el acta que da comienzo
-- formal a la ejecución.
--
-- Hay un matiz de la matriz que la historia no recoge y conviene dejar dicho.
-- La actividad 9.1 se llama «Reunión de inicio» y describe el acta como
-- «firmada por ambas partes, SI FUE PACTADA EN EL CONTRATO»: el acta no siempre
-- aplica. La historia, en cambio, la enuncia como el hecho que marca el
-- contrato en ejecución, sin condicionarla.
--
-- Se modela lo que reconcilia las dos lecturas: lo que arranca la ejecución es
-- la reunión de inicio, y el acta es su soporte cuando el contrato la pactó.
-- Así un contrato sin acta pactada puede entrar en ejecución dejando
-- constancia de la reunión, y uno que sí la pactó no puede hacerlo sin el
-- documento firmado. Exigir el acta siempre bloquearía contratos que la ley no
-- obliga a suscribirla; no exigirla nunca dejaría empezar sin soporte a los que
-- sí la pactaron.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.actas_inicio (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id         uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- Fecha real de la reunión, no la del registro: es la que cuenta como inicio
  -- de la ejecución y desde la que corre el plazo del contrato.
  fecha_inicio        date         NOT NULL,

  -- Qué se socializó. La matriz lo pide en 9.1: alcance, cronograma y
  -- entregables. Se guarda el texto porque es lo que acredita que la reunión
  -- ocurrió y no fue un trámite en el papel.
  temas_tratados      text         NOT NULL,

  -- Quiénes asistieron, en texto libre: por la entidad puede ir el supervisor,
  -- el ordenador o quien deleguen, y por el contratista su representante. No se
  -- modela como lista de personas porque el contratista no es usuario del
  -- sistema y no está en el directorio.
  asistentes          text,

  -- El acta firmada. Nula cuando el contrato no la pactó: en ese caso la
  -- reunión se registra igual y el contrato arranca, que es lo que dice la
  -- matriz con su «si fue pactada en el contrato».
  acta_documento_id   uuid         REFERENCES hiring.documentos(id),
  -- Si el contrato la pactó. Congelado al registrar, porque de él depende que
  -- el acta fuera exigible en ese momento.
  acta_pactada        boolean      NOT NULL DEFAULT true,

  registrado_por      varchar(200),
  created_at          timestamptz  NOT NULL DEFAULT now(),

  -- El acta y su condición van juntas: si el contrato la pactó, el documento es
  -- obligatorio. Sin esta regla se podría marcar «pactada» y no adjuntar nada,
  -- que es justo lo que la actividad pretende impedir.
  CONSTRAINT ck_acta_inicio_documento CHECK (
    acta_pactada = false OR acta_documento_id IS NOT NULL
  ),
  CONSTRAINT ck_acta_inicio_temas CHECK (length(trim(temas_tratados)) >= 10)
);

-- Una sola reunión de inicio por contrato: la ejecución empieza una vez. Si
-- hubiera que corregirla se anula y se registra otra, como el resto del módulo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_acta_inicio_contrato
  ON hiring.actas_inicio (contrato_id);

CREATE INDEX IF NOT EXISTS ix_actas_inicio_contrato
  ON hiring.actas_inicio (contrato_id);

COMMENT ON TABLE hiring.actas_inicio IS
  'Reunión de inicio y su acta, cuando el contrato la pactó (EFDS-1167, actividad 9.1).';

-- ------------------------------------------------------ estado del contrato --
-- La historia pide que el contrato quede «en ejecución». Hasta ahora su estado
-- se derivaba de firmas y coberturas —GENERADO, ACEPTADO, PERFECCIONADO,
-- LEGALIZADO—; EJECUCION es el siguiente y se deriva igual, de que exista la
-- reunión de inicio. No se declara a mano.
--
-- En un DO por la misma razón que en la 036 y la 037: sin tabla de control, la
-- reaplicación tiene que converger en vez de fallar o retroceder. Sin el guard,
-- volver a aplicar la 037 después de esta borraría EJECUCION del CHECK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_contrato_estado'
      AND pg_get_constraintdef(oid) LIKE '%EJECUCION%'
  ) THEN
    ALTER TABLE hiring.contratos DROP CONSTRAINT IF EXISTS ck_contrato_estado;
    ALTER TABLE hiring.contratos ADD CONSTRAINT ck_contrato_estado
      CHECK (estado IN (
        'GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO', 'LEGALIZADO', 'EJECUCION'
      ));
  END IF;
END $$;

-- Cuándo arrancó la ejecución, para no recalcularlo desde el acta cada vez que
-- se consulta el contrato. Nulo mientras no haya reunión de inicio.
ALTER TABLE hiring.contratos
  ADD COLUMN IF NOT EXISTS ejecucion_desde date;

COMMENT ON COLUMN hiring.contratos.ejecucion_desde IS
  'Fecha de la reunión de inicio: desde cuándo el contrato está en ejecución (EFDS-1167).';

-- Un contrato en ejecución sin fecha de arranque sería un estado que nadie
-- puede fechar. Mismo criterio que ck_contrato_legalizado en la 037.
ALTER TABLE hiring.contratos DROP CONSTRAINT IF EXISTS ck_contrato_ejecucion;
ALTER TABLE hiring.contratos ADD CONSTRAINT ck_contrato_ejecucion
  CHECK (estado <> 'EJECUCION' OR ejecucion_desde IS NOT NULL);
