-- ============================================================================
-- rol_pruebas_legalizacion.sql
--
-- ⚠️  SOLO PARA DESARROLLO LOCAL. NO EJECUTAR en dev, qa, pre ni prod.
--     Vive fuera de db/migrations/ para que ningún runner lo aplique solo.
--
-- Crea el rol dedicado con el que las pruebas automatizadas (RUN_DB_TESTS=1)
-- purgan los expedientes de legalización cerrados que ellas mismas crearon.
-- La inmutabilidad (migraciones 451, 452 y 454) solo cede ante este rol, y solo
-- con SET LOCAL travel_expenses.purga_pruebas = 'on' en la misma transacción.
--
-- Sin LOGIN: nadie se conecta como este rol; la limpieza hace SET LOCAL ROLE
-- desde la conexión de pruebas. Solo puede borrar en las tablas de la Etapa 9.
--
-- Idempotente.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'travel_expenses_pruebas') THEN
        CREATE ROLE travel_expenses_pruebas NOLOGIN;
    END IF;
END $$;

GRANT USAGE ON SCHEMA travel_expenses TO travel_expenses_pruebas;
GRANT SELECT, DELETE ON
    travel_expenses.legalizacion_reversiones,
    travel_expenses.legalizacion_revisiones,
    travel_expenses.legalizacion_soportes,
    travel_expenses.legalizaciones_comision
TO travel_expenses_pruebas;

-- La conexión de pruebas (postgres en local) debe poder asumir el rol.
GRANT travel_expenses_pruebas TO CURRENT_USER;
