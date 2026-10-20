-- ============================================================================
-- 041 · EFDS-2314 — Semestres con los ids y códigos que siembra el importador.
--
-- La 007 (EFDS-1368) siembra academic_work_plan.ubicacion_semestral con códigos
-- PRE_x / POS_x e ids de serie (posgrado primero). El importador de la carga
-- masiva del PTA (asignaturas-import.service.ts, seedUbicacionesSemestrales)
-- siembra ids FIJOS: 1–12 pregrado ('1'..'12') y 13–16 posgrado ('Sem I'..),
-- con ON CONFLICT (id). En un ambiente donde corrió la 007 antes de la primera
-- carga, la carga real falla por ubicacion_semestral_etiqueta_key (la
-- simulación no lo detecta). No se edita la 007: esta migración la reconcilia.
--
-- Se guía por la ETIQUETA (única): cada fila va al id y código del importador y
-- las asignaturas se reapuntan. Si ya está como el importador (lo normal en dev,
-- donde la carga corrió primero), no hace nada. Una etiqueta desconocida que
-- ocupe un id del importador aborta: no se adivina.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

DO $$
DECLARE
  pendientes int;
  intrusos int;
BEGIN
  CREATE TEMP TABLE objetivo (id smallint, codigo varchar, etiqueta varchar, tipo varchar, orden smallint) ON COMMIT DROP;
  INSERT INTO objetivo VALUES
    (1,'1','Primer semestre','pregrado',1), (2,'2','Segundo semestre','pregrado',2),
    (3,'3','Tercer semestre','pregrado',3), (4,'4','Cuarto semestre','pregrado',4),
    (5,'5','Quinto semestre','pregrado',5), (6,'6','Sexto semestre','pregrado',6),
    (7,'7','Séptimo semestre','pregrado',7), (8,'8','Octavo semestre','pregrado',8),
    (9,'9','Noveno semestre','pregrado',9), (10,'10','Décimo semestre','pregrado',10),
    (11,'11','Onceavo semestre','pregrado',11), (12,'12','Doceavo semestre','pregrado',12),
    (13,'Sem I','Semestre I','posgrado',13), (14,'Sem II','Semestre II','posgrado',14),
    (15,'Sem III','Semestre III','posgrado',15), (16,'Sem IV','Semestre IV','posgrado',16);

  -- ¿Algo que reconciliar? (fila con la etiqueta en otro id o con otro código)
  SELECT COUNT(*) INTO pendientes
    FROM academic_work_plan.ubicacion_semestral u JOIN objetivo o ON o.etiqueta = u.etiqueta
   WHERE u.id <> o.id OR u.codigo <> o.codigo OR u.orden <> o.orden;
  IF pendientes = 0 THEN
    RAISE NOTICE '041: ubicacion_semestral ya está como el importador; nada que hacer.';
    RETURN;
  END IF;

  -- Una fila con etiqueta desconocida en un id del importador: no se adivina.
  SELECT COUNT(*) INTO intrusos
    FROM academic_work_plan.ubicacion_semestral u
   WHERE u.id BETWEEN 1 AND 16 AND NOT EXISTS (SELECT 1 FROM objetivo o WHERE o.etiqueta = u.etiqueta);
  IF intrusos > 0 THEN
    RAISE EXCEPTION '041: % fila(s) de ubicacion_semestral con etiqueta desconocida ocupan ids del importador (1–16).', intrusos;
  END IF;

  CREATE TEMP TABLE mapa ON COMMIT DROP AS
    SELECT u.id AS viejo, o.id AS nuevo FROM academic_work_plan.ubicacion_semestral u JOIN objetivo o ON o.etiqueta = u.etiqueta;

  ALTER TABLE academic_work_plan.asignatura DROP CONSTRAINT IF EXISTS asignatura_id_ubicacion_semestral_fkey;
  UPDATE academic_work_plan.asignatura a SET id_ubicacion_semestral = m.nuevo FROM mapa m WHERE a.id_ubicacion_semestral = m.viejo;
  -- Paso intermedio para no chocar con las restricciones únicas (id, código, etiqueta).
  UPDATE academic_work_plan.ubicacion_semestral u
     SET id = u.id + 1000, codigo = 't' || u.id, etiqueta = 't' || u.id
    FROM mapa m WHERE u.id = m.viejo;
  UPDATE academic_work_plan.ubicacion_semestral u
     SET id = m.nuevo, codigo = o.codigo, etiqueta = o.etiqueta, tipo_programa = o.tipo, orden = o.orden
    FROM mapa m JOIN objetivo o ON o.id = m.nuevo
   WHERE u.id = m.viejo + 1000;
  ALTER TABLE academic_work_plan.asignatura ADD CONSTRAINT asignatura_id_ubicacion_semestral_fkey
    FOREIGN KEY (id_ubicacion_semestral) REFERENCES academic_work_plan.ubicacion_semestral(id);
  PERFORM setval(pg_get_serial_sequence('academic_work_plan.ubicacion_semestral', 'id'),
                 GREATEST(16, (SELECT MAX(id) FROM academic_work_plan.ubicacion_semestral)));
  RAISE NOTICE '041: % semestres reconciliados con el importador.', (SELECT COUNT(*) FROM mapa);
END $$;
