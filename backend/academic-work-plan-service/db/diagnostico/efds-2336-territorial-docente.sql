-- ============================================================================
-- EFDS-2336 · Diagnóstico de la territorial de un docente en el PTA. SOLO LECTURA.
--
-- NO es una migración (vive en db/diagnostico/: db-migrate no la corre).
-- Uso, en el servidor de cada ambiente (PRE y QA):
--
--   docker cp backend/academic-work-plan-service/db/diagnostico/efds-2336-territorial-docente.sql superapp-db-<amb>:/tmp/
--   docker exec superapp-db-<amb> psql -U postgres -d esap_db -v cedula=<CEDULA> -f /tmp/efds-2336-territorial-docente.sql
--
-- Todo corre en BEGIN READ ONLY … ROLLBACK. No muestra nombres de personas: solo la
-- cédula de entrada, identificadores, estados, roles y nombres de TERRITORIALES.
--
-- Para cada identificador muestra a qué resuelve en CADA catálogo:
--   · auth.seccionales            (el que usa el PTA; trae mezcladas las filas heredadas
--                                  —código CAU, TOL…— y las de Estructura Organizacional —DT-xxx—)
--   · auth.dependencias           (la territorial del RUND puede llegar como id de dependencia)
--   · academic_work_plan.direccion_territorial (catálogo de los CETAP, código DT-xxx)
-- Si un mismo id resuelve en dos catálogos con nombres distintos, la pantalla puede
-- mostrar un nombre válido pero equivocado: eso es dato, no pantalla.
-- ============================================================================
\set ON_ERROR_STOP on
\pset null '—'
BEGIN READ ONLY;

\echo '== 1. Territorial del docente (RUND y persona)'
WITH catalogos AS (
  SELECT 'seccionales' AS catalogo, s.id_seccional::text AS id, s.cod_seccional::text AS codigo, s.nom_seccional::text AS nombre FROM auth.seccionales s
  UNION ALL SELECT 'dependencias', x.id_dependencia::text, x.cod_dependencia::text, x.nom_dependencia::text FROM auth.dependencias x
  UNION ALL SELECT 'direccion_territorial', t.id::text, t.codigo::text, t.nombre::text FROM academic_work_plan.direccion_territorial t
), doc AS (
  SELECT d.id AS docente_id, d."territorialId" AS territorial_rund, p.id_seccional::text AS seccional_persona
    FROM academic_work_plan."Docente" d
    JOIN auth.personas p ON p.id_person::text = d."personaId"::text
   WHERE regexp_replace(p.num_identificacion, '[^0-9A-Za-z]', '', 'g') = :'cedula'
)
SELECT :'cedula' AS cedula, doc.docente_id,
       doc.territorial_rund AS "territorialId (RUND)",
       (SELECT string_agg(c.catalogo || ' → ' || c.nombre || ' [' || coalesce(c.codigo, '') || ']', ' | ' ORDER BY c.catalogo)
          FROM catalogos c WHERE c.id = doc.territorial_rund) AS "resuelve (por id) en",
       doc.seccional_persona AS "id_seccional (persona)",
       (SELECT string_agg(c.catalogo || ' → ' || c.nombre, ' | ' ORDER BY c.catalogo)
          FROM catalogos c WHERE c.catalogo = 'seccionales' AND c.id = doc.seccional_persona) AS "persona resuelve en"
  FROM doc;

\echo '== 2. PTA del docente'
SELECT pta.id AS pta_id, pta.periodo, pta.estado
  FROM academic_work_plan."PlanTrabajoAcademico" pta
  JOIN academic_work_plan."Docente" d ON d.id::text = pta."docenteId"::text
  JOIN auth.personas p ON p.id_person::text = d."personaId"::text
 WHERE regexp_replace(p.num_identificacion, '[^0-9A-Za-z]', '', 'g') = :'cedula'
 ORDER BY pta.periodo DESC;

\echo '== 3. Decisiones por componente (lo que muestran las tarjetas): alcance guardado y a qué resuelve'
WITH catalogos AS (
  SELECT 'seccionales' AS catalogo, s.id_seccional::text AS id, s.cod_seccional::text AS codigo, s.nom_seccional::text AS nombre FROM auth.seccionales s
  UNION ALL SELECT 'dependencias', x.id_dependencia::text, x.cod_dependencia::text, x.nom_dependencia::text FROM auth.dependencias x
  UNION ALL SELECT 'direccion_territorial', t.id::text, t.codigo::text, t.nombre::text FROM academic_work_plan.direccion_territorial t
), ptas AS (
  SELECT pta.id::text AS pta_id, pta.periodo
    FROM academic_work_plan."PlanTrabajoAcademico" pta
    JOIN academic_work_plan."Docente" d ON d.id::text = pta."docenteId"::text
    JOIN auth.personas p ON p.id_person::text = d."personaId"::text
   WHERE regexp_replace(p.num_identificacion, '[^0-9A-Za-z]', '', 'g') = :'cedula'
)
SELECT ptas.periodo, a.componente, a.estado, a.scope, a.scope_id,
       (SELECT string_agg(c.catalogo || ' → ' || c.nombre, ' | ' ORDER BY c.catalogo)
          FROM catalogos c WHERE c.id = a.scope_id OR lower(c.codigo) = lower(a.scope_id)) AS "scope_id resuelve en",
       a.aprobador_rol, a.fecha_aprobacion
  FROM academic_work_plan."PtaComponentApproval" a
  JOIN ptas ON ptas.pta_id = a.pta_id::text
 ORDER BY ptas.periodo DESC, a.componente;

\echo '== 4. Decisiones por par (territorial de la docencia, nivel): la territorial que se aprobó'
WITH catalogos AS (
  SELECT 'seccionales' AS catalogo, s.id_seccional::text AS id, s.cod_seccional::text AS codigo, s.nom_seccional::text AS nombre FROM auth.seccionales s
  UNION ALL SELECT 'dependencias', x.id_dependencia::text, x.cod_dependencia::text, x.nom_dependencia::text FROM auth.dependencias x
  UNION ALL SELECT 'direccion_territorial', t.id::text, t.codigo::text, t.nombre::text FROM academic_work_plan.direccion_territorial t
), ptas AS (
  SELECT pta.id::text AS pta_id, pta.periodo
    FROM academic_work_plan."PlanTrabajoAcademico" pta
    JOIN academic_work_plan."Docente" d ON d.id::text = pta."docenteId"::text
    JOIN auth.personas p ON p.id_person::text = d."personaId"::text
   WHERE regexp_replace(p.num_identificacion, '[^0-9A-Za-z]', '', 'g') = :'cedula'
)
SELECT ptas.periodo, t.componente, t.territorial_id, t.territorial_nombre AS "nombre guardado en la fila",
       (SELECT string_agg(c.catalogo || ' → ' || c.nombre, ' | ' ORDER BY c.catalogo)
          FROM catalogos c WHERE c.id = t.territorial_id) AS "resuelve (por id) en",
       t.nivel, t.estado, t.actor_rol
  FROM academic_work_plan."PtaTerritorialApproval" t
  JOIN ptas ON ptas.pta_id = t.pta_id::text
 ORDER BY ptas.periodo DESC, t.componente, t.territorial_id, t.nivel;

\echo '== 5. Territorial de cada asignatura de su docencia (la guardada y la de su oferta CETAP)'
WITH catalogos AS (
  SELECT 'seccionales' AS catalogo, s.id_seccional::text AS id, s.cod_seccional::text AS codigo, s.nom_seccional::text AS nombre FROM auth.seccionales s
  UNION ALL SELECT 'dependencias', x.id_dependencia::text, x.cod_dependencia::text, x.nom_dependencia::text FROM auth.dependencias x
  UNION ALL SELECT 'direccion_territorial', t.id::text, t.codigo::text, t.nombre::text FROM academic_work_plan.direccion_territorial t
), ptas AS (
  SELECT pta.periodo, pta."datosEstructurados" AS datos
    FROM academic_work_plan."PlanTrabajoAcademico" pta
    JOIN academic_work_plan."Docente" d ON d.id::text = pta."docenteId"::text
    JOIN auth.personas p ON p.id_person::text = d."personaId"::text
   WHERE regexp_replace(p.num_identificacion, '[^0-9A-Za-z]', '', 'g') = :'cedula'
), asig AS (
  SELECT ptas.periodo, a
    FROM ptas, jsonb_array_elements(CASE WHEN jsonb_typeof(ptas.datos->'asignaturas') = 'array' THEN ptas.datos->'asignaturas' ELSE '[]'::jsonb END) a
)
SELECT asig.periodo, asig.a->>'nombre' AS asignatura, asig.a->>'componente_docencia' AS componente,
       asig.a->>'territorial_id' AS territorial_id,
       (SELECT string_agg(c.catalogo || ' → ' || c.nombre, ' | ' ORDER BY c.catalogo)
          FROM catalogos c WHERE c.id = asig.a->>'territorial_id') AS "territorial_id resuelve en",
       asig.a->>'cetap_id' AS cetap_id,
       (SELECT dt.nombre || ' [' || dt.codigo || ']' FROM academic_work_plan.cetap ce
          JOIN academic_work_plan.direccion_territorial dt ON dt.id = ce.id_direccion_territorial
         WHERE ce.id::text = asig.a->>'cetap_id') AS "territorial de su CETAP",
       (SELECT s.nom_seccional || ' (id ' || s.id_seccional || ')' FROM academic_work_plan.cetap ce
          JOIN academic_work_plan.direccion_territorial dt ON dt.id = ce.id_direccion_territorial
          JOIN auth.seccionales s ON s.cod_seccional = dt.codigo
         WHERE ce.id::text = asig.a->>'cetap_id') AS "seccional DT de su CETAP"
  FROM asig
 ORDER BY asig.periodo DESC, 2;

\echo '== 6. Ambiente: ids que existen a la vez en dos catálogos (mismo número, dos significados)'
SELECT 'seccionales ∩ dependencias' AS cruce, count(*) AS ids
  FROM auth.seccionales s JOIN auth.dependencias x ON x.id_dependencia::text = s.id_seccional::text
UNION ALL
SELECT 'seccionales ∩ direccion_territorial', count(*)
  FROM auth.seccionales s JOIN academic_work_plan.direccion_territorial t ON t.id::text = s.id_seccional::text
UNION ALL
SELECT 'docentes cuya territorial (RUND) no está en seccionales', count(*)
  FROM academic_work_plan."Docente" d
 WHERE d."territorialId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM auth.seccionales s WHERE s.id_seccional::text = d."territorialId")
UNION ALL
SELECT 'docentes cuya territorial (RUND) existe en seccionales Y en dependencias', count(*)
  FROM academic_work_plan."Docente" d
 WHERE EXISTS (SELECT 1 FROM auth.seccionales s WHERE s.id_seccional::text = d."territorialId")
   AND EXISTS (SELECT 1 FROM auth.dependencias x WHERE x.id_dependencia::text = d."territorialId");

ROLLBACK;
