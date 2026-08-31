-- ============================================================================
-- 043 · Reporte de presunto incumplimiento (bloque Presunto Incumplimiento)
--
-- EFDS-1180 (RF-INC-01): iniciada la ejecución, el supervisor reporta el
-- presunto incumplimiento del contrato y con ello queda abierto el caso.
--
-- Es «presunto» en toda la historia y el nombre lo conserva: el supervisor
-- reporta lo que observa, y quien declara el incumplimiento es el área
-- jurídica al cabo de su trámite (EFDS-1181). Guardarlo como «incumplimiento»
-- a secas haría que el expediente afirmara algo que todavía no se ha resuelto.
--
-- El caso no se borra nunca: uno reportado existió aunque después se descarte,
-- y el expediente tiene que poder explicar por qué se abrió. Mismo criterio de
-- la minuta rechazada (EFDS-1161) y del supervisor relevado (EFDS-1165).
--
-- El acceso restringido por reserva legal que pide RF-INC-03 es EFDS-1182 y se
-- resuelve allí: esta tabla solo guarda el reporte.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.casos_incumplimiento (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id        uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- Qué se observó. Se pide con holgura porque es lo que el área jurídica lee
  -- para decidir si abre trámite, y «incumplió» sin más no le sirve de nada.
  motivo             text         NOT NULL,

  -- Cuándo ocurrió el hecho, no cuándo se registró: de esta fecha cuelgan los
  -- términos del trámite sancionatorio, así que un hecho de marzo reportado en
  -- abril sigue siendo de marzo.
  fecha_hecho        date         NOT NULL,

  -- El soporte, cuando lo hay. Es opcional a propósito: un incumplimiento se
  -- constata a veces sin documento a la mano —una obra que no avanza, un
  -- entregable que no llega—, y exigir uno dejaría al supervisor sin poder
  -- reportar lo que está viendo. Mismo criterio del cierre financiero.
  documento_id       uuid         REFERENCES hiring.documentos(id),

  -- EFDS-1180 solo abre el caso. Los estados del trámite sancionatorio los
  -- añade EFDS-1181 cuando exista; admitir aquí «en trámite» prometería un
  -- flujo que no está construido.
  estado             varchar(20)  NOT NULL DEFAULT 'REPORTADO',

  -- Quién lo reportó y en calidad de qué: el supervisor de entonces puede no
  -- ser el de ahora, y el expediente tiene que decir quién vigilaba el día que
  -- se constató el hecho.
  reportado_por      varchar(200),
  supervision_id     uuid         REFERENCES hiring.supervisiones_contrato(id),

  created_at         timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_incumplimiento_estado CHECK (estado IN ('REPORTADO')),
  CONSTRAINT ck_incumplimiento_motivo CHECK (length(trim(motivo)) >= 10)
);

CREATE INDEX IF NOT EXISTS ix_casos_incumplimiento_contrato
  ON hiring.casos_incumplimiento (contrato_id, fecha_hecho DESC);

COMMENT ON TABLE hiring.casos_incumplimiento IS
  'Reportes de presunto incumplimiento del contrato (EFDS-1180, RF-INC-01).';
