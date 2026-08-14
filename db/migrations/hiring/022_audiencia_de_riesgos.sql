-- ============================================================================
-- 022 · Audiencia de asignación de riesgos (actividad 5.5)
--
-- EFDS-1153 (RF-PUB-04): en licitación pública la audiencia de asignación de
-- riesgos es obligatoria, y su resultado se consolida en la matriz de riesgos.
-- Sin ella el proceso no puede abrirse.
--
-- El numeral es el siguiente disponible de la etapa, con el mismo criterio que
-- las actividades anteriores (ver la nota de la migración 016): la historia dice
-- "5.x (audiencia de riesgos)" y el flujo la ubica después de las observaciones
-- y la limitación a MIPYME, antes de la apertura. Si la matriz oficial dice otro
-- número, se corrige aquí.
-- ============================================================================

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('5.5', 5, 'Audiencia de asignación de riesgos',
   'Audiencia en la que se asignan y tipifican los riesgos del proceso. Su resultado se consolida en la matriz de riesgos, que queda en el expediente junto con el acta.',
   50)
ON CONFLICT (numeral) DO NOTHING;

-- Solo las dos exclusiones que los documentos fuente dejan sin duda, por la
-- misma razón que en 013, 016 y 017: una exclusión equivocada escondería una
-- actividad que la ley sí exige.
--
--   · Contratación directa no adelanta proceso de selección: no hay audiencia
--     con oferentes a la que asignar riesgos.
--   · El régimen especial 092 de 2017 sigue su propio trámite y ya está
--     excluido de la elaboración y la publicación.
INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
VALUES
  ('5.5', 'CONTRATACION_DIRECTA',
   'La contratación directa no adelanta audiencia de asignación de riesgos: no hay convocatoria ni oferentes'),
  ('5.5', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la audiencia ordinaria de riesgos')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Dónde es obligatoria.
--
-- La historia deja como supuesto a validar "las modalidades exactas en que
-- aplica según la matriz", así que la regla entra en tabla y no en el código, y
-- nace sin confirmar. Es el mismo mecanismo de los umbrales de cuantía y los
-- plazos de publicidad: la aplicación funciona con el valor provisional y avisa
-- de que lo es, en vez de bloquearse esperando una respuesta.
--
-- "Aplica" y "es obligatoria" son cosas distintas: en las modalidades donde
-- aplica sin ser obligatoria, la audiencia puede celebrarse y registrarse, pero
-- no impide abrir el proceso.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hiring.audiencia_riesgos_config (
  modalidad    varchar(60) PRIMARY KEY REFERENCES hiring.modalidades(codigo),
  obligatoria  boolean     NOT NULL DEFAULT false,
  fundamento   text,
  confirmado   boolean     NOT NULL DEFAULT false,
  updated_by   varchar(200),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE hiring.audiencia_riesgos_config IS
  'En qué modalidades la audiencia de riesgos es obligatoria (EFDS-1153, RF-PUB-04).';

-- Lo único que la historia afirma sin ambigüedad es la licitación pública. Va
-- confirmada; las demás quedan como no obligatorias y sin confirmar, que es la
-- forma honesta de decir "esto todavía no lo sabemos".
INSERT INTO hiring.audiencia_riesgos_config (modalidad, obligatoria, fundamento, confirmado)
VALUES
  ('LICITACION_PUBLICA', true,
   'RF-PUB-04: en licitación pública la audiencia de asignación de riesgos es obligatoria',
   true)
ON CONFLICT (modalidad) DO NOTHING;

-- ----------------------------------------------------------------------------
-- La audiencia celebrada.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hiring.audiencias_riesgos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  -- La de celebración, no la del registro: es el hecho que la matriz de riesgos
  -- documenta, y de ella depende que el proceso pueda abrirse.
  fecha_celebracion     date        NOT NULL,
  acta_documento_id     uuid        NOT NULL REFERENCES hiring.documentos(id),
  matriz_documento_id   uuid        NOT NULL REFERENCES hiring.documentos(id),
  observaciones         text,
  registrado_por        varchar(200),
  created_at            timestamptz NOT NULL DEFAULT now(),
  -- Corregir una audiencia mal registrada la anula y obliga a registrarla de
  -- nuevo: el acta anterior queda en el expediente, como en la publicación.
  anulada_at            timestamptz,
  anulada_por           varchar(200),
  motivo_anulacion      text
);

-- Una sola audiencia vigente por proceso; las anuladas quedan fuera del índice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_audiencia_riesgos_vigente
  ON hiring.audiencias_riesgos (proceso_id)
  WHERE anulada_at IS NULL;

COMMENT ON TABLE hiring.audiencias_riesgos IS
  'Audiencias de asignación de riesgos celebradas, con su acta y su matriz consolidada.';
