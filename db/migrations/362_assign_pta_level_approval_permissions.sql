-- Asigna permisos granulares del flujo PTA a los roles oficiales.
-- No elimina permisos existentes: solo agrega los faltantes para que el panel
-- de Roles y Permisos refleje N1, N2 y N3 de forma explícita.

DO $$
BEGIN
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM (
    VALUES
      ('JEFATURA_TERRITORIAL', 'pta.backoffice.aprobador_N1'),
      ('JEFATURA_TERRITORIAL', 'pta.approve.academica'),
      ('JEFATURA_TERRITORIAL', 'pta.approve.complementarias'),

      ('DECANO', 'pta.backoffice.aprobador_N2'),
      ('DECANO', 'pta.approve.investigacion'),
      ('DECANO', 'pta.approve.extension.capacitacion'),
      ('DECANO', 'pta.approve.extension.procesos_seleccion'),
      ('DECANO', 'pta.approve.extension.fortalecimiento'),
      ('DECANO', 'pta.approve.extension.alto_gobierno'),
      ('DECANO', 'pta.approve.extension.secciones_actividades'),

      ('GESTION_PROFESORAL', 'pta.backoffice.aprobador_N3'),
      ('GESTION_PROFESORAL', 'pta.approve.academicas_admin')
  ) AS cfg(role_code, permission_code)
  JOIN auth.role r ON r.code = cfg.role_code
  JOIN auth.permission p ON p.code = cfg.permission_code
  ON CONFLICT (id_rol, id_permission) DO UPDATE
    SET is_active = true;
END $$;
