-- =====================================================
-- Migración: 661_add_auto_remision_competencia.sql
-- Módulo: Control Interno Disciplinario
-- Schema: internal_disciplinary_control
-- Descripción: 
--   1. Registra AUTO_REMISION_COMPETENCIA en autos_configuration
--   2. Agrega campos de remisión por competencia a legal_autos
--   3. Agrega campos de remisión por competencia a disciplinary_processes
--   4. Asigna permisos de remisión al rol SECRETARIA_RADICADOR
-- Idempotente (soporta re-ejecución segura)
-- =====================================================

-- 1. Registrar AUTO_REMISION_COMPETENCIA en autos_configuration
INSERT INTO internal_disciplinary_control.autos_configuration
  (id, tipo, nombre, estado, stage, orden, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(), 'AUTO_REMISION_COMPETENCIA', 'Auto de Remisión por Competencia', 'activo', NULL, 98, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM internal_disciplinary_control.autos_configuration WHERE tipo = 'AUTO_REMISION_COMPETENCIA'
);

UPDATE internal_disciplinary_control.autos_configuration
SET nombre = 'Auto de Remisión por Competencia',
    estado = 'activo',
    "updatedAt" = NOW()
WHERE tipo = 'AUTO_REMISION_COMPETENCIA';

-- 2. Campos de remisión en legal_autos
ALTER TABLE internal_disciplinary_control.legal_autos
  ADD COLUMN IF NOT EXISTS entidad_destino VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS entidad_destino_email VARCHAR(255) NULL;

-- 3. Campos de remisión en disciplinary_processes
ALTER TABLE internal_disciplinary_control.disciplinary_processes
  ADD COLUMN IF NOT EXISTS en_proceso_remision BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS remision_aprobada BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS numero_rc VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS entidad_remision VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS correo_entidad_remision VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS fecha_remision TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS tipo_remision VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS justificacion_remision TEXT NULL,
  ADD COLUMN IF NOT EXISTS descripcion_remision JSONB NULL;

-- Actualizar procesos existentes cuyo origen sea remisión
UPDATE internal_disciplinary_control.disciplinary_processes p
SET en_proceso_remision = true,
    entidad_remision = COALESCE(p.entidad_remision, n.entidad_remision),
    tipo_remision = COALESCE(p.tipo_remision, 'sin-competencia')
FROM internal_disciplinary_control.disciplinary_news n
WHERE p."newsId" = n.id
  AND (
    n.origen::text IN ('REMISION', 'Remisión por competencia')
    OR n.origen::text ILIKE '%remisi%'
    OR n.entidad_remision IS NOT NULL
  )
  AND (p.en_proceso_remision IS NULL OR p.en_proceso_remision = false);

-- 4. Asignar permiso control-disciplinario.procesos.redimir a roles de Radicador
DO $$
DECLARE
  v_module_id uuid;
  v_redimir_proceso_perm_id uuid;
  v_redimir_noticia_perm_id uuid;
  v_secretaria_role_id uuid;
  v_radicador_role_id uuid;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';

  -- Asegurar que el permiso para procesos existe
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'control-disciplinario.procesos.redimir',
    'Procesos - Redimir',
    'Permite remitir un proceso disciplinario por falta de competencia a otra entidad',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = true
  RETURNING id_permission INTO v_redimir_proceso_perm_id;

  IF v_redimir_proceso_perm_id IS NULL THEN
    SELECT id_permission INTO v_redimir_proceso_perm_id 
    FROM auth.permission 
    WHERE code = 'control-disciplinario.procesos.redimir';
  END IF;

  SELECT id_permission INTO v_redimir_noticia_perm_id 
  FROM auth.permission 
  WHERE code = 'control-disciplinario.noticia-disciplinaria.redimir';

  SELECT id INTO v_secretaria_role_id FROM auth.role WHERE code = 'SECRETARIA_RADICADOR';
  SELECT id INTO v_radicador_role_id FROM auth.role WHERE code = 'RADICADOR_DISCIPLINARIO';

  -- Asignar a SECRETARIA_RADICADOR
  IF v_secretaria_role_id IS NOT NULL THEN
    IF v_redimir_proceso_perm_id IS NOT NULL THEN
      INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
      VALUES (v_secretaria_role_id, v_redimir_proceso_perm_id, true)
      ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
    END IF;
    IF v_redimir_noticia_perm_id IS NOT NULL THEN
      INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
      VALUES (v_secretaria_role_id, v_redimir_noticia_perm_id, true)
      ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
    END IF;
  END IF;

  -- Asignar a RADICADOR_DISCIPLINARIO si existe
  IF v_radicador_role_id IS NOT NULL THEN
    IF v_redimir_proceso_perm_id IS NOT NULL THEN
      INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
      VALUES (v_radicador_role_id, v_redimir_proceso_perm_id, true)
      ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
    END IF;
    IF v_redimir_noticia_perm_id IS NOT NULL THEN
      INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
      VALUES (v_radicador_role_id, v_redimir_noticia_perm_id, true)
      ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
    END IF;
  END IF;

  RAISE NOTICE 'Migración 661 aplicada exitosamente: AUTO_REMISION_COMPETENCIA y permisos configurados';
END $$;
