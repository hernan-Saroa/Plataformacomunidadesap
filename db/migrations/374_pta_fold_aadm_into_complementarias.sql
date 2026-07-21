-- =============================================================================
-- 374: Fusión de "Académico-Administrativas" (AADM) dentro de "Complementarias"
-- =============================================================================
-- (Corre después de la 373.)
--
-- "Académico-Administrativas" deja de ser un componente propio del PTA y pasa a ser
-- una SECCIÓN de Complementarias (sección `academico_administrativas`), al igual que
-- Extensión tiene sub-secciones. Esta migración alinea los datos existentes:
--
--   1) Datos del PTA: mueve datosEstructurados.academico_admin[] hacia
--      complementarias[] etiquetando cada ítem con `seccion`
--      ('academico_administrativas' para los de AADM; los de complementarias sin
--      seccion quedan como 'complementarias_docencia'). Elimina la clave
--      academico_admin del JSON.
--   2) Aprobación granular (PtaComponentApproval): fusiona las filas
--      componente='academicas_admin' dentro de la fila 'complementarias'
--      (merge-then-delete, respetando el UNIQUE (pta_id, componente)).
--   3) Permiso: desactiva (soft) pta.approve.academicas_admin — su aprobación queda
--      cubierta por pta.approve.complementarias (migración 362/370).
--
-- Idempotente y re-ejecutable (sin tabla de tracking).
-- =============================================================================

-- ── 1) Fusionar academico_admin dentro de complementarias con tag de sección ──
UPDATE academic_work_plan."PlanTrabajoAcademico" p
SET "datosEstructurados" =
      (p."datosEstructurados" - 'academico_admin')
      || jsonb_build_object('complementarias',
           COALESCE((
             SELECT jsonb_agg(elem || jsonb_build_object('seccion',
                      COALESCE(NULLIF(elem->>'seccion', ''), 'complementarias_docencia')))
             FROM jsonb_array_elements(COALESCE(p."datosEstructurados"->'complementarias', '[]'::jsonb)) AS elem
           ), '[]'::jsonb)
           ||
           COALESCE((
             SELECT jsonb_agg(elem || jsonb_build_object('seccion', 'academico_administrativas'))
             FROM jsonb_array_elements(COALESCE(p."datosEstructurados"->'academico_admin', '[]'::jsonb)) AS elem
           ), '[]'::jsonb)
         )
WHERE p."datosEstructurados" IS NOT NULL
  AND (
    p."datosEstructurados" ? 'academico_admin'
    OR jsonb_typeof(p."datosEstructurados"->'complementarias') = 'array'
  );

-- ── 2) Fusionar filas de aprobación academicas_admin → complementarias ──
DO $$
BEGIN
  -- 2a) Cuando ya existe fila 'complementarias' en el mismo PTA: mezclar estado
  --     (precedencia: devuelto > pendiente > aprobado) y borrar la fila AADM.
  UPDATE academic_work_plan."PtaComponentApproval" c
     SET estado = CASE
                    WHEN c.estado = 'devuelto'  OR a.estado = 'devuelto'  THEN 'devuelto'
                    WHEN c.estado = 'pendiente' OR a.estado = 'pendiente' THEN 'pendiente'
                    ELSE 'aprobado'
                  END,
         updated_at = NOW()
    FROM academic_work_plan."PtaComponentApproval" a
   WHERE a.pta_id = c.pta_id
     AND c.componente = 'complementarias'
     AND a.componente = 'academicas_admin';

  -- 2b) Filas AADM huérfanas (sin fila 'complementarias' en ese PTA): promoverlas.
  UPDATE academic_work_plan."PtaComponentApproval" a
     SET componente = 'complementarias', updated_at = NOW()
   WHERE a.componente = 'academicas_admin'
     AND NOT EXISTS (
       SELECT 1 FROM academic_work_plan."PtaComponentApproval" c
        WHERE c.pta_id = a.pta_id AND c.componente = 'complementarias'
     );

  -- 2c) Borrar las filas AADM que ya fueron mezcladas en 2a.
  DELETE FROM academic_work_plan."PtaComponentApproval"
   WHERE componente = 'academicas_admin';
END $$;

-- ── 3) Desactivar (soft) el permiso pta.approve.academicas_admin ──
UPDATE auth.role_permissions rp
   SET is_active = false
  FROM auth.permission p
 WHERE p.id_permission = rp.id_permission
   AND p.code = 'pta.approve.academicas_admin';

UPDATE auth.permission
   SET is_active = false
 WHERE code = 'pta.approve.academicas_admin';
