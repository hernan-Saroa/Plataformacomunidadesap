-- ============================================================================
-- EFDS-1643 — Permisos granulares de Programación Académica (RN-08)
--
-- La migración 002 registró el módulo `programacion-academica` en auth.module
-- pero NO sembró ningún permiso, así que no había forma de expresar la
-- segregación por nivel que exige RN-08.
--
-- ⚠️ RN-08 segrega el CATÁLOGO ACADÉMICO, no la disponibilidad de docentes.
-- Un programador de Pregrado no debe ver asignaturas de Posgrado, pero SÍ debe
-- ver que el docente X ya tiene ocupado el martes. Por eso la disponibilidad de
-- docentes tiene permiso propio y NO se divide por nivel: si se segregara,
-- moriría el bloqueo transversal de franjas (RN-07, EFDS-1374) antes de existir.
--
-- Idempotente.
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'programacion-academica';

    IF v_module_id IS NULL THEN
        RAISE NOTICE 'Módulo programacion-academica ausente; ejecute antes la migración 002.';
        RETURN;
    END IF;

    INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
    VALUES
        -- Catálogo: SÍ se segrega por nivel (RN-08).
        (gen_random_uuid(), 'programacion.catalogo.pregrado',
         'Programación — Catálogo de Pregrado',
         'Permite consultar y programar el catálogo de asignaturas de programas de pregrado',
         v_module_id, true),
        (gen_random_uuid(), 'programacion.catalogo.posgrado',
         'Programación — Catálogo de Posgrado',
         'Permite consultar y programar el catálogo de asignaturas de especializaciones y maestrías',
         v_module_id, true),

        -- Disponibilidad docente: NO se segrega por nivel (ver nota de cabecera).
        (gen_random_uuid(), 'programacion.docentes.disponibilidad',
         'Programación — Disponibilidad de docentes',
         'Permite consultar la disponibilidad horaria y las horas remanentes de los docentes compartidos, sin importar el nivel del programa que causó la ocupación',
         v_module_id, true),

        -- Permiso integral, análogo a pta.approve.all.
        (gen_random_uuid(), 'programacion.all',
         'Programación — Acceso integral',
         'Habilita el catálogo de todos los niveles académicos',
         v_module_id, true)
    ON CONFLICT (code) DO NOTHING;
END $$;

-- Quien ya administra el catálogo académico o aprueba Docencia en el PTA recibe
-- la disponibilidad de docentes, que es información transversal y no otorga
-- capacidad de programar por sí sola.
DO $$
BEGIN
    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
    SELECT DISTINCT rp.id_rol, p_new.id_permission, true
    FROM auth.role_permissions rp
    JOIN auth.permission p_old
      ON p_old.id_permission = rp.id_permission
     AND p_old.code IN ('pta.approve.academica.pregrado', 'pta.approve.academica.posgrado')
    CROSS JOIN auth.permission p_new
    WHERE p_new.code = 'programacion.docentes.disponibilidad'
      AND COALESCE(rp.is_active, true) = true
    ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
END $$;
