-- Docencia territorial: tercer componente de aprobación de Docencia.
--
-- Regla de negocio (matriz de revisión/aprobación del PTA): las asignaturas dictadas
-- en una Dirección Territorial (Chocó, Antioquia, ...) las revisa el Coordinador
-- Territorial y las aprueba la Jefatura de la Territorial, sin importar si son de
-- pregrado o de posgrado. Solo lo dictado en Sede Central se separa por nivel
-- (pta.*.academica.pregrado / .posgrado, migración 388).
--
-- La territorialidad MANDA sobre el nivel, por eso es un componente propio y no una
-- subsección: sigue el mismo patrón que Extensión (varios componentes independientes
-- agrupados bajo un solo rótulo visible).
--
-- Idempotente.

DO $$
DECLARE
    v_module_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';

    IF v_module_id IS NOT NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
        VALUES
            (gen_random_uuid(), 'pta.approve.academica.territorial', 'Aprobar Docencia - Territorial',
             'Permite aprobar las asignaturas de Docencia dictadas en Direcciones Territoriales (Jefatura de la Territorial)', v_module_id, true),
            (gen_random_uuid(), 'pta.review.academica.territorial', 'Revisar Docencia - Territorial',
             'Permite revisar (preaprobar) las asignaturas de Docencia dictadas en Direcciones Territoriales (Coordinador Territorial)', v_module_id, true)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;

-- El rol que hoy aprueba Docencia en las territoriales es JEFATURA_TERRITORIAL, que
-- ya tenía pta.approve.academica.pregrado (heredado de la migración 388). Se le otorga
-- el permiso territorial para que el flujo siga funcionando sin intervención manual.
-- No se crean roles nuevos: el Coordinador Territorial (revisión) lo configura QA con
-- la administración de roles existente, igual que el resto de permisos pta.review.*.
DO $$
BEGIN
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code = 'JEFATURA_TERRITORIAL'
    AND p.code = 'pta.approve.academica.territorial'
  ON CONFLICT (id_rol, id_permission) DO UPDATE
    SET is_active = true;
END $$;
