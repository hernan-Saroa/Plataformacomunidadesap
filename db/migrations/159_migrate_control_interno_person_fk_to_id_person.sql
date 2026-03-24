-- Migration 159: Migrate control_interno references from auth.personas(id_tercero)
--                to auth.personas(id_person)
-- This migration:
-- 1) Drops affected views that depend on person-reference columns.
-- 2) Converts FK columns from BIGINT to UUID and rebinds FKs to id_person.
-- 3) Recreates affected views using id_person.
-- 4) Removes auth.personas.id_tercero when no dependencies remain.

DROP VIEW IF EXISTS control_interno.v_auditorias_kanban_completo;
DROP VIEW IF EXISTS control_interno.v_auditor_disponibilidad;

CREATE OR REPLACE FUNCTION auth.map_id_tercero_to_id_person(p_id_tercero BIGINT)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT p.id_person
    FROM auth.personas p
    WHERE p.id_tercero = p_id_tercero
$$;

DO $$
DECLARE
    personas_tbl REGCLASS := 'auth.personas'::regclass;
    id_tercero_attnum SMALLINT;
    fk_rec RECORD;
    match_clause TEXT;
    on_update_clause TEXT;
    on_delete_clause TEXT;
    deferrable_clause TEXT;
BEGIN
    SELECT a.attnum
    INTO id_tercero_attnum
    FROM pg_attribute a
    WHERE a.attrelid = personas_tbl
      AND a.attname = 'id_tercero'
      AND NOT a.attisdropped;

    IF id_tercero_attnum IS NULL THEN
        RAISE NOTICE 'auth.personas.id_tercero no existe. Se omite conversion de FKs legacy.';
        RETURN;
    END IF;

    CREATE TEMP TABLE tmp_ci_person_fks ON COMMIT DROP AS
    SELECT
        con.conname,
        con.conrelid::regclass AS table_name,
        att.attname AS local_column,
        t.typname AS local_type,
        con.confmatchtype,
        con.confupdtype,
        con.confdeltype,
        con.condeferrable,
        con.condeferred
    FROM pg_constraint con
    JOIN LATERAL unnest(con.conkey) AS k(attnum) ON TRUE
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = k.attnum
    JOIN pg_type t
      ON t.oid = att.atttypid
    JOIN pg_namespace n
      ON n.oid = con.connamespace
    WHERE con.contype = 'f'
      AND con.confrelid = personas_tbl
      AND con.confkey = ARRAY[id_tercero_attnum]
      AND array_length(con.conkey, 1) = 1
      AND n.nspname = 'control_interno';

    IF NOT EXISTS (SELECT 1 FROM tmp_ci_person_fks) THEN
        RAISE NOTICE 'No se encontraron FKs legacy en control_interno hacia auth.personas(id_tercero).';
        RETURN;
    END IF;

    -- 1) Drop all legacy FKs first (important when multiple FKs point to same column).
    FOR fk_rec IN SELECT * FROM tmp_ci_person_fks LOOP
        EXECUTE format(
            'ALTER TABLE %s DROP CONSTRAINT %I',
            fk_rec.table_name,
            fk_rec.conname
        );
    END LOOP;

    -- 2) Convert each referencing column once.
    FOR fk_rec IN
        SELECT DISTINCT table_name, local_column, local_type
        FROM tmp_ci_person_fks
    LOOP
        IF fk_rec.local_type <> 'uuid' THEN
            EXECUTE format(
                'ALTER TABLE %s ALTER COLUMN %I TYPE UUID USING auth.map_id_tercero_to_id_person(%I)',
                fk_rec.table_name,
                fk_rec.local_column,
                fk_rec.local_column
            );
        END IF;
    END LOOP;

    -- 3) Recreate FKs targeting auth.personas(id_person) preserving FK behavior.
    FOR fk_rec IN SELECT * FROM tmp_ci_person_fks LOOP
        match_clause := CASE fk_rec.confmatchtype
            WHEN 'f' THEN 'MATCH FULL'
            WHEN 'p' THEN 'MATCH PARTIAL'
            ELSE 'MATCH SIMPLE'
        END;

        on_update_clause := CASE fk_rec.confupdtype
            WHEN 'r' THEN 'ON UPDATE RESTRICT'
            WHEN 'c' THEN 'ON UPDATE CASCADE'
            WHEN 'n' THEN 'ON UPDATE SET NULL'
            WHEN 'd' THEN 'ON UPDATE SET DEFAULT'
            ELSE 'ON UPDATE NO ACTION'
        END;

        on_delete_clause := CASE fk_rec.confdeltype
            WHEN 'r' THEN 'ON DELETE RESTRICT'
            WHEN 'c' THEN 'ON DELETE CASCADE'
            WHEN 'n' THEN 'ON DELETE SET NULL'
            WHEN 'd' THEN 'ON DELETE SET DEFAULT'
            ELSE 'ON DELETE NO ACTION'
        END;

        deferrable_clause := CASE
            WHEN fk_rec.condeferrable AND fk_rec.condeferred THEN 'DEFERRABLE INITIALLY DEFERRED'
            WHEN fk_rec.condeferrable THEN 'DEFERRABLE INITIALLY IMMEDIATE'
            ELSE 'NOT DEFERRABLE'
        END;

        EXECUTE format(
            'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.personas(id_person) %s %s %s %s',
            fk_rec.table_name,
            fk_rec.conname,
            fk_rec.local_column,
            match_clause,
            on_update_clause,
            on_delete_clause,
            deferrable_clause
        );
    END LOOP;
END
$$;

DO $$
DECLARE
    personas_tbl REGCLASS := 'auth.personas'::regclass;
    current_pk_name TEXT;
    current_pk_cols TEXT[];
    current_pk_conkey SMALLINT[];
    pk_dep_count INTEGER := 0;
    id_person_key_dep_count INTEGER := 0;
BEGIN
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

    IF current_pk_name IS NULL THEN
        ALTER TABLE auth.personas ADD CONSTRAINT personas_pkey PRIMARY KEY (id_person);
        RETURN;
    END IF;

    IF current_pk_cols <> ARRAY['id_person'] THEN
        SELECT COUNT(*)
        INTO pk_dep_count
        FROM pg_constraint con
        WHERE con.contype = 'f'
          AND con.confrelid = personas_tbl
          AND con.confkey = current_pk_conkey;

        IF pk_dep_count > 0 THEN
            RAISE NOTICE 'No se migra PK de auth.personas a id_person en este paso: existen % FK(s) sobre la PK legacy.', pk_dep_count;
        ELSE
            ALTER TABLE auth.personas DROP CONSTRAINT IF EXISTS personas_pkey;
            ALTER TABLE auth.personas ADD CONSTRAINT personas_pkey PRIMARY KEY (id_person);
        END IF;
    END IF;

    -- Do not drop personas_id_person_key while FKs are still bound to that index.
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = personas_tbl
          AND conname = 'personas_id_person_key'
          AND contype = 'u'
    ) THEN
        SELECT COUNT(*)
        INTO id_person_key_dep_count
        FROM pg_constraint con
        JOIN pg_constraint u
          ON u.conrelid = personas_tbl
         AND u.conname = 'personas_id_person_key'
         AND u.contype = 'u'
        WHERE con.contype = 'f'
          AND con.confrelid = personas_tbl
          AND con.confkey = u.conkey;

        IF id_person_key_dep_count = 0 THEN
            ALTER TABLE auth.personas DROP CONSTRAINT IF EXISTS personas_id_person_key;
        ELSE
            RAISE NOTICE 'Se conserva personas_id_person_key: existen % FK(s) dependientes.', id_person_key_dep_count;
        END IF;
    END IF;
END
$$;

CREATE OR REPLACE VIEW control_interno.v_auditor_disponibilidad AS
SELECT
    p.id_person AS persona_id,
    p.nom_largo AS nombre,
    p.num_identificacion,
    p.tip_identificacion,
    p.dir_email AS email,
    ap.especialidad,
    ap.cargo,
    ap.nivel_experiencia,
    ap.estado_disponibilidad,
    COALESCE((
        SELECT COUNT(DISTINCT a.id)
        FROM control_interno.auditoria a
        WHERE (
            (a.auditor_lider_id = p.id_person)
            OR (a.auditor_asignado_id = p.id_person)
            OR EXISTS (
                SELECT 1
                FROM control_interno.equipo_auditor ea
                WHERE ea.auditoria_id = a.id
                  AND ea.persona_id = p.id_person
                  AND ea.activo = TRUE
            )
        )
        AND a.estado_kanban::text <> ALL (ARRAY['Finalizada', 'Archivada'])
        AND COALESCE(a.activa, TRUE) = TRUE
    ), 0::bigint) AS auditorias_en_curso,
    COALESCE((
        SELECT COUNT(DISTINCT a.id)
        FROM control_interno.auditoria a
        WHERE a.auditor_lider_id = p.id_person
          AND a.estado_kanban::text <> ALL (ARRAY['Finalizada', 'Archivada'])
          AND COALESCE(a.activa, TRUE) = TRUE
    ), 0::bigint) AS auditorias_como_lider,
    COALESCE((
        SELECT COUNT(DISTINCT a.id)
        FROM control_interno.auditoria a
        WHERE a.auditor_asignado_id = p.id_person
          AND a.estado_kanban::text <> ALL (ARRAY['Finalizada', 'Archivada'])
          AND COALESCE(a.activa, TRUE) = TRUE
    ), 0::bigint) AS auditorias_como_asignado,
    ap.fecha_ultima_actividad,
    ap.observaciones,
    ap.activo,
    ap.created_at,
    ap.updated_at
FROM auth.personas p
LEFT JOIN control_interno.auditor_perfil ap
    ON p.id_person = ap.persona_id
WHERE ap.activo = TRUE OR ap.id IS NULL;

CREATE OR REPLACE VIEW control_interno.v_auditorias_kanban_completo AS
SELECT
    a.id,
    a.codigo,
    a.nombre AS titulo,
    a.descripcion,
    a.estado_kanban AS estado,
    COALESCE(a.tipo_kanban, a.tipo) AS tipo,
    a.riesgo_kanban AS riesgo,
    a.semaforo,
    a.territorial,
    a.prioridad_kanban AS prioridad,
    a.area_objetivo,
    a.proceso_auditado,
    a.alcance,
    a.progreso,
    a.hallazgos AS total_hallazgos,
    a.dias_restantes,
    a.porcentaje_tiempo,
    a.ultima_actuacion,
    a.calificacion_riesgo,
    a.total_documentos,
    a.total_informes,
    a.total_tareas,
    a.actividades_completas,
    a.actividades_pendientes,
    a.responsable_area_nombre,
    a.responsable_area_cargo,
    a.responsable_area_email,
    supervisor.id_person AS supervisor_asignado_id,
    supervisor.nom_largo AS supervisor_asignado_nombre,
    supervisor.dir_email AS supervisor_asignado_email,
    a.fecha_reunion_apertura,
    ra.modalidad AS reunion_modalidad,
    ra.estado_acta AS reunion_estado_acta,
    lider.id_person AS auditor_lider_id,
    lider.nom_largo AS auditor_lider_nombre,
    lider.dir_email AS auditor_lider_email,
    lider_perfil.especialidad AS auditor_lider_especialidad,
    lider_perfil.cargo AS auditor_lider_cargo,
    asignado.id_person AS auditor_asignado_id,
    asignado.nom_largo AS auditor_asignado_nombre,
    asignado.dir_email AS auditor_asignado_email,
    asignado_perfil.especialidad AS auditor_asignado_especialidad,
    asignado_perfil.cargo AS auditor_asignado_cargo,
    ti.nombre AS territorial_nombre,
    ti.ciudad AS territorial_ciudad,
    ti.departamento AS territorial_departamento,
    ei.tipo_motivo AS especial_tipo_motivo,
    ei.solicitante AS especial_solicitante,
    ei.justificacion AS especial_justificacion,
    a.fecha_inicio,
    a.fecha_fin,
    a.created_at,
    a.updated_at
FROM control_interno.auditoria a
LEFT JOIN auth.personas lider
    ON a.auditor_lider_id = lider.id_person
LEFT JOIN control_interno.auditor_perfil lider_perfil
    ON lider.id_person = lider_perfil.persona_id
   AND lider_perfil.activo = TRUE
LEFT JOIN auth.personas asignado
    ON a.auditor_asignado_id = asignado.id_person
LEFT JOIN control_interno.auditor_perfil asignado_perfil
    ON asignado.id_person = asignado_perfil.persona_id
   AND asignado_perfil.activo = TRUE
LEFT JOIN auth.personas supervisor
    ON a.supervisor_asignado_id = supervisor.id_person
LEFT JOIN control_interno.auditoria_territorial_info ti
    ON a.id = ti.auditoria_id
LEFT JOIN control_interno.auditoria_especial_info ei
    ON a.id = ei.auditoria_id
LEFT JOIN control_interno.reunion_apertura ra
    ON a.id = ra.auditoria_id;

COMMENT ON VIEW control_interno.v_auditor_disponibilidad IS
'Vista que muestra auditores con sus especialidades, disponibilidad y conteo de auditorías en curso';

COMMENT ON VIEW control_interno.v_auditorias_kanban_completo IS
'Vista completa de auditorías con toda la información necesaria para el módulo Kanban';

DO $$
DECLARE
    personas_tbl REGCLASS := 'auth.personas'::regclass;
    id_tercero_attnum SMALLINT;
    deps_count INTEGER;
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
    INTO deps_count
    FROM pg_constraint con
    WHERE con.contype = 'f'
      AND con.confrelid = personas_tbl
      AND con.confkey = ARRAY[id_tercero_attnum];

    IF deps_count = 0 THEN
        ALTER TABLE auth.personas DROP CONSTRAINT IF EXISTS personas_id_tercero_key;
        ALTER TABLE auth.personas DROP COLUMN IF EXISTS id_tercero;
    ELSE
        RAISE NOTICE 'No se elimina auth.personas.id_tercero en esta migracion: aun existen % FK(s) dependientes.', deps_count;
    END IF;
END
$$;

DROP FUNCTION IF EXISTS auth.map_id_tercero_to_id_person(BIGINT);
