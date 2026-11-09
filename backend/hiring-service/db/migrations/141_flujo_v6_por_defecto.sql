-- ============================================================================
-- 141 · El flujo actual de Juan (versión 6) pasa a ser el por defecto
--
-- La 137 dejó como por defecto la versión 3 del flujo. Juan (2026-10-30) siguió
-- ajustándolo desde la pantalla hasta la versión 6, que es la activa en su base
-- y no estaba en ninguna migración. Juan (2026-11-05): que el flujo actual sea
-- el que trae el módulo.
--
-- Lo que cambia frente a la 137:
--
--   4.2    la aprueba un escalón propio, el puesto Abogado estructurador, en vez
--          de la cadena «Revisión del estudio previo».
--   5.1    sin aprobación (antes, la cadena «Revisión del estudio previo»).
--   5.2    la hace quien tenga el permiso, sin aprobación, y no detiene el flujo.
--   5.3    la hace quien tenga el permiso, sin aprobación, sin dependencia y no
--          detiene el flujo.
--   8.8    detiene el flujo: obligatoria antes de la etapa 9 (ya lo hace la 138).
--   9.5    depende de la 8.1, no de la 8.7 (ya lo hace la 138).
--
-- Y en la cadena «Revisión del estudio previo», el primer escalón
-- (estructurador y revisor de estudios de sector y de mercado) ahora también
-- puede devolver, no solo aprobar.
--
--   1. La cadena se ajusta por nombre donde exista activa y sea distinta. Los
--      puestos van por nombre: en cada ambiente tienen ids distintos.
--   2. El flujo: si la versión activa no es ya la de abajo, se crea una nueva,
--      se activa y pasan a ella los procesos vivos, igual que la 137 y que
--      activar desde la pantalla. En la base de Juan la activa ya es esta, así
--      que no cambia nada.
--
-- Lo que NO se toca: los roles y sus permisos, los puestos, las demás cadenas
-- ni el borrador del flujo si lo hay.
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- ========================================== 1. cadena del estudio previo --

CREATE TEMP TABLE cadena_141 ON COMMIT DROP AS
SELECT (
  SELECT jsonb_agg(
           e || jsonb_build_object('puestos', (
             SELECT COALESCE(jsonb_agg(p.id::text ORDER BY o.n), '[]'::jsonb)
               FROM jsonb_array_elements_text(e -> 'puestos') WITH ORDINALITY o(nombre, n)
               JOIN hiring.puestos_proceso p ON lower(p.nombre) = lower(o.nombre) AND p.activo))
           ORDER BY i)
    FROM jsonb_array_elements(
      '[{"roles": [], "nombre": "Estructurador y revisor estudios de sector y de mercado", "papeles": [], "puestos": ["Abogado estructurador", "Revisor estudios de sector y de mercado"], "acciones": ["APROBAR", "DEVOLVER"], "personas": [], "reglaDecision": "TODOS"},
        {"roles": [], "nombre": "Abogado revisor", "papeles": [], "puestos": ["Abogado revisor"], "acciones": ["APROBAR"], "personas": [], "reglaDecision": "UNO"},
        {"roles": [], "nombre": "Abogado estructurador", "papeles": [], "puestos": ["Abogado estructurador"], "acciones": ["APROBAR", "DEVOLVER"], "personas": [], "reglaDecision": "UNO"},
        {"roles": ["DIRECTORA_DE_CONTRATACION"], "nombre": "Jefe", "papeles": [], "puestos": [], "acciones": ["APROBAR", "DEVOLVER", "NEGAR"], "personas": [], "reglaDecision": "UNO"}]'::jsonb
    ) WITH ORDINALITY x(e, i)
) AS escalones;

UPDATE hiring.cadenas_aprobacion ca
   SET escalones = c.escalones,
       updated_by = 'migracion-141',
       updated_at = now()
  FROM cadena_141 c
 WHERE ca.nombre = 'Revisión del estudio previo'
   AND ca.activa
   AND ca.escalones IS DISTINCT FROM c.escalones;

-- ============================================================== 2. flujo --

-- La versión 6 de Juan, con el puesto y la cadena por nombre. `escalon` son
-- los puestos que aprueban cuando la aprobación es un escalón propio.
CREATE TEMP TABLE flujo_141 (numeral varchar(10), la_hace text, puesto text, aprobacion text, cadena text,
                             escalon text[], secuencia jsonb)
  ON COMMIT DROP;
INSERT INTO flujo_141 VALUES
  ('3.1',   NULL,      NULL,                    'CADENA',  'Revisión del estudio previo',    NULL, NULL),
  ('3.6',   'PUESTO',  'Abogado estructurador', NULL,      NULL,                             NULL, NULL),
  ('3.7',   'PUESTO',  'Abogado estructurador', NULL,      NULL,                             NULL, NULL),
  ('4.2',   'PERMISO', NULL,                    'ESCALON', NULL, ARRAY['Abogado estructurador'], NULL),
  ('5.1',   'PERMISO', NULL,                    'NINGUNA', NULL,                             NULL, NULL),
  ('5.2',   'PERMISO', NULL,                    'NINGUNA', NULL, NULL, '{"dependeDe": ["4.2"], "noBloquea": true}'),
  ('5.3',   'PERMISO', NULL,                    'NINGUNA', NULL, NULL, '{"dependeDe": null, "noBloquea": true}'),
  ('5.4',   'PERMISO', NULL,                    'NINGUNA', NULL, NULL, '{"dependeDe": ["5.3"], "noBloquea": true}'),
  ('5.6.1', 'PUESTO',  'Abogado estructurador', 'CADENA',  'Revisión del pliego definitivo', NULL, NULL),
  ('5.12',  NULL,      NULL,                    NULL,      NULL, NULL, '{"dependeDe": ["5.7"], "noBloquea": false}'),
  ('5.13',  'PUESTO',  'Abogado estructurador', NULL,      NULL,                             NULL, NULL),
  ('8.8',   NULL,      NULL,                    NULL,      NULL, NULL, '{"dependeDe": ["8.1"], "noBloquea": false}'),
  ('9.1',   NULL,      NULL,                    NULL,      NULL, NULL, '{"dependeDe": null, "noBloquea": true}'),
  ('9.5',   NULL,      NULL,                    NULL,      NULL, NULL, '{"dependeDe": ["8.1"], "noBloquea": true}'),
  ('10.4',  NULL,      NULL,                    NULL,      NULL, NULL, '{"dependeDe": ["10.2"], "noBloquea": false}');

CREATE TEMP TABLE asignaciones_141 ON COMMIT DROP AS
SELECT f.numeral,
       CASE f.la_hace
         WHEN 'PERMISO' THEN jsonb_build_object('tipo', 'PERMISO')
         WHEN 'PUESTO'  THEN jsonb_build_object('tipo', 'PUESTO', 'puestoId', p.id::text)
       END AS la_hace,
       CASE f.aprobacion
         WHEN 'NINGUNA' THEN jsonb_build_object('tipo', 'NINGUNA')
         WHEN 'CADENA'  THEN jsonb_build_object('tipo', 'CADENA', 'cadenaId', c.id::text)
         WHEN 'ESCALON' THEN jsonb_build_object(
                               'tipo', 'ESCALON', 'roles', '[]'::jsonb, 'personas', '[]'::jsonb,
                               'puestos', (SELECT COALESCE(jsonb_agg(pe.id::text ORDER BY o.n), '[]'::jsonb)
                                             FROM unnest(f.escalon) WITH ORDINALITY o(nombre, n)
                                             JOIN hiring.puestos_proceso pe
                                               ON lower(pe.nombre) = lower(o.nombre) AND pe.activo))
       END AS aprobacion,
       f.secuencia
  FROM flujo_141 f
  LEFT JOIN hiring.puestos_proceso p ON lower(p.nombre) = lower(f.puesto) AND p.activo
  LEFT JOIN LATERAL (
    SELECT id FROM hiring.cadenas_aprobacion ca
     WHERE ca.nombre = f.cadena AND ca.activa ORDER BY ca.created_at LIMIT 1) c ON true;

DO $$
DECLARE
  activa   uuid;
  nueva    uuid;
  num_de   integer;
  num_a    integer;
  distinta boolean;
  p        record;
BEGIN
  -- Sin el puesto o la cadena la asignación quedaría a medias: mejor no tocar.
  IF EXISTS (SELECT 1 FROM asignaciones_141 a JOIN flujo_141 f USING (numeral)
              WHERE (f.la_hace = 'PUESTO' AND a.la_hace->>'puestoId' IS NULL)
                 OR (f.aprobacion = 'CADENA' AND a.aprobacion->>'cadenaId' IS NULL)
                 OR (f.aprobacion = 'ESCALON' AND jsonb_array_length(a.aprobacion->'puestos') = 0)) THEN
    RAISE EXCEPTION 'Falta un puesto o una cadena del flujo por defecto: corre antes la 137';
  END IF;

  SELECT id, numero INTO activa, num_de FROM hiring.flujo_versiones WHERE estado = 'ACTIVA';

  -- Las filas sin nada (las que dejó la pantalla al volver una actividad a lo
  -- predeterminado) no cuentan para comparar.
  SELECT EXISTS (
           (SELECT numeral, la_hace, aprobacion, secuencia FROM asignaciones_141
            EXCEPT
            SELECT numeral, la_hace, aprobacion, secuencia FROM hiring.flujo_asignaciones
             WHERE version_id = activa AND modalidad IS NULL)
           UNION ALL
           (SELECT numeral, la_hace, aprobacion, secuencia FROM hiring.flujo_asignaciones
             WHERE version_id = activa
               AND (modalidad IS NOT NULL OR la_hace IS NOT NULL OR aprobacion IS NOT NULL OR secuencia IS NOT NULL)
            EXCEPT
            SELECT numeral, la_hace, aprobacion, secuencia FROM asignaciones_141))
    INTO distinta;

  IF activa IS NOT NULL AND NOT distinta THEN
    RETURN;
  END IF;

  SELECT COALESCE(max(numero), 0) + 1 INTO num_a FROM hiring.flujo_versiones;
  UPDATE hiring.flujo_versiones SET estado = 'RETIRADA', retirada_at = now() WHERE estado = 'ACTIVA';
  INSERT INTO hiring.flujo_versiones (numero, estado, nota, creada_por, activada_por, activada_at)
  VALUES (num_a, 'ACTIVA', 'El flujo por defecto del módulo: la versión 6 de Juan (migración 141).',
          'migracion-141', 'migracion-141', now())
  RETURNING id INTO nueva;

  INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, la_hace, aprobacion, secuencia, updated_by)
  SELECT nueva, numeral, NULL, la_hace, aprobacion, secuencia, 'migracion-141' FROM asignaciones_141;

  -- Los procesos vivos pasan a la nueva, como al activar desde la pantalla.
  FOR p IN
    SELECT pr.id, v.numero AS de
      FROM hiring.procesos pr LEFT JOIN hiring.flujo_versiones v ON v.id = pr.flujo_version_id
     WHERE pr.estado IN ('EN_CURSO', 'ADJUDICADO')
  LOOP
    UPDATE hiring.procesos SET flujo_version_id = nueva WHERE id = p.id;
    INSERT INTO hiring.trazabilidad (proceso_id, entidad_id, entidad, accion, detalle, usuario_nombre)
    VALUES (p.id, p.id, 'flujo_version', 'ACTUALIZAR',
            jsonb_build_object('de', p.de, 'a', num_a, 'automatico', true,
                               'motivo', 'Se activó la versión ' || num_a || ' del flujo: el flujo por defecto del módulo'),
            'migracion-141');
  END LOOP;
END $$;

COMMIT;
