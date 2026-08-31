-- ============================================================================
-- 046 · Cesión, aclaración y suspensión/reanudación
--
-- EFDS-1178 (RF-MOD-03): se tramitan mediante acto administrativo o acta
-- motivada, y el estado del contrato se actualiza cuando aplique.
--
-- La tabla ya existe desde la 045 con todos los tipos declarados; aquí solo se
-- agregan los campos que estas tres necesitan.
-- ============================================================================

-- Nombre y documento y no un id de tercero: el cesionario puede no estar
-- registrado en la plataforma, y exigirlo impediría una cesión válida.
ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS cesionario_nombre     varchar(200),
  ADD COLUMN IF NOT EXISTS cesionario_documento  varchar(40);

-- Nulo cuando la causa de la suspensión aún no se resuelve: obligar la fecha
-- haría inventar una.
ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS fecha_reanudacion_prevista date;

-- De aquí salen los días que el contrato estuvo detenido.
ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS suspension_id uuid REFERENCES hiring.modificaciones_contrato(id);

ALTER TABLE hiring.modificaciones_contrato DROP CONSTRAINT IF EXISTS ck_modificacion_cesionario;
ALTER TABLE hiring.modificaciones_contrato ADD CONSTRAINT ck_modificacion_cesionario
  CHECK (
    (tipo = 'CESION' AND cesionario_nombre IS NOT NULL AND cesionario_documento IS NOT NULL)
    OR (tipo <> 'CESION' AND cesionario_nombre IS NULL AND cesionario_documento IS NULL)
  );

ALTER TABLE hiring.modificaciones_contrato DROP CONSTRAINT IF EXISTS ck_modificacion_reanudacion;
ALTER TABLE hiring.modificaciones_contrato ADD CONSTRAINT ck_modificacion_reanudacion
  CHECK (
    (tipo = 'REANUDACION' AND suspension_id IS NOT NULL)
    OR (tipo <> 'REANUDACION' AND suspension_id IS NULL)
  );

COMMENT ON COLUMN hiring.modificaciones_contrato.suspension_id IS
  'Qué suspensión levanta esta reanudación (EFDS-1178).';
