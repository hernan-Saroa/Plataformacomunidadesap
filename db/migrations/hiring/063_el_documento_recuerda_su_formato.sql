-- ============================================================================
-- El documento recuerda de qué formato salió (EFDS-1183)
--
-- Hasta ahora un documento del expediente decía a qué actividad pertenece
-- —`numeral`— pero no de dónde venía. Con eso no se puede distinguir lo que la
-- actividad exigía de lo que alguien adjuntó además:
--
--   · con formato asignado  → es un documento requerido, y se sabe cuál
--   · sin formato           → es adicional; se guarda igual, pero no se exige
--
-- Esa distinción es la que permite decir «falta el BS-FO-047» en vez de
-- «falta un adjunto», y la que evita contar como cumplido un anexo cualquiera.
-- ============================================================================

ALTER TABLE hiring.documentos
  ADD COLUMN IF NOT EXISTS plantilla_id uuid NULL;

-- ON DELETE SET NULL y no CASCADE: retirar un formato de la biblioteca no
-- puede borrar los documentos que se entregaron con él. El expediente debe
-- seguir probando que el documento existió, aunque su plantilla ya no esté.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_documento_plantilla'
  ) THEN
    ALTER TABLE hiring.documentos
      ADD CONSTRAINT fk_documento_plantilla
      FOREIGN KEY (plantilla_id) REFERENCES hiring.plantillas(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Para responder «¿ya se entregó el documento de este formato?», que es la
-- pregunta que hace la pantalla por cada fila que dibuja.
CREATE INDEX IF NOT EXISTS idx_documentos_plantilla
  ON hiring.documentos(plantilla_id)
  WHERE plantilla_id IS NOT NULL;

COMMENT ON COLUMN hiring.documentos.plantilla_id IS
  'Formato del SIG del que salió este documento. NULL = adjunto adicional, no exigido por ningún formato.';

-- ----------------------------------------------------------------------------
-- Los documentos ya cargados se quedan en NULL a propósito.
--
-- Adivinar su formato por el nombre acertaría unas veces y otras no, y un
-- expediente que afirma con precisión lo que en realidad dedujo es peor que
-- uno que reconoce lo que no sabe: al auditar no habría forma de distinguir
-- el dato del acierto.
-- ----------------------------------------------------------------------------
