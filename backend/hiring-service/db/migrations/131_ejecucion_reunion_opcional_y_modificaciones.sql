-- ============================================================================
-- 131 · Reunión de inicio opcional y modificaciones desde la ejecución
--
-- Revisión de QA (2026-10-26):
--
-- EFDS-1167 · No todos los contratos tienen reunión de inicio. Lo que la
-- configuración llama «no detiene el flujo» (125) es justamente la actividad
-- opcional: se registra si aplica y no bloquea a las siguientes. La 9.1 queda
-- así en la versión activa y en el borrador del flujo.
--
-- EFDS-1176 · El botón de Modificaciones (9.5) se habilita desde el inicio de
-- la ejecución, es decir, desde el acta de inicio (8.7), no desde la reunión
-- (9.1). Y la supervisión registra las solicitudes: el rol
-- SUPERVISOR_CONTRATO gana «editar» en la 9.5 (aprobar sigue en Contratación).
--
-- EFDS-1171 · La 10.1 es el informe final de supervisión, no del contratista.
--
-- Idempotente.
-- ============================================================================

BEGIN;

CREATE TEMP TABLE semilla_131 (numeral varchar(10), secuencia jsonb) ON COMMIT DROP;
INSERT INTO semilla_131 VALUES
  ('9.1', '{"dependeDe": null, "noBloquea": true}'),
  ('9.5', '{"dependeDe": ["8.7"], "noBloquea": true}');

UPDATE hiring.flujo_asignaciones f
   SET secuencia = s.secuencia, updated_by = 'migración 131', updated_at = now()
  FROM semilla_131 s, hiring.flujo_versiones v
 WHERE f.numeral = s.numeral
   AND f.modalidad IS NULL
   AND v.id = f.version_id
   AND v.estado IN ('ACTIVA', 'BORRADOR');

INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, secuencia, updated_by)
SELECT v.id, s.numeral, NULL, s.secuencia, 'migración 131'
  FROM hiring.flujo_versiones v
 CROSS JOIN semilla_131 s
 WHERE v.estado IN ('ACTIVA', 'BORRADOR')
   AND NOT EXISTS (
     SELECT 1 FROM hiring.flujo_asignaciones f
      WHERE f.version_id = v.id AND f.numeral = s.numeral AND f.modalidad IS NULL
   );

INSERT INTO hiring.alcances_permiso (rol_id, accion, numeral, created_by)
SELECT r.id, 'editar', '9.5', 'migracion-131'
  FROM auth.role r
 WHERE r.code = 'SUPERVISOR_CONTRATO'
   AND NOT EXISTS (
     SELECT 1 FROM hiring.alcances_permiso ap
      WHERE ap.rol_id = r.id AND ap.accion = 'editar' AND ap.numeral = '9.5' AND ap.activo
   );

UPDATE hiring.actividades
   SET nombre = 'Informe final de supervisión'
 WHERE numeral = '10.1';

COMMIT;
