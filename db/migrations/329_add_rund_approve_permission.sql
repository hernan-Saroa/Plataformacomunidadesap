-- ============================================
-- MIGRATION: Permiso para aprobar documentos RUND (Gestión Profesoral)
-- ============================================

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Obtener ID del módulo Gestión Profesoral
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-profesoral';
  
  IF v_module_id IS NOT NULL THEN
    -- Insertar el permiso de aprobación de documentos
    INSERT INTO auth.permission (id_permission, code, name, description, id_module, created_at, is_active)
    VALUES (gen_random_uuid(), 'gestion-profesoral.approve_documents', 'Aprobar Documentos RUND', 'Permite aprobar los documentos cargados por los docentes en el RUND', v_module_id, NOW(), true)
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;
