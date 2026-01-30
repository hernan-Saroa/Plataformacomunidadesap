-- 040_fix_expedientes_etapa_kanban.sql
-- Corrige las etapas procesales para que coincidan con el Kanban de Defensa Judicial
-- Las etapas del Kanban son: NOTIFICADA, CONTESTACIÓN, PROBATORIA, ALEGATOS

SET search_path TO legal_management, public;

-- =====================================================
-- MAPEO DE ETAPAS:
-- ADMISION -> NOTIFICADA (primera etapa, demanda recibida)
-- CONTESTACION -> CONTESTACIÓN (con tilde)
-- PRUEBAS -> PROBATORIA
-- SENTENCIA -> ALEGATOS (o se puede dejar para futuras columnas)
-- =====================================================

-- Actualizar expedientes con etapas antiguas a las nuevas
UPDATE expedientes SET etapa_procesal = 'NOTIFICADA' WHERE etapa_procesal = 'ADMISION';
UPDATE expedientes SET etapa_procesal = 'NOTIFICADA' WHERE etapa_procesal = 'RADICADO';
UPDATE expedientes SET etapa_procesal = 'NOTIFICADA' WHERE etapa_procesal = 'TRASLADO_DESCARGOS';
UPDATE expedientes SET etapa_procesal = 'NOTIFICADA' WHERE etapa_procesal = 'EN_TRAMITE';
UPDATE expedientes SET etapa_procesal = 'CONTESTACIÓN' WHERE etapa_procesal = 'CONTESTACION';
UPDATE expedientes SET etapa_procesal = 'PROBATORIA' WHERE etapa_procesal = 'PRUEBAS';
UPDATE expedientes SET etapa_procesal = 'ALEGATOS' WHERE etapa_procesal = 'SENTENCIA';
UPDATE expedientes SET etapa_procesal = 'ALEGATOS' WHERE etapa_procesal = 'FALLO';
UPDATE expedientes SET etapa_procesal = 'ALEGATOS' WHERE etapa_procesal = 'ARCHIVADO';

-- Cualquier otra etapa desconocida va a NOTIFICADA
UPDATE expedientes SET etapa_procesal = 'NOTIFICADA' 
WHERE etapa_procesal NOT IN ('NOTIFICADA', 'CONTESTACIÓN', 'PROBATORIA', 'ALEGATOS');

-- También actualizar cualquier valor NULL
UPDATE expedientes SET etapa_procesal = 'NOTIFICADA' WHERE etapa_procesal IS NULL;
UPDATE expedientes SET etapa_procesal = 'NOTIFICADA' WHERE etapa_procesal IS NULL;

-- Verificación
DO $$
DECLARE
    cnt_notificada INT;
    cnt_contestacion INT;
    cnt_probatoria INT;
    cnt_alegatos INT;
BEGIN
    SELECT COUNT(*) INTO cnt_notificada FROM expedientes WHERE etapa_procesal = 'NOTIFICADA';
    SELECT COUNT(*) INTO cnt_contestacion FROM expedientes WHERE etapa_procesal = 'CONTESTACIÓN';
    SELECT COUNT(*) INTO cnt_probatoria FROM expedientes WHERE etapa_procesal = 'PROBATORIA';
    SELECT COUNT(*) INTO cnt_alegatos FROM expedientes WHERE etapa_procesal = 'ALEGATOS';
    
    RAISE NOTICE '✅ Migración 040_fix_expedientes_etapa_kanban.sql ejecutada';
    RAISE NOTICE '   - NOTIFICADA: % expedientes', cnt_notificada;
    RAISE NOTICE '   - CONTESTACIÓN: % expedientes', cnt_contestacion;
    RAISE NOTICE '   - PROBATORIA: % expedientes', cnt_probatoria;
    RAISE NOTICE '   - ALEGATOS: % expedientes', cnt_alegatos;
END $$;
