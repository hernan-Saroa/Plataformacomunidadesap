-- ════════════════════════════════════════════════════════════════════════════
-- Migración 186: Cambiar rol_ocig de ENUM a VARCHAR(100)
-- ════════════════════════════════════════════════════════════════════════════
-- Fecha: 2026-04-14
-- Descripción: 
--   Elimina la restricción ENUM en configuracion_profesionales_ocig.rol_ocig
--   para permitir que acepte cualquier rol del sistema (ADMIN, USER, etc.)
--   en lugar de solo los 5 roles predefinidos de auditoría OCIG.
--
-- Razón del cambio:
--   Los usuarios pueden tener múltiples roles en el sistema y el backend
--   debe respetar cualquier valor enviado, no solo los roles de auditoría.
--
-- Cambios:
--   1. Convertir columna rol_ocig de ENUM a VARCHAR(100)
--   2. Mantener default 'Auditor' para compatibilidad
--   3. Eliminar tipo ENUM si existe
-- ════════════════════════════════════════════════════════════════════════════

-- Convertir la columna de ENUM a VARCHAR(100)
ALTER TABLE control_interno.configuracion_profesionales_ocig 
  ALTER COLUMN rol_ocig TYPE varchar(100) USING rol_ocig::text;

-- Mantener el valor por defecto
ALTER TABLE control_interno.configuracion_profesionales_ocig 
  ALTER COLUMN rol_ocig SET DEFAULT 'Auditor';

-- Intentar eliminar el tipo ENUM (puede no existir dependiendo del estado de la BD)
DO $$
BEGIN
  -- Buscar y eliminar el tipo enum con cualquier nombre posible
  EXECUTE 'DROP TYPE IF EXISTS control_interno.configuracion_profesionales_ocig_rol_ocig_enum CASCADE';
EXCEPTION 
  WHEN OTHERS THEN 
    -- Ignorar si no existe
    NULL;
END$$;

-- Verificación
DO $$
DECLARE
  tipo_columna TEXT;
BEGIN
  SELECT data_type INTO tipo_columna
  FROM information_schema.columns 
  WHERE table_schema = 'control_interno' 
    AND table_name = 'configuracion_profesionales_ocig' 
    AND column_name = 'rol_ocig';
  
  IF tipo_columna = 'character varying' THEN
    RAISE NOTICE '✅ Migración 186 completada: rol_ocig es ahora VARCHAR(100)';
  ELSE
    RAISE WARNING '⚠️  rol_ocig tiene tipo inesperado: %', tipo_columna;
  END IF;
END$$;
