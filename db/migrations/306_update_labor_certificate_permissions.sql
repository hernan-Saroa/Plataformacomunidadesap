-- MIGRATION 306: Ajustar permisos visibles del modulo Certificados Laborales.
-- - Mantiene activos solo los permisos usados actualmente.
-- - Renombra "Entregar Certificado" a "Reenviar Certificado" sin cambiar el codigo.
-- - Inactiva las asignaciones activas de permisos no usados sin borrar roles.

BEGIN;

WITH assignable_permissions(code) AS (
  VALUES
    ('certificados-laborales.certificate.deliver'),
    ('certificados-laborales.certificate.sign'),
    ('certificados-laborales.certificate.verify'),
    ('certificados-laborales.config.edit'),
    ('certificados-laborales.export.report'),
    ('certificados-laborales.template.manage')
)
UPDATE auth.permission p
SET
  name = CASE
    WHEN p.code = 'certificados-laborales.certificate.deliver'
      THEN 'Reenviar Certificado'
    WHEN p.code = 'certificados-laborales.config.edit'
      THEN 'Editar Prima'
    ELSE p.name
  END,
  description = CASE
    WHEN p.code = 'certificados-laborales.certificate.deliver'
      THEN 'Reenviar certificado al correo del solicitante'
    WHEN p.code = 'certificados-laborales.config.edit'
      THEN 'Modificar primas'
    ELSE p.description
  END,
  is_active = true,
  updated_at = NOW()
FROM assignable_permissions ap
WHERE p.code = ap.code;

WITH assignable_permissions(code) AS (
  VALUES
    ('certificados-laborales.certificate.deliver'),
    ('certificados-laborales.certificate.sign'),
    ('certificados-laborales.certificate.verify'),
    ('certificados-laborales.config.edit'),
    ('certificados-laborales.export.report'),
    ('certificados-laborales.template.manage')
)
UPDATE auth.permission p
SET
  is_active = false,
  updated_at = NOW()
WHERE p.code LIKE 'certificados-laborales.%'
  AND NOT EXISTS (
    SELECT 1
    FROM assignable_permissions ap
    WHERE ap.code = p.code
  );

WITH assignable_permissions(code) AS (
  VALUES
    ('certificados-laborales.certificate.deliver'),
    ('certificados-laborales.certificate.sign'),
    ('certificados-laborales.certificate.verify'),
    ('certificados-laborales.config.edit'),
    ('certificados-laborales.export.report'),
    ('certificados-laborales.template.manage')
)
UPDATE auth.role_permissions rp
SET
  is_active = false,
  updated_at = NOW()
FROM auth.permission p
WHERE rp.id_permission = p.id_permission
  AND p.code LIKE 'certificados-laborales.%'
  AND NOT EXISTS (
    SELECT 1
    FROM assignable_permissions ap
    WHERE ap.code = p.code
  )
  AND COALESCE(rp.is_active, true) = true;

COMMIT;
