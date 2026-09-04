-- ============================================================================
-- Migration: 017_comisionados_add_id_dependencia.sql
-- Created: 2026-09-04
-- Description: Añade la columna `id_dependencia` (bigint, nullable) a la tabla
--              `travel_expenses.comisionados` y la rellena con el valor que
--              exista en `auth.personas` para el mismo `numero_documento`.
--
--              Esto soporta la regla de negocio del módulo de viáticos según
--              la cual todo comisionado debe estar asociado a una dependencia
--              institucional (origen "ESAP" → `auth.personas`).
--
--              Adicionalmente, amplía el CHECK constraint
--              `comisionados_origen_datos_check` para que admita el valor
--              'ESAP' (origen desde auth.personas) además de los valores
--              históricos 'HUMANO' y 'SECOP'.
--
--              Idempotente: ADD COLUMN IF NOT EXISTS + DROP/ADD CONSTRAINT
--              seguro. NO crea FK cross-schema porque `auth.dependencias`
--              pertenece a otro microservicio; la integridad referencial se
--              valida a nivel de aplicación.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS travel_expenses;

ALTER TABLE travel_expenses.comisionados
    ADD COLUMN IF NOT EXISTS id_dependencia bigint NULL;

COMMENT ON COLUMN travel_expenses.comisionados.id_dependencia IS
    'ID de la dependencia institucional (auth.dependencias) del comisionado. Se obtiene desde auth.personas.id_dependencia al consultar por número de documento.';

CREATE INDEX IF NOT EXISTS idx_comisionados_id_dependencia
    ON travel_expenses.comisionados (id_dependencia);

-- Backfill: para los comisionados ya existentes (sembrados manualmente),
-- copiar el id_dependencia desde auth.personas usando el numero_documento
-- como llave. LEFT JOIN para no perder comisionados sin equivalente en
-- auth.personas.
UPDATE travel_expenses.comisionados c
SET id_dependencia = p.id_dependencia
FROM auth.personas p
WHERE p.num_identificacion = c.numero_documento
  AND c.id_dependencia IS NULL
  AND p.id_dependencia IS NOT NULL;

-- Ampliar el CHECK de origen_datos para incluir 'ESAP'. El módulo de
-- viáticos materializa comisionados desde auth.personas con origenDatos='ESAP'
-- cuando el documento no se encuentra en la tabla local.
ALTER TABLE travel_expenses.comisionados
    DROP CONSTRAINT IF EXISTS comisionados_origen_datos_check;

ALTER TABLE travel_expenses.comisionados
    ADD CONSTRAINT comisionados_origen_datos_check
    CHECK (origen_datos IN ('HUMANO', 'SECOP', 'ESAP'));

RESET search_path;
