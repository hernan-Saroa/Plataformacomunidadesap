-- ============================================================================
-- 107 · Lo que hacía la Financiera lo registra Contratación
--
-- La 106 quitó el rol financiero y dejó cuatro acciones sin nadie. Las cuatro
-- registran en el aplicativo algo que la Financiera hace por fuera, como el
-- CDP desde la 103:
--
--   · decidir 8.3  · verificar la disponibilidad, expedir o rechazar el RP
--   · decidir 9.4  · tramitar el pago que el supervisor ya avaló
--   · aprobar 9.5  · el CDP o el RP de una adición
--   · editar 10.3  · el cierre financiero
--
-- Se las queda el Gestor de Contratación, que ya lleva el expediente desde la
-- 3.3: edita toda la etapa 8 (radica la solicitud del RP), la 9.4 y la 9.5, y
-- decide la 10.3. Ninguna de las cuatro le deja aprobar su propio trabajo: el
-- aval del pago sigue en el Supervisor y la decisión de la modificación en el
-- Director y el Ordenador del Gasto.
--
-- El Gestor no aprobaba nada hasta aquí, así que también recibe el permiso de
-- acción `contratacion.aprobar`. Sin un alcance no habilita nada: solo le sirve
-- en la 9.5.
--
-- Sin confirmar, como la 103: la Dirección puede moverlas desde
-- Configuración → Permisos.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

INSERT INTO hiring.alcances_permiso (rol_id, accion, numeral, confirmado, activo, created_by)
SELECT r.id, v.accion, v.numeral, false, true, 'migracion-107'
  FROM auth.role r
 CROSS JOIN (VALUES
   ('decidir', '8.3'),
   ('decidir', '9.4'),
   ('aprobar', '9.5'),
   ('editar',  '10.3')
 ) AS v(accion, numeral)
 WHERE r.code = 'GESTOR_CONTRATACION'
   AND NOT EXISTS (
     SELECT 1 FROM hiring.alcances_permiso a
      WHERE a.rol_id = r.id AND a.accion = v.accion AND a.numeral = v.numeral AND a.activo
   );

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
SELECT r.id, p.id_permission, true, now(), now()
  FROM auth.role r, auth.permission p
 WHERE r.code = 'GESTOR_CONTRATACION'
   AND p.code = 'contratacion.aprobar'
   AND NOT EXISTS (
     SELECT 1 FROM auth.role_permissions rp
      WHERE rp.id_rol = r.id AND rp.id_permission = p.id_permission
   );

UPDATE auth.role_permissions rp
   SET is_active = true, updated_at = now()
  FROM auth.role r, auth.permission p
 WHERE rp.id_rol = r.id
   AND rp.id_permission = p.id_permission
   AND r.code = 'GESTOR_CONTRATACION'
   AND p.code = 'contratacion.aprobar'
   AND NOT rp.is_active;

COMMIT;
