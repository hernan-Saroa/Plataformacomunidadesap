-- Migration 158: Add id_person UUID to auth.personas and auth.user
-- Safe transition:
-- 1) auth.personas.id_person becomes PK
-- 2) auth."user" links to personas.id_person
-- 3) auth."user".id_tercero is removed
-- 4) auth.personas.id_tercero is removed only if no remaining dependencies

ALTER TABLE auth.personas
ADD COLUMN IF NOT EXISTS id_person UUID DEFAULT gen_random_uuid();

UPDATE auth.personas
SET id_person = gen_random_uuid()
WHERE id_person IS NULL;

ALTER TABLE auth.personas
ALTER COLUMN id_person SET NOT NULL;

DO $$
DECLARE
    personas_tbl REGCLASS := 'auth.personas'::regclass;
    current_pk_name TEXT;
    current_pk_cols TEXT[];
    current_pk_conkey SMALLINT[];
    has_id_tercero BOOLEAN;
    has_unique_id_tercero BOOLEAN;
    has_unique_id_person BOOLEAN;
    pk_dep_count INTEGER := 0;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'auth'
          AND table_name = 'personas'
          AND column_name = 'id_tercero'
    ) INTO has_id_tercero;

    SELECT c.conname,
           ARRAY_AGG(a.attname::text ORDER BY u.ord),
           c.conkey
    INTO current_pk_name, current_pk_cols, current_pk_conkey
    FROM pg_constraint c
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord) ON TRUE
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = u.attnum
    WHERE c.conrelid = personas_tbl
      AND c.contype = 'p'
    GROUP BY c.conname, c.conkey;

    -- If PK is still id_tercero, create a dedicated UNIQUE first to keep external FKs valid.
    IF has_id_tercero AND current_pk_cols = ARRAY['id_tercero'] THEN
        SELECT EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord) ON TRUE
            JOIN pg_attribute a
              ON a.attrelid = c.conrelid
             AND a.attnum = u.attnum
            WHERE c.conrelid = personas_tbl
              AND c.contype = 'u'
            GROUP BY c.oid
            HAVING ARRAY_AGG(a.attname::text ORDER BY u.ord) = ARRAY['id_tercero']::text[]
        ) INTO has_unique_id_tercero;

        IF NOT has_unique_id_tercero THEN
            EXECUTE 'ALTER TABLE auth.personas ADD CONSTRAINT personas_id_tercero_key UNIQUE (id_tercero)';
        END IF;
    END IF;

    -- Ensure id_person has uniqueness so it can be referenced even
    -- before becoming PK (needed when legacy FKs still depend on personas_pkey).
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord) ON TRUE
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = u.attnum
        WHERE c.conrelid = personas_tbl
          AND c.contype IN ('p', 'u')
        GROUP BY c.oid
        HAVING ARRAY_AGG(a.attname::text ORDER BY u.ord) = ARRAY['id_person']::text[]
    ) INTO has_unique_id_person;

    IF NOT has_unique_id_person THEN
        EXECUTE 'ALTER TABLE auth.personas ADD CONSTRAINT personas_id_person_key UNIQUE (id_person)';
    END IF;

    -- Switch PK to id_person only when no FK still depends on current PK.
    IF current_pk_name IS NULL THEN
        EXECUTE 'ALTER TABLE auth.personas ADD CONSTRAINT personas_pkey PRIMARY KEY (id_person)';
    ELSIF current_pk_cols <> ARRAY['id_person'] THEN
        SELECT COUNT(*)
        INTO pk_dep_count
        FROM pg_constraint con
        WHERE con.contype = 'f'
          AND con.confrelid = personas_tbl
          AND con.confkey = current_pk_conkey;

        IF pk_dep_count = 0 THEN
            EXECUTE format('ALTER TABLE auth.personas DROP CONSTRAINT %I', current_pk_name);
            EXECUTE 'ALTER TABLE auth.personas ADD CONSTRAINT personas_pkey PRIMARY KEY (id_person)';
            EXECUTE 'ALTER TABLE auth.personas DROP CONSTRAINT IF EXISTS personas_id_person_key';
        ELSE
            RAISE NOTICE 'Se mantiene PK actual (%) en auth.personas: existen % FK(s) dependientes. Se migraran en la siguiente migracion.', current_pk_name, pk_dep_count;
        END IF;
    END IF;
END
$$;

ALTER TABLE auth."user"
ADD COLUMN IF NOT EXISTS id_person UUID;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'auth'
          AND table_name = 'user'
          AND column_name = 'id_tercero'
    )
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'auth'
          AND table_name = 'personas'
          AND column_name = 'id_tercero'
    ) THEN
        UPDATE auth."user" u
        SET id_person = p.id_person
        FROM auth.personas p
        WHERE u.id_person IS NULL
          AND u.id_tercero = p.id_tercero;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_user_id_person ON auth."user" (id_person);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conname = 'fk_user_personas_id_person'
          AND c.conrelid = 'auth."user"'::regclass
    ) THEN
        ALTER TABLE auth."user"
        ADD CONSTRAINT fk_user_personas_id_person
        FOREIGN KEY (id_person)
        REFERENCES auth.personas(id_person);
    END IF;
END
$$;

-- Drop old FK to personas(id_tercero) and remove legacy column from auth."user".
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conname = 'fk_user_personas'
          AND c.conrelid = 'auth."user"'::regclass
    ) THEN
        ALTER TABLE auth."user" DROP CONSTRAINT fk_user_personas;
    END IF;
END
$$;

ALTER TABLE auth."user"
DROP COLUMN IF EXISTS id_tercero;

-- Try removing personas.id_tercero only if no dependencies remain outside auth."user".
DO $$
DECLARE
    personas_tbl REGCLASS := 'auth.personas'::regclass;
    id_tercero_attnum SMALLINT;
    fk_count INTEGER := 0;
    view_count INTEGER := 0;
BEGIN
    SELECT a.attnum
    INTO id_tercero_attnum
    FROM pg_attribute a
    WHERE a.attrelid = personas_tbl
      AND a.attname = 'id_tercero'
      AND NOT a.attisdropped;

    IF id_tercero_attnum IS NULL THEN
        RETURN;
    END IF;

    SELECT COUNT(*)
    INTO fk_count
    FROM pg_constraint con
    WHERE con.contype = 'f'
      AND con.confrelid = personas_tbl
      AND con.confkey = ARRAY[id_tercero_attnum];

    SELECT COUNT(*)
    INTO view_count
    FROM pg_depend d
    JOIN pg_rewrite r ON r.oid = d.objid
    JOIN pg_class v ON v.oid = r.ev_class
    WHERE d.refobjid = personas_tbl
      AND d.refobjsubid = id_tercero_attnum
      AND v.relkind IN ('v', 'm');

    IF fk_count = 0 AND view_count = 0 THEN
        ALTER TABLE auth.personas DROP CONSTRAINT IF EXISTS personas_id_tercero_key;
        ALTER TABLE auth.personas DROP COLUMN IF EXISTS id_tercero;
    ELSE
        RAISE NOTICE 'No se elimina auth.personas.id_tercero en esta migracion. Dependencias activas -> FKs: %, Views: %', fk_count, view_count;
    END IF;
END
$$;

ALTER TABLE auth."user"
ADD COLUMN IF NOT EXISTS password_temp boolean DEFAULT false;

ALTER TABLE auth."user"
ADD COLUMN IF NOT EXISTS token_microsoft character varying(255) DEFAULT NULL;

ALTER TABLE auth."user"
ADD COLUMN IF NOT EXISTS "2fa" boolean DEFAULT false;
