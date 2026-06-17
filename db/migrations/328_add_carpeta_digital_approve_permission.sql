-- ============================================
-- MIGRATION: Permiso para aprobar documentos RUND (Carpeta Digital)
-- ============================================

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Obtener ID del módulo Carpeta Digital
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'carpeta-digital';
  
  IF v_module_id IS NOT NULL THEN
    -- Insertar el permiso de aprobación
    INSERT INTO auth.permission (id_permission, code, name, description, id_module, created_at, is_active)
    VALUES (gen_random_uuid(), 'carpeta-digital.approve', 'Aprobar Documentos', 'Permite aprobar los documentos cargados en la Carpeta Digital (RUND)', v_module_id, NOW(), true)
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;
