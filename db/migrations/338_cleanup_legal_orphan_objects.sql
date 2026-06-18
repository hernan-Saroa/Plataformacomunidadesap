-- Migration 338: Limpieza de objetos huérfanos en legal_management
--
-- Contexto: tras la eliminación de `abogados` (migración 315), quedan objetos de BD
-- sin entity, sin trigger y sin uso en código. Esta migración los elimina.
-- No requiere cambios de código (ninguno de estos objetos se referencia en el repo).
--
-- NO EJECUTAR AUTOMÁTICAMENTE. Aplicar manualmente tras las validaciones de abajo.
--
-- Validaciones previas (ejecutar y confirmar ANTES de correr la migración):
--   1) test_data sin datos relevantes:
--      SELECT COUNT(*) FROM legal_management.test_data;
--   2) Ningún trigger usa las funciones a eliminar (debe retornar 0 filas):
--      SELECT t.tgname, t.tgrelid::regclass, p.proname
--      FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
--      WHERE p.proname IN ('generar_numero_concepto','generar_radicado_consulta');
--   3) La tabla conceptos_juridicos no existe (debe ser NULL):
--      SELECT to_regclass('legal_management.conceptos_juridicos');

BEGIN;

-- 1) Funciones huérfanas:
--    - generar_numero_concepto(): su tabla destino `conceptos_juridicos` no existe.
--    - generar_radicado_consulta(): genera patrón 'CONS-OJ-...' pero el código genera
--      'CJ-...' a nivel app; ningún trigger la invoca.
DROP FUNCTION IF EXISTS legal_management.generar_numero_concepto() CASCADE;
DROP FUNCTION IF EXISTS legal_management.generar_radicado_consulta() CASCADE;

-- 2) Secuencias huérfanas (los radicados se generan en código: CJ-…, REQ-OC-…)
DROP SEQUENCE IF EXISTS legal_management.seq_concepto_numero;
DROP SEQUENCE IF EXISTS legal_management.seq_consulta_radicado;
DROP SEQUENCE IF EXISTS legal_management.seq_radicado_oc;

-- 3) Tabla de pruebas (sin entity, sin código, sin migración que la cree).
--    CASCADE elimina también la secuencia test_data_id_seq (OWNED BY).
DROP TABLE IF EXISTS legal_management.test_data CASCADE;

COMMIT;
