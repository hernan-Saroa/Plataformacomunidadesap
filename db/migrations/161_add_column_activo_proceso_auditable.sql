-- ============================================================================
-- MIGRACIÓN 161: Agregar columna activo a proceso_auditable
-- Fecha: 2026-03-11
-- Descripción: Catálogo parametrizado - permite inactivar procesos sin eliminar
--              Solo procesos activos se muestran en Universo de Auditoría
-- Ejecutar en Docker: docker exec -i superapp-db psql -U postgres -d esap_db -f - < db/migrations/161_add_column_activo_proceso_auditable.sql
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'proceso_auditable' 
        AND column_name = 'activo'
    ) THEN
        ALTER TABLE control_interno.proceso_auditable 
        ADD COLUMN activo BOOLEAN DEFAULT true;
        RAISE NOTICE 'Columna activo agregada a proceso_auditable';
    ELSE
        RAISE NOTICE 'Columna activo ya existe en proceso_auditable';
    END IF;
END $$;

UPDATE control_interno.proceso_auditable SET activo = true WHERE activo IS NULL;
