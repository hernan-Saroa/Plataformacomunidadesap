-- ============================================================================
-- 037 · Pólizas, garantías y ARL (actividades 8.4 y 8.5)
--
-- EFDS-1164 (RF-LEG-03): suscrito el contrato, el contratista constituye las
-- garantías y la entidad las aprueba. Cuando el contratista es persona natural
-- se exige además el registro de la ARL.
--
-- Los amparos van desglosados y no como una sola póliza con una fecha. La
-- matriz lo pide explícito en 8.4 —«desglosar los amparos para el control de
-- las fechas de vencimiento»— y con una fecha única no se podría avisar del
-- amparo que vence primero, que es justo para lo que sirve el control.
--
-- Los numerales 8.4 y 8.5 ya están en la matriz de la migración 030.
-- ============================================================================

-- ------------------------------------------------------ tipos de amparo --
-- Catálogo de las coberturas que una garantía puede incluir. Se siembra con las
-- del Decreto 1082 de 2015 y queda idempotente: si Contratación añade otras,
-- se agregan sin tocar las existentes.
CREATE TABLE IF NOT EXISTS hiring.tipos_amparo (
  codigo       varchar(60) PRIMARY KEY,
  nombre       varchar(200) NOT NULL,
  descripcion  text,
  activo       boolean      NOT NULL DEFAULT true,
  orden        int          NOT NULL DEFAULT 100
);

COMMENT ON TABLE hiring.tipos_amparo IS
  'Coberturas que puede incluir una garantía, para controlar sus vencimientos (EFDS-1164).';

INSERT INTO hiring.tipos_amparo (codigo, nombre, descripcion, orden) VALUES
  ('CUMPLIMIENTO', 'Cumplimiento del contrato',
   'Ampara los perjuicios por el incumplimiento total o parcial de las obligaciones.', 10),
  ('BUEN_MANEJO_ANTICIPO', 'Buen manejo y correcta inversión del anticipo',
   'Ampara la debida destinación de los dineros entregados como anticipo.', 20),
  ('SALARIOS_PRESTACIONES', 'Pago de salarios y prestaciones sociales',
   'Ampara el pago de las obligaciones laborales del contratista con su personal.', 30),
  ('CALIDAD_SERVICIO', 'Calidad del servicio',
   'Ampara la calidad de los servicios prestados durante la ejecución.', 40),
  ('CALIDAD_BIENES', 'Calidad y correcto funcionamiento de los bienes',
   'Ampara la calidad de los bienes entregados y su funcionamiento.', 50),
  ('ESTABILIDAD_OBRA', 'Estabilidad y calidad de la obra',
   'Ampara los defectos de la obra que aparezcan después de recibida.', 60),
  ('RESPONSABILIDAD_CIVIL', 'Responsabilidad civil extracontractual',
   'Ampara los daños causados a terceros durante la ejecución del contrato.', 70)
ON CONFLICT (codigo) DO NOTHING;

-- ------------------------------------------------------------ garantías --
CREATE TABLE IF NOT EXISTS hiring.garantias (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id            uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  aseguradora            varchar(200) NOT NULL,
  numero_poliza          varchar(80)  NOT NULL,

  -- La póliza como documento. Obligatoria: aprobar una garantía que nadie
  -- adjuntó sería dar por cubierta una obligación sin haber visto la cobertura.
  documento_id           uuid         NOT NULL REFERENCES hiring.documentos(id),

  estado                 varchar(20)  NOT NULL DEFAULT 'CARGADA',

  cargada_por            varchar(200),
  created_at             timestamptz  NOT NULL DEFAULT now(),

  -- La revisión que pide el criterio 1. Quién aprobó o rechazó y cuándo: es lo
  -- que separa una garantía revisada de una simplemente adjuntada.
  revisada_por           varchar(200),
  revisada_at            timestamptz,
  motivo_rechazo         text,

  CONSTRAINT ck_garantia_estado CHECK (estado IN ('CARGADA', 'APROBADA', 'RECHAZADA')),
  -- Aprobada o rechazada tienen siempre quién y cuándo; la rechazada, además,
  -- por qué. Sin el motivo el contratista no sabría qué corregir.
  CONSTRAINT ck_garantia_revisada CHECK (
    estado = 'CARGADA'
    OR (revisada_por IS NOT NULL AND revisada_at IS NOT NULL)
  ),
  CONSTRAINT ck_garantia_rechazada CHECK (
    estado <> 'RECHAZADA' OR motivo_rechazo IS NOT NULL
  )
);

-- Dos pólizas VIGENTES con el mismo número serían la misma; pero la corrección
-- de una devuelta llega con el mismo número, así que la rechazada no bloquea.
-- Índice parcial y no UNIQUE a secas por el mismo criterio que uq_contrato_vigente.
-- El DROP cubre las bases donde alcanzó a existir la restricción total.
ALTER TABLE hiring.garantias DROP CONSTRAINT IF EXISTS uq_garantia_poliza;
CREATE UNIQUE INDEX IF NOT EXISTS uq_garantia_poliza_vigente
  ON hiring.garantias (contrato_id, numero_poliza)
  WHERE estado <> 'RECHAZADA';

CREATE INDEX IF NOT EXISTS ix_garantias_contrato ON hiring.garantias (contrato_id);

COMMENT ON TABLE hiring.garantias IS
  'Pólizas constituidas por el contratista, con su revisión y aprobación (EFDS-1164).';

-- ------------------------------------------- los amparos de cada garantía --
CREATE TABLE IF NOT EXISTS hiring.amparos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garantia_id     uuid          NOT NULL REFERENCES hiring.garantias(id) ON DELETE CASCADE,
  tipo            varchar(60)   NOT NULL REFERENCES hiring.tipos_amparo(codigo),

  valor_asegurado numeric(18,2) NOT NULL,

  -- El desglose que pide la matriz: cada amparo con su propia vigencia, porque
  -- no todos vencen a la vez. La estabilidad de la obra se extiende años
  -- después de recibida, mientras que el anticipo se libera al amortizarlo.
  vigencia_desde  date          NOT NULL,
  vigencia_hasta  date          NOT NULL,

  created_at      timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT ck_amparo_valor CHECK (valor_asegurado > 0),
  CONSTRAINT ck_amparo_vigencia CHECK (vigencia_hasta > vigencia_desde),
  -- Un amparo no se repite dentro de la misma póliza: dos coberturas iguales
  -- serían una sola con otro valor, y no se sabría cuál rige.
  CONSTRAINT uq_amparo_tipo UNIQUE (garantia_id, tipo)
);

CREATE INDEX IF NOT EXISTS ix_amparos_garantia ON hiring.amparos (garantia_id);
-- Para responder «qué amparos vencen en los próximos días», que es la pregunta
-- que justifica el desglose.
CREATE INDEX IF NOT EXISTS ix_amparos_vencimiento ON hiring.amparos (vigencia_hasta);

COMMENT ON TABLE hiring.amparos IS
  'Coberturas de cada garantía con su vigencia, para controlar vencimientos (EFDS-1164).';

-- ----------------------------------------------------------------- ARL --
-- Criterio 2: para personas naturales la legalización exige el registro de la
-- afiliación. La condición se deriva de `contratos.contratista_tipo`, que se
-- guarda al contratar (migración 035), y no de una casilla que alguien marque.
CREATE TABLE IF NOT EXISTS hiring.afiliaciones_arl (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id       uuid         NOT NULL REFERENCES hiring.contratos(id) ON DELETE CASCADE,

  -- La matriz distingue los dos casos en 8.5: «cuando la entidad realiza la
  -- afiliación o cuando la realiza directamente el contratista».
  afiliado_por      varchar(20)  NOT NULL,

  administradora    varchar(200) NOT NULL,
  numero_afiliacion varchar(80),
  fecha_afiliacion  date         NOT NULL,

  soporte_documento_id uuid      NOT NULL REFERENCES hiring.documentos(id),

  registrada_por    varchar(200),
  created_at        timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ck_arl_afiliado_por CHECK (afiliado_por IN ('ENTIDAD', 'CONTRATISTA')),
  -- Una sola afiliación vigente por contrato: el contratista está afiliado o no
  -- lo está, y dos registros dejarían sin saber cuál rige.
  CONSTRAINT uq_arl_contrato UNIQUE (contrato_id)
);

COMMENT ON TABLE hiring.afiliaciones_arl IS
  'Afiliación a riesgos laborales, exigida a los contratistas persona natural (EFDS-1164).';

-- ------------------------------------------------- el contrato se amplía --
-- Legalizado es el estado al que se llega con todas las garantías aprobadas y,
-- si aplica, la ARL registrada. Lo deriva el servicio; no lo declara nadie.
ALTER TABLE hiring.contratos
  ADD COLUMN IF NOT EXISTS legalizado_at timestamptz;

-- En un DO por la misma razón que en la 036: sin tabla de control, la
-- reaplicación tiene que converger en vez de fallar o retroceder.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_contrato_estado'
      AND pg_get_constraintdef(oid) LIKE '%LEGALIZADO%'
  ) THEN
    ALTER TABLE hiring.contratos DROP CONSTRAINT IF EXISTS ck_contrato_estado;
    ALTER TABLE hiring.contratos ADD CONSTRAINT ck_contrato_estado
      CHECK (estado IN ('GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO', 'LEGALIZADO'));
  END IF;
END $$;

ALTER TABLE hiring.contratos DROP CONSTRAINT IF EXISTS ck_contrato_legalizado;
ALTER TABLE hiring.contratos ADD CONSTRAINT ck_contrato_legalizado
  CHECK (estado <> 'LEGALIZADO' OR legalizado_at IS NOT NULL);
