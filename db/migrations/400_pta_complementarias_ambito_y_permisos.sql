-- EFDS-1353: Complementarias deja de compartir los permisos de Docencia y gana
-- su propio juego de revisión/aprobación por ámbito, más los dos ámbitos que no
-- existían: Territorial (Decanatura) y Gestión Profesoral.
--
-- Situación previa (el bug de fondo): los componentes complementarias_pregrado y
-- complementarias_posgrado NO tenían permiso propio — mapeaban a
-- pta.approve/review.academica.pregrado|posgrado, es decir, al MISMO permiso de
-- Docencia. Por eso un revisor "revisaba todo por igual": no existía forma de
-- expresar "este usuario revisa Complementarias de Posgrado pero no Docencia de
-- Posgrado", ni de acotar Complementarias por territorial.
--
-- Permisos nuevos (espejo de los de Docencia, ver migraciones 388 y 397):
--   pta.approve.complementarias.pregrado / .posgrado
--   pta.approve.complementarias.territorial.pregrado / .posgrado
--   pta.approve.complementarias.gestion_profesoral
--   ... y los pta.review.* equivalentes.
--
-- Compatibilidad: todo rol que hoy aprueba/revisa Docencia de un nivel hereda el
-- permiso equivalente de Complementarias de ese nivel, que es exactamente lo que
-- podía hacer hasta ahora. Así nadie pierde acceso al desplegar; a partir de aquí
-- el administrador ya puede separarlos. NO se desactiva ningún permiso existente:
-- pta.approve/review.complementarias (catch-all "sin ámbito") sigue vigente.
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
            (gen_random_uuid(), 'pta.approve.complementarias.pregrado', 'Aprobar Complementarias - Pregrado',
             'Permite aprobar las actividades complementarias asociadas a programas de pregrado', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.complementarias.posgrado', 'Aprobar Complementarias - Posgrado',
             'Permite aprobar las actividades complementarias asociadas a programas de posgrado', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.complementarias.territorial.pregrado', 'Aprobar Complementarias - Territorial Pregrado',
             'Permite aprobar las actividades complementarias de pregrado de una Decanatura (Dirección Territorial)', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.complementarias.territorial.posgrado', 'Aprobar Complementarias - Territorial Posgrado',
             'Permite aprobar las actividades complementarias de posgrado de una Decanatura (Dirección Territorial)', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.complementarias.gestion_profesoral', 'Aprobar Complementarias - Gestión Profesoral',
             'Permite aprobar las actividades complementarias de tipo Gestión Profesoral (flujo único, sin ramificar por territorial)', v_module_id, true),
            (gen_random_uuid(), 'pta.review.complementarias.pregrado', 'Revisar Complementarias - Pregrado',
             'Permite revisar (preaprobar) las actividades complementarias asociadas a programas de pregrado', v_module_id, true),
            (gen_random_uuid(), 'pta.review.complementarias.posgrado', 'Revisar Complementarias - Posgrado',
             'Permite revisar (preaprobar) las actividades complementarias asociadas a programas de posgrado', v_module_id, true),
            (gen_random_uuid(), 'pta.review.complementarias.territorial.pregrado', 'Revisar Complementarias - Territorial Pregrado',
             'Permite revisar (preaprobar) las actividades complementarias de pregrado de una Decanatura (Dirección Territorial)', v_module_id, true),
            (gen_random_uuid(), 'pta.review.complementarias.territorial.posgrado', 'Revisar Complementarias - Territorial Posgrado',
             'Permite revisar (preaprobar) las actividades complementarias de posgrado de una Decanatura (Dirección Territorial)', v_module_id, true),
            (gen_random_uuid(), 'pta.review.complementarias.gestion_profesoral', 'Revisar Complementarias - Gestión Profesoral',
             'Permite revisar (preaprobar) las actividades complementarias de tipo Gestión Profesoral', v_module_id, true)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;

-- Herencia: quien hoy aprueba/revisa Docencia de un nivel ya venía aprobando de
-- hecho las Complementarias de ese nivel (compartían permiso). Se le concede el
-- permiso nuevo equivalente para que el comportamiento no cambie al desplegar.
DO $$
DECLARE
    v_par RECORD;
BEGIN
    FOR v_par IN
        SELECT * FROM (VALUES
            ('pta.approve.academica.pregrado',             'pta.approve.complementarias.pregrado'),
            ('pta.approve.academica.posgrado',             'pta.approve.complementarias.posgrado'),
            ('pta.approve.academica.territorial.pregrado', 'pta.approve.complementarias.territorial.pregrado'),
            ('pta.approve.academica.territorial.posgrado', 'pta.approve.complementarias.territorial.posgrado'),
            ('pta.review.academica.pregrado',              'pta.review.complementarias.pregrado'),
            ('pta.review.academica.posgrado',              'pta.review.complementarias.posgrado'),
            ('pta.review.academica.territorial.pregrado',  'pta.review.complementarias.territorial.pregrado'),
            ('pta.review.academica.territorial.posgrado',  'pta.review.complementarias.territorial.posgrado')
        ) AS t(origen, destino)
    LOOP
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
        SELECT rp.id_rol, p_new.id_permission, true
        FROM auth.role_permissions rp
        JOIN auth.permission p_old
          ON p_old.id_permission = rp.id_permission AND p_old.code = v_par.origen
        CROSS JOIN auth.permission p_new
        WHERE p_new.code = v_par.destino
          AND COALESCE(rp.is_active, true) = true
        ON CONFLICT (id_rol, id_permission) DO UPDATE
          SET is_active = true;
    END LOOP;
END $$;

-- Gestión Profesoral es un ámbito NUEVO (no existía equivalente en Docencia del
-- cual heredar). Se concede a quien ya tiene el catch-all de Complementarias,
-- que es el rol que hasta ahora venía resolviendo estas actividades.
--
-- Ojo: la aprobación del catch-all es un único permiso ('pta.approve.complementarias'),
-- pero la REVISIÓN nunca tuvo un 'pta.review.complementarias' a secas: se
-- descompone en las subsecciones .docencia y .academico_administrativas. Por eso
-- el origen de revisión son esas dos, y basta tener cualquiera de ellas.
DO $$
BEGIN
    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
    SELECT DISTINCT rp.id_rol, p_new.id_permission, true
    FROM auth.role_permissions rp
    JOIN auth.permission p_old
      ON p_old.id_permission = rp.id_permission
     AND p_old.code = 'pta.approve.complementarias'
    CROSS JOIN auth.permission p_new
    WHERE p_new.code = 'pta.approve.complementarias.gestion_profesoral'
      AND COALESCE(rp.is_active, true) = true
    ON CONFLICT (id_rol, id_permission) DO UPDATE
      SET is_active = true;

    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
    SELECT DISTINCT rp.id_rol, p_new.id_permission, true
    FROM auth.role_permissions rp
    JOIN auth.permission p_old
      ON p_old.id_permission = rp.id_permission
     AND p_old.code IN ('pta.review.complementarias.docencia',
                        'pta.review.complementarias.academico_administrativas')
    CROSS JOIN auth.permission p_new
    WHERE p_new.code = 'pta.review.complementarias.gestion_profesoral'
      AND COALESCE(rp.is_active, true) = true
    ON CONFLICT (id_rol, id_permission) DO UPDATE
      SET is_active = true;
END $$;
