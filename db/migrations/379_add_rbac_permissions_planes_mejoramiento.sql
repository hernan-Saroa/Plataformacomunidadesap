-- =============================================================================
-- Migration 379: Permisos RBAC nuevos para Planes de Mejoramiento y Seguimiento
-- =============================================================================
-- Permite validar evidencias, registrar seguimiento y cerrar planes de mejoramiento.
-- Relacionado con: RF015 / US-025
-- =============================================================================

DO $$
DECLARE
  v_module_id uuid;
BEGIN
-- Obtener el módulo de Gestión Legal (juzgamiento vive bajo el mismo módulo)
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-interno';

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el módulo auth.module con code = ''control-interno''. Ejecute primero las migraciones del módulo de control-interno.';
  END IF;
  -- Solo insertar si la tabla de permisos existe
  IF EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'permission')
  THEN
    INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
    VALUES
      (gen_random_uuid(), 'control-interno.planes-mejoramiento.validar-evidencia',
       'Validar Evidencias Plan Mejoramiento',
       'Calificar evidencias de acciones de mejora (Aceptado/Con Observaciones). Ref: US-032 / RF-SG-02',
       v_module_id, true),
      (gen_random_uuid(), 'control-interno.planes-mejoramiento.seguimiento',
       'Seguimiento Plan Mejoramiento',
       'Registrar seguimiento y evaluacion de acciones de mejora. Ref: EM-PT-002 act. 5',
       v_module_id, true),
      (gen_random_uuid(), 'control-interno.planes-mejoramiento.cerrar',
       'Cerrar Plan Mejoramiento',
       'Cerrar y archivar planes de mejoramiento. Ref: EM-PT-002 act. 8-10',
       v_module_id, true)
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;
