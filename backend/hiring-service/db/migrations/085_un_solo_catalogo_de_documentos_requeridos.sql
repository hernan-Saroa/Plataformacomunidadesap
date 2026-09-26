-- ============================================================================
-- 085 · Un solo catálogo de documentos requeridos (EFDS-2066)
--
-- Había dos maneras de decir «aquí se entrega un documento», con dos tablas de
-- entregas y tres servicios:
--
--   · `documentos_requeridos` + `documentos_proceso` (019): nombre,
--     descripción, obligatorio, orden, modalidades. La usaban solo la 3.1
--     (lista de chequeo, 074) y la 5.1, cada una con su numeral fijo en el
--     código y sin pantalla para administrarla.
--   · `plantillas.numeral` + `documentos.plantilla_id` (062/063): asignar un
--     formato a una actividad lo volvía requisito. Sin obligatorio ni
--     descripción, y con un solo `numeral` por formato, así que «asignarlo» a
--     otra actividad lo sacaba de la anterior.
--
-- Desde aquí manda la primera. Cada fila es un ítem de la lista de chequeo de
-- su actividad y puede nombrar la plantilla que se descarga para diligenciarlo;
-- la biblioteca de plantillas queda como lo que es, el archivo del SIG con su
-- versión, y un mismo formato sirve en tantas actividades como filas lo citen.
-- ============================================================================

-- ------------------------------------------------------- las columnas nuevas --

/*
 * La plantilla se cita por código y no por id. `plantillas` versiona por
 * (codigo, version): cuando el SIG publica la versión 3 del BS-FO-047 se sube
 * como fila nueva, y el requisito tiene que empezar a ofrecerla sin que nadie
 * vuelva a configurar cada actividad. Qué versión se diligenció de verdad lo
 * sigue diciendo `documentos.plantilla_id`.
 */
ALTER TABLE hiring.documentos_requeridos
  ADD COLUMN IF NOT EXISTS plantilla_codigo varchar(40);

/*
 * Tipologías contractuales a las que aplica; vacío = todas.
 *
 * Son los valores de la opción `tipologia_contractual` de la 3.1 —texto, no
 * códigos—, que es donde el proceso la guarda. La 074 dejó opcional el
 * certificado de idoneidad solo porque este filtro no existía.
 */
ALTER TABLE hiring.documentos_requeridos
  ADD COLUMN IF NOT EXISTS tipologias jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE hiring.documentos_requeridos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN hiring.documentos_requeridos.plantilla_codigo IS
  'Código del formato de hiring.plantillas que se descarga para diligenciar el documento. Se ofrece la versión activa más reciente.';
COMMENT ON COLUMN hiring.documentos_requeridos.tipologias IS
  'Valores de tipologia_contractual (3.1) a los que aplica el requisito; vacío = todas.';

CREATE INDEX IF NOT EXISTS ix_documentos_requeridos_plantilla
  ON hiring.documentos_requeridos (plantilla_codigo)
  WHERE plantilla_codigo IS NOT NULL;

-- ------------------------------------------ el certificado, ya con su filtro --

UPDATE hiring.documentos_requeridos
   SET tipologias  = '["Prestación de servicios profesionales y de apoyo a la gestión"]'::jsonb,
       obligatorio = true,
       updated_at  = now()
 WHERE numeral = '3.1'
   AND codigo = 'CERTIFICADO_IDONEIDAD'
   AND tipologias = '[]'::jsonb;

-- ------------------------------------ las plantillas asignadas, como requisitos --
/*
 * Una fila por (actividad, código de formato), con el nombre y el alcance de
 * su versión activa más reciente. Obligatorias, porque eso es lo que la 062
 * hacía de ellas: asignar el formato exigía el documento.
 *
 * Van primero en el orden (1, 2, 3…): en la 3.1 son los formatos del estudio
 * previo, que es el entregable de la actividad y lo que el paquete acompaña.
 */
INSERT INTO hiring.documentos_requeridos
  (numeral, codigo, nombre, descripcion, modalidades, obligatorio, orden,
   confirmado, nota_fuente, plantilla_codigo)
SELECT p.numeral,
       p.codigo,
       p.nombre,
       NULL,
       p.modalidades,
       true,
       row_number() OVER (PARTITION BY p.numeral ORDER BY p.codigo)::int,
       true,
       'Formato asignado a la actividad desde la biblioteca (EFDS-1183).',
       p.codigo
  FROM (
        SELECT DISTINCT ON (numeral, codigo) numeral, codigo, nombre, modalidades
          FROM hiring.plantillas
         WHERE activo
           AND coalesce(numeral, '') <> ''
         ORDER BY numeral, codigo, created_at DESC
       ) p
ON CONFLICT (numeral, codigo) DO NOTHING;

-- ------------------------------------ lo que ya se entregó contra esos formatos --
/*
 * Cada documento con `plantilla_id` pasa a tener su fila de entrega. El más
 * reciente por requisito queda vigente; si hubiera más de uno —el servicio lo
 * impedía, pero la base no—, los anteriores entran anulados, que es como el
 * resto del módulo guarda lo sustituido.
 */
WITH entregas AS (
  SELECT e.proceso_id,
         d.numeral,
         p.codigo,
         d.id AS documento_id,
         d.subido_por,
         d.created_at,
         row_number() OVER (
           PARTITION BY e.proceso_id, d.numeral, p.codigo
           ORDER BY d.created_at DESC
         ) AS n
    FROM hiring.documentos d
    JOIN hiring.expedientes e ON e.id = d.expediente_id
    JOIN hiring.plantillas p ON p.id = d.plantilla_id
   WHERE d.tipo = 'ADJUNTO'
     AND NOT EXISTS (
           SELECT 1 FROM hiring.documentos_proceso dp WHERE dp.documento_id = d.id
         )
)
INSERT INTO hiring.documentos_proceso
  (proceso_id, numeral, codigo, documento_id, cargado_por, created_at, anulado_at, anulado_por)
SELECT proceso_id, numeral, codigo, documento_id, subido_por, created_at,
       CASE WHEN n > 1 THEN now() END,
       CASE WHEN n > 1 THEN 'Migración 085' END
  FROM entregas
ON CONFLICT DO NOTHING;

-- ------------------------------------------- el estudio previo ya adjuntado --
/*
 * Hasta hoy el estudio previo era «el adjunto de la 3.1 que no está en la
 * lista de chequeo»: así lo contaba `enviar()`. Desde aquí es la fila de su
 * formato, y sin este paso todo proceso en borrador lo vería pendiente aunque
 * ya lo hubiera cargado.
 *
 * Se ata el adjunto más reciente con esa misma regla, y solo cuando a la
 * modalidad del proceso le aplica **un** formato de la 3.1: con dos o más no
 * hay forma de saber cuál es, y un expediente que afirma lo que dedujo es peor
 * que uno que deja el requisito pendiente (el criterio de la 063).
 */
WITH formato AS (
  SELECT pr.id AS proceso_id, min(r.codigo) AS codigo
    FROM hiring.procesos pr
    JOIN hiring.documentos_requeridos r
      ON r.numeral = '3.1'
     AND r.activo
     AND r.plantilla_codigo IS NOT NULL
     AND (r.modalidades = '[]'::jsonb OR r.modalidades ? pr.modalidad)
   GROUP BY pr.id
  HAVING count(*) = 1
),
adjunto AS (
  SELECT DISTINCT ON (e.proceso_id)
         e.proceso_id, d.id AS documento_id, d.subido_por, d.created_at
    FROM hiring.documentos d
    JOIN hiring.expedientes e ON e.id = d.expediente_id
   WHERE d.numeral = '3.1'
     AND d.tipo = 'ADJUNTO'
     AND NOT EXISTS (
           SELECT 1 FROM hiring.documentos_proceso dp WHERE dp.documento_id = d.id
         )
   ORDER BY e.proceso_id, d.created_at DESC
)
INSERT INTO hiring.documentos_proceso
  (proceso_id, numeral, codigo, documento_id, cargado_por, created_at)
SELECT a.proceso_id, '3.1', f.codigo, a.documento_id, a.subido_por, a.created_at
  FROM adjunto a
  JOIN formato f ON f.proceso_id = a.proceso_id
 WHERE NOT EXISTS (
         SELECT 1 FROM hiring.documentos_proceso dp
          WHERE dp.proceso_id = a.proceso_id
            AND dp.numeral = '3.1'
            AND dp.codigo = f.codigo
            AND dp.anulado_at IS NULL
       );

-- ----------------------------------------------------------------------------
-- Nota para quien venga después
--
-- `plantillas.numeral` no se borra todavía: la biblioteca la sigue mostrando
-- como la actividad donde se registró el formato. Lo que deja de hacer es
-- exigir nada; dónde se pide un documento lo dicen solo estas filas, y se
-- administran desde Configuración → la actividad → «Documentos que pide».
--
-- Reaplicarla no duplica nada: los requisitos chocan con su UNIQUE, las
-- entregas se saltan los documentos que ya tienen fila y el estudio previo
-- solo se ata donde su requisito sigue pendiente.
-- ----------------------------------------------------------------------------
