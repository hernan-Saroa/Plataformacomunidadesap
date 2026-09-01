-- ============================================================================
-- Datos sembrados para la muestra del jueves — EFDS-1370 / EFDS-1371
--
-- Red de seguridad: si algo falla al crear en vivo, hay un grupo con horario que
-- mostrar. Se marcan con observaciones = 'DEMO' para poder identificarlos y
-- borrarlos de un solo golpe:
--
--     DELETE FROM "academic-schedule".grupo WHERE observaciones = 'DEMO';
--
-- (Las franjas caen solas por el ON DELETE CASCADE de fk_franja_grupo.)
--
-- Se usa ASIG-00026 "Derecho Constitucional" de AP Diurno: presencial_dia, 4
-- créditos, 64 h de clase — del bloque del catálogo que se ve completo. Se evita
-- a propósito cualquier asignatura en 'sin_definir'.
--
-- Horario: el esquema AP real del levantamiento (lunes 11:00-13:00 presencial y
-- jueves 14:00-16:00 mediada por tecnología).
--
-- Idempotente: no vuelve a sembrar si el grupo DEMO ya existe.
-- ============================================================================

INSERT INTO "academic-schedule".grupo
    (id_asignatura, numero_grupo, cupo_maximo, estado, observaciones, fecha_inicio, fecha_fin)
SELECT a.id, 1, 35, 'PROGRAMADO', 'DEMO', DATE '2026-02-02', DATE '2026-06-12'
FROM academic_work_plan.asignatura a
WHERE a.codigo = 'ASIG-00026'
  AND NOT EXISTS (
      SELECT 1 FROM "academic-schedule".grupo g
      WHERE g.id_asignatura = a.id AND g.observaciones = 'DEMO'
  );

INSERT INTO "academic-schedule".franja_horaria
    (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, jornada, aula_codigo, estado)
SELECT g.id_grupo, 'LUNES', TIME '11:00', TIME '13:00', 'presencial', 'DIURNA', 'Aula 204', 'PROGRAMADO'
FROM "academic-schedule".grupo g
JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura AND a.codigo = 'ASIG-00026'
WHERE g.observaciones = 'DEMO'
  AND NOT EXISTS (
      SELECT 1 FROM "academic-schedule".franja_horaria f
      WHERE f.id_grupo = g.id_grupo AND f.dia_semana = 'LUNES' AND f.hora_inicio = TIME '11:00'
  );

INSERT INTO "academic-schedule".franja_horaria
    (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, jornada, estado)
SELECT g.id_grupo, 'JUEVES', TIME '14:00', TIME '16:00', 'mediada_tecnologia', 'DIURNA', 'PROGRAMADO'
FROM "academic-schedule".grupo g
JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura AND a.codigo = 'ASIG-00026'
WHERE g.observaciones = 'DEMO'
  AND NOT EXISTS (
      SELECT 1 FROM "academic-schedule".franja_horaria f
      WHERE f.id_grupo = g.id_grupo AND f.dia_semana = 'JUEVES' AND f.hora_inicio = TIME '14:00'
  );
