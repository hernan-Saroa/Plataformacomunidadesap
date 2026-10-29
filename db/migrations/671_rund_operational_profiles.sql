-- Three operational profiles. Does not assign people or change RUND records.
DO $$
DECLARE module_id uuid;
BEGIN
  SELECT id_module INTO module_id FROM auth.module WHERE code='gestion-profesoral';
  IF module_id IS NULL THEN RAISE EXCEPTION 'Apply 423_seed_rund_permissions.sql first'; END IF;

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
