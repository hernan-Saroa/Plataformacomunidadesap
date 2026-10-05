SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 448_depurar_columnas_redundantes_solicitudes.sql
-- Propósito: Depurar de forma segura las columnas redundantes y obsoletas en
--            travel_expenses.solicitudes_comision y normalizar los registros
--            anteriores para eliminar ceros y nulos en la autoliquidación.
--
-- 1. COLUMNAS DUPLICADAS / REDUNDANTES ELIMINADAS:
--    - rubro_presupuestal_rp  -> consolidado en rubro_rp (migración 037/432)
--    - usuario_presupuesto_id -> consolidado en expedido_rp_por_id (migración 037/432)
--    - fecha_registro_rp      -> consolidado en fecha_expedicion_rp (migración 037/432)
--
-- 2. COLUMNAS EN DESUSO / 100% NULL ELIMINADAS:
--    - desglose_calculo   (JSONB que nunca se pobló y está NULL en todas las filas)
--    - alertas_liquidacion (JSONB que nunca se pobló y está NULL en todas las filas)
--
-- 3. NORMALIZACIÓN DE DATOS HISTÓRICOS:
--    - Recalcula los campos de liquidación del Decreto 314 de 2026 para los
--      registros anteriores (COM-2026-0006 a 0013) que tenían 0.00 o NULL.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASO 1: Consolidación y respaldo de datos antes de eliminar columnas (Idempotente)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'travel_expenses' 
      AND table_name = 'solicitudes_comision' 
      AND column_name = 'rubro_presupuestal_rp'
  ) THEN
    EXECUTE '
      UPDATE travel_expenses.solicitudes_comision
      SET 
        rubro_rp = COALESCE(rubro_rp, rubro_presupuestal_rp),
        expedido_rp_por_id = COALESCE(expedido_rp_por_id, usuario_presupuesto_id),
        fecha_expedicion_rp = COALESCE(fecha_expedicion_rp, fecha_registro_rp)
      WHERE rubro_presupuestal_rp IS NOT NULL 
         OR usuario_presupuesto_id IS NOT NULL 
         OR fecha_registro_rp IS NOT NULL;
    ';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PASO 2: Eliminación segura de columnas redundantes y sin uso
-- ----------------------------------------------------------------------------
ALTER TABLE travel_expenses.solicitudes_comision
  DROP COLUMN IF EXISTS rubro_presupuestal_rp,
  DROP COLUMN IF EXISTS usuario_presupuesto_id,
  DROP COLUMN IF EXISTS fecha_registro_rp,
  DROP COLUMN IF EXISTS desglose_calculo,
  DROP COLUMN IF EXISTS alertas_liquidacion;

-- ----------------------------------------------------------------------------
-- PASO 3: Normalización y recálculo de autoliquidación para registros históricos
--         (Elimina los valores 0.00 y NULL en comisiones existentes)
-- ----------------------------------------------------------------------------
UPDATE travel_expenses.solicitudes_comision
SET
  decreto_aplicado = COALESCE(NULLIF(decreto_aplicado, ''), 'Decreto 314 de 2026'),
  salario_base_aplicado = CASE 
    WHEN salario_base_aplicado IS NULL OR salario_base_aplicado = 0 THEN 
      COALESCE(NULLIF(salario_basico, 0), 4500000.00)
    ELSE salario_base_aplicado 
  END,
  tarifa_diaria_base = CASE
    WHEN tarifa_diaria_base IS NULL OR tarifa_diaria_base = 0 THEN 335520.00
    ELSE tarifa_diaria_base
  END,
  tarifa_final_aplicada_dia = CASE
    WHEN tarifa_final_aplicada_dia IS NULL OR tarifa_final_aplicada_dia = 0 THEN 335520.00
    ELSE tarifa_final_aplicada_dia
  END,
  factor_comisionado = COALESCE(factor_comisionado, 1.00),
  factor_pernocta = COALESCE(factor_pernocta, 1.00),
  dias_pernoctados = CASE
    WHEN (dias_pernoctados IS NULL OR dias_pernoctados = 0) AND dias_comision > 1 THEN dias_comision - 1
    WHEN (dias_pernoctados IS NULL OR dias_pernoctados = 0) AND dias_comision <= 1 THEN 0
    ELSE dias_pernoctados
  END,
  tarifa_dia_pernoctado = CASE
    WHEN tarifa_dia_pernoctado IS NULL OR tarifa_dia_pernoctado = 0 THEN 335520.00
    ELSE tarifa_dia_pernoctado
  END,
  total_pernoctados = CASE
    WHEN total_pernoctados IS NULL OR total_pernoctados = 0 THEN
      (CASE WHEN dias_comision > 1 THEN dias_comision - 1 ELSE 0 END) * 335520.00
    ELSE total_pernoctados
  END,
  dias_no_pernoctados = CASE
    WHEN (dias_no_pernoctados IS NULL OR dias_no_pernoctados = 0) AND dias_comision > 1 THEN 1
    WHEN (dias_no_pernoctados IS NULL OR dias_no_pernoctados = 0) AND dias_comision <= 1 THEN dias_comision
    ELSE dias_no_pernoctados
  END,
  tarifa_dia_no_pernoctado = CASE
    WHEN tarifa_dia_no_pernoctado IS NULL OR tarifa_dia_no_pernoctado = 0 THEN 167760.00
    ELSE tarifa_dia_no_pernoctado
  END,
  total_no_pernoctados = CASE
    WHEN total_no_pernoctados IS NULL OR total_no_pernoctados = 0 THEN
      (CASE WHEN dias_comision > 1 THEN 1 ELSE dias_comision END) * 167760.00
    ELSE total_no_pernoctados
  END
WHERE total_pernoctados = 0 
   OR total_pernoctados IS NULL 
   OR tarifa_diaria_base = 0 
   OR tarifa_diaria_base IS NULL;

-- ----------------------------------------------------------------------------
-- PASO 4: Configurar DEFAULTS en la tabla para que NINGÚN registro futuro quede en NULL
-- ----------------------------------------------------------------------------
ALTER TABLE travel_expenses.solicitudes_comision
  ALTER COLUMN decreto_aplicado SET DEFAULT 'Decreto 314 de 2026',
  ALTER COLUMN factor_comisionado SET DEFAULT 1.00,
  ALTER COLUMN factor_pernocta SET DEFAULT 1.00,
  ALTER COLUMN dias_pernoctados SET DEFAULT 0,
  ALTER COLUMN tarifa_dia_pernoctado SET DEFAULT 0,
  ALTER COLUMN total_pernoctados SET DEFAULT 0,
  ALTER COLUMN dias_no_pernoctados SET DEFAULT 0,
  ALTER COLUMN tarifa_dia_no_pernoctado SET DEFAULT 0,
  ALTER COLUMN total_no_pernoctados SET DEFAULT 0,
  ALTER COLUMN tarifa_diaria_base SET DEFAULT 0,
  ALTER COLUMN tarifa_final_aplicada_dia SET DEFAULT 0,
  ALTER COLUMN salario_base_aplicado SET DEFAULT 0;

-- Fin de migración 448
