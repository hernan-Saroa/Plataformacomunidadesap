-- ============================================================================
-- 651 · Permisos de las modificaciones contractuales
--
-- EFDS-1177 (RF-MOD-02): prórroga en tiempo, actividad 9.5.
--
-- Solicitar y aprobar van separados a propósito: quien pide la prórroga no
-- puede concedérsela. Es la misma separación que ya tienen el estudio previo
-- —`actividad.edit` frente a `actividad.approve`— y el CDP.
--
-- Aditiva: solo agrega códigos nuevos al catálogo. No asigna permisos a ningún
-- rol —eso es configuración de la entidad— ni toca los que ya existen.
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
    SELECT id_module INTO v_module_id
    FROM auth.module
    WHERE code = 'contratacion';
  END IF;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el módulo de contratación en auth.module ni permisos previos suyos en auth.permission: siembra primero el catálogo de módulos.';
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'contratacion.modificacion.solicitar',
     'Solicitar modificación contractual',
     'Pedir una prórroga u otra modificación del contrato, con su justificación técnica',
     v_module_id, true, NOW(), NOW()),

    (gen_random_uuid(), 'contratacion.modificacion.aprobar',
     'Aprobar modificación contractual',
     'Conceder o negar la modificación solicitada, con el acto administrativo que la soporta',
     v_module_id, true, NOW(), NOW()),

    (gen_random_uuid(), 'contratacion.modificacion.ver',
     'Consultar modificaciones del contrato',
     'Consultar el plazo vigente del contrato y el historial de sus modificaciones',
     v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

  RAISE NOTICE 'Permisos de modificaciones contractuales sembrados (módulo %)', v_module_id;
END $$;
