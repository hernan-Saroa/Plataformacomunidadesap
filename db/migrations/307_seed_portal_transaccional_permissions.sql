-- ============================================================
-- Migración 307: Seed de permisos del Portal Transaccional
-- ============================================================
-- Contexto: El PortalTransaccional.tsx filtra servicios por permiso.
-- Cada servicio tiene un campo `requierePermiso` que se valida contra
-- los permisos del usuario. Si el permiso NO existe en auth.permission,
-- el servicio nunca se muestra.
--
-- Permisos requeridos por el frontend:
--   - portal-transaccional.certificado-laboral.view
--   - portal-transaccional.carpeta-digital.view
--   - portal-transaccional.pta.view
--   - portal-transaccional.mis-auditorias.view
--
-- Este seed:
--   1. Crea el módulo 'portal-transaccional' si no existe
--   2. Inserta los 4 permisos
--   3. Asigna permisos según rol:
--      - Administrativo: certificado-laboral, carpeta-digital
--      - Docente: pta, carpeta-digital
--      - USUARIO_AUDITADO: mis-auditorias, carpeta-digital
--      - JEFE_OCI / AUDITOR_LIDER / AUDITOR_SENIOR / AUDITOR_JUNIOR /
--        PROFESIONAL_OCI / ADMIN_CI: mis-auditorias (acceso OCI)
--      - SUPER_ADMIN: todos los permisos del portal
--      - Estudiante / Graduado: carpeta-digital
-- ============================================================

DO $$
DECLARE
  v_module_id UUID;
  -- Permission IDs
  p_cert     UUID;
  p_carpeta  UUID;
  p_pta      UUID;
  p_audit    UUID;
  -- Role IDs
  r_id       UUID;
BEGIN
  -- ─── 1. Crear módulo portal-transaccional ───────────────────
  SELECT id_module INTO v_module_id
  FROM auth.module
  WHERE code = 'portal-transaccional';

  IF v_module_id IS NULL THEN
    INSERT INTO auth.module (id_module, code, name, description, icon, color, display_order, category, is_active)
    VALUES (
      gen_random_uuid(),
      'portal-transaccional',
      'Portal Transaccional',
      'Módulo que agrupa los servicios del Portal Transaccional del usuario',
      'LayoutDashboard',
      '#003DA5',
      30,
      'portal',
      true
    )
    RETURNING id_module INTO v_module_id;

    RAISE NOTICE '✅ Módulo portal-transaccional creado (ID: %)', v_module_id;
  ELSE
    RAISE NOTICE 'ℹ️  Módulo portal-transaccional ya existe (ID: %)', v_module_id;
  END IF;

  -- ─── 2. Insertar permisos ──────────────────────────────────
  -- Certificado Laboral
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), 'portal-transaccional.certificado-laboral.view', 'Ver Certificado Laboral (Portal)', 'Permite acceder al servicio de Certificados Laborales desde el Portal', v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;

  SELECT id_permission INTO p_cert FROM auth.permission WHERE code = 'portal-transaccional.certificado-laboral.view';

  -- Carpeta Digital
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), 'portal-transaccional.carpeta-digital.view', 'Ver Carpeta Digital (Portal)', 'Permite acceder a la Carpeta Digital desde el Portal', v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;

  SELECT id_permission INTO p_carpeta FROM auth.permission WHERE code = 'portal-transaccional.carpeta-digital.view';

  -- PTA
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), 'portal-transaccional.pta.view', 'Ver PTA (Portal)', 'Permite acceder al Plan de Trabajo Académico desde el Portal', v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;

  SELECT id_permission INTO p_pta FROM auth.permission WHERE code = 'portal-transaccional.pta.view';

  -- Mis Auditorías
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), 'portal-transaccional.mis-auditorias.view', 'Ver Mis Auditorías (Portal)', 'Permite acceder al módulo de Control Interno de Gestión desde el Portal', v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;

  SELECT id_permission INTO p_audit FROM auth.permission WHERE code = 'portal-transaccional.mis-auditorias.view';

  RAISE NOTICE '✅ Permisos del Portal Transaccional insertados';
  RAISE NOTICE '   certificado-laboral.view = %', p_cert;
  RAISE NOTICE '   carpeta-digital.view     = %', p_carpeta;
  RAISE NOTICE '   pta.view                 = %', p_pta;
  RAISE NOTICE '   mis-auditorias.view      = %', p_audit;

  -- ─── 3. Asignar permisos a roles ───────────────────────────

  -- ══════════════════════════════════════════════════════════
  -- SUPER_ADMIN → todos los permisos del portal
  -- ══════════════════════════════════════════════════════════
  SELECT id INTO r_id FROM auth.role WHERE code = 'SUPER_ADMIN';
  IF r_id IS NOT NULL THEN
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_cert)    ON CONFLICT (id_rol, id_permission) DO NOTHING;
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_carpeta) ON CONFLICT (id_rol, id_permission) DO NOTHING;
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_pta)     ON CONFLICT (id_rol, id_permission) DO NOTHING;
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_audit)   ON CONFLICT (id_rol, id_permission) DO NOTHING;
    RAISE NOTICE '   ✅ SUPER_ADMIN → todos los permisos del portal';
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- Administrativo → certificado-laboral, carpeta-digital
  -- ══════════════════════════════════════════════════════════
  SELECT id INTO r_id FROM auth.role WHERE code = 'Administrativo';
  IF r_id IS NOT NULL THEN
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_cert)    ON CONFLICT (id_rol, id_permission) DO NOTHING;
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_carpeta) ON CONFLICT (id_rol, id_permission) DO NOTHING;
    RAISE NOTICE '   ✅ Administrativo → certificado-laboral, carpeta-digital';
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- Docente → pta, carpeta-digital
  -- ══════════════════════════════════════════════════════════
  SELECT id INTO r_id FROM auth.role WHERE code = 'Docente';
  IF r_id IS NOT NULL THEN
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_pta)     ON CONFLICT (id_rol, id_permission) DO NOTHING;
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_carpeta) ON CONFLICT (id_rol, id_permission) DO NOTHING;
    RAISE NOTICE '   ✅ Docente → pta, carpeta-digital';
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- Estudiante → carpeta-digital
  -- ══════════════════════════════════════════════════════════
  SELECT id INTO r_id FROM auth.role WHERE code = 'Estudiante';
  IF r_id IS NOT NULL THEN
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_carpeta) ON CONFLICT (id_rol, id_permission) DO NOTHING;
    RAISE NOTICE '   ✅ Estudiante → carpeta-digital';
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- Graduado → carpeta-digital
  -- ══════════════════════════════════════════════════════════
  SELECT id INTO r_id FROM auth.role WHERE code = 'Graduado';
  IF r_id IS NOT NULL THEN
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_carpeta) ON CONFLICT (id_rol, id_permission) DO NOTHING;
    RAISE NOTICE '   ✅ Graduado → carpeta-digital';
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- USUARIO_AUDITADO → mis-auditorias, carpeta-digital
  -- ══════════════════════════════════════════════════════════
  SELECT id INTO r_id FROM auth.role WHERE code = 'USUARIO_AUDITADO';
  IF r_id IS NOT NULL THEN
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_audit)   ON CONFLICT (id_rol, id_permission) DO NOTHING;
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_carpeta) ON CONFLICT (id_rol, id_permission) DO NOTHING;
    RAISE NOTICE '   ✅ USUARIO_AUDITADO → mis-auditorias, carpeta-digital';
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- Roles OCI (Backoffice) → mis-auditorias
  -- Para que el equipo OCI también pueda ver "Mis Auditorías"
  -- desde el portal si acceden al sistema portal.
  -- ══════════════════════════════════════════════════════════
  FOR r_id IN
    SELECT id FROM auth.role
    WHERE code IN ('JEFE_OCI', 'AUDITOR_LIDER', 'AUDITOR_SENIOR', 'AUDITOR_JUNIOR', 'PROFESIONAL_OCI', 'ADMIN_CI')
  LOOP
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_audit)   ON CONFLICT (id_rol, id_permission) DO NOTHING;
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_carpeta) ON CONFLICT (id_rol, id_permission) DO NOTHING;
  END LOOP;
  RAISE NOTICE '   ✅ Roles OCI → mis-auditorias, carpeta-digital';

  -- ══════════════════════════════════════════════════════════
  -- Roles directivos (aprobadores plan anual) → mis-auditorias
  -- ══════════════════════════════════════════════════════════
  FOR r_id IN
    SELECT id FROM auth.role
    WHERE code IN ('RECTOR', 'SECRETARIO_GENERAL', 'SUBDIRECTOR_ACADEMICO', 'SUBDIRECTOR_PROYECCION', 'SUBDIRECTOR_ALTO_GOBIERNO', 'JEFE_JURIDICA', 'JEFE_PLANEACION')
  LOOP
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_audit)   ON CONFLICT (id_rol, id_permission) DO NOTHING;
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_carpeta) ON CONFLICT (id_rol, id_permission) DO NOTHING;
    INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (r_id, p_cert)    ON CONFLICT (id_rol, id_permission) DO NOTHING;
  END LOOP;
  RAISE NOTICE '   ✅ Roles directivos → mis-auditorias, carpeta-digital, certificado-laboral';

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '✅ Seed de permisos del Portal Transaccional completado';
  RAISE NOTICE '════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════
-- Verificación final
-- ═══════════════════════════════════════════════════════════
SELECT 
  p.code AS permiso,
  p.name,
  COUNT(rp.id_rol) AS roles_asignados
FROM auth.permission p
LEFT JOIN auth.role_permissions rp ON rp.id_permission = p.id_permission
WHERE p.code LIKE 'portal-transaccional.%'
GROUP BY p.code, p.name
ORDER BY p.code;
