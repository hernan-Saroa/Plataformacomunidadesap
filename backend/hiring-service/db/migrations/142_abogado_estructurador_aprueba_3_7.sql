-- ============================================================================
-- 142 · El Abogado estructurador trae «aprobar» en la 3.7
--
-- La 3.7 (registro del comité de contratación) se protege con «aprobar», no
-- con «editar» (ACCION_QUE_HACE en src/auth/la-hace.ts): quien la hace es
-- quien tiene «aprobar 3.7». La 137 sembró al rol ABOGADO_ESTRUCTURADOR con
-- «editar 3.7» pero sin «aprobar 3.7», y el flujo por defecto pone la 3.7 en
-- el puesto Abogado estructurador. Como un puesto solo ofrece cuentas con
-- todos los permisos de lo que hace, el puesto se quedaba sin candidatos en
-- la 3.3 (Juan, 2026-11-13).
--
-- «editar 3.7» se queda: es el que deja subir los documentos de la actividad
-- (documentos-actividad). Los permisos suman, no chocan.
--
-- Solo agrega el alcance si el rol existe y no lo tiene ya. Idempotente.
-- ============================================================================

BEGIN;

INSERT INTO hiring.alcances_permiso (rol_id, accion, etapa, numeral, confirmado, created_by)
SELECT r.id, 'aprobar', NULL, '3.7', true, 'migracion-142'
  FROM auth.role r
 WHERE r.code = 'ABOGADO_ESTRUCTURADOR'
   AND NOT EXISTS (
     SELECT 1 FROM hiring.alcances_permiso ap
      WHERE ap.rol_id = r.id AND ap.accion = 'aprobar' AND ap.activo AND ap.tramite IS NULL
        AND (ap.numeral = '3.7' OR ap.etapa = 3 OR (ap.etapa IS NULL AND ap.numeral IS NULL)));

COMMIT;
