-- ============================================================================
-- 147 · Las pólizas y los amparos guardan el nombre con que se registraron
--       (EFDS-XXXX)
--
-- AJU-002 de QA (17/11): los tipos de póliza y de amparo se administran desde
-- Configuración (145), y los registros históricos tienen que conservar la
-- descripción que tenían al crearse. Hasta aquí solo guardaban el código, y la
-- pantalla lo traducía con el catálogo de hoy: si un tipo se renombraba, la
-- póliza vieja pasaba a decir otra cosa, y si se retiraba, mostraba el código.
--
-- · garantias.tipo_poliza_nombre y amparos.tipo_nombre: se llenan al
--   registrar. Las ya registradas se llenan con el nombre actual del catálogo,
--   que es lo mejor que se sabe de ellas.
--
-- Idempotente.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.garantias ADD COLUMN IF NOT EXISTS tipo_poliza_nombre varchar(200);
ALTER TABLE hiring.amparos   ADD COLUMN IF NOT EXISTS tipo_nombre        varchar(200);

COMMENT ON COLUMN hiring.garantias.tipo_poliza_nombre IS
  'Nombre del tipo de póliza cuando se registró; no cambia si el catálogo se edita (147)';
COMMENT ON COLUMN hiring.amparos.tipo_nombre IS
  'Nombre del amparo cuando se registró; no cambia si el catálogo se edita (147)';

UPDATE hiring.garantias g
   SET tipo_poliza_nombre = t.nombre
  FROM hiring.tipos_poliza t
 WHERE t.codigo = g.tipo_poliza
   AND g.tipo_poliza_nombre IS NULL;

UPDATE hiring.amparos a
   SET tipo_nombre = t.nombre
  FROM hiring.tipos_amparo t
 WHERE t.codigo = a.tipo
   AND a.tipo_nombre IS NULL;

COMMIT;
