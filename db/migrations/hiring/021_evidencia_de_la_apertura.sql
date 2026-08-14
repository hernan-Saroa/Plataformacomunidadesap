-- ============================================================================
-- 021 · Evidencia de la publicación del pliego definitivo
--
-- EFDS-1399, sobre la historia EFDS-1152. El criterio dice que la apertura
-- "publica el pliego definitivo", pero el registro guardaba solo el documento y
-- un enlace tecleado a mano: nada probaba que la publicación hubiera ocurrido.
--
-- El módulo no se integra con SECOP II, registra hechos con su soporte. La
-- actividad 5.2 ya resolvió esto para el proyecto de pliego, donde la evidencia
-- es obligatoria (migración 016) porque es lo único que prueba que la
-- publicación existió. La apertura sigue el mismo criterio.
--
-- La columna entra NOT NULL de una vez: aperturas_proceso nació en la migración
-- 020, de esta misma entrega, y no hay ninguna fila registrada en ningún
-- entorno. Dejarla opcional para no romper datos que no existen habría
-- permitido, en adelante, aperturas sin prueba de publicación.
-- ============================================================================

ALTER TABLE hiring.aperturas_proceso
  ADD COLUMN IF NOT EXISTS evidencia_documento_id uuid;

-- En dos pasos por si el ALTER anterior ya se hubiera corrido en algún entorno
-- con la columna vacía: así la migración se puede repetir sin caerse.
UPDATE hiring.aperturas_proceso
   SET evidencia_documento_id = pliego_documento_id
 WHERE evidencia_documento_id IS NULL;

ALTER TABLE hiring.aperturas_proceso
  ALTER COLUMN evidencia_documento_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_apertura_evidencia'
  ) THEN
    ALTER TABLE hiring.aperturas_proceso
      ADD CONSTRAINT fk_apertura_evidencia
      FOREIGN KEY (evidencia_documento_id) REFERENCES hiring.documentos(id);
  END IF;
END $$;

COMMENT ON COLUMN hiring.aperturas_proceso.evidencia_documento_id IS
  'Soporte de que el pliego definitivo se publicó; admite captura de pantalla (EFDS-1399).';
