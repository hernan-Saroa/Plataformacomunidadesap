SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 506_campos_limite_caracteres_dinamico.sql
-- Created: 2026-10-08
-- Description:
--   1. Agrega la columna limite_caracteres a travel_expenses.config_campos_formulario
--      con valor por defecto (250 caracteres) para permitir validación dinámica por campo.
--   2. Modifica columnas de solicitudes_comision a tipo TEXT para que la base de datos
--      no tenga un límite rígido (VARCHAR) y las restricciones se gestionen dinámicamente
--      desde la parametrización de campos.
--   3. Asigna límites iniciales coherentes a los campos estándar del catálogo.
-- ============================================================================

-- 1. Agregar columna limite_caracteres en config_campos_formulario
ALTER TABLE travel_expenses.config_campos_formulario
  ADD COLUMN IF NOT EXISTS limite_caracteres INTEGER DEFAULT 250;

COMMENT ON COLUMN travel_expenses.config_campos_formulario.limite_caracteres IS
  'Límite máximo de caracteres permitido para el campo. Por defecto 250 caracteres, configurable por administrador.';

-- 2. Actualizar límites por defecto de campos existentes en el catálogo
UPDATE travel_expenses.config_campos_formulario
SET limite_caracteres = 250
WHERE limite_caracteres IS NULL;

UPDATE travel_expenses.config_campos_formulario
SET limite_caracteres = 250
WHERE clave = 'objetoComision' AND (limite_caracteres IS NULL OR limite_caracteres = 0);

UPDATE travel_expenses.config_campos_formulario
SET limite_caracteres = 100
WHERE clave IN ('destinoCiudad', 'destinoDepartamento', 'rubroPresupuestal', 'numeroCdp', 'numeroContrato')
  AND (limite_caracteres IS NULL OR limite_caracteres = 250);

UPDATE travel_expenses.config_campos_formulario
SET limite_caracteres = 150
WHERE clave IN ('cargoEsap', 'rolEsap', 'cargo')
  AND (limite_caracteres IS NULL OR limite_caracteres = 250);

UPDATE travel_expenses.config_campos_formulario
SET limite_caracteres = 50
WHERE clave IN ('documentoComisionado', 'num_cuenta', 'fechaCdp')
  AND (limite_caracteres IS NULL OR limite_caracteres = 250);

-- 3. Modificar columnas de solicitudes_comision a TEXT para remover restricciones rígidas de longitud en BD
DO $$
BEGIN
  -- objeto_comision
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'travel_expenses'
      AND table_name = 'solicitudes_comision'
      AND column_name = 'objeto_comision'
  ) THEN
    ALTER TABLE travel_expenses.solicitudes_comision
      ALTER COLUMN objeto_comision TYPE TEXT;
  END IF;

  -- destino_ciudad
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'travel_expenses'
      AND table_name = 'solicitudes_comision'
      AND column_name = 'destino_ciudad'
  ) THEN
    ALTER TABLE travel_expenses.solicitudes_comision
      ALTER COLUMN destino_ciudad TYPE TEXT;
  END IF;

  -- destino_departamento
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'travel_expenses'
      AND table_name = 'solicitudes_comision'
      AND column_name = 'destino_departamento'
  ) THEN
    ALTER TABLE travel_expenses.solicitudes_comision
      ALTER COLUMN destino_departamento TYPE TEXT;
  END IF;

  -- rubro_presupuestal
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'travel_expenses'
      AND table_name = 'solicitudes_comision'
      AND column_name = 'rubro_presupuestal'
  ) THEN
    ALTER TABLE travel_expenses.solicitudes_comision
      ALTER COLUMN rubro_presupuestal TYPE TEXT;
  END IF;

  -- numero_cdp
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'travel_expenses'
      AND table_name = 'solicitudes_comision'
      AND column_name = 'numero_cdp'
  ) THEN
    ALTER TABLE travel_expenses.solicitudes_comision
      ALTER COLUMN numero_cdp TYPE TEXT;
  END IF;

  -- cargo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'travel_expenses'
      AND table_name = 'solicitudes_comision'
      AND column_name = 'cargo'
  ) THEN
    ALTER TABLE travel_expenses.solicitudes_comision
      ALTER COLUMN cargo TYPE TEXT;
  END IF;

  -- fecha_cdp
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'travel_expenses'
      AND table_name = 'solicitudes_comision'
      AND column_name = 'fecha_cdp'
  ) THEN
    ALTER TABLE travel_expenses.solicitudes_comision
      ALTER COLUMN fecha_cdp TYPE TEXT;
  END IF;
END $$;

RESET search_path;
