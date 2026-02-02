
-- Modules - Nuevo
INSERT INTO auth.module (code, name, description, icon, color, display_order, category) VALUES
  ('graduates-certificates', 'Verificación de Títulos', 'Verificación de títulos para registro academicos', 'Award', '#003DA5', 9, 'backoffice');

UPDATE auth.module SET display_order = 10 WHERE code = 'enrolamiento';
UPDATE auth.module SET display_order = 11 WHERE code = 'comunidad_publicaciones';
UPDATE auth.module SET display_order = 12 WHERE code = 'comunidad_eventos';
UPDATE auth.module SET display_order = 13 WHERE code = 'comunidad_anuncios';
UPDATE auth.module SET display_order = 14 WHERE code = 'bolsa_empleo';
UPDATE auth.module SET display_order = 15 WHERE code = 'estructura-organizacional';
UPDATE auth.module SET display_order = 16 WHERE code = 'programas-academicos';
UPDATE auth.module SET display_order = 17 WHERE code = 'arquitectura-empresarial';
UPDATE auth.module SET display_order = 18 WHERE code = 'gestion-profesoral';
UPDATE auth.module SET display_order = 19 WHERE code = 'estion_passwords';
UPDATE auth.module SET display_order = 20 WHERE code = 'reportes';
UPDATE auth.module SET display_order = 21 WHERE code = 'audit';

-- Permissions
INSERT INTO auth.permission (code, name, description, id_module)
SELECT p.code, p.name, p.description, m.id_module
FROM (VALUES
  ('graduates-certificates.certificates.view', 'Certificados Generados', 'Permite ver certificados emitidos', 'graduates-certificates'),
  ('graduates-certificates.certificates.export', 'Exportar Certificados', 'Permite descargar certificados emitidos', 'graduates-certificates'),
  ('graduates-certificates.certificates.edit', 'Editar Certificados', 'Permite editar certificados emitidos', 'graduates-certificates'),
  ('graduates-certificates.certificates.reenviar', 'Reenviar Certificados', 'Permite reenviar certificados emitidos', 'graduates-certificates'),
  ('graduates-certificates.solicitude.view', 'Solicitudes de Revisión', 'Permite ver solicitudes de revisión', 'graduates-certificates'),
  ('graduates-certificates.solicitude.review', 'Enviar a Revisión', 'Permite enviar solicitudes de revisión', 'graduates-certificates'),
  ('graduates-certificates.solicitude.aprobar', 'Aprobar Solicitudes', 'Permite aprobar solicitudes de revisión', 'graduates-certificates'),
  ('graduates-certificates.solicitude.rechazar', 'Rechazar Solicitudes', 'Permite rechazar solicitudes de revisión', 'graduates-certificates')
) AS p(code,name,description,module_code)
JOIN auth.module m ON m.code = p.module_code;

UPDATE auth.permission SET is_active = false WHERE code like 'graduates.%';

UPDATE auth.permission SET is_active = true WHERE code = 'graduates.edit';
UPDATE auth.permission SET is_active = true WHERE code = 'graduates.verify_certificate';
UPDATE auth.permission SET is_active = true WHERE code = 'graduates.export';