-- Permite que un empleado tenga mas de una prima, manteniendo una sola
-- asignacion por prima/categoria.

DROP INDEX IF EXISTS certification.ux_technical_bonus_id_number;

CREATE INDEX IF NOT EXISTS idx_technical_bonus_id_number
  ON certification.technical_bonus_assignments (id_number);

ALTER TABLE certification.certificates
  ADD COLUMN IF NOT EXISTS technical_bonuses JSONB;

COMMENT ON INDEX certification.idx_technical_bonus_id_number IS
  'Permite buscar asignaciones de prima por documento sin impedir varias categorias.';

COMMENT ON COLUMN certification.certificates.technical_bonuses IS
  'Snapshot JSON de las primas incluidas al emitir el certificado laboral.';
