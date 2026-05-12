-- ============================================
-- Script de Limpieza de Datos Disciplinarios
-- Elimina todos los datos de las tablas relacionadas con el módulo disciplinario
-- Schema: internal_disciplinary_control
-- Ejecutar con cuidado - ESTE SCRIPT ELIMINA TODOS LOS DATOS
-- ============================================

-- Desactivar restricciones de claves foráneas temporalmente
SET session_replication_role = 'replica';

-- ============================================
-- 1. Eliminar datos de tablas dependientes (orden inverso de dependencias)
-- ============================================

-- Tablas con CASCADE automático (se eliminarán con sus padres):
-- - disciplinary_process_tasks (CASCADE desde disciplinary_processes)
-- - disciplinary_process_actuaciones (CASCADE desde disciplinary_processes)
-- - disciplinary_process_notes (CASCADE desde disciplinary_processes)
-- - disciplinary_process_reassignment_requests (CASCADE desde disciplinary_processes)
-- - evidence (CASCADE desde disciplinary_processes)
-- - legal_autos (CASCADE desde disciplinary_processes)
-- - disciplinary_news_processes (CASCADE desde disciplinary_news y disciplinary_processes)

-- ============================================
-- 2. Eliminar procesos disciplinarios primero (referencian noticias)
-- ============================================
DELETE FROM internal_disciplinary_control.disciplinary_processes;

-- ============================================
-- 3. Eliminar noticias disciplinarias (ya no tienen procesos asociados)
-- ============================================
DELETE FROM internal_disciplinary_control.disciplinary_news;

-- ============================================
-- 4. Limpiar secuencias (reiniciar contadores)
-- ============================================
UPDATE internal_disciplinary_control.sequences
SET "currentValue" = 0, "updatedAt" = CURRENT_TIMESTAMP
WHERE name IN ('DISCIPLINARY_NEWS_2025', 'DISCIPLINARY_PROCESS_2025');

-- ============================================
-- 5. Verificar que las tablas estén vacías
-- ============================================
-- SELECT 'disciplinary_news' AS tabla, COUNT(*) AS registros FROM internal_disciplinary_control.disciplinary_news
-- UNION ALL
-- SELECT 'disciplinary_processes' AS tabla, COUNT(*) AS registros FROM internal_disciplinary_control.disciplinary_processes
-- UNION ALL
-- SELECT 'disciplinary_process_tasks' AS tabla, COUNT(*) AS registros FROM internal_disciplinary_control.disciplinary_process_tasks
-- UNION ALL
-- SELECT 'disciplinary_process_actuaciones' AS tabla, COUNT(*) AS registros FROM internal_disciplinary_control.disciplinary_process_actuaciones
-- UNION ALL
-- SELECT 'disciplinary_process_notes' AS tabla, COUNT(*) AS registros FROM internal_disciplinary_control.disciplinary_process_notes
-- UNION ALL
-- SELECT 'disciplinary_process_reassignment_requests' AS tabla, COUNT(*) AS registros FROM internal_disciplinary_control.disciplinary_process_reassignment_requests
-- UNION ALL
-- SELECT 'evidence' AS tabla, COUNT(*) AS registros FROM internal_disciplinary_control.evidence
-- UNION ALL
-- SELECT 'legal_autos' AS tabla, COUNT(*) AS registros FROM internal_disciplinary_control.legal_autos
-- UNION ALL
-- SELECT 'disciplinary_news_processes' AS tabla, COUNT(*) AS registros FROM internal_disciplinary_control.disciplinary_news_processes;

-- Reactivar restricciones de claves foráneas
SET session_replication_role = 'origin';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================