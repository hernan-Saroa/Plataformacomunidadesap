-- Operacion manual opcional: copy_rund_data_from_pta
-- Fuera de db/migrations: no debe ejecutarse ni registrarse automaticamente en el deploy.
-- Requiere revisar origen, destino, archivos originales, recuperacion y resultados por tabla.
-- Description: Copia los datos del RUND que vivian en academic_work_plan al esquema rund
--              (mismas 16 tablas, mismos nombres y columnas que crea la migracion 003).
--
-- * Idempotente: ON CONFLICT DO NOTHING; se puede volver a ejecutar para traer registros nuevos.
-- * No borra ni modifica nada en academic_work_plan (el RUND de PTA se conserva como respaldo).
-- * Cada tabla se copia en su propio bloque: si una falla, se avisa (WARNING) y las demas continuan.
-- * Si el origen no existe (entorno nuevo sin PTA) la tabla se omite.
-- * Las columnas se copian por nombre y se castean al tipo de la tabla destino.
-- * No se ejecuta por resolver el merge. Su uso requiere una decision operativa explicita.
-- * Los WARNING existentes permiten resultados parciales: revisar cada tabla y los conteos.

DO $$
DECLARE
  -- Orden: Docente primero; el resto referencia docentes.
  v_tabla   text;
  v_tablas  text[] := ARRAY[
    'Docente', 'validacion_documental', 'RundCampoEstado', 'RundSoporteCampo',
    'BancoDocentesInvitaciones', 'RundAprobacionLog', 'RundInvitacionDocente',
    'RundAccesoExterno', 'RundMacroDocenteConsultaLog', 'RundDocumentoCategoria',
    'RundDocumentoPerfil', 'RundCargaMasiva', 'RundAccesoDatosLog',
    'RundExtraccionInicio', 'RundExtraccionTrabajo', 'RundExtraccionSugerencia'
  ];
  v_cols    text;
  v_sel     text;
  v_filas   bigint;
BEGIN
  FOREACH v_tabla IN ARRAY v_tablas LOOP
    BEGIN
      IF to_regclass(format('academic_work_plan.%I', v_tabla)) IS NULL THEN
        RAISE NOTICE '[004] % omitida: no existe en academic_work_plan', v_tabla;
        CONTINUE;
      END IF;
      IF to_regclass(format('rund.%I', v_tabla)) IS NULL THEN
        RAISE WARNING '[004] % omitida: falta en rund (aplicar antes la migracion 003)', v_tabla;
        CONTINUE;
      END IF;

      SELECT string_agg(format('%I', d.column_name), ', ' ORDER BY d.ordinal_position),
             string_agg(format('s.%I::text::%s', d.column_name,
                               format_type(a.atttypid, a.atttypmod)), ', ' ORDER BY d.ordinal_position)
        INTO v_cols, v_sel
        FROM information_schema.columns d
        JOIN information_schema.columns o
          ON o.table_schema = 'academic_work_plan' AND o.table_name = d.table_name
         AND o.column_name = d.column_name
        JOIN pg_attribute a
          ON a.attrelid = format('rund.%I', v_tabla)::regclass
         AND a.attname = d.column_name AND NOT a.attisdropped
       WHERE d.table_schema = 'rund' AND d.table_name = v_tabla
         AND d.is_generated = 'NEVER';

      EXECUTE format(
        'INSERT INTO rund.%I (%s) SELECT %s FROM academic_work_plan.%I s ON CONFLICT DO NOTHING',
        v_tabla, v_cols, v_sel, v_tabla);
      GET DIAGNOSTICS v_filas = ROW_COUNT;
      RAISE NOTICE '[004] % : % filas nuevas copiadas', v_tabla, v_filas;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[004] % fallo y se omitio: % (%)', v_tabla, SQLERRM, SQLSTATE;
    END;
  END LOOP;
END $$;

-- La secuencia del numero RUND debe quedar por encima de lo ya asignado (en ambos esquemas).
DO $$
DECLARE
  v_max bigint;
BEGIN
  IF to_regclass('rund.docente_id_rund_seq') IS NULL THEN
    RETURN;
  END IF;
  -- "idRund" es texto con formato RUND-0003: se toma su parte numerica.
  SELECT GREATEST(
           COALESCE((SELECT max(NULLIF(regexp_replace("idRund", '\D', '', 'g'), '')::bigint) FROM rund."Docente"), 0),
           (SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM rund.docente_id_rund_seq),
           CASE WHEN to_regclass('academic_work_plan.docente_id_rund_seq') IS NOT NULL
                THEN (SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM academic_work_plan.docente_id_rund_seq)
                ELSE 0 END
         ) INTO v_max;
  IF v_max > 0 THEN
    PERFORM setval('rund.docente_id_rund_seq', v_max, true);
  END IF;
  RAISE NOTICE '[004] rund.docente_id_rund_seq ajustada a %', v_max;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[004] no se pudo ajustar docente_id_rund_seq: % (%)', SQLERRM, SQLSTATE;
END $$;

-- Conteos origen vs destino, para verificar el corte.
DO $$
DECLARE
  v_tabla text;
  v_o bigint;
  v_d bigint;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY[
    'Docente', 'validacion_documental', 'RundCampoEstado', 'RundSoporteCampo',
    'BancoDocentesInvitaciones', 'RundAprobacionLog', 'RundInvitacionDocente',
    'RundAccesoExterno', 'RundMacroDocenteConsultaLog', 'RundDocumentoCategoria',
    'RundDocumentoPerfil', 'RundCargaMasiva', 'RundAccesoDatosLog',
    'RundExtraccionInicio', 'RundExtraccionTrabajo', 'RundExtraccionSugerencia'
  ] LOOP
    IF to_regclass(format('academic_work_plan.%I', v_tabla)) IS NOT NULL
       AND to_regclass(format('rund.%I', v_tabla)) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM academic_work_plan.%I', v_tabla) INTO v_o;
      EXECUTE format('SELECT count(*) FROM rund.%I', v_tabla) INTO v_d;
      RAISE NOTICE '[004] conteo % : origen=% destino=%', v_tabla, v_o, v_d;
    END IF;
  END LOOP;
END $$;
