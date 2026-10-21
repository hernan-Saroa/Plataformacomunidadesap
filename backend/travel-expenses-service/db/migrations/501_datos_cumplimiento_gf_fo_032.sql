-- ============================================================================
-- Migración: 501_datos_cumplimiento_gf_fo_032.sql
-- Historias de Usuario: EFDS-1309 (legalización) y EFDS-1310 (cierre).
--
-- El formato GF-FO-032 V2 (Informe cumplimiento de comisión o desplazamiento y
-- legalización de gastos de transporte) trae las fechas en que el comisionado
-- realmente cumplió la comisión. Se capturan al legalizar, junto con si la
-- comisión se cumplió fuera de la ESAP (lo que exige el certificado de la
-- entidad externa, migración 502).
--
-- Con las fechas reales se calcula el reintegro por viaje más corto, con las
-- tarifas de la liquidación pagada. El plazo de legalización sigue saliendo de
-- la fecha planeada: la real solo se conoce al legalizar.
--
-- reintegro_viaje_corto guarda, al cerrar, la parte del reintegro que se debe
-- a los días no viajados (NULL si no se pudo calcular: sin fechas reales o sin
-- liquidación registrada).
--
-- Idempotente.
-- ============================================================================

ALTER TABLE travel_expenses.legalizaciones_comision
    ADD COLUMN IF NOT EXISTS fecha_inicio_real          DATE          NULL,
    ADD COLUMN IF NOT EXISTS fecha_fin_real             DATE          NULL,
    ADD COLUMN IF NOT EXISTS comision_externa           BOOLEAN       NULL,
    ADD COLUMN IF NOT EXISTS entidad_externa            VARCHAR(200)  NULL,
    ADD COLUMN IF NOT EXISTS cumplimiento_registrado_en TIMESTAMPTZ   NULL,
    ADD COLUMN IF NOT EXISTS cumplimiento_registrado_por_id UUID      NULL,
    ADD COLUMN IF NOT EXISTS reintegro_viaje_corto      NUMERIC(14,2) NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_legalizaciones_cumplimiento') THEN
        ALTER TABLE travel_expenses.legalizaciones_comision
            ADD CONSTRAINT chk_legalizaciones_cumplimiento
                CHECK ((fecha_inicio_real IS NULL) = (fecha_fin_real IS NULL)
                       AND (fecha_fin_real IS NULL OR fecha_fin_real >= fecha_inicio_real)
                       AND (comision_externa IS NOT TRUE OR length(trim(entidad_externa)) >= 2)
                       AND (cumplimiento_registrado_en IS NULL) = (cumplimiento_registrado_por_id IS NULL)
                       AND (reintegro_viaje_corto IS NULL OR reintegro_viaje_corto >= 0));
    END IF;
END $$;

COMMENT ON COLUMN travel_expenses.legalizaciones_comision.fecha_inicio_real IS
    'Fecha en que el comisionado realmente inició la comisión, según el GF-FO-032 V2.';
COMMENT ON COLUMN travel_expenses.legalizaciones_comision.fecha_fin_real IS
    'Fecha en que el comisionado realmente terminó la comisión, según el GF-FO-032 V2. No cambia el plazo, que sale de la fecha planeada.';
COMMENT ON COLUMN travel_expenses.legalizaciones_comision.comision_externa IS
    'TRUE si la comisión se cumplió fuera de la ESAP: exige el certificado de la entidad externa. NULL = no declarado.';
COMMENT ON COLUMN travel_expenses.legalizaciones_comision.reintegro_viaje_corto IS
    'Al cerrar: parte del reintegro por los días no viajados, con las tarifas de la liquidación pagada.';
