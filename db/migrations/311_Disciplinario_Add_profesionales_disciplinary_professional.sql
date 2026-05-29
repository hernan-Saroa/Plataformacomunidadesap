-- ============================================
-- MIGRATION: Populate disciplinary_professional from users with manage permission
-- ============================================

DO $$
BEGIN

  -- Clear existing professionals
  DELETE FROM internal_disciplinary_control.disciplinary_professional;

  -- Insert professionals from users who have the manage permission
  -- Use DISTINCT ON to avoid duplicates when users have multiple qualifying roles
INSERT INTO internal_disciplinary_control.disciplinary_professional (
    id_user,
    nombre_completo,
    email,
    telefono,
    cargo,
    especialidad,
    tipo_contrato,
    territorial,
    capacidad_maxima,
    estado,
    created_at,
    updated_at
)
   SELECT DISTINCT ON (u.username)
     u.id_user as id_user,
     per.nom_largo as nombre_completo,
     u.username as email,
     per.tel_celular as telefono,
     CASE
       WHEN r.code = 'JEFE_DE_LA_OCID' THEN 'jefe oficina'
       WHEN r.code = 'SECRETARIA_RADICADOR' THEN 'radicador'
       WHEN r.code = 'PROFESIONAL' THEN 'profesional'
       ELSE 'profesional' -- fallback
     END as cargo,
     NULL as especialidad,
     NULL as tipo_contrato,
     NULL as territorial,
     10 as capacidad_maxima,
     'ACTIVO' as estado,
     NOW() as created_at,
     NOW() as updated_at
  FROM auth.user u
  JOIN auth.user_roles ur ON ur.id_user = u.id_user
  JOIN auth.role r ON r.id = ur.id_rol
  JOIN auth.role_permissions rp ON rp.id_rol = r.id
  JOIN auth.permission p ON p.id_permission = rp.id_permission
  JOIN auth.personas per ON per.id_person = u.id_person
  WHERE p.code = 'control-disciplinario.procesos.manage'
    AND ur.is_active = true
    AND rp.is_active = true
    AND p.is_active = true
    AND r.is_active = true
  ORDER BY u.username,
    CASE
      WHEN r.code = 'JEFE_DE_LA_OCID' THEN 1
      WHEN r.code = 'SECRETARIA_RADICADOR' THEN 2
      WHEN r.code = 'PROFESIONAL' THEN 3
      ELSE 4
    END;

END $$;