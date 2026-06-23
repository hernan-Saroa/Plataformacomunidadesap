-- ===========================================================================
-- Migracion 356: Normalizar UUIDs semilla de personas OCI/Comite
-- ===========================================================================
--
-- Contexto:
--   Algunos datos semilla usan valores con forma UUID, pero sin version RFC:
--     a0000002-0000-0000-0000-000000000002
--   PostgreSQL los acepta en columnas uuid, pero class-validator @IsUUID()
--   los rechaza porque el tercer bloque no tiene version valida.
--
-- Objetivo:
--   Migrar esos identificadores a UUIDs determinísticos version 4 / variant 8:
--     a0000002-0000-4000-8000-000000000002
--
-- Uso recomendado:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/356_normalize_oci_seed_person_uuid_versions.sql
--
-- Nota:
--   El script es transaccional. Si alguna referencia no puede recrearse,
--   se revierte todo.

BEGIN;

CREATE TEMP TABLE _oci_person_uuid_map (
  old_id uuid PRIMARY KEY,
  new_id uuid UNIQUE NOT NULL
) ON COMMIT DROP;

INSERT INTO _oci_person_uuid_map (old_id, new_id)
VALUES
  ('a0000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000000'),
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-4000-8000-000000000001'),
  ('a0000002-0000-0000-0000-000000000002', 'a0000002-0000-4000-8000-000000000002'),
  ('a0000003-0000-0000-0000-000000000003', 'a0000003-0000-4000-8000-000000000003'),
  ('a0000004-0000-0000-0000-000000000004', 'a0000004-0000-4000-8000-000000000004'),
  ('a0000005-0000-0000-0000-000000000005', 'a0000005-0000-4000-8000-000000000005'),
  ('a0000006-0000-0000-0000-000000000006', 'a0000006-0000-4000-8000-000000000006'),
  ('a0000007-0000-0000-0000-000000000007', 'a0000007-0000-4000-8000-000000000007'),
  ('a0000008-0000-0000-0000-000000000008', 'a0000008-0000-4000-8000-000000000008'),
  ('a0000009-0000-0000-0000-000000000009', 'a0000009-0000-4000-8000-000000000009'),
  ('d0000001-0000-0000-0000-000000000001', 'd0000001-0000-4000-8000-000000000001'),
  ('d0000002-0000-0000-0000-000000000002', 'd0000002-0000-4000-8000-000000000002'),
  ('d0000003-0000-0000-0000-000000000003', 'd0000003-0000-4000-8000-000000000003'),
  ('d0000004-0000-0000-0000-000000000004', 'd0000004-0000-4000-8000-000000000004'),
  ('d0000005-0000-0000-0000-000000000005', 'd0000005-0000-4000-8000-000000000005'),
  ('d0000006-0000-0000-0000-000000000006', 'd0000006-0000-4000-8000-000000000006'),
  ('d0000007-0000-0000-0000-000000000007', 'd0000007-0000-4000-8000-000000000007');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth.personas p
    JOIN _oci_person_uuid_map m ON p.id_person = m.new_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM auth.personas old_p
      WHERE old_p.id_person = m.old_id
    )
  ) THEN
    RAISE EXCEPTION 'Ya existen personas con alguno de los UUID destino. Revise _oci_person_uuid_map antes de ejecutar.';
  END IF;
END
$$;

CREATE TEMP TABLE _dropped_person_fks (
  schema_name text NOT NULL,
  table_name text NOT NULL,
  constraint_name text NOT NULL,
  constraint_def text NOT NULL
) ON COMMIT DROP;

INSERT INTO _dropped_person_fks (schema_name, table_name, constraint_name, constraint_def)
SELECT
  ns.nspname,
  rel.relname,
  con.conname,
  pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE con.contype = 'f'
  AND con.confrelid = 'auth.personas'::regclass
  AND ns.nspname NOT LIKE 'pg_%'
  AND ns.nspname <> 'information_schema';

DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN SELECT * FROM _dropped_person_fks LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      fk.schema_name,
      fk.table_name,
      fk.constraint_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  col record;
  touched integer;
BEGIN
  FOR col IN
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.udt_name = 'uuid'
      AND c.table_schema NOT LIKE 'pg_%'
      AND c.table_schema <> 'information_schema'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format(
      'UPDATE %I.%I t SET %I = m.new_id FROM _oci_person_uuid_map m WHERE t.%I = m.old_id',
      col.table_schema,
      col.table_name,
      col.column_name,
      col.column_name
    );
    GET DIAGNOSTICS touched = ROW_COUNT;
    IF touched > 0 THEN
      RAISE NOTICE 'Actualizados %.% columna uuid %: % filas', col.table_schema, col.table_name, col.column_name, touched;
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  col record;
  touched integer;
BEGIN
  FOR col IN
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.data_type IN ('character varying', 'character', 'text')
      AND c.table_schema NOT LIKE 'pg_%'
      AND c.table_schema <> 'information_schema'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format(
      'UPDATE %I.%I t SET %I = m.new_id::text FROM _oci_person_uuid_map m WHERE t.%I = m.old_id::text',
      col.table_schema,
      col.table_name,
      col.column_name,
      col.column_name
    );
    GET DIAGNOSTICS touched = ROW_COUNT;
    IF touched > 0 THEN
      RAISE NOTICE 'Actualizados %.% columna texto %: % filas', col.table_schema, col.table_name, col.column_name, touched;
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  col record;
  mapping record;
  touched integer;
BEGIN
  FOR col IN
    SELECT c.table_schema, c.table_name, c.column_name, c.udt_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.udt_name IN ('json', 'jsonb')
      AND c.table_schema NOT LIKE 'pg_%'
      AND c.table_schema <> 'information_schema'
      AND t.table_type = 'BASE TABLE'
  LOOP
    FOR mapping IN SELECT old_id, new_id FROM _oci_person_uuid_map LOOP
      EXECUTE format(
        'UPDATE %I.%I SET %I = replace(%I::text, %L, %L)::%s WHERE %I::text LIKE %L',
        col.table_schema,
        col.table_name,
        col.column_name,
        col.column_name,
        mapping.old_id::text,
        mapping.new_id::text,
        col.udt_name,
        col.column_name,
        '%' || mapping.old_id::text || '%'
      );
      GET DIAGNOSTICS touched = ROW_COUNT;
      IF touched > 0 THEN
        RAISE NOTICE 'Actualizados %.% columna % %: % filas', col.table_schema, col.table_name, col.udt_name, col.column_name, touched;
      END IF;
    END LOOP;
  END LOOP;
END
$$;

DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN SELECT * FROM _dropped_person_fks LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
      fk.schema_name,
      fk.table_name,
      fk.constraint_name,
      fk.constraint_def
    );
  END LOOP;
END
$$;

COMMIT;
