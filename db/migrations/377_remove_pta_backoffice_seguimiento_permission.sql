-- =============================================================================
-- 377: Elimina el permiso pta.backoffice.seguimiento
-- =============================================================================
-- En el modelo POR COMPONENTE, la revisión (ver + aprobar/rechazar) de las
-- evidencias de seguimiento ya NO se habilita con un permiso de vista único
-- (pta.backoffice.seguimiento), sino con los 7 permisos de aprobación
-- (pta.approve.<componente>): cada aprobador ve y resuelve las evidencias de su
-- propio componente/sección. Por eso este permiso queda obsoleto y se elimina.
--
-- Se conserva `pta.backoffice.reporte_seguimiento`, que sigue habilitando la vista
-- de reporte (ReporteSeguimientoPTA), independiente de la revisión de evidencias.
--
-- Se elimina de la fuente de verdad (auth.permission / auth.role_permissions) y del
-- esquema legacy (academic_work_plan."Permiso" / "RolPermiso"). Mismo patrón que la
-- migración 375. Idempotente.
-- =============================================================================

DO $$
DECLARE
  v_codes text[] := ARRAY[
    'pta.backoffice.seguimiento'
  ];
BEGIN
  -- ── Fuente de verdad de autorización (auth.*) ──────────────────────────────
  -- 1) Quitar las asignaciones de este permiso a cualquier rol.
  DELETE FROM auth.role_permissions rp
   USING auth.permission p
   WHERE rp.id_permission = p.id_permission
     AND p.code = ANY(v_codes);

  -- 2) Eliminar la definición del permiso (deja de aparecer en el panel de Roles).
  DELETE FROM auth.permission
   WHERE code = ANY(v_codes);

  -- ── Esquema legacy (academic_work_plan.*) ──────────────────────────────────
  -- 3) Quitar los enlaces rol-permiso legacy (recurso = código del permiso).
  DELETE FROM academic_work_plan."RolPermiso" rpz
   USING academic_work_plan."Permiso" pz
   WHERE rpz."permisoId" = pz.id
     AND pz.recurso = ANY(v_codes);

  -- 4) Eliminar el permiso legacy.
  DELETE FROM academic_work_plan."Permiso"
   WHERE recurso = ANY(v_codes);
END $$;
