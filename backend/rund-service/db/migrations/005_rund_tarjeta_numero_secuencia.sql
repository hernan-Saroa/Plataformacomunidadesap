-- Numeracion del CRUD base rund.docente; conserva todas las tarjetas emitidas.
-- Secuencia independiente del idRund del banco (rund.docente_id_rund_seq).
DO $$
DECLARE
    maximum_issued NUMERIC;
    sequence_value BIGINT;
    sequence_called BOOLEAN;
    current_next NUMERIC;
    desired_next NUMERIC;
BEGIN
    -- Evitar nuevas tarjetas/cambios mientras se calcula el punto inicial.
    LOCK TABLE rund.docente IN SHARE ROW EXCLUSIVE MODE;

    CREATE SEQUENCE IF NOT EXISTS rund.numero_tarjeta_rund_seq
        AS BIGINT INCREMENT BY 1 MINVALUE 1 NO MAXVALUE START WITH 1 CACHE 1 NO CYCLE;

    -- ALTER toma el lock de la secuencia hasta terminar el bloque, antes de leerla.
    ALTER SEQUENCE rund.numero_tarjeta_rund_seq NO CYCLE;
    IF EXISTS (
        SELECT 1 FROM pg_sequence
        WHERE seqrelid = 'rund.numero_tarjeta_rund_seq'::regclass
          AND (seqtypid <> 'bigint'::regtype OR seqincrement <> 1 OR seqmin <> 1
               OR seqmax <> 9223372036854775807 OR seqcache <> 1)
    ) THEN
        RAISE EXCEPTION 'Configuracion inesperada de rund.numero_tarjeta_rund_seq';
    END IF;

    -- NUMERIC evita overflow al examinar numeros historicos antes de validarlos.
    SELECT COALESCE(MAX((parts[1])::NUMERIC), 0) INTO maximum_issued
    FROM (
        SELECT regexp_match(numero_tarjeta_rund, '^RUND-[0-9]{4}-([0-9]+)$') AS parts
        FROM rund.docente
    ) issued
    WHERE parts IS NOT NULL;

    SELECT last_value, is_called INTO sequence_value, sequence_called
    FROM rund.numero_tarjeta_rund_seq;
    current_next := sequence_value::NUMERIC + CASE WHEN sequence_called THEN 1 ELSE 0 END;
    desired_next := GREATEST(maximum_issued + 1, current_next);

    IF desired_next > 9223372036854775807 THEN
        RAISE EXCEPTION 'No hay correlativos BIGINT disponibles; revisar tarjetas y secuencia sin renumerar registros';
    END IF;

    -- Nunca retroceder, incluso si se reservaron valores que no llegaron a guardarse.
    -- RESTART es transaccional; setval no permitiria revertir un fallo del bloque.
    IF desired_next > current_next THEN
        EXECUTE format('ALTER SEQUENCE rund.numero_tarjeta_rund_seq RESTART WITH %s', desired_next::BIGINT);
    END IF;
    ALTER SEQUENCE rund.numero_tarjeta_rund_seq OWNED BY rund.docente.numero_tarjeta_rund;
END;
$$;
