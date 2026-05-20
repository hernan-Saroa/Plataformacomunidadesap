-- Script destructivo para reconstruir academic_work_plan."Docente" desde auth.
--
-- Que hace:
-- 1. Borra todos los registros de academic_work_plan."Docente" con CASCADE.
-- 2. Busca usuarios con rol DOCENTE en auth."user"/auth.user_roles/auth.role.
-- 3. Crea un registro academic_work_plan."Docente" por cada auth.personas asociada.
--
-- Importante:
-- TRUNCATE ... CASCADE elimina tambien los registros dependientes por llaves
-- foraneas, por ejemplo PTA, solicitudes y evidencias asociadas al docente.
-- Ejecutar manualmente solo despues de validar backup y ventana operativa.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.role r
    WHERE UPPER(COALESCE(r.code, '')) = 'DOCENTE'
       OR UPPER(COALESCE(r.name, '')) = 'DOCENTE'
  ) THEN
    RAISE EXCEPTION 'No existe el rol DOCENTE en auth.role';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.seccionales
  ) THEN
    RAISE EXCEPTION 'No existen registros en auth.seccionales para asignar territorialId';
  END IF;
END
$$;

TRUNCATE TABLE academic_work_plan."Docente" CASCADE;

WITH default_territorial AS (
  SELECT s.id_seccional::text AS id
  FROM auth.seccionales s
  ORDER BY s.nom_seccional NULLS LAST, s.cod_seccional NULLS LAST, s.id_seccional
  LIMIT 1
),
docentes_base AS (
  SELECT DISTINCT ON (p.id_person)
    p.id_person,
    COALESCE(p.id_seccional::text, sede.id_seccional::text, dt.id) AS territorial_id,
    sede.id_sede::text AS sede_id,
    COALESCE(NULLIF(BTRIM(p.dir_email), ''), NULLIF(BTRIM(u.username), '')) AS correo_institucional,
    CASE
      WHEN COALESCE(u.is_active, false) THEN 'ACTIVO'
      ELSE 'INACTIVO'
    END AS estado,
    COALESCE(NULLIF(BTRIM(p.nom_largo), ''), NULLIF(BTRIM(u.username), ''), p.id_person::text) AS nombre_orden
  FROM auth."user" u
  JOIN auth.personas p
    ON p.id_person = u.id_person
  LEFT JOIN auth.sedes sede
    ON sede.id_sede = p.id_sede
  JOIN auth.user_roles ur
    ON ur.id_user = u.id_user
   AND COALESCE(ur.is_active, true)
  JOIN auth.role r
    ON r.id = ur.id_rol
   AND COALESCE(r.is_active, true)
  CROSS JOIN default_territorial dt
  WHERE UPPER(COALESCE(r.code, '')) = 'DOCENTE'
     OR UPPER(COALESCE(r.name, '')) = 'DOCENTE'
  ORDER BY
    p.id_person,
    COALESCE(NULLIF(BTRIM(p.nom_largo), ''), NULLIF(BTRIM(u.username), ''), p.id_person::text)
),
docentes_auth AS (
  SELECT
    db.id_person,
    db.territorial_id,
    db.sede_id,
    db.correo_institucional,
    db.estado,
    ROW_NUMBER() OVER (ORDER BY db.nombre_orden, db.id_person) AS orden_listado
  FROM docentes_base db
),
inserted AS (
  INSERT INTO academic_work_plan."Docente" (
    id,
    "personaId",
    "territorialId",
    "sedeId",
    "tipoVinculacion",
    dedicacion,
    estado,
    "horasAsignables",
    "ordenListado",
    "correoInstitucional",
    "createdAt",
    "updatedAt"
  )
  SELECT
    gen_random_uuid()::text,
    da.id_person,
    da.territorial_id,
    da.sede_id,
    'OCASIONAL',
    'TC',
    da.estado,
    800,
    da.orden_listado,
    da.correo_institucional,
    NOW(),
    NOW()
  FROM docentes_auth da
  RETURNING id
)
SELECT
  COUNT(*) AS docentes_recreados_desde_auth
FROM inserted;

COMMIT;
