-- ============================================================================
-- 020 · Registro de la apertura del proceso (actividad 5.7)
--
-- EFDS-1152 (RF-PUB-03): la apertura exige resolución de apertura y pliego
-- definitivo, y no puede darse sin CDP expedido (RF-EST-05, ya implementado en
-- la migración 010_cdp).
--
-- Hasta ahora la apertura solo movía la etapa del proceso: quedaba constancia
-- de que se abrió, pero no de con qué acto administrativo. Un expediente que no
-- guarda la resolución que dio inicio al proceso no prueba que el inicio fue
-- legal, que es justo lo que un ente de control revisa.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.aperturas_proceso (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id               uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  -- Número y fecha del acto administrativo, no del registro: es la fecha en que
  -- la entidad abrió el proceso, y la que cuenta para los términos siguientes.
  resolucion_numero        varchar(80)  NOT NULL,
  resolucion_fecha         date         NOT NULL,
  resolucion_documento_id  uuid         NOT NULL REFERENCES hiring.documentos(id),
  -- El pliego definitivo se publica con la apertura: es el documento que rige
  -- el proceso a partir de aquí, y sustituye al proyecto publicado en la 5.2.
  pliego_documento_id      uuid         NOT NULL REFERENCES hiring.documentos(id),
  secop_url                text,
  abierto_por              varchar(200),
  created_at               timestamptz  NOT NULL DEFAULT now(),
  -- Un proceso se abre una sola vez. La restricción está en la base y no solo
  -- en el servicio porque una segunda apertura dejaría dos resoluciones
  -- distintas dando inicio al mismo proceso.
  CONSTRAINT uq_apertura_proceso UNIQUE (proceso_id)
);

COMMENT ON TABLE hiring.aperturas_proceso IS
  'Resolución de apertura y pliego definitivo de cada proceso (EFDS-1152).';

-- ----------------------------------------------------------------------------
-- Aplicabilidad de la actividad.
--
-- La historia la limita a "modalidades competitivas con apertura formal". Las
-- dos que quedan fuera son las mismas que ya se excluyen de la publicación y de
-- las observaciones (migraciones 016 y 017): en contratación directa no hay
-- convocatoria que abrir, y el régimen especial 092 sigue su propio trámite.
-- ----------------------------------------------------------------------------
INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
VALUES
  ('5.7', 'CONTRATACION_DIRECTA',
   'La contratación directa no abre convocatoria: se contrata sin proceso de selección'),
  ('5.7', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la apertura ordinaria del proceso')
ON CONFLICT DO NOTHING;
