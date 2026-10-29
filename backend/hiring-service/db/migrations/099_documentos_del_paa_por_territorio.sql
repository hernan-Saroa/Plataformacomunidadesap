-- ============================================================================
-- 099 · Cada territorio carga su propio PAA
--
-- La 097 suponía un solo archivo por año con todas las regiones dentro. No es
-- así: cada territorial publica su Plan Anual de Adquisiciones en su propio
-- Excel. El de la Sede Central es la excepción, porque trae también las líneas
-- de Chocó.
--
-- Por eso aparece el documento: el Excel que publica un territorio, con las
-- regiones que trae. Las vigencias pasan a ser de cada documento, y con ellas
-- las versiones, la comparación, la activación y el cambio de año. Activar la
-- versión 12 del PAA de un territorio no toca los procesos de otro, y cada
-- territorio declara vigente su año nuevo cuando carga su PAA.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS hiring.paa_documentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      varchar(40)  NOT NULL UNIQUE,
  nombre      varchar(150) NOT NULL,
  created_by  varchar(150),
  created_at  timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE hiring.paa_documentos IS
  'El Excel del PAA que publica un territorio. Trae una o varias regiones; se versiona y cambia de año por su cuenta.';

INSERT INTO hiring.paa_documentos (codigo, nombre, created_by)
VALUES ('SEDE_CENTRAL', 'Sede Central y Chocó', 'migracion-099')
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------- la región es de un documento --

ALTER TABLE hiring.paa_regiones
  ADD COLUMN IF NOT EXISTS documento_id uuid REFERENCES hiring.paa_documentos(id);

UPDATE hiring.paa_regiones
   SET documento_id = (SELECT id FROM hiring.paa_documentos WHERE codigo = 'SEDE_CENTRAL')
 WHERE documento_id IS NULL;

ALTER TABLE hiring.paa_regiones ALTER COLUMN documento_id SET NOT NULL;

COMMENT ON COLUMN hiring.paa_regiones.documento_id IS
  'En qué Excel vienen sus líneas. No cambia: sus versiones y procesos quedaron ligados a ese documento.';

-- -------------------------------------------- la vigencia es de un documento --

ALTER TABLE hiring.paa_vigencias
  ADD COLUMN IF NOT EXISTS documento_id uuid REFERENCES hiring.paa_documentos(id);

UPDATE hiring.paa_vigencias
   SET documento_id = (SELECT id FROM hiring.paa_documentos WHERE codigo = 'SEDE_CENTRAL')
 WHERE documento_id IS NULL;

ALTER TABLE hiring.paa_vigencias ALTER COLUMN documento_id SET NOT NULL;

-- El año deja de ser único: 2027 existe una vez por territorio.
ALTER TABLE hiring.paa_vigencias DROP CONSTRAINT IF EXISTS paa_vigencias_anio_key;
ALTER TABLE hiring.paa_vigencias DROP CONSTRAINT IF EXISTS uq_paa_vigencia_documento_anio;
ALTER TABLE hiring.paa_vigencias
  ADD CONSTRAINT uq_paa_vigencia_documento_anio UNIQUE (documento_id, anio);

-- Una vigente por documento, no una para toda la entidad.
DROP INDEX IF EXISTS hiring.uq_paa_una_vigencia_vigente;
CREATE UNIQUE INDEX IF NOT EXISTS uq_paa_una_vigencia_vigente
  ON hiring.paa_vigencias (documento_id) WHERE vigente;

COMMIT;
