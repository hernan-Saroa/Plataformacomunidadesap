-- ============================================================================
-- 102 · Quién revisa el estudio previo en cada escalón se designa en la 3.3
--
-- Con la 101 la 3.1 puede aprobarse por una cadena de escalones, y un escalón
-- puede nombrar un rol: «Coordinador», «Director de Contratación». Decidido así
-- a secas, cualquiera con el rol resolvería cualquier proceso de la entidad.
--
-- Juan lo pidió como funciona el abogado (2026-10-14): en la 3.3, quien toma el
-- proceso reparte también los escalones por rol de la cadena de la 3.1 entre
-- personas concretas que tengan ese rol, y desde ahí:
--
--   · el escalón lo decide solo la persona designada en ese proceso;
--   · sin designación no lo decide nadie, y la pantalla dice que falta;
--   · se puede cambiar con motivo mientras ese escalón no haya decidido.
--
-- Un escalón que nombra personas o un papel del proceso no se designa: ya dice
-- quién decide. Solo la 3.1: las demás actividades con cadena siguen por rol.
--
-- Una fila por designación y no un campo que se sobrescribe, como en
-- `participaciones_proceso`: quien fue relevado respondió por su tramo, y el
-- historial dice quién estuvo, quién lo cambió y por qué.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.designaciones_escalon (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id      uuid NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  numeral         varchar(20) NOT NULL DEFAULT '3.1',
  -- El orden del escalón en la cadena: el 2 de «técnico, coordinador, director».
  escalon         int NOT NULL CHECK (escalon >= 1),
  -- Cómo se llamaba el escalón al designar, para leer el historial sin la cadena.
  escalon_nombre  varchar(120),
  usuario_id      uuid NOT NULL,
  usuario_nombre  varchar(120) NOT NULL,
  persona_id      uuid,
  nombre          varchar(200) NOT NULL,
  estado          varchar(10) NOT NULL DEFAULT 'VIGENTE',
  asignado_por    varchar(200),
  asignado_at     timestamptz NOT NULL DEFAULT now(),
  relevado_at     timestamptz,
  relevado_por    varchar(200),
  motivo_relevo   text,
  CONSTRAINT ck_designacion_estado CHECK (estado IN ('VIGENTE', 'RELEVADO'))
);

-- Una sola persona vigente por escalón del proceso.
CREATE UNIQUE INDEX IF NOT EXISTS uq_designacion_vigente
  ON hiring.designaciones_escalon (proceso_id, numeral, escalon) WHERE estado = 'VIGENTE';

COMMENT ON TABLE hiring.designaciones_escalon IS
  'Quién decide cada escalón por rol de la cadena de la 3.1 en un proceso. Se designa en la 3.3.';
