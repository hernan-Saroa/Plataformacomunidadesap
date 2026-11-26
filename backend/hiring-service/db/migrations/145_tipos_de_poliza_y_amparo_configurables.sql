-- ============================================================================
-- 145 · Tipos de póliza y de amparo configurables (EFDS-XXXX)
--
-- Pedido de Juan del 2026-11-17: los tipos de póliza y los amparos tienen que
-- poder crearse desde Configuración, porque pueden aparecer nuevos y no se
-- puede pedir una migración cada vez.
--
-- · tipos_poliza: catálogo nuevo. La 8.4 registraba aseguradora y número,
--   pero no qué clase de garantía era. Se siembra con las clases del Decreto
--   1082 de 2015 (art. 2.2.1.2.3.1.2) y la de responsabilidad civil, que la
--   norma exige en póliza aparte.
-- · garantias.tipo_poliza: la clase de cada garantía. Nula en las ya
--   registradas: no se adivina qué eran.
-- · tipos_amparo.tipos_poliza: en qué tipos de póliza se ofrece cada amparo.
--   Vacío = en todos.
-- · tipos_amparo.ampara_tras_el_contrato: si el amparo sigue vigente después
--   de liquidado el contrato (estabilidad, calidad) y por eso el cierre
--   definitivo espera a que venza. Antes era una lista fija en el código; con
--   amparos nuevos tiene que decidirlo quien los crea.
--
-- Idempotente.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS hiring.tipos_poliza (
  codigo       varchar(60)  PRIMARY KEY,
  nombre       varchar(200) NOT NULL,
  descripcion  text,
  activo       boolean      NOT NULL DEFAULT true,
  orden        int          NOT NULL DEFAULT 100
);

COMMENT ON TABLE hiring.tipos_poliza IS
  'Clases de garantía que puede constituir el contratista en la 8.4; se administran desde Configuración.';

INSERT INTO hiring.tipos_poliza (codigo, nombre, descripcion, orden) VALUES
  ('CUMPLIMIENTO_ENTIDADES_ESTATALES', 'Póliza de cumplimiento a favor de entidades estatales',
   'Contrato de seguro que respalda las obligaciones del contratista.', 10),
  ('RESPONSABILIDAD_CIVIL', 'Póliza de responsabilidad civil extracontractual',
   'Ampara los daños a terceros; la norma la exige en póliza separada.', 20),
  ('GARANTIA_BANCARIA', 'Garantía bancaria',
   'Garantía expedida por un establecimiento de crédito.', 30),
  ('PATRIMONIO_AUTONOMO', 'Patrimonio autónomo',
   'Fiducia mercantil constituida como garantía.', 40)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE hiring.garantias
  ADD COLUMN IF NOT EXISTS tipo_poliza varchar(60) REFERENCES hiring.tipos_poliza(codigo);

ALTER TABLE hiring.tipos_amparo
  ADD COLUMN IF NOT EXISTS tipos_poliza varchar(60)[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ampara_tras_el_contrato boolean NOT NULL DEFAULT false;

-- Los tres que el cierre definitivo tenía fijos en el código.
UPDATE hiring.tipos_amparo
   SET ampara_tras_el_contrato = true
 WHERE codigo IN ('ESTABILIDAD_OBRA', 'CALIDAD_SERVICIO', 'CALIDAD_BIENES');

-- La responsabilidad civil solo va en su propia póliza; los demás amparos se
-- ofrecen en las clases que respaldan el cumplimiento.
UPDATE hiring.tipos_amparo
   SET tipos_poliza = ARRAY['RESPONSABILIDAD_CIVIL']::varchar(60)[]
 WHERE codigo = 'RESPONSABILIDAD_CIVIL' AND tipos_poliza = '{}';

UPDATE hiring.tipos_amparo
   SET tipos_poliza = ARRAY['CUMPLIMIENTO_ENTIDADES_ESTATALES', 'GARANTIA_BANCARIA', 'PATRIMONIO_AUTONOMO']::varchar(60)[]
 WHERE codigo <> 'RESPONSABILIDAD_CIVIL' AND tipos_poliza = '{}';

COMMIT;
