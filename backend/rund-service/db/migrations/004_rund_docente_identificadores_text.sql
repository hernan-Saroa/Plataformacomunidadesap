-- Docente.id ya es TEXT (003). Alinear sus referencias sin cambiar identificadores.
-- No altera auth, academic_work_plan ni el CRUD base rund.docente.
-- Un solo DO mantiene el cambio atomico incluso al ejecutarlo sin transaccion externa.
DO $$
DECLARE
    target_table TEXT;
    column_type TEXT;
BEGIN
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_schema = 'rund' AND table_name = 'Docente' AND column_name = 'id';

    IF column_type IS DISTINCT FROM 'text' THEN
        RAISE EXCEPTION 'Se requiere rund."Docente".id TEXT; verificar migracion 003';
    END IF;

    FOREACH target_table IN ARRAY ARRAY[
        'RundCampoEstado', 'RundSoporteCampo', 'RundAprobacionLog',
        'RundDocumentoPerfil', 'RundExtraccionTrabajo'
    ] LOOP
        SELECT data_type INTO column_type
        FROM information_schema.columns
        WHERE table_schema = 'rund' AND table_name = target_table AND column_name = 'docente_id';

        IF column_type = 'text' THEN
            CONTINUE;
        ELSIF column_type IN ('uuid', 'character varying') THEN
            EXECUTE format('ALTER TABLE rund.%I ALTER COLUMN docente_id TYPE TEXT USING docente_id::text', target_table);
        ELSE
            RAISE EXCEPTION 'Tipo inesperado en rund.%.docente_id: %; no se modificaron las referencias', target_table, COALESCE(column_type, 'columna ausente');
        END IF;
    END LOOP;
END;
$$;
