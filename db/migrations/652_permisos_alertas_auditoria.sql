-- ============================================================================
-- 652 · Permisos de alertas y auditoría del expediente
--
-- EFDS-1185 (RF-SIS-03) y EFDS-1186.
--
-- Aditiva: solo agrega códigos al catálogo. No asigna permisos a ningún rol
-- —eso es configuración de la entidad— ni toca los que ya existen.
-- ============================================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id_module INTO v_module_id
  FROM auth.permission
  WHERE code LIKE 'contratacion.%'
  LIMIT 1;

  IF v_module_id IS NULL THEN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'contratacion';
  END IF;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el módulo de contratación en auth.module ni permisos previos suyos en auth.permission: siembra primero el catálogo de módulos.';
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'contratacion.alerta.ver',
     'Consultar alertas de vencimiento',
     'Ver las pólizas, CDP, RP y plazos de liquidación próximos a vencer o ya vencidos',
     v_module_id, true, NOW(), NOW()),

    (gen_random_uuid(), 'contratacion.expediente.auditar',
     'Auditar el expediente del proceso',
     'Consultar el expediente completo con su trazabilidad, documentos y hash de integridad',
     v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

  RAISE NOTICE 'Permisos de alertas y auditoría sembrados (módulo %)', v_module_id;
END $$;
