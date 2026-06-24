-- ============================================================================
-- Migración 360: Limpieza de datos de aprobación del Plan Anual
-- Fecha: 2026-06-23
-- Descripción:
--   1. Elimina registros corruptos en plan_anual_5_roles con años negativos
--   2. Desactiva registros fantasma de Aprobador PAI sin persona real
--   3. Sincroniza el equipo_aprobacion de cada plan con los aprobadores reales
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 1: Eliminar planes con años corruptos (negativos o irreales)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM control_interno.plan_anual_5_roles
  WHERE ano < 0 OR ano > 2100;

  IF v_count > 0 THEN
    RAISE NOTICE '[Migración 360] Eliminando % plan(es) con año corrupto', v_count;
  END IF;
END $$;

-- Eliminar actividades, roles y planes corruptos
DELETE FROM control_interno.actividad_plan_anual_5
WHERE rol_id IN (
  SELECT r.id FROM control_interno.rol_plan_anual_5 r
  JOIN control_interno.plan_anual_5_roles p ON r.plan_id = p.id
  WHERE p.ano < 0 OR p.ano > 2100
);

DELETE FROM control_interno.rol_plan_anual_5
WHERE plan_id IN (
  SELECT id FROM control_interno.plan_anual_5_roles
  WHERE ano < 0 OR ano > 2100
);

DELETE FROM control_interno.plan_anual_5_roles
WHERE ano < 0 OR ano > 2100;


-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 2: Desactivar registros de Aprobador PAI sin persona real en auth
-- (configuraciones fantasma / datos de prueba)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM control_interno.configuracion_profesionales_ocig cfg
  LEFT JOIN auth.personas p ON p.id_person = cfg.id_tercero::uuid
  WHERE cfg.rol_ocig = 'Aprobador PAI'
    AND cfg.activo = true
    AND p.id_person IS NULL;

  RAISE NOTICE '[Migración 360] Desactivando % registro(s) de Aprobador PAI sin persona real', v_count;
END $$;

UPDATE control_interno.configuracion_profesionales_ocig
SET activo = false, 
    observaciones = COALESCE(observaciones, '') || ' [Desactivado automáticamente: sin persona vinculada en auth.personas - Migración 360]',
    updated_at = NOW()
WHERE rol_ocig = 'Aprobador PAI'
  AND activo = true
  AND id_tercero NOT IN (
    SELECT id_person::text FROM auth.personas WHERE id_person IS NOT NULL
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 3: Sincronizar equipo_aprobacion de planes existentes
-- Actualizar los planes cuyo equipo_aprobacion contiene aprobadores que
-- ya no tienen persona real, reemplazándolos con los aprobadores válidos actuales
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_plan RECORD;
  v_nuevo_equipo JSONB;
  v_count INTEGER := 0;
BEGIN
  -- Construir el nuevo equipo de aprobación basado en los aprobadores REALES
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id_person::text,
      'idPerson', p.id_person::text,
      'idTercero', p.id_person::text,
      'nombre', p.nom_largo,
      'email', COALESCE(p.dir_email, ''),
      'cargo', 'Aprobador PAI',
      'estado', 'PENDIENTE'
    ) ORDER BY p.nom_largo
  ) INTO v_nuevo_equipo
  FROM control_interno.configuracion_profesionales_ocig cfg
  INNER JOIN auth.personas p ON p.id_person = cfg.id_tercero::uuid
  WHERE cfg.rol_ocig = 'Aprobador PAI'
    AND cfg.activo = true
    AND p.nom_largo IS NOT NULL;

  IF v_nuevo_equipo IS NULL THEN
    RAISE NOTICE '[Migración 360] No se encontraron aprobadores PAI válidos. No se actualizan planes.';
    RETURN;
  END IF;

  -- Actualizar solo planes en estado borrador o en-revision
  -- (No tocar planes ya completados/en-ejecucion con firmas existentes)
  FOR v_plan IN 
    SELECT id, ano, estado 
    FROM control_interno.plan_anual_5_roles 
    WHERE estado IN ('borrador', 'en-revision')
  LOOP
    UPDATE control_interno.plan_anual_5_roles
    SET equipo_aprobacion = v_nuevo_equipo,
        updated_at = NOW()
    WHERE id = v_plan.id;
    
    v_count := v_count + 1;
    RAISE NOTICE '[Migración 360] Plan % (año %) actualizado con % aprobadores reales', 
      v_plan.id, v_plan.ano, jsonb_array_length(v_nuevo_equipo);
  END LOOP;

  RAISE NOTICE '[Migración 360] Total: % plan(es) actualizados con aprobadores reales', v_count;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_aprobadores_activos INTEGER;
  v_planes INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_aprobadores_activos
  FROM control_interno.configuracion_profesionales_ocig cfg
  INNER JOIN auth.personas p ON p.id_person = cfg.id_tercero::uuid
  WHERE cfg.rol_ocig = 'Aprobador PAI' AND cfg.activo = true;

  SELECT COUNT(*) INTO v_planes
  FROM control_interno.plan_anual_5_roles;

  RAISE NOTICE '[Migración 360] Resultado: % Aprobadores PAI activos, % planes en total', v_aprobadores_activos, v_planes;
END $$;

COMMIT;
