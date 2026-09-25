-- ============================================================================
-- 087 · Los nombres de archivo que se guardaron con las tildes rotas
--
-- Multer lee el nombre original de un archivo como latin1 si no se le dice
-- otra cosa, y el navegador lo manda en UTF-8. Todo lo que se subió con tildes
-- o eñes quedó guardado mal: «Resolución de apertura.pdf» se guardó como
-- «ResoluciÃ³n de apertura.pdf», y así se veía en el expediente, en la lista
-- de chequeo y en cada panel que nombra un soporte. El servicio ya lo lee en
-- UTF-8 (`NOMBRE_EN_UTF8` en `modules/archivos.ts`); esto arregla lo que ya
-- estaba guardado.
--
-- Se deshace la doble codificación: el texto se vuelve a los bytes latin1 que
-- lo formaron y esos bytes se leen como lo que eran, UTF-8. Solo se toca lo
-- que tiene la huella de ese error —una Ã o una Â seguida de un carácter de
-- continuación—, y si la conversión no da un UTF-8 válido la fila se deja como
-- estaba: un nombre raro es mejor que uno inventado.
--
-- `nombre` también, porque varias actividades guardan ahí el nombre del
-- archivo cuando no hay un requisito que dé otro.
--
-- Reaplicarla no hace nada: lo corregido ya no tiene la huella.
-- ============================================================================

DO $$
DECLARE
  fila record;
  huella constant text := '[' || chr(194) || chr(195) || '][' || chr(128) || '-' || chr(191) || ']';
  corregido text;
BEGIN
  FOR fila IN
    SELECT id, nombre, archivo_nombre_original
      FROM hiring.documentos
     WHERE archivo_nombre_original ~ huella OR nombre ~ huella
  LOOP
    BEGIN
      IF fila.archivo_nombre_original ~ huella THEN
        corregido := convert_from(convert_to(fila.archivo_nombre_original, 'LATIN1'), 'UTF8');
        UPDATE hiring.documentos SET archivo_nombre_original = corregido WHERE id = fila.id;
      END IF;
      IF fila.nombre ~ huella THEN
        corregido := convert_from(convert_to(fila.nombre, 'LATIN1'), 'UTF8');
        UPDATE hiring.documentos SET nombre = corregido WHERE id = fila.id;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Se deja sin tocar el documento %: %', fila.id, SQLERRM;
    END;
  END LOOP;
END $$;
