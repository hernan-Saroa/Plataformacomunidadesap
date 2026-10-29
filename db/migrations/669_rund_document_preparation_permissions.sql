-- Separate document preparation from documentary approval. Assigns no users.
DO $$
DECLARE
  module_id uuid;
BEGIN
  SELECT id_module INTO module_id FROM auth.module WHERE code = 'gestion-profesoral';
  IF module_id IS NULL THEN
    RAISE EXCEPTION 'Apply 423_seed_rund_permissions.sql first';
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'banco-docentes.rund.sensitive.view', 'Consultar documentos y datos originales RUND',
    'Acceso explícito a los PDF originales, datos de identidad, puntaje salarial y evidencia OCR del RUND. No autoriza editar ni aprobar.', module_id, true)
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO auth.role (id, code, name, description, category, type, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'RUND_CARGADOR', 'RUND - Carga y corrección documental',
      'Carga y reemplaza documentos, prepara perfiles y corrige datos OCR. No aprueba ni devuelve soportes.', 'gestion', 'personalizado', true, now(), now()),
    (gen_random_uuid(), 'RUND_APROBADOR', 'RUND - Revisión y aprobación documental',
      'Consulta datos y PDF preparados; valida o devuelve filas y bloques. No carga documentos ni modifica datos OCR.', 'gestion', 'personalizado', true, now(), now())
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
  SELECT r.id, p.id_permission, true, now(), now()
  FROM auth.role r CROSS JOIN auth.permission p
  WHERE (r.code = 'RUND_CARGADOR' AND p.code IN
    ('banco-docentes.rund.view', 'banco-docentes.rund.edit', 'banco-docentes.rund.documents.manage', 'banco-docentes.rund.sensitive.view'))
    OR (r.code = 'RUND_APROBADOR' AND p.code IN
    ('banco-docentes.rund.view', 'banco-docentes.rund.validate', 'banco-docentes.rund.sensitive.view'))
    OR (r.code IN ('GESTION_PROFESORAL', 'SUPER_ADMIN') AND p.code = 'banco-docentes.rund.sensitive.view')
  ON CONFLICT (id_rol, id_permission) DO NOTHING;
END $$;
