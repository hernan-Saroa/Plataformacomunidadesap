-- 684_rund_limite_archivo_25mb.sql
-- El tamaño máximo por archivo de soporte RUND pasa de 10 MB a 25 MB: un expediente real trae PDF escaneados de más de 10 MB.
-- Aditiva e idempotente: solo sube los topes que estén por debajo y cambia el valor por defecto de las categorías nuevas.
BEGIN;

ALTER TABLE academic_work_plan."RundDocumentoCategoria"
  ALTER COLUMN tamano_maximo_bytes SET DEFAULT 26214400;

UPDATE academic_work_plan."RundDocumentoCategoria"
SET tamano_maximo_bytes = 26214400
WHERE tamano_maximo_bytes < 26214400;

COMMIT;
