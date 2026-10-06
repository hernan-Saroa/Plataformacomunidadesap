-- ============================================================================
-- Migración 024 · EFDS-1740 CORRECCIÓN DINÁMICA id_module permisos + asignaciones
-- (Migración NUEVA, no rompe ni modifica 021 original).
--
-- ¡0 UUIDs HARDCODEADOS EN TODO ESTE ARCHIVO!
--
-- Problema que corrige:
--   La migración 021 original seed 27 permisos, 7 roles y 1 matriz pivot
--   usando WHERE id_module = 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2' literal.
--   Este UUID FUE ASIGNADO por la migración 002 en ESTE ambiente local.
--   Si 002 corre en un ambiente distinto → id_module CAMBIA.
--
-- Esta migración 024 ASEGURA (en CUALQUIER ambiente) que:
--   1. auth.permission.code LIKE 'infraestructura.%' → todos apuntan a
--      id_module = (SELECT id_module FROM auth.module WHERE code='gestion-infraestructura').
--      Corrige si estaban ligados a otro UUID, o a NULL.
--   2. Matriz pivot auth.role_permissions está correctamente asignada
--      a los 7 roles P1-P7 + legacy equivalentes + SUPER_ADMIN (*).
--   3. TODO idempotente ON CONFLICT DO NOTHING / UPDATE solo si hay diferencia.
-- ============================================================================
BEGIN;
SET LOCAL search_path TO auth, public;

DO $$
DECLARE
  v_mod_id UUID;
BEGIN
  -- ====== (1) RESOLVER v_mod_id DINÁMICAMENTE (NO LITERAL) ======
  SELECT id_module INTO STRICT v_mod_id
  FROM auth.module
  WHERE code = 'gestion-infraestructura';

  -- ====== (2) CORREGIR permisos 'infraestructura.*' al id_module REAL del ambiente ======
  UPDATE auth.permission
     SET id_module  = v_mod_id,
         is_active  = true,
         updated_at = now()
  WHERE code LIKE 'infraestructura.%'
    AND (id_module IS DISTINCT FROM v_mod_id OR is_active IS NOT TRUE);

  -- ====== (3) RE-ASEGURAR matriz pivot 7 roles P1-P7 + legacy + SUPER_ADMIN (*) ======
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
  WITH
    p AS (SELECT code, id_permission FROM auth.permission WHERE id_module = v_mod_id AND code LIKE 'infraestructura.%'),
    r AS (SELECT code, id FROM auth.role WHERE code IN (
      'SOLICITANTE_INFRA','ANALISTA_ASIGNADOR_UMI','TECNICO_ELECTRICO_ESPECIALIZADO',
      'TECNICO_UMI_MULTIPROPOSITO','ADMINISTRADOR_FUNCIONAL_INFRA','ADMINISTRADOR_MODULO_INFRA',
      'CONSULTA_CALIDAD_INFRA','SUPER_ADMIN','ADMIN','USER','GESTOR_MANTENIMIENTO','ADMINISTRADOR_FUNCIONAL','UMI','INFRAESTRUCTURA','COORDINADOR_INFRAESTRUCTURA','TECNICO_UMI'
    )),
    p1_perms(c_perm) AS (VALUES
      ('infraestructura.view'),('infraestructura.solicitud.create'),('infraestructura.solicitud.read_own'),
      ('infraestructura.solicitud.read_rejection_reason_own'),('infraestructura.solicitud.confirm_close_own'),('infraestructura.solicitud.rate_close_own')),
    p2_perms(c_perm) AS (VALUES
      ('infraestructura.view'),('infraestructura.solicitud.read_all'),('infraestructura.solicitud.assign'),
      ('infraestructura.solicitud.reject'),('infraestructura.solicitud.redistribute'),('infraestructura.solicitud.forward_ti'),
      ('infraestructura.solicitud.read_assigned'),('infraestructura.solicitud.read_ti'),('infraestructura.solicitud.read_audit_history_any'),
      ('infraestructura.estadisticas.calificaciones.consolidadas'),('infraestructura.reportes.gestion')),
    p3_perms(c_perm) AS (VALUES
      ('infraestructura.view'),('infraestructura.solicitud.create'),('infraestructura.solicitud.read_own'),
      ('infraestructura.solicitud.read_assigned'),('infraestructura.solicitud.execute_assigned'),
      ('infraestructura.solicitud.close_with_evidence'),('infraestructura.solicitud.read_rejection_reason_own')),
    p4_perms(c_perm) AS (SELECT c_perm FROM p3_perms),
    p5_perms(c_perm) AS (VALUES
      ('infraestructura.view'),('infraestructura.solicitud.read_all'),('infraestructura.solicitud.read_ti'),
      ('infraestructura.solicitud.read_audit_history_any'),('infraestructura.solicitud.ti_tracing_full'),
      ('infraestructura.solicitud.authorize_special_categories'),('infraestructura.param.approve_config'),
      ('infraestructura.estadisticas.calificaciones.consolidadas'),('infraestructura.reportes.gestion'),('infraestructura.reporting.export_excel')),
    p6_perms(c_perm) AS (VALUES
      ('infraestructura.view'),('infraestructura.solicitud.read_all'),('infraestructura.solicitud.read_ti'),
      ('infraestructura.param.categories_crud'),('infraestructura.param.rules_edit'),('infraestructura.param.sla_times_edit'),
      ('infraestructura.param.technicians_crud'),('infraestructura.param.territorial_crud')),
    p7_perms(c_perm) AS (VALUES
      ('infraestructura.view'),('infraestructura.solicitud.read_all'),('infraestructura.solicitud.read_ti'),
      ('infraestructura.solicitud.read_audit_history_any'),('infraestructura.solicitud.ti_tracing_full'),
      ('infraestructura.estadisticas.calificaciones.consolidadas'),('infraestructura.reportes.gestion'),('infraestructura.reporting.export_excel'))
  SELECT r.id, p.id_permission, true, now(), now()
  FROM r CROSS JOIN p
  JOIN (
    SELECT 'SOLICITANTE_INFRA' AS rol, c_perm FROM p1_perms UNION ALL
    SELECT 'ANALISTA_ASIGNADOR_UMI' AS rol, c_perm FROM p2_perms UNION ALL
    SELECT 'TECNICO_ELECTRICO_ESPECIALIZADO' AS rol, c_perm FROM p3_perms UNION ALL
    SELECT 'TECNICO_UMI_MULTIPROPOSITO' AS rol, c_perm FROM p4_perms UNION ALL
    SELECT 'ADMINISTRADOR_FUNCIONAL_INFRA' AS rol, c_perm FROM p5_perms UNION ALL
    SELECT 'ADMINISTRADOR_MODULO_INFRA' AS rol, c_perm FROM p6_perms UNION ALL
    SELECT 'CONSULTA_CALIDAD_INFRA' AS rol, c_perm FROM p7_perms UNION ALL
    -- Equivalencias LEGACY (OQ-2)
    SELECT 'ADMIN' AS rol, c_perm FROM p2_perms UNION ALL
    SELECT 'GESTOR_MANTENIMIENTO' AS rol, c_perm FROM p2_perms UNION ALL
    SELECT 'ADMINISTRADOR_FUNCIONAL' AS rol, c_perm FROM p5_perms UNION ALL
    SELECT 'UMI' AS rol, c_perm FROM p2_perms UNION ALL
    SELECT 'INFRAESTRUCTURA' AS rol, c_perm FROM p2_perms UNION ALL
    SELECT 'COORDINADOR_INFRAESTRUCTURA' AS rol, c_perm FROM p5_perms UNION ALL
    SELECT 'TECNICO_UMI' AS rol, c_perm FROM p4_perms UNION ALL
    SELECT 'USER' AS rol, c_perm FROM p1_perms
  ) matrix ON matrix.rol = r.code AND matrix.c_perm = p.code
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  -- ====== (4) SUPER_ADMIN recibe TODOS los permisos infra del módulo ======
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
  SELECT r.id, p.id_permission, true, now(), now()
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code = 'SUPER_ADMIN' AND p.id_module = v_mod_id
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

  RAISE NOTICE 'EFDS-1740 migración 024 aplicada. id_module resuelto dinámicamente: %', v_mod_id;
END $$;

COMMIT;


-- ---------------------------------------------------------------------------
-- Sanity check: reporte conteo permisos + asignaciones por rol P1-P7/SUPER_ADMIN
-- ---------------------------------------------------------------------------
WITH
  mod          AS (SELECT id_module FROM auth.module WHERE code = 'gestion-infraestructura' LIMIT 1),
  total_mod    AS (SELECT COALESCE(COUNT(*),0)::bigint AS n
                   FROM auth.permission p CROSS JOIN mod
                   WHERE p.id_module = mod.id_module),
  roles_target AS (SELECT code, id, name
                   FROM auth.role
                   WHERE code IN (
                     'SOLICITANTE_INFRA','ANALISTA_ASIGNADOR_UMI','TECNICO_ELECTRICO_ESPECIALIZADO',
                     'TECNICO_UMI_MULTIPROPOSITO','ADMINISTRADOR_FUNCIONAL_INFRA','ADMINISTRADOR_MODULO_INFRA',
                     'CONSULTA_CALIDAD_INFRA','SUPER_ADMIN'
                   )),
  perms_mod AS (SELECT p.id_permission FROM auth.permission p CROSS JOIN mod WHERE p.id_module = mod.id_module)
SELECT
  rt.code                                                                AS rol_code,
  rt.name                                                                AS rol_name,
  COUNT(DISTINCT rp.id_permission)
    FILTER (WHERE rp.id_permission IN (SELECT id_permission FROM perms_mod))
                                                                         AS total_asignados_infra,
  (SELECT n FROM total_mod)                                              AS total_en_modulo
FROM roles_target rt
LEFT JOIN auth.role_permissions rp ON rp.id_rol = rt.id
GROUP BY 1,2
ORDER BY
  CASE rt.code
    WHEN 'SOLICITANTE_INFRA'               THEN 1
    WHEN 'ANALISTA_ASIGNADOR_UMI'          THEN 2
    WHEN 'TECNICO_ELECTRICO_ESPECIALIZADO' THEN 3
    WHEN 'TECNICO_UMI_MULTIPROPOSITO'      THEN 4
    WHEN 'ADMINISTRADOR_FUNCIONAL_INFRA'   THEN 5
    WHEN 'ADMINISTRADOR_MODULO_INFRA'      THEN 6
    WHEN 'CONSULTA_CALIDAD_INFRA'          THEN 7
    WHEN 'SUPER_ADMIN'                     THEN 99
  END;
