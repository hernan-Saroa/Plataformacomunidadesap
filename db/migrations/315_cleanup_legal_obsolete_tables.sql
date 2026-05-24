-- Migration 315: Cleanup de tablas obsoletas en legal_management
-- Contexto: tabla `abogados` reemplazada por auth federado.
--
-- Antes de ejecutar esta migracion, validar:
-- 1) SELECT conname FROM pg_constraint WHERE confrelid = 'legal_management.abogados'::regclass;
--    Confirmar nombres reales de las FKs y ajustar si difieren.
-- 2) SELECT COUNT(*) FROM legal_management.riesgos_historial;
--    Si tiene datos, migrarlos a legal_management.riesgo_historial antes.
-- 3) Hacer backup de legal_management.abogados por si hay que recuperar mapping id -> nombre.
--
-- Las FKs de riesgos.responsable_id (224) y requerimientos_oc.abogado_asignado_id (305) ya fueron sueltas.
-- Esta migracion suelta las 7 FKs restantes, dropea tablas huerfanas, elimina el trigger de historial OC
-- y finalmente dropea abogados.

BEGIN;

-- 1) Soltar las 7 FKs restantes hacia abogados (los nombres reales pueden variar:
--    confirmar con: SELECT conname FROM pg_constraint WHERE confrelid = 'legal_management.abogados'::regclass;)
ALTER TABLE IF EXISTS legal_management.audiencias            DROP CONSTRAINT IF EXISTS audiencias_abogado_id_fkey;
ALTER TABLE IF EXISTS legal_management.comentarios_oc        DROP CONSTRAINT IF EXISTS comentarios_oc_autor_id_fkey;
ALTER TABLE IF EXISTS legal_management.conceptos_juridicos   DROP CONSTRAINT IF EXISTS conceptos_juridicos_abogado_redactor_id_fkey;
ALTER TABLE IF EXISTS legal_management.consultas_juridicas   DROP CONSTRAINT IF EXISTS consultas_juridicas_abogado_asignado_id_fkey;
ALTER TABLE IF EXISTS legal_management.notas_expediente      DROP CONSTRAINT IF EXISTS notas_expediente_autor_id_fkey;
ALTER TABLE IF EXISTS legal_management.planes_mejoramiento   DROP CONSTRAINT IF EXISTS planes_mejoramiento_responsable_id_fkey;
ALTER TABLE IF EXISTS legal_management.tareas_expediente     DROP CONSTRAINT IF EXISTS tareas_expediente_responsable_id_fkey;

-- 2) Eliminar trigger + funcion de historial OC (la tabla destino se dropea abajo)
DROP TRIGGER IF EXISTS trg_historial_oc ON legal_management.requerimientos_oc;
DROP FUNCTION IF EXISTS legal_management.registrar_historial_oc() CASCADE;

-- 3) Renombrar riesgos_historial (plural, basura) -> fusionar con riesgo_historial (singular, en uso)
--    Si riesgos_historial tiene datos que deban preservarse, migrarlos manualmente ANTES de correr esta migracion.
--    Asumimos que esta vacia o no se requiere preservar (confirmar con: SELECT COUNT(*) FROM legal_management.riesgos_historial;)
DROP TABLE IF EXISTS legal_management.riesgos_historial CASCADE;

-- 4) Dropear tablas huerfanas
DROP TABLE IF EXISTS legal_management.avances_hallazgo            CASCADE;
DROP TABLE IF EXISTS legal_management.historial_requerimientos_oc CASCADE;

-- 5) Finalmente dropear abogados
DROP TABLE IF EXISTS legal_management.abogados CASCADE;

COMMIT;
