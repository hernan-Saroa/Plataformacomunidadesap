-- Divide los permisos territoriales de Docencia (aprobación y revisión) en
-- pregrado/posgrado, mismo patrón que la migración 388 (split de
-- academica_pregrado/posgrado para Sede Central).
--
-- Bug de fondo (ver revisarComponente/assertAlcanceTerritorial en pta.service.ts):
-- academica_territorial trataba pregrado y posgrado de una misma territorial como
-- una sola unidad de revisión/aprobación. Un revisor/aprobador de "Docencia
-- Territorial - Pregrado" de la territorial X no debe verse bloqueado ni
-- involucrado en decisiones sobre posgrado de esa misma territorial, y viceversa.
--
-- pta.approve.academica.territorial → .pregrado + .posgrado
-- pta.review.academica.territorial  → .pregrado + .posgrado
--
-- Cualquier rol que tuviera el permiso viejo hereda automáticamente ambos nuevos
-- (igual que 388), y el permiso viejo se desactiva (soft-delete, no se borra).
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
            (gen_random_uuid(), 'pta.approve.academica.territorial.pregrado', 'Aprobar Docencia - Territorial Pregrado',
             'Permite aprobar las asignaturas de pregrado de Docencia dictadas en Direcciones Territoriales', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.academica.territorial.posgrado', 'Aprobar Docencia - Territorial Posgrado',
             'Permite aprobar las asignaturas de posgrado de Docencia dictadas en Direcciones Territoriales', v_module_id, true),
            (gen_random_uuid(), 'pta.review.academica.territorial.pregrado', 'Revisar Docencia - Territorial Pregrado',
             'Permite revisar (preaprobar) las asignaturas de pregrado de Docencia dictadas en Direcciones Territoriales', v_module_id, true),
            (gen_random_uuid(), 'pta.review.academica.territorial.posgrado', 'Revisar Docencia - Territorial Posgrado',
             'Permite revisar (preaprobar) las asignaturas de posgrado de Docencia dictadas en Direcciones Territoriales', v_module_id, true)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;

-- Otorga los permisos nuevos a cualquier rol que ya tuviera el permiso viejo
-- correspondiente (aprobación o revisión), para que el flujo actual siga
-- funcionando sin intervención manual de QA.
DO $$
BEGIN
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT rp.id_rol, p_new.id_permission, true
  FROM auth.role_permissions rp
  JOIN auth.permission p_old ON p_old.id_permission = rp.id_permission AND p_old.code = 'pta.approve.academica.territorial'
  CROSS JOIN auth.permission p_new
  WHERE p_new.code IN ('pta.approve.academica.territorial.pregrado', 'pta.approve.academica.territorial.posgrado')
    AND COALESCE(rp.is_active, true) = true
  ON CONFLICT (id_rol, id_permission) DO UPDATE
    SET is_active = true;

  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT rp.id_rol, p_new.id_permission, true
  FROM auth.role_permissions rp
  JOIN auth.permission p_old ON p_old.id_permission = rp.id_permission AND p_old.code = 'pta.review.academica.territorial'
  CROSS JOIN auth.permission p_new
  WHERE p_new.code IN ('pta.review.academica.territorial.pregrado', 'pta.review.academica.territorial.posgrado')
    AND COALESCE(rp.is_active, true) = true
  ON CONFLICT (id_rol, id_permission) DO UPDATE
    SET is_active = true;
END $$;

-- Deprecación suave de los permisos viejos (ya cubiertos por los nuevos).
UPDATE auth.role_permissions rp
SET is_active = false
FROM auth.permission p
WHERE p.id_permission = rp.id_permission
  AND p.code IN ('pta.approve.academica.territorial', 'pta.review.academica.territorial');

UPDATE auth.permission
SET is_active = false
WHERE code IN ('pta.approve.academica.territorial', 'pta.review.academica.territorial');
