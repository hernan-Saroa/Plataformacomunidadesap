-- ============================================
-- MIGRATION: Permiso para editar datos del docente en el Banco de Docentes (PTA)
-- ============================================

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Obtener ID del módulo PTA (o banco de docentes si existe, asumiendo PTA)
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';
  
  IF v_module_id IS NOT NULL THEN
    -- Insertar el permiso de edición de docente
    INSERT INTO auth.permission (id_permission, code, name, description, id_module, created_at, is_active)
    VALUES (gen_random_uuid(), 'pta.backoffice.editar_docente', 'Editar Docente (Banco de Docentes)', 'Permite editar los datos de un docente existente desde el Banco de Docentes o Panel RUND', v_module_id, NOW(), true)
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;
