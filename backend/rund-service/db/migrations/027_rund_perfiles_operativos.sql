-- Perfiles operativos RUND (669 + 671 + 672 del RUND embebido, estado final): permiso sensible, tres perfiles
-- (Cargador / Revisor / Incorporador), roles RUND_* y descripciones. No asigna personas ni modifica expedientes.
-- Prerrequisito: 002/006 (módulo y catálogo de permisos RUND).

-- ===== origen: 669_rund_document_preparation_permissions
-- Separate document preparation from documentary approval. Assigns no users.
DO $$
DECLARE
  module_id uuid;
BEGIN
  SELECT id_module INTO module_id FROM auth.module WHERE code IN ('rund','gestion-profesoral') ORDER BY (code='rund') DESC LIMIT 1;
  IF module_id IS NULL THEN
    RAISE EXCEPTION 'Apply 002/006 (rund-service) first';
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

-- ===== origen: 671_rund_operational_profiles
-- Three operational profiles. Does not assign people or change RUND records.
DO $$
DECLARE module_id uuid;
BEGIN
  SELECT id_module INTO module_id FROM auth.module WHERE code IN ('rund','gestion-profesoral') ORDER BY (code='rund') DESC LIMIT 1;
  IF module_id IS NULL THEN RAISE EXCEPTION 'Apply 002/006 (rund-service) first'; END IF;

  INSERT INTO auth.permission (id_permission,code,name,description,id_module,is_active)
  VALUES
    (gen_random_uuid(),'banco-docentes.rund.carga','RUND · Cargador GGP',
      'Registra e importa aspirantes/docentes, prepara documentos y corrige datos OCR. No aprueba ni devuelve soportes.',module_id,true),
    (gen_random_uuid(),'banco-docentes.rund.revision','RUND · Revisor GGP',
      'Consulta evidencia y aprueba o devuelve soportes y bloques. No carga documentos ni cambia datos del perfil.',module_id,true),
    (gen_random_uuid(),'banco-docentes.rund.incorporacion','RUND · Responsable de incorporación',
      'Consulta RUND y registra datos y soportes de contratación. Este permiso no concede edición general ni aprobación.',module_id,true)
  ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,id_module=EXCLUDED.id_module;

  INSERT INTO auth.role (id,code,name,description,category,type,is_active,created_at,updated_at)
  VALUES
    (gen_random_uuid(),'RUND_CARGADOR','RUND - Cargador GGP','Registro y preparación documental RUND.','gestion','personalizado',true,now(),now()),
    (gen_random_uuid(),'RUND_APROBADOR','RUND - Revisor GGP','Revisión documental según los permisos asignados.','gestion','personalizado',true,now(),now()),
    (gen_random_uuid(),'RUND_INCORPORADOR','RUND - Responsable de incorporación','Registro de datos y soportes de contratación.','gestion','personalizado',true,now(),now())
  ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description;

  -- Replace only the RUND permissions of these three predefined profiles.
  -- Custom roles and permissions belonging to other modules are preserved.
  DELETE FROM auth.role_permissions rp USING auth.role r,auth.permission p
  WHERE rp.id_rol=r.id AND rp.id_permission=p.id_permission
    AND r.code IN ('RUND_CARGADOR','RUND_APROBADOR','RUND_INCORPORADOR')
    AND p.code LIKE 'banco-docentes.rund.%'
    AND p.code <> CASE r.code WHEN 'RUND_CARGADOR' THEN 'banco-docentes.rund.carga'
      WHEN 'RUND_APROBADOR' THEN 'banco-docentes.rund.revision' ELSE 'banco-docentes.rund.incorporacion' END;

  INSERT INTO auth.role_permissions (id_rol,id_permission,is_active,created_at,updated_at)
  SELECT r.id,p.id_permission,true,now(),now() FROM auth.role r JOIN auth.permission p ON p.code=
    CASE r.code WHEN 'RUND_CARGADOR' THEN 'banco-docentes.rund.carga'
      WHEN 'RUND_APROBADOR' THEN 'banco-docentes.rund.revision' ELSE 'banco-docentes.rund.incorporacion' END
  WHERE r.code IN ('RUND_CARGADOR','RUND_APROBADOR','RUND_INCORPORADOR')
  ON CONFLICT (id_rol,id_permission) DO NOTHING;
END $$;

-- ===== origen: 672_rund_permission_descriptions
-- Update descriptions after allowing an authorized uploader to review their own
-- evidence. Do not alter grants, user assignments, active flags or RUND records.
UPDATE auth.permission
SET description = 'Consulta RUND y registra datos y soportes de contratación. Este permiso no concede edición general ni aprobación.'
WHERE code = 'banco-docentes.rund.incorporacion';

UPDATE auth.role
SET description = 'Revisión documental según los permisos asignados.'
WHERE code = 'RUND_APROBADOR';
