-- ============================================================================
-- Diagnóstico de los bugs de QA de Programación Académica (EFDS-2427 … 2435).
-- SOLO LECTURA: todo va dentro de BEGIN READ ONLY … ROLLBACK. No escribe nada.
--
-- Cómo correrlo en QA (Henrry):
--   docker exec -i superapp-db-qa psql -U postgres -d esap_db < scripts/diagnostico-bugs-qa.sql > diag-qa.txt
-- (el nombre del contenedor puede variar; es el Postgres del ambiente QA).
-- Devolver el archivo diag-qa.txt completo a Tomás.
-- ============================================================================
\pset pager off
BEGIN READ ONLY;

\echo '=== A. Migraciones nuestras: registradas en el log y objetos que crean ==='
SELECT filename, executed_at
  FROM auth.migrations_db_log
 WHERE filename ~ '(^|/)(06[0-5]_|669_|670_|671_|672_|673_|387_|397_)'
 ORDER BY filename;

-- El log puede no reflejar lo aplicado a mano: se verifica también el objeto.
SELECT 'grupo.modalidad'              AS objeto, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='academic-schedule' AND table_name='grupo' AND column_name='modalidad') AS existe
UNION ALL SELECT 'modalidad admite distancia (065)', EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_grupo_modalidad' AND pg_get_constraintdef(oid) LIKE '%distancia%')
UNION ALL SELECT 'franja.definida_por (063)',  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='academic-schedule' AND table_name='franja_horaria' AND column_name='definida_por')
UNION ALL SELECT 'función area_de_asignatura (671)', EXISTS (SELECT 1 FROM pg_proc WHERE proname='area_de_asignatura')
UNION ALL SELECT 'tabla nucleo_equivalencia (669)', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='academic_work_plan' AND table_name='nucleo_equivalencia')
UNION ALL SELECT 'rol REVISOR_DOCENCIA_PREGRADO (064)', EXISTS (SELECT 1 FROM auth.role WHERE code='REVISOR_DOCENCIA_PREGRADO')
UNION ALL SELECT 'estado POR_ACEPTAR en concertación (061)', EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_concertacion_estado' AND pg_get_constraintdef(oid) LIKE '%POR_ACEPTAR%');

\echo '=== B. Datos que NO llegan por migración: ¿existen en QA? ==='
SELECT 'equivalencias de núcleo activas'       AS dato, COUNT(*) FROM academic_work_plan.nucleo_equivalencia WHERE activa
UNION ALL SELECT 'docentes en el banco (Docente)',      COUNT(DISTINCT "personaId") FROM academic_work_plan."Docente"
UNION ALL SELECT 'núcleos de docentes origen RUND',     COUNT(*) FROM academic_work_plan.docente_nucleo WHERE origen = 'rund'
UNION ALL SELECT 'núcleos de docentes origen PUENTE',   COUNT(*) FROM academic_work_plan.docente_nucleo WHERE origen = 'puente'
UNION ALL SELECT 'docentes con NUCLEO_TEMATICO del RUND', COUNT(DISTINCT "personaId") FROM academic_work_plan."Docente" WHERE btrim(COALESCE("nucleoTematico", '')) <> ''
UNION ALL SELECT 'asignaturas sin área',                COUNT(*) FROM academic_work_plan.asignatura a WHERE academic_work_plan.area_de_asignatura(a.id) IS NULL
UNION ALL SELECT 'aulas',                               COUNT(*) FROM "academic-schedule".aula;

\echo '--- Aulas por CETAP y el CETAP «Sede Central» de esta base (EFDS-2429 / 065)'
SELECT au.codigo_cetap, c.nombre AS cetap, COUNT(*) AS aulas
  FROM "academic-schedule".aula au LEFT JOIN academic_work_plan.cetap c ON c.codigo = au.codigo_cetap
 GROUP BY 1, 2 ORDER BY 3 DESC;
SELECT c.codigo, c.nombre, dt.codigo AS dt, dt.nombre AS territorial
  FROM academic_work_plan.cetap c LEFT JOIN academic_work_plan.direccion_territorial dt ON dt.id = c.id_direccion_territorial
 WHERE lower(btrim(c.nombre)) = 'sede central';

\echo '=== C. Periodos de la plataforma ==='
SELECT id, codigo, estado, extraordinario, fecha_inicio, fecha_fin
  FROM academic_work_plan.periodo_academico ORDER BY codigo;

\echo '=== D. EFDS-2429: ofertas CETAP del programa Diurno (PRO-001) por periodo ==='
SELECT pa.codigo AS periodo, COUNT(*) AS ofertas, string_agg(c.nombre || ' (' || c.codigo || ')', ', ' ORDER BY c.nombre) AS cetaps
  FROM academic_work_plan.oferta_cetap_programa o
  JOIN academic_work_plan.programa pr ON pr.id = o.id_programa
  JOIN academic_work_plan.cetap c ON c.id = o.id_cetap
  JOIN academic_work_plan.periodo_academico pa ON pa.id = o.id_periodo_academico
 WHERE pr.codigo = 'PRO-001' AND o.activa AND o.deleted_at IS NULL
 GROUP BY pa.codigo ORDER BY pa.codigo;
\echo '--- Ofertas por programa en cada periodo (para comparar con la MATRIZ_OFERTA)'
SELECT pa.codigo AS periodo, pr.codigo AS programa, pr.nombre, COUNT(*) AS cetaps
  FROM academic_work_plan.oferta_cetap_programa o
  JOIN academic_work_plan.programa pr ON pr.id = o.id_programa
  JOIN academic_work_plan.periodo_academico pa ON pa.id = o.id_periodo_academico
 WHERE o.activa AND o.deleted_at IS NULL
 GROUP BY 1, 2, 3 ORDER BY 1, 2;

\echo '=== E. EFDS-2434: ASIG-00003 grupo 1 y ASIG-00001 grupos 1 y 2 ==='
SELECT a.codigo, a.nombre, g.numero_grupo, g.id_grupo, g.modalidad, pa.codigo AS periodo,
       af.codigo AS area_codigo, af.nombre AS area,
       g.fecha_inicio, g.fecha_fin, c.codigo AS cetap_oferta
  FROM "academic-schedule".grupo g
  JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
  LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id = g.id_periodo_academico
  LEFT JOIN academic_work_plan.area_formacion af ON af.id = academic_work_plan.area_de_asignatura(a.id)
  LEFT JOIN academic_work_plan.oferta_cetap_programa o ON o.id = g.id_oferta_cetap
  LEFT JOIN academic_work_plan.cetap c ON c.id = o.id_cetap
 WHERE a.codigo IN ('ASIG-00001', 'ASIG-00003')
 ORDER BY a.codigo, pa.codigo, g.numero_grupo;

\echo '--- Franjas de esos grupos (día, hora, estado, docente)'
SELECT a.codigo, g.numero_grupo, f.dia_semana, f.hora_inicio, f.hora_fin, f.tipo_sesion, f.aula_codigo, f.estado,
       p.num_identificacion AS docente_doc, p.nom_largo AS docente
  FROM "academic-schedule".franja_horaria f
  JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
  JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
  LEFT JOIN auth.personas p ON p.id_person = f.id_docente
 WHERE a.codigo IN ('ASIG-00001', 'ASIG-00003')
 ORDER BY a.codigo, g.numero_grupo, f.dia_semana, f.hora_inicio;

\echo '--- Docentes del área de ASIG-00003 con los datos que deciden el bloqueo'
WITH area AS (
  SELECT academic_work_plan.area_de_asignatura(id) AS id_area FROM academic_work_plan.asignatura WHERE codigo = 'ASIG-00003'
)
SELECT p.num_identificacion AS documento, p.nom_largo AS nombre, dn.origen, dn.texto_origen,
       d."tipoVinculacion", d."situacionAdministrativa", d."situacionCategoria", d."horasAsignables",
       d."fechaInicioVinculacion", d."fechaFinVinculacion", d.escalafon
  FROM area
  JOIN academic_work_plan.docente_nucleo dn ON dn.id_area = area.id_area
  JOIN auth.personas p ON p.id_person = dn.id_persona
  LEFT JOIN LATERAL (SELECT * FROM academic_work_plan."Docente" x WHERE x."personaId" = dn.id_persona
                      ORDER BY x."updatedAt" DESC NULLS LAST LIMIT 1) d ON TRUE
 ORDER BY p.nom_largo;

\echo '--- Lo que ya tienen programado esos docentes en el periodo (para ver cruces y tope)'
WITH area AS (
  SELECT academic_work_plan.area_de_asignatura(id) AS id_area FROM academic_work_plan.asignatura WHERE codigo = 'ASIG-00003'
)
SELECT p.nom_largo AS docente, a.codigo, g.numero_grupo, f.dia_semana, f.hora_inicio, f.hora_fin, f.estado, pa.codigo AS periodo
  FROM area
  JOIN academic_work_plan.docente_nucleo dn ON dn.id_area = area.id_area
  JOIN auth.personas p ON p.id_person = dn.id_persona
  JOIN "academic-schedule".franja_horaria f ON f.id_docente = dn.id_persona
  JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
  JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
  LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id = g.id_periodo_academico
 ORDER BY p.nom_largo, f.dia_semana, f.hora_inicio;

\echo '=== F. EFDS-2435: concertaciones por estado y configuración del PTA ==='
SELECT periodo_ref, estado, COUNT(*) FROM "academic-schedule".concertacion_docencia GROUP BY 1, 2 ORDER BY 1, 2;
SELECT clave, valor, "updatedAt" FROM academic_work_plan."ConfiguracionSistema" ORDER BY clave;

ROLLBACK;

-- ----------------------------------------------------------------------------
-- Complemento para EFDS-2434 (no es SQL): el servidor ya calcula el motivo de cada
-- docente. Con un token del superusuario en QA:
--   GET /services/programacion-academica/api/v1/asignaciones/candidatos?grupo=<id_grupo de la sección E>
-- Devuelve cada docente del área con `motivos: [{ regla, mensaje }]`. Pegar la respuesta.
-- ----------------------------------------------------------------------------
