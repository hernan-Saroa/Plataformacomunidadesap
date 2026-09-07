-- El administrador de programas debe contener únicamente registros creados
-- explícitamente desde Gestión de Graduados. Las opciones provenientes de
-- graduados se calculan dinámicamente y no se persisten en este catálogo.

DELETE FROM academic_registration.graduate_program_catalog
WHERE created_by IN (
  'Migración desde graduados existentes',
  'Sincronización de graduados'
);
