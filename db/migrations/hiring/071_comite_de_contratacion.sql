-- ============================================================================
-- 071 · El comité de contratación deja de ser un acta suelta
--
-- La actividad 3.7 —3.6 en la matriz— se cumplía con el registro de constancia
-- de la 051: fecha, nota y el acta adjunta. Pero la matriz no la describe como
-- un trámite que ocurre afuera y del que solo llega un papel; la describe como
-- **tres decisiones**: «Va o No / observa o no / aprueba o no». Y RF-DOC-05, de
-- prioridad alta, precisa lo que el papel no dice: «Observaciones de fondo o
-- aprobaciones condicionadas; en directa solo si supera 1.000 SMMLV».
--
-- Con una nota libre, el expediente no puede responder si el comité aprobó, si
-- aprobó con condiciones —ni cuáles—, o si devolvió los documentos con
-- observaciones de fondo. Y como el registro cerraba la actividad en APROBADO
-- pasara lo que pasara, un proceso observado por el comité seguía su camino
-- como si lo hubieran avalado.
--
-- Dos tablas, porque son dos cosas distintas: cuándo hay que ir al comité es
-- configuración de la entidad, y lo que el comité decidió es historia del
-- proceso.
-- ============================================================================

-- ------------------------------------------ cuándo hay que ir al comité ----
-- La matriz ya dice en qué modalidades va: lo resuelve `actividades_excluidas`
-- y son ocho de once —quedan fuera la menor cuantía, la enajenación por subasta
-- y la mínima cuantía—.
--
-- Lo que la matriz no puede decir es la condición de cuantía de la directa,
-- porque su celda es por modalidad y esto depende del valor de cada proceso.
-- Va en tabla propia y por modalidad, no como constante ni como una fila suelta
-- de «el umbral del comité»: hoy solo la directa tiene condición, y si mañana
-- la Dirección le pone una a otra modalidad es un INSERT.
CREATE TABLE IF NOT EXISTS hiring.umbrales_comite_contratacion (
  modalidad    varchar(60)    PRIMARY KEY REFERENCES hiring.modalidades (codigo),
  -- Por encima de este valor el proceso pasa por comité; por debajo, no.
  valor        numeric(18,2)  NOT NULL,
  unidad       varchar(10)    NOT NULL DEFAULT 'SMMLV',
  -- De dónde sale la cifra, como en `parametros_mipyme`: importa poder leer el
  -- fundamento junto al número cuando alguien venga a validarlo.
  fundamento   text,
  confirmado   boolean        NOT NULL DEFAULT false,
  created_at   timestamptz    NOT NULL DEFAULT now(),
  updated_at   timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT ck_umbral_comite_unidad CHECK (unidad IN ('SMMLV', 'PESOS')),
  -- Un umbral de cero o negativo no filtra nada: sería decir «siempre va» por
  -- un camino que no se lee como tal.
  CONSTRAINT ck_umbral_comite_valor CHECK (valor > 0)
);

COMMENT ON TABLE hiring.umbrales_comite_contratacion IS
  'Condición de cuantía para pasar por el comité de contratación (actividad 3.7). La modalidad sin fila va a comité siempre que la matriz la marque.';

-- En SMMLV y no en pesos, como los umbrales de modalidad de la 009: el salario
-- cambia cada año por decreto y la cifra en pesos quedaría vieja en enero.
INSERT INTO hiring.umbrales_comite_contratacion (modalidad, valor, unidad, fundamento) VALUES
  ('CONTRATACION_DIRECTA', 1000, 'SMMLV',
   'RF-DOC-05: «en directa solo si supera 1.000 SMMLV». La presentación del flujo lo repite en la diapositiva de la modalidad: «Comité solo si supera 1.000 SMMLV».')
ON CONFLICT (modalidad) DO NOTHING;

-- ------------------------------------------------- lo que el comité hizo ---
-- Una fila por sesión y no una por proceso: un comité que observa devuelve los
-- documentos, el proceso los corrige y **vuelve a comité**. Con una sola fila,
-- la segunda sesión pisaría a la primera y el expediente perdería justo lo que
-- explica por qué el proceso tardó un mes más.
CREATE TABLE IF NOT EXISTS hiring.sesiones_comite_contratacion (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id          uuid          NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  -- La fecha de la sesión, que no es la de la transcripción: el comité sesiona
  -- en la Dirección y esto se registra después.
  fecha               date          NOT NULL,
  decision            varchar(30)   NOT NULL,
  -- A qué queda sujeta la aprobación condicionada.
  condiciones         text,
  -- Las observaciones de fondo, cuando el comité no aprueba todavía.
  observaciones       text,
  -- El acta. Es lo único que prueba que un cuerpo colegiado sesionó: sin ella,
  -- el registro es la palabra de quien lo escribe.
  acta_documento_id   uuid          REFERENCES hiring.documentos(id),
  registrado_por      varchar(120),
  registrado_por_id   varchar(120),
  created_at          timestamptz   NOT NULL DEFAULT now(),

  -- Tres desenlaces y no cuatro. No existe el «no aprueba» a secas: un comité
  -- que no aprueba dice qué falta, y eso es observar. Si lo que procede es no
  -- contratar, eso no lo resuelve el comité —se niega en la 3.4, donde la
  -- Dirección decide sobre el estudio previo—.
  CONSTRAINT ck_sesion_comite_decision
    CHECK (decision IN ('APROBADO', 'APROBADO_CON_CONDICIONES', 'OBSERVADO')),

  -- Cada desenlace exige lo que lo hace legible. Una aprobación condicionada
  -- sin condiciones es una aprobación; unas observaciones vacías dejan al
  -- proceso devuelto sin saber qué corregir.
  CONSTRAINT ck_sesion_comite_condiciones
    CHECK (decision <> 'APROBADO_CON_CONDICIONES' OR condiciones IS NOT NULL),
  CONSTRAINT ck_sesion_comite_observaciones
    CHECK (decision <> 'OBSERVADO' OR observaciones IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_sesiones_comite_proceso
  ON hiring.sesiones_comite_contratacion (proceso_id, fecha DESC);

COMMENT ON TABLE hiring.sesiones_comite_contratacion IS
  'Sesiones del comité de contratación sobre un proceso (actividad 3.7). Una por sesión: observar devuelve el proceso al comité, y las dos quedan.';

-- --------------------------------------------- lo que se queda como está ---
-- La fila de la 3.7 en `actividades_con_soporte` (059) no se borra, con el
-- mismo criterio de la 070 y de EFDS-1183: manda la lista del servicio, la fila
-- sobrante no habilita nada, y borrarla arrastraría los registros que algún
-- proceso ya tenga guardados ahí.
--
-- Su `exige_soporte = true` decía que el acta era obligatoria, y lo sigue
-- siendo: ahora lo exige el servicio, que además sabe *de qué* sesión es el
-- acta. La marca `confirmado = false` de aquella fila advertía que la exigencia
-- era del equipo y no de la matriz; sigue valiendo, y por eso la exigencia se
-- documenta donde ahora vive.
--
-- Los procesos que ya cumplieron la 3.7 por registro tampoco se tocan: su
-- actividad sigue en APROBADO y su acta sigue en el expediente. Quedan sin
-- sesión registrada, que es la verdad —nadie dijo qué decidió el comité— y el
-- panel lo dice en vez de inventar una decisión a partir de una nota libre.
