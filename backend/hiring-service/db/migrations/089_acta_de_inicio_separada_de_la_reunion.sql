-- ============================================================================
-- 089 · El acta de inicio (8.7), separada de la reunión de inicio (9.1)
--
-- La 042 las trató como un solo hecho contado dos veces y las dos casillas del
-- riel abrían el mismo panel, titulado «Reunión de inicio». En la sesión de
-- revisión del flujo de licitación pública se pidió separarlas: en la matriz
-- son dos actividades de dos etapas —la 8.7 cierra la legalización con el acta
-- suscrita, la 9.1 abre la ejecución con la reunión— y verlas como una sola
-- pantalla confundía a quien recorre el flujo.
--
-- La reunión se queda en `actas_inicio`, que es de donde liquidación, pagos,
-- seguimiento e informe final toman la fecha en que empezó la ejecución.
-- El acta suscrita pasa a su propia tabla, con su fecha y su documento.
--
-- Si el acta aplica ya no se pregunta en la pantalla con una casilla de
-- «¿el contrato la pactó?»: lo dice la matriz SÍ/NO por modalidad
-- (`actividades_excluidas` de la 8.7). Donde aplica, la reunión toma el acta
-- de aquí; donde no, se registra sin ella.
--
-- Reaplicarla no hace nada nuevo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.suscripciones_acta_inicio (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id         uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- Cuándo firmaron las dos partes, que no es cuándo se cargó.
  fecha_suscripcion   date         NOT NULL,

  -- El acta firmada: sin documento no hay suscripción que registrar.
  acta_documento_id   uuid         NOT NULL REFERENCES hiring.documentos(id),

  registrado_por      varchar(200),
  created_at          timestamptz  NOT NULL DEFAULT now()
);

-- Una sola acta de inicio por contrato, como una sola reunión.
CREATE UNIQUE INDEX IF NOT EXISTS uq_suscripcion_acta_inicio_contrato
  ON hiring.suscripciones_acta_inicio (contrato_id);

COMMENT ON TABLE hiring.suscripciones_acta_inicio IS
  'Acta de inicio suscrita por la entidad y el contratista (actividad 8.7). La reunión (9.1) va en actas_inicio.';

-- La descripción de la 9.1 hablaba del acta; ahora el acta es de la 8.7.
UPDATE hiring.actividades
   SET descripcion = 'Socialización del alcance, el cronograma y los entregables. Con ella el contrato entra en ejecución.'
 WHERE numeral = '9.1';

-- Las actas que llegaron con la reunión, antes de separarlas, pasan a la 8.7.
-- Si se quedaban en `actas_inicio`, la 8.7 las leía de allá y las dos casillas
-- mostraban el mismo documento. La fecha de firma es la de la reunión: es la
-- única que se registró.
INSERT INTO hiring.suscripciones_acta_inicio
       (contrato_id, fecha_suscripcion, acta_documento_id, registrado_por, created_at)
SELECT ai.contrato_id, ai.fecha_inicio, ai.acta_documento_id, ai.registrado_por, ai.created_at
  FROM hiring.actas_inicio ai
 WHERE ai.acta_documento_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM hiring.suscripciones_acta_inicio s
                    WHERE s.contrato_id = ai.contrato_id);

-- La 042 exigía el documento en la reunión cuando el acta se pactó. Ahora el
-- acta vive en la 8.7 y la reunión no lo guarda: la regla ya no es de esta tabla.
ALTER TABLE hiring.actas_inicio DROP CONSTRAINT IF EXISTS ck_acta_inicio_documento;

-- El documento va al expediente de la 8.7, y la reunión deja de apuntarle.
UPDATE hiring.documentos d
   SET numeral = '8.7'
  FROM hiring.suscripciones_acta_inicio s
 WHERE d.id = s.acta_documento_id
   AND d.numeral = '9.1';

UPDATE hiring.actas_inicio ai
   SET acta_documento_id = NULL
  FROM hiring.suscripciones_acta_inicio s
 WHERE s.contrato_id = ai.contrato_id
   AND ai.acta_documento_id = s.acta_documento_id;
