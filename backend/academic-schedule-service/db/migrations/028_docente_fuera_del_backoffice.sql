-- ============================================================================
-- Lote 2 · 2.4 — DOCENTE deja de abrir el backoffice de la decanatura
--
-- 🔴 AGUJERO QUE SE CIERRA AQUÍ. El sidebar deriva la visibilidad del PREFIJO
-- del permiso, así que CUALQUIER permiso `programacion-academica.*` abre el
-- backoffice completo. Con la 027, el rol DOCENTE lo abría: y ese panel tiene
-- la programación de todos los programas, la disponibilidad de TODOS los
-- docentes y la gestión de aulas.
--
-- Es más grave que el cruce pregrado/posgrado que cuidan RN-07 y RN-08: un
-- docente vería la carga horaria de sus colegas. Mismo mecanismo que produjo el
-- huérfano, visto del otro lado — antes ocultaba de más, ahora mostraba de más.
--
-- ⚠️ NO SE INVENTA SOLUCIÓN: se copia la que la plataforma ya usa. El PTA tiene
-- las dos superficies y las separa por MÓDULO, no por rol:
--     backoffice → permiso con el prefijo del propio módulo (lo deriva el sidebar)
--     portal     → permiso bajo el módulo `portal-transaccional`, consumido por
--                  PortalTransaccional.tsx vía `requierePermiso`
-- Su tile docente es exactamente `portal-transaccional.pta.view`.
--
-- Así que los dos permisos de DOCENTE se MUEVEN al módulo del portal,
-- conservando id_permission para no romper las asignaciones ya hechas (misma
-- técnica de la 017; reasignar fue justo el fallo de EFDS-1643).
--
--   programacion-academica.franjas.propias -> portal-transaccional.programacion-academica.view
--   programacion-academica.franjas.tomar   -> portal-transaccional.programacion-academica.tomar
--
-- El rol DOCENTE queda creado y con sus permisos, pero SIN abrir el backoffice.
-- Cuando NUEVA-2 construya la superficie docente, cuelga de estos permisos con
-- un tile del portal, como hace el PTA.
--
-- ⚠️ Esto SUPERSEDE la expectativa del canario de la 027 para DOCENTE: ese rol
-- ya NO debe resolver permisos del módulo de backoffice. El canario de abajo
-- afirma justamente lo contrario que aquel.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

UPDATE auth.permission
   SET code       = 'portal-transaccional.programacion-academica.view',
       name       = 'Portal — Ver mi programación académica',
       id_module  = (SELECT id_module FROM auth.module WHERE code = 'portal-transaccional'),
       updated_at = NOW()
 WHERE code = 'programacion-academica.franjas.propias';

UPDATE auth.permission
   SET code       = 'portal-transaccional.programacion-academica.tomar',
       name       = 'Portal — Tomar franjas publicadas',
       id_module  = (SELECT id_module FROM auth.module WHERE code = 'portal-transaccional'),
       updated_at = NOW()
 WHERE code = 'programacion-academica.franjas.tomar';

-- ── CANARIO: DOCENTE NO puede alcanzar el backoffice ───────────────────────
DO $$
DECLARE
  v_backoffice INT;
  v_portal     INT;
  v_mal_pref   INT;
BEGIN
  -- (a) Cero permisos cuyo prefijo derive al módulo de backoffice.
  SELECT COUNT(*) INTO v_backoffice
    FROM auth.role r
    JOIN auth.role_permissions rp ON rp.id_rol = r.id AND COALESCE(rp.is_active, TRUE)
    JOIN auth.permission p ON p.id_permission = rp.id_permission
   WHERE r.code = 'DOCENTE'
     AND replace(lower(split_part(p.code, '.', 1)), '_', '-') = 'programacion-academica';

  IF v_backoffice > 0 THEN
    RAISE EXCEPTION
      '028: DOCENTE aun resuelve % permisos con el prefijo del backoffice; abriria el panel de la decanatura',
      v_backoffice;
  END IF;

  -- (b) Pero conserva los suyos en el portal: el rol no puede quedar vacío.
  SELECT COUNT(*) INTO v_portal
    FROM auth.role r
    JOIN auth.role_permissions rp ON rp.id_rol = r.id AND COALESCE(rp.is_active, TRUE)
    JOIN auth.permission p ON p.id_permission = rp.id_permission
   WHERE r.code = 'DOCENTE' AND p.code LIKE 'portal-transaccional.programacion-academica.%';

  IF v_portal < 2 THEN
    RAISE EXCEPTION '028: DOCENTE deberia conservar sus 2 permisos de portal y tiene %', v_portal;
  END IF;

  -- (c) Y el módulo de backoffice sigue coherente: todo permiso suyo deriva a su código.
  SELECT COUNT(*) INTO v_mal_pref
    FROM auth.permission p
   WHERE p.id_module = (SELECT id_module FROM auth.module WHERE code = 'programacion-academica')
     AND replace(lower(split_part(p.code, '.', 1)), '_', '-') <> 'programacion-academica';

  IF v_mal_pref > 0 THEN
    RAISE EXCEPTION '028: % permisos del modulo con prefijo que no deriva a su codigo', v_mal_pref;
  END IF;

  RAISE NOTICE '028: DOCENTE backoffice=% portal=% (prefijos incoherentes=%)', v_backoffice, v_portal, v_mal_pref;
END $$;
