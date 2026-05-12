-- Migración 217: Permisos de aprobación/devolución de respuesta para Asesoría Jurídica
-- Jefe: puede aprobar y devolver. Abogado (resuelve): solo puede redactar y enviar al jefe.

DO $$
DECLARE
  v_module_id uuid;
  v_jefe_id   uuid;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-legal';
  SELECT id INTO v_jefe_id FROM auth.role WHERE code = 'JEFE_GESTION_LEGAL';

  -- Insertar los 2 permisos nuevos
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES
    (gen_random_uuid(),
     'gestion-legal.asesoria-juridica.aprobar-respuesta',
     'Aprobar y Enviar Respuesta - Asesoría Jurídica',
     'Permite al jefe aprobar la respuesta del abogado y enviarla al solicitante',
     v_module_id, true),
    (gen_random_uuid(),
     'gestion-legal.asesoria-juridica.devolver-respuesta',
     'Devolver Respuesta - Asesoría Jurídica',
     'Permite al jefe devolver la respuesta al abogado con comentarios de corrección',
     v_module_id, true)
  ON CONFLICT (code) DO NOTHING;

  -- Asignar al JEFE todos los permisos gestion-legal.% (incluye los nuevos)
  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT v_jefe_id, p.id_permission
  FROM auth.permission p
  WHERE p.code LIKE 'gestion-legal.%'
  ON CONFLICT (id_rol, id_permission) DO NOTHING;

END $$;
