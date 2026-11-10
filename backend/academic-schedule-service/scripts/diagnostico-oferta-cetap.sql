-- Diagnóstico (SOLO LECTURA): ¿por qué no salen CETAP al crear grupos de una asignatura?
--
-- El selector «Oferta CETAP» lista las ofertas (CETAP × programa × periodo) del programa de la
-- asignatura en el periodo seleccionado. Esas ofertas NO vienen del RUND: las crea la carga del
-- Excel del catálogo PARA ESE PERIODO (Programas Académicos → Periodos → Importar). El catálogo
-- de CETAP y territoriales lo cargan la estructura organizacional o la propia carga del Excel.
--
-- Uso (psql, en la base de QA):   psql "$DATABASE_URL" -f diagnostico-oferta-cetap.sql
-- No modifica datos: la transacción es de solo lectura.

BEGIN READ ONLY;

\echo '== 1) Catálogo de CETAP y territoriales'
SELECT (SELECT count(*) FROM academic_work_plan.cetap)                                   AS cetap,
       (SELECT count(*) FROM academic_work_plan.cetap WHERE id_direccion_territorial IS NULL) AS cetap_sin_territorial,
       (SELECT count(*) FROM academic_work_plan.direccion_territorial)                    AS direcciones_territoriales,
       (SELECT count(*) FROM auth.seccionales)                                            AS seccionales_auth;

\echo '== 2) Territoriales sin seccional que las vincule (el grupo no se podría concertar): cod_seccional = codigo'
SELECT dt.codigo, dt.nombre
  FROM academic_work_plan.direccion_territorial dt
 WHERE (SELECT count(*) FROM auth.seccionales sc WHERE sc.cod_seccional = dt.codigo) <> 1
 ORDER BY dt.codigo;

\echo '== 3) Ofertas por periodo (0 = el periodo no tiene la carga del Excel: nada que elegir)'
SELECT pa.codigo AS periodo, pa.estado, pa.tipo,
       count(o.id) FILTER (WHERE o.activa AND o.deleted_at IS NULL)                      AS ofertas_activas,
       count(DISTINCT o.id_programa) FILTER (WHERE o.activa AND o.deleted_at IS NULL)    AS programas_ofertados,
       count(DISTINCT o.id_cetap) FILTER (WHERE o.activa AND o.deleted_at IS NULL)       AS cetap_ofertados
  FROM academic_work_plan.periodo_academico pa
  LEFT JOIN academic_work_plan.oferta_cetap_programa o ON o.id_periodo_academico = pa.id
 GROUP BY pa.id
 ORDER BY pa.fecha_inicio DESC;

\echo '== 4) Programas SIN ninguna oferta en periodos que sí tienen carga (el programa no se ofrece ahí)'
SELECT pa.codigo AS periodo, pr.codigo AS programa, pr.nombre
  FROM academic_work_plan.periodo_academico pa
  CROSS JOIN academic_work_plan.programa pr
 WHERE EXISTS (SELECT 1 FROM academic_work_plan.oferta_cetap_programa o
                WHERE o.id_periodo_academico = pa.id AND o.activa AND o.deleted_at IS NULL)
   AND NOT EXISTS (SELECT 1 FROM academic_work_plan.oferta_cetap_programa o
                    WHERE o.id_periodo_academico = pa.id AND o.id_programa = pr.id AND o.activa AND o.deleted_at IS NULL)
 ORDER BY pa.codigo, pr.codigo;

\echo '== 5) Grupos sin oferta CETAP (no se pueden concertar hasta ubicarlos)'
SELECT COALESCE(pa.codigo, 'legado') AS periodo, count(*) AS grupos_sin_oferta
  FROM "academic-schedule".grupo g
  LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id = g.id_periodo_academico
 WHERE g.id_oferta_cetap IS NULL
 GROUP BY 1 ORDER BY 1;

ROLLBACK;
