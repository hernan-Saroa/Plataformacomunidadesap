-- ============================================================================
-- 041 · Declaratoria desierta del proceso (etapa 7)
--
-- EFDS-1160 (RF-ADJ-02): el otro desenlace posible de la etapa 7. La 040 dejó
-- el modelo preparado a propósito —nada obliga a que exista un acto de
-- adjudicación—, así que esta migración no deshace nada de aquella.
--
-- ----------------------------------------------------------------------------
-- El hallazgo que gobierna este modelo
-- ----------------------------------------------------------------------------
-- La plataforma **no puede representar hoy "ninguna oferta habilitada"**:
-- `resultados_evaluacion.oferente_id` es NOT NULL —hay que nombrar una
-- ganadora— e `informes_evaluacion.resultado_id` también. Es coherente con la
-- 038: la evaluación se hace por fuera y lo que llega es el resultado ya
-- tomado, y un resultado, para la 038, es alguien que ganó.
--
-- Consecuencia: cuando el comité no habilita a nadie no hay resultado, no hay
-- informe preliminar y no hay traslado. **La declaratoria llega por su propio
-- camino y no colgada del traslado**, y el veredicto del comité entra como
-- documento propio de la declaratoria. Se resuelve sin tocar 1157 ni 1158; si
-- Contratación dice que el comité tiene que poder registrar formalmente
-- "ninguna habilitada" como resultado, eso sí toca la 038 y está anotado en
-- EFDS-1513.
--
-- ----------------------------------------------------------------------------
-- Lo que esta migración decide
-- ----------------------------------------------------------------------------
-- 1. **No se crea numeral nuevo.** La matriz no le da uno a la declaratoria: el
--    punto de decisión vive dentro de la 6.4 ("Si no hay ofertas habilitadas →
--    proceso desierto") y se repite en la 6.7.1 de subasta. Los numerales de la
--    etapa 7 salen de la matriz, no del equipo, y la 036 vino justamente a
--    reparar el daño de haberlos elegido por cuenta propia. Inventar un 7.5
--    sería repetir ese error. Lo que la declaratoria hace en el riel es marcar
--    NO_APLICA las actividades de la etapa 7 que ya no se van a adelantar.
--
-- 2. **Dónde aplica se lee de la matriz.** Si la modalidad está excluida de la
--    6.1 no recibe ofertas, y sin ofertas no hay nada que declarar desierto.
--    Hoy eso es solo contratación directa, pero la regla no es esa lista: es
--    `actividades_excluidas`, como en todo el módulo.
--
-- 3. **Dos causales y no una.** La fuente nombra una sola —"cuando no hay
--    ofertas habilitadas"—, pero en el expediente son dos caminos distintos:
--    que no llegara ninguna oferta y que llegaran y ninguna quedara habilitada.
--    La segunda exige el informe del comité; la primera no tiene comité que la
--    sustente. Si Contratación necesita una causal abierta, entra después
--    (EFDS-1513): esto no se presenta como definitivo.
-- ============================================================================

-- ------------------------------------------------- estado del proceso -------
-- Lo que le da sentido a "cierra el proceso" del criterio de aceptación.
--
-- Hasta ahora el proceso no tenía estado y no le hacía falta: el riel de
-- actividades decía en qué iba. Un desenlace es otra cosa —es la afirmación de
-- que ya no va a seguir— y no se deduce del riel sin adivinar.
--
-- Aditiva y con default: todos los procesos existentes quedan EN_CURSO, que es
-- lo que son.

ALTER TABLE hiring.procesos
  ADD COLUMN IF NOT EXISTS estado varchar(20) NOT NULL DEFAULT 'EN_CURSO';

COMMENT ON COLUMN hiring.procesos.estado IS
  'Desenlace del proceso de selección: EN_CURSO mientras se adelanta, ADJUDICADO o DESIERTO cuando termina (EFDS-1160).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_proceso_estado'
  ) THEN
    ALTER TABLE hiring.procesos
      ADD CONSTRAINT ck_proceso_estado
      CHECK (estado IN ('EN_CURSO', 'ADJUDICADO', 'DESIERTO'));
  END IF;
END $$;

-- Los procesos que ya tienen acto de adjudicación vigente nacen ADJUDICADOS con
-- esta migración: el hecho ya ocurrió, y dejarlos EN_CURSO haría que la columna
-- mintiera desde el primer día.
UPDATE hiring.procesos p
   SET estado = 'ADJUDICADO'
  FROM hiring.actos_adjudicacion a
 WHERE a.proceso_id = p.id
   AND a.estado = 'VIGENTE'
   AND p.estado = 'EN_CURSO';

-- ------------------------------------------------ declaratoria desierta -----

CREATE TABLE IF NOT EXISTS hiring.declaratorias_desiertas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            uuid        NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,

  -- SIN_OFERTAS: la recepción cerró y no se presentó nadie.
  -- SIN_OFERTAS_HABILITADAS: se presentaron y el comité no habilitó a ninguna.
  -- Son dos caminos distintos del expediente y se sustentan con piezas
  -- distintas, por eso no es un solo "no hay ofertas habilitadas".
  causal                varchar(30) NOT NULL,

  -- La motivación del acto. Obligatoria: la declaratoria desierta es un acto
  -- administrativo motivado, no un botón, y es lo que un tercero va a leer para
  -- entender por qué el proceso no terminó en contrato.
  motivo                text        NOT NULL,

  -- Número y fecha de la resolución, como los trae el acto firmado. Mismo
  -- criterio del acto de adjudicación (040).
  numero_acto           varchar(60) NOT NULL,
  fecha_acto            date        NOT NULL,

  -- La resolución firmada. Obligatoria por lo mismo que el acta de la audiencia
  -- y el acto de adjudicación: sin ella no hay declaratoria que probar.
  acto_documento_id     uuid        NOT NULL REFERENCES hiring.documentos(id),

  -- El informe con que el comité dice que ninguna oferta quedó habilitada.
  -- Nullable en la tabla y obligatorio por causal (ver el CHECK de abajo):
  -- cuando no se presentó nadie no hay comité que haya evaluado nada.
  --
  -- Esta columna es la que resuelve el hueco descrito arriba: hoy ese veredicto
  -- no cabe en `resultados_evaluacion`, y sin un sitio donde ponerlo la
  -- declaratoria quedaría sin sustento documental.
  informe_comite_documento_id uuid  REFERENCES hiring.documentos(id),

  -- Cuántas ofertas había cuando se declaró. Se fotografía, como hacen los dos
  -- informes (039 y 040): mañana pueden anularse oferentes y lo que importa es
  -- lo que era cierto el día del acto.
  ofertas_recibidas     int         NOT NULL DEFAULT 0,

  -- Si el comité había registrado una ganadora y aun así se declara desierto,
  -- queda dicho de cuál resultado se apartó la declaratoria. No se impide
  -- —puede haber razones— pero no puede pasar en silencio: mismo criterio de
  -- adjudicar a alguien distinto del ganador (040).
  resultado_contradicho_id uuid     REFERENCES hiring.resultados_evaluacion(id),

  -- Notificación y publicación, cada una con su evidencia: la declaratoria se
  -- notifica y publica como el acto de adjudicación, y no hay integración con
  -- SECOP II.
  notificada_at         timestamptz,
  publicada_at          timestamptz,
  evidencia_documento_id uuid       REFERENCES hiring.documentos(id),

  estado                varchar(20) NOT NULL DEFAULT 'VIGENTE',
  declarada_por         varchar(200),
  declarada_at          timestamptz NOT NULL DEFAULT now(),

  -- Revocar no borra, igual que el acto de adjudicación: la declaratoria pudo
  -- notificarse y publicarse, y hay terceros que la conocieron.
  revocada_at           timestamptz,
  revocada_por          varchar(200),
  motivo_revocacion     text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_desierta_causal CHECK (
    causal IN ('SIN_OFERTAS', 'SIN_OFERTAS_HABILITADAS')
  ),
  CONSTRAINT ck_desierta_estado CHECK (estado IN ('VIGENTE', 'REVOCADA')),

  -- Cada causal con su aritmética y su sustento:
  --   sin ofertas → ninguna recibida y no hay informe de comité que exigir;
  --   ninguna habilitada → al menos una recibida y el informe del comité.
  CONSTRAINT ck_desierta_sustento CHECK (
    (causal = 'SIN_OFERTAS'
       AND ofertas_recibidas = 0
       AND informe_comite_documento_id IS NULL)
    OR
    (causal = 'SIN_OFERTAS_HABILITADAS'
       AND ofertas_recibidas > 0
       AND informe_comite_documento_id IS NOT NULL)
  ),

  CONSTRAINT ck_desierta_revocacion CHECK (
    estado <> 'REVOCADA' OR (revocada_at IS NOT NULL AND motivo_revocacion IS NOT NULL)
  ),

  -- Publicar es un hecho posterior a declarar; sin evidencia no se puede
  -- probar. Mismo CHECK del acto de adjudicación.
  CONSTRAINT ck_desierta_publicacion CHECK (
    publicada_at IS NULL OR evidencia_documento_id IS NOT NULL
  )
);

COMMENT ON TABLE hiring.declaratorias_desiertas IS
  'Declaratoria desierta del proceso: causal, motivación, acto firmado, notificación y publicación (EFDS-1160, RF-ADJ-02).';

-- Una sola declaratoria vigente por proceso, tantas revocadas como haga falta.
-- Índice parcial y no UNIQUE a secas, por lo mismo que el acto de adjudicación.
CREATE UNIQUE INDEX IF NOT EXISTS uq_desierta_vigente
  ON hiring.declaratorias_desiertas (proceso_id)
  WHERE estado = 'VIGENTE';

CREATE INDEX IF NOT EXISTS ix_desiertas_proceso
  ON hiring.declaratorias_desiertas (proceso_id);
