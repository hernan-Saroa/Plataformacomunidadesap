-- ============================================================================
-- 058 · Converge `actas_inicio` a la forma que quedó tras la integración
--
-- La actividad 9.1 se construyó dos veces en paralelo y las dos versiones se
-- llamaron `042_acta_de_inicio.sql`: la de EFDS-1514 y la de EFDS-1167. Al
-- integrar se conservó la segunda, que es la que describe la entidad
-- `ActaInicio` de hoy, pero la tabla ya existía en las bases donde había
-- corrido la primera —y la 042 crea con `CREATE TABLE IF NOT EXISTS`, así que
-- volver a aplicarla no la toca—.
--
-- El resultado es una base cuyo esquema es el de una versión y cuyo código es
-- el de la otra. Cada consulta de las etapas 9 y 10 que mira el acta de inicio
-- —la 9.1, el seguimiento 9.2, los pagos 9.4, el informe final 10.1 y la
-- liquidación 10.2— pide `temas_tratados` y recibe «column does not exist»,
-- que la pantalla muestra como «No se pudo cargar la actividad · Internal
-- server error». No es un fallo del módulo: es el esquema atrasado.
--
-- Qué cambia respecto de la forma vieja:
--
--   compromisos    -> temas_tratados   (lo que se socializó en la reunión)
--   suscrita_por   -> registrado_por
--   fecha_reunion  -> se va: el modelo integrado tiene una sola fecha, la de
--                     la reunión, y es desde la que corre el plazo
--   estado         -> se va, con anulada_at, anulada_por y motivo_anulacion:
--                     el acta ya no se anula
--   acta_documento_id deja de ser obligatorio, y en su lugar entra
--   `acta_pactada`: la matriz pide el acta «si fue pactada en el contrato», y
--   un contrato que no la pactó arranca igual con la constancia de la reunión
--
-- Va en un DO con guard por lo mismo que la 042, la 057 y las demás: sin tabla
-- de control, la reaplicación tiene que converger en vez de fallar. En una
-- base que aplicó la 042 buena esta migración no hace nada.
-- ============================================================================

DO $$
DECLARE
  vieja boolean;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hiring'
      AND table_name = 'actas_inicio'
      AND column_name = 'temas_tratados'
  ) INTO vieja;

  IF NOT vieja THEN
    RETURN;
  END IF;

  -- Un acta anulada no existe en el modelo integrado, y además chocaría contra
  -- el índice único por contrato que sí trae. Se van antes de tocar nada más:
  -- son actas que su propio autor declaró sin efecto.
  DELETE FROM hiring.actas_inicio WHERE estado = 'ANULADA';

  ALTER TABLE hiring.actas_inicio
    ADD COLUMN IF NOT EXISTS temas_tratados text,
    ADD COLUMN IF NOT EXISTS acta_pactada   boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS registrado_por varchar(200);

  UPDATE hiring.actas_inicio SET registrado_por = suscrita_por;

  -- Los compromisos son lo más cercano a los temas tratados que guardaba la
  -- forma vieja: las dos responden qué se acordó en la reunión. Cuando venían
  -- vacíos se deja dicho que la reunión se registró sin ellos, en vez de
  -- inventar un texto: `ck_acta_inicio_temas` exige diez caracteres, y una
  -- cadena de relleno haría pasar por socializado algo que no consta.
  UPDATE hiring.actas_inicio
     SET temas_tratados = CASE
       WHEN length(trim(coalesce(compromisos, ''))) >= 10 THEN compromisos
       ELSE 'Acta registrada antes de la integración; no consta el detalle de lo socializado.'
     END;

  -- La fecha de la reunión desaparece, pero solo se pierde algo donde difería
  -- de la de inicio: en las demás filas las dos dicen lo mismo. Donde difería,
  -- queda escrita en los temas antes de borrar la columna.
  UPDATE hiring.actas_inicio
     SET temas_tratados = temas_tratados
       || E'\n\nReunión celebrada el ' || to_char(fecha_reunion, 'YYYY-MM-DD') || '.'
   WHERE fecha_reunion IS DISTINCT FROM fecha_inicio;

  ALTER TABLE hiring.actas_inicio
    ALTER COLUMN temas_tratados SET NOT NULL,
    ALTER COLUMN acta_documento_id DROP NOT NULL;

  ALTER TABLE hiring.actas_inicio
    DROP CONSTRAINT IF EXISTS ck_acta_inicio_estado,
    DROP CONSTRAINT IF EXISTS ck_acta_inicio_anulada,
    DROP CONSTRAINT IF EXISTS ck_acta_inicio_fechas;

  DROP INDEX IF EXISTS hiring.uq_acta_inicio_vigente;

  ALTER TABLE hiring.actas_inicio
    DROP COLUMN IF EXISTS fecha_reunion,
    DROP COLUMN IF EXISTS compromisos,
    DROP COLUMN IF EXISTS suscrita_por,
    DROP COLUMN IF EXISTS estado,
    DROP COLUMN IF EXISTS anulada_at,
    DROP COLUMN IF EXISTS anulada_por,
    DROP COLUMN IF EXISTS motivo_anulacion;
END $$;

-- Las dos reglas que la 042 declara dentro del CREATE TABLE y que por eso
-- nunca llegaron a la tabla vieja. Fuera del DO para que una base a la que le
-- falte solo una de las dos —porque la 042 corrió a medias— también converja.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_acta_inicio_documento'
  ) THEN
    ALTER TABLE hiring.actas_inicio ADD CONSTRAINT ck_acta_inicio_documento
      CHECK (acta_pactada = false OR acta_documento_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_acta_inicio_temas'
  ) THEN
    ALTER TABLE hiring.actas_inicio ADD CONSTRAINT ck_acta_inicio_temas
      CHECK (length(trim(temas_tratados)) >= 10);
  END IF;
END $$;

-- Una sola reunión de inicio por contrato: la ejecución empieza una vez. La
-- 042 lo crea, pero se repite aquí porque la base vieja traía en su lugar el
-- índice parcial `uq_acta_inicio_vigente`, que acaba de irse con el estado.
CREATE UNIQUE INDEX IF NOT EXISTS uq_acta_inicio_contrato
  ON hiring.actas_inicio (contrato_id);

CREATE INDEX IF NOT EXISTS ix_actas_inicio_contrato
  ON hiring.actas_inicio (contrato_id);

COMMENT ON TABLE hiring.actas_inicio IS
  'Reunión de inicio y su acta, cuando el contrato la pactó (EFDS-1167, actividad 9.1).';
