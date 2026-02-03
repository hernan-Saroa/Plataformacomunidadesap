-- ============================================
-- MIGRACION 101: Limpiar placeholders y quitar defaults de dependencias
-- Descripcion: Normaliza valores y elimina defaults para department_parent y department_son
-- ============================================

SET search_path TO certification, public;

-- Limpiar placeholders con normalizacion de espacios (incluye NBSP)
UPDATE certificate_requests
SET department_parent = NULL
WHERE department_parent IS NOT NULL
  AND lower(
    regexp_replace(
      translate(department_parent, chr(160), ' '),
      '\\s+',
      ' ',
      'g'
    )
  ) = 'registro padre';

UPDATE certificates
SET department_parent = NULL
WHERE department_parent IS NOT NULL
  AND lower(
    regexp_replace(
      translate(department_parent, chr(160), ' '),
      '\\s+',
      ' ',
      'g'
    )
  ) = 'registro padre';

UPDATE certificate_requests
SET department_son = NULL
WHERE department_son IS NOT NULL
  AND lower(
    regexp_replace(
      translate(department_son, chr(160), ' '),
      '\\s+',
      ' ',
      'g'
    )
  ) = 'registro hijo';

UPDATE certificates
SET department_son = NULL
WHERE department_son IS NOT NULL
  AND lower(
    regexp_replace(
      translate(department_son, chr(160), ' '),
      '\\s+',
      ' ',
      'g'
    )
  ) = 'registro hijo';

-- Evitar que se vuelvan a asignar defaults en nuevos registros
ALTER TABLE certificate_requests
  ALTER COLUMN department_parent DROP DEFAULT;

ALTER TABLE certificates
  ALTER COLUMN department_parent DROP DEFAULT;

ALTER TABLE certificate_requests
  ALTER COLUMN department_son DROP DEFAULT;

ALTER TABLE certificates
  ALTER COLUMN department_son DROP DEFAULT;
