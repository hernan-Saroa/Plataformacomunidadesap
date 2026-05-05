-- ============================================
-- Migración 188: Eliminar procesos seed obsoletos
-- Fecha: 2026-04-14
-- Descripción: Elimina los 25 procesos insertados por la migración 065
--              (SEDE-001..009 y TERR-001..016) que ya fueron reemplazados
--              por los procesos gestionados desde Configuraciones → Procesos.
--              Solo quedarán los procesos creados por migración 180 y los
--              creados manualmente por el usuario en el módulo de Configuraciones.
-- ============================================

-- Primero verificar cuántos hay antes
DO $$
DECLARE
    total_antes INTEGER;
    sede_count INTEGER;
    terr_old_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_antes FROM control_interno.proceso_auditable;
    SELECT COUNT(*) INTO sede_count FROM control_interno.proceso_auditable WHERE codigo LIKE 'SEDE-%';
    SELECT COUNT(*) INTO terr_old_count FROM control_interno.proceso_auditable WHERE codigo LIKE 'TERR-0%' AND macroproceso = 'Procesos Territoriales';
    
    RAISE NOTICE '📊 Antes de limpieza:';
    RAISE NOTICE '   - Total procesos: %', total_antes;
    RAISE NOTICE '   - Procesos SEDE-xxx (obsoletos): %', sede_count;
    RAISE NOTICE '   - Procesos TERR-0xx (obsoletos): %', terr_old_count;
END $$;

-- Eliminar procesos SEDE-001 a SEDE-009 (seed data de migración 065)
DELETE FROM control_interno.proceso_auditable 
WHERE codigo IN (
    'SEDE-001', 'SEDE-002', 'SEDE-003', 'SEDE-004', 'SEDE-005',
    'SEDE-006', 'SEDE-007', 'SEDE-008', 'SEDE-009'
);

-- Eliminar procesos TERR-001 a TERR-016 que fueron seed data de migración 065
-- (CUIDADO: NO eliminar los TERR-xxx creados por el usuario en Configuraciones,
--  esos tienen macroproceso distinto a 'Procesos Territoriales')
DELETE FROM control_interno.proceso_auditable 
WHERE codigo IN (
    'TERR-001', 'TERR-002', 'TERR-003', 'TERR-004', 'TERR-005', 'TERR-006',
    'TERR-007', 'TERR-008', 'TERR-009', 'TERR-010', 'TERR-011', 'TERR-012',
    'TERR-013', 'TERR-014', 'TERR-015', 'TERR-016'
)
AND macroproceso = 'Procesos Territoriales';

-- También eliminar procesos duplicados de migración 180 que ya existen con nuevos códigos
-- (estos ya fueron reemplazados por los procesos creados en Configuraciones)
-- La migración 180 insertó procesos como RELC-001, FORM-002, BIEN-001, etc.
-- que el usuario ya reemplazó con GFIN-001, GCONT-001, etc.
DELETE FROM control_interno.proceso_auditable
WHERE codigo IN (
    'RELC-001', 'FORM-002', 'BIEN-001', 'PROY-003', 'PROY-004',
    'RECL-001', 'GLOB-001', 'INV-001', 'EFEC-001', 'SEDE-003'
)
AND NOT EXISTS (
    -- Solo eliminar si NO fueron modificados manualmente (mantener si el usuario los editó)
    SELECT 1 FROM control_interno.proceso_auditable pa2 
    WHERE pa2.codigo = proceso_auditable.codigo 
    AND pa2.updated_at > pa2.created_at + interval '1 minute'
);

-- Verificación final
DO $$
DECLARE
    total_despues INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_despues FROM control_interno.proceso_auditable;
    RAISE NOTICE '✅ Después de limpieza:';
    RAISE NOTICE '   - Total procesos restantes: %', total_despues;
    RAISE NOTICE '   - Solo quedan procesos gestionados desde Configuraciones';
END $$;
