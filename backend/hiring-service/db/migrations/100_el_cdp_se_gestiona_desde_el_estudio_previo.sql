-- ============================================================================
-- 100 · El CDP se puede gestionar desde el estudio previo
--
-- Hasta aquí el CDP nacía solo al cerrarse la etapa 3: el estudio previo
-- aprobado era la solicitud, y la Financiera lo expedía en la 4.2. Pero hay
-- áreas que ya tienen el certificado cuando redactan el estudio previo, y otras
-- que quieren adelantar el trámite para que la Financiera trabaje en paralelo
-- con la revisión. Desde aquí el área puede, desde la etapa 3:
--
--   · solicitar el CDP: el mismo registro de `hiring.cdp` en SOLICITADO que
--     antes nacía al cerrar la etapa, solo que antes; llega a la bandeja de la
--     Financiera como cualquier otra solicitud;
--   · registrar uno que ya tiene: número, valor, rubro, fecha y soporte. Queda
--     EXPEDIDO de una vez (decisión de Juan) y, al aprobarse el estudio previo,
--     la 4.1 y la 4.2 se dan por atendidas sin que nadie vuelva a diligenciarlo.
--
-- Lo que no cambia: es un solo CDP por proceso (el índice
-- `idx_cdp_vigente_por_proceso` sigue mandando), y lo que no se gestionó antes
-- se pide al cerrar la etapa 3, como hasta hoy.
--
-- `origen` dice de dónde salió cada CDP, para no confundir un certificado que
-- expidió la Financiera con uno que transcribió el área: los dos quedan en
-- EXPEDIDO, pero no prueban lo mismo.
--
-- `cdp_antes_de_radicar` dice, por modalidad, si el estudio previo se puede
-- enviar a revisión sin el CDP gestionado. Se siembra todo en `false` —que es
-- el comportamiento de hoy— y sin confirmar: lo decide la Dirección de
-- Contratación desde Configuración. Cambiarlo solo afecta los envíos
-- posteriores; lo que ya está en revisión o aprobado no se toca.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.cdp
  ADD COLUMN IF NOT EXISTS origen varchar(30) NOT NULL DEFAULT 'ETAPA_4';

ALTER TABLE hiring.cdp DROP CONSTRAINT IF EXISTS cdp_origen_check;
ALTER TABLE hiring.cdp
  ADD CONSTRAINT cdp_origen_check
  CHECK (origen IN ('ETAPA_4', 'SOLICITADO_EN_ETAPA_3', 'REGISTRADO_EN_ETAPA_3'));

COMMENT ON COLUMN hiring.cdp.origen IS
  'ETAPA_4: lo pidió el cierre de la etapa 3 o la 4.1. SOLICITADO_EN_ETAPA_3: el área lo solicitó desde el estudio previo. REGISTRADO_EN_ETAPA_3: el área registró un CDP que ya tenía.';

CREATE TABLE IF NOT EXISTS hiring.cdp_antes_de_radicar (
  modalidad       varchar(60)  PRIMARY KEY REFERENCES hiring.modalidades(codigo),
  obligatorio     boolean      NOT NULL DEFAULT false,
  fundamento      text,
  confirmado      boolean      NOT NULL DEFAULT false,
  actualizado_por varchar(160),
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE hiring.cdp_antes_de_radicar IS
  'Por modalidad: si el estudio previo exige el CDP solicitado o registrado antes de enviarse a revisión.';

INSERT INTO hiring.cdp_antes_de_radicar (modalidad, obligatorio, fundamento, confirmado)
SELECT codigo,
       false,
       'Supuesto del equipo: opcional, que es como funcionaba antes de esta migración.',
       false
  FROM hiring.modalidades
ON CONFLICT (modalidad) DO NOTHING;

COMMIT;
