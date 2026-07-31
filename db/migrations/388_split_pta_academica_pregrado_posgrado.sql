-- Divide el componente de aprobación "Docencia" (academica) en dos componentes
-- independientes — Pregrado y Posgrado — con el mismo patrón que ya usa Extensión
-- (4 componentes independientes agrupados bajo un solo rótulo). Antes había un
-- único permiso pta.approve.academica; ahora hay uno por nivel.
--
-- No se crean roles nuevos: el rol JEFATURA_TERRITORIAL que ya aprobaba Docencia
-- (migración 362) recibe automáticamente los dos permisos nuevos para no romper
-- el flujo existente. El permiso viejo se desactiva (no se borra) siguiendo el
-- mismo patrón de deprecación ya usado en las migraciones 369/370/375/377.

DO $$
DECLARE
    v_module_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';

    IF v_module_id IS NOT NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
        VALUES
            (gen_random_uuid(), 'pta.approve.academica.pregrado', 'Aprobar Docencia - Pregrado', 'Permite aprobar el componente de Docencia (asignaturas de pregrado) en el PTA', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.academica.posgrado', 'Aprobar Docencia - Posgrado', 'Permite aprobar el componente de Docencia (asignaturas de posgrado) en el PTA', v_module_id, true)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;

-- Otorga los dos permisos nuevos a cualquier rol que ya tuviera pta.approve.academica,
-- para que el aprobador actual (JEFATURA_TERRITORIAL) siga pudiendo aprobar Docencia
-- sin intervención manual de QA.
DO $$
BEGIN
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT rp.id_rol, p_new.id_permission, true
  FROM auth.role_permissions rp
  JOIN auth.permission p_old ON p_old.id_permission = rp.id_permission AND p_old.code = 'pta.approve.academica'
  CROSS JOIN auth.permission p_new
  WHERE p_new.code IN ('pta.approve.academica.pregrado', 'pta.approve.academica.posgrado')
    AND COALESCE(rp.is_active, true) = true
  ON CONFLICT (id_rol, id_permission) DO UPDATE
    SET is_active = true;
END $$;

-- Deprecación suave del permiso viejo (ya cubierto por los dos nuevos): se
-- desactiva tanto la asignación a roles como el permiso en sí, sin borrarlo.
UPDATE auth.role_permissions rp
SET is_active = false
FROM auth.permission p
WHERE p.id_permission = rp.id_permission
  AND p.code = 'pta.approve.academica';

UPDATE auth.permission
SET is_active = false
WHERE code = 'pta.approve.academica';
