-- Propietario verificado por sesión. Los identificadores anteriores eran datos
-- suministrados por el cliente: no se usan para reasignar historial automáticamente.
BEGIN;

ALTER TABLE chatbot.conversacion
  ADD COLUMN IF NOT EXISTS propietario_usuario_id UUID
  REFERENCES auth."user" (id_user) ON DELETE SET NULL;

COMMENT ON COLUMN chatbot.conversacion.propietario_usuario_id IS
  'Cuenta propietaria verificada por el servidor. NULL: historial legacy sin propietario acreditado.';

CREATE INDEX IF NOT EXISTS idx_chatbot_conversacion_propietario_activo
  ON chatbot.conversacion (propietario_usuario_id, updated_at DESC)
  WHERE is_activo = true;

INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'chatbot.conversaciones.read_all',
       'Consultar historial institucional del chatbot',
       'Permite leer conversaciones de otras cuentas y el historial anterior sin propietario verificado. No permite escribir ni borrar consultas ajenas.',
       m.id_module, true, NOW(), NOW()
  FROM auth.module m WHERE m.code = 'chatbot'
ON CONFLICT (code) DO NOTHING;

-- Solo el rol de superadministración recibe la concesión inicial. No reactivar
-- asignaciones retiradas al volver a ejecutar la migración.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
SELECT r.id, p.id_permission, true, NOW(), NOW()
  FROM auth.role r
  JOIN auth.permission p ON p.code = 'chatbot.conversaciones.read_all'
 WHERE UPPER(r.code) = 'SUPER_ADMIN' AND r.is_active = true
ON CONFLICT (id_rol, id_permission) DO NOTHING;

COMMIT;
