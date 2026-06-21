-- Migration 347: Fix document names encoding issues (latin1 to utf-8)
-- Fixes characters like Ã³ to ó, Ã¡ to á, etc.

-- 1. Update control_interno.documento
UPDATE control_interno.documento
SET 
  nombre_archivo = REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(nombre_archivo, 'Ã¡', 'á'),
            'Ã©', 'é'
          ),
          'Ã­', 'í'
        ),
        'Ã³', 'ó'
      ),
      'Ãº', 'ú'
    ),
    'Ã±', 'ñ'
  ),
  ruta_archivo = REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(ruta_archivo, 'Ã¡', 'á'),
            'Ã©', 'é'
          ),
          'Ã­', 'í'
        ),
        'Ã³', 'ó'
      ),
      'Ãº', 'ú'
    ),
    'Ã±', 'ñ'
  )
WHERE nombre_archivo LIKE '%Ã%' OR ruta_archivo LIKE '%Ã%';

-- 2. Update control_interno.hallazgo
UPDATE control_interno.hallazgo
SET 
  documento_controversia_nombre = REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(documento_controversia_nombre, 'Ã¡', 'á'),
            'Ã©', 'é'
          ),
          'Ã­', 'í'
        ),
        'Ã³', 'ó'
      ),
      'Ãº', 'ú'
    ),
    'Ã±', 'ñ'
  )
WHERE documento_controversia_nombre LIKE '%Ã%';
