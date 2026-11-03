-- ============================================================================
-- 133 · El supervisor registra el trámite del pago de su contrato (9.4)
-- ============================================================================
-- Prueba en navegador de EFDS-1170 (2026-10-27): el supervisor radica y avala
-- la cuenta de cobro, y también registra que se tramitó el pago con la
-- referencia de la orden. Se le da al rol SUPERVISOR_CONTRATO la acción
-- «decidir» en la 9.4. El permiso es del rol, pero el servicio de pagos lo
-- limita al contrato donde la cuenta ocupa el puesto «Supervisor del contrato»,
-- igual que el aval. El gestor de Contratación lo sigue registrando en
-- cualquier contrato.
--
-- El alcance solo vale con el permiso base `contratacion.decidir` en el rol
-- (AlcanceService une las dos tablas). Ese permiso no abre nada más: «decidir»
-- solo cuenta donde haya una fila de alcance, y la del supervisor es la 9.4.
--
-- Idempotente.
-- ============================================================================

BEGIN;

INSERT INTO hiring.alcances_permiso (rol_id, accion, numeral, created_by)
SELECT r.id, 'decidir', '9.4', 'migracion-133'
  FROM auth.role r
 WHERE r.code = 'SUPERVISOR_CONTRATO'
   AND NOT EXISTS (
     SELECT 1 FROM hiring.alcances_permiso ap
      WHERE ap.rol_id = r.id AND ap.accion = 'decidir' AND ap.numeral = '9.4' AND ap.activo
   );

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
  FROM auth.role r
  JOIN auth.permission p ON p.code = 'contratacion.decidir'
 WHERE r.code = 'SUPERVISOR_CONTRATO'
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

COMMIT;
