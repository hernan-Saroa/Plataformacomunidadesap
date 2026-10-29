-- ============================================================================
-- 122 · El acto de la 7.3 en las modalidades sin convocatoria
--
-- La matriz v2 marca la 7.3 en contratación directa («Ordenador del gasto
-- emite resolución o acto administrativo»), pero excluye la 6.1 y la 7.2: no
-- hay ofertas ni informe de evaluación definitivo. El acto exigía las dos
-- cosas, y la 8.1 solo daba por adjudicado el proceso cuya recepción de
-- ofertas cerró con un oferente. Un proceso de directa no llegaba nunca al
-- contrato.
--
-- Desde aquí el acto puede nacer sin oferta ni informe definitivo, y entonces
-- guarda él mismo al contratista: nombre, documento y si es persona natural o
-- jurídica. Una de las dos formas tiene que estar completa.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.actos_adjudicacion
  ALTER COLUMN informe_definitivo_id DROP NOT NULL,
  ALTER COLUMN oferente_id DROP NOT NULL;

ALTER TABLE hiring.actos_adjudicacion
  ADD COLUMN IF NOT EXISTS contratista_nombre varchar(300),
  ADD COLUMN IF NOT EXISTS contratista_documento varchar(40),
  ADD COLUMN IF NOT EXISTS contratista_tipo varchar(20);

ALTER TABLE hiring.actos_adjudicacion DROP CONSTRAINT IF EXISTS ck_acto_adjudicatario;
ALTER TABLE hiring.actos_adjudicacion
  ADD CONSTRAINT ck_acto_adjudicatario CHECK (
    (oferente_id IS NOT NULL AND informe_definitivo_id IS NOT NULL)
    OR (
      oferente_id IS NULL
      AND contratista_nombre IS NOT NULL
      AND contratista_documento IS NOT NULL
      AND contratista_tipo IN ('NATURAL', 'JURIDICA')
    )
  );

COMMENT ON COLUMN hiring.actos_adjudicacion.contratista_nombre IS
  'Sin convocatoria (directa): a quién se adjudica. Con convocatoria sale del oferente.';

COMMIT;
