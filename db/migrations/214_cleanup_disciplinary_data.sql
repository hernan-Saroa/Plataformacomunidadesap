-- Migration 214: Limpiar datos disciplinarios
-- Elimina todos los datos relacionados con noticias y procesos disciplinarios
-- Schema: internal_disciplinary_control

-- Desactivar restricciones de claves foráneas temporalmente para evitar conflictos
SET session_replication_role = 'replica';

-- Eliminar procesos disciplinarios primero
DELETE FROM internal_disciplinary_control.disciplinary_processes;

-- Eliminar noticias disciplinarias
DELETE FROM internal_disciplinary_control.disciplinary_news;

-- Limpiar datos restantes que no fueron eliminados por CASCADE
DELETE FROM internal_disciplinary_control.evidence;
DELETE FROM internal_disciplinary_control.legal_autos;
DELETE FROM internal_disciplinary_control.disciplinary_process_tasks;
DELETE FROM internal_disciplinary_control.disciplinary_process_actuaciones;
DELETE FROM internal_disciplinary_control.disciplinary_process_notes;
DELETE FROM internal_disciplinary_control.disciplinary_process_reassignment_requests;
DELETE FROM internal_disciplinary_control.disciplinary_news_processes;

-- Reiniciar secuencias
UPDATE internal_disciplinary_control.sequences
SET "currentValue" = 0, "updatedAt" = CURRENT_TIMESTAMP
WHERE name IN ('DISCIPLINARY_NEWS_2025', 'DISCIPLINARY_PROCESS_2025');

-- Reactivar restricciones de claves foráneas
SET session_replication_role = 'origin';