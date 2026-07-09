-- =============================================================================
-- 375: Elimina permisos PTA MUERTOS del flujo de aprobación / workflow
-- =============================================================================
-- Auditoría (este chat) confirmó que estos permisos están definidos y/o asignados
-- a roles, pero NUNCA se chequean en el código: no gatean ninguna vista, botón ni
-- endpoint. En el modelo actual la aprobación/devolución se hace por componente
-- (pta.approve.<componente>) vía el estado 'aprobado'/'devuelto', no con estos.
--
-- Permisos eliminados:
--   pta.backoffice.rechazar            (flag huérfano, sin lector)
--   pta.backoffice.arbitrar            (deriva puedeArbitrar, que nadie consume)
--   pta.backoffice.concertar           (deriva puedeConcertar, que nadie consume)
--   pta.portal.concertar               (sin definición ni chequeo)
--   pta.backoffice.firma_digital       (sin chequeo en código)
--   pta.backoffice.enviar_propuesta    (sin chequeo en código)
--   pta.backoffice.gestionar_estados   (sin chequeo en código)
--
-- Se eliminan de la fuente de verdad (auth.permission / auth.role_permissions) y
-- del esquema legacy (academic_work_plan."Permiso" / "RolPermiso").
--
-- NOTA: si a futuro se implementa firma digital o el envío de propuesta al docente,
-- habrá que reintroducir el permiso y su chequeo — hoy no existe ninguno.
-- Idempotente.
-- =============================================================================

DO $$
DECLARE
  v_codes text[] := ARRAY[
    'pta.backoffice.rechazar',
    'pta.backoffice.arbitrar',
    'pta.backoffice.concertar',
    'pta.portal.concertar',
    'pta.backoffice.firma_digital',
    'pta.backoffice.enviar_propuesta',
    'pta.backoffice.gestionar_estados'
  ];
BEGIN
  -- ── Fuente de verdad de autorización (auth.*) ──────────────────────────────
  -- 1) Quitar las asignaciones de estos permisos a cualquier rol.
  DELETE FROM auth.role_permissions rp
   USING auth.permission p
   WHERE rp.id_permission = p.id_permission
     AND p.code = ANY(v_codes);

  -- 2) Eliminar las definiciones de permiso (dejan de aparecer en el panel de Roles).
  DELETE FROM auth.permission
   WHERE code = ANY(v_codes);

  -- ── Esquema legacy (academic_work_plan.*) ──────────────────────────────────
  -- 3) Quitar los enlaces rol-permiso legacy (recurso = código del permiso).
  DELETE FROM academic_work_plan."RolPermiso" rpz
   USING academic_work_plan."Permiso" pz
   WHERE rpz."permisoId" = pz.id
     AND pz.recurso = ANY(v_codes);

  -- 4) Eliminar los permisos legacy.
  DELETE FROM academic_work_plan."Permiso"
   WHERE recurso = ANY(v_codes);
END $$;
