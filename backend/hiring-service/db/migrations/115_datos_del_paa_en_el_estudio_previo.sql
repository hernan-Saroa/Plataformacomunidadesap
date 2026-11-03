-- ============================================================================
-- 115 · Qué datos del PAA muestra la 3.1
--
-- Los campos del formulario del PAA decidían solo qué ve quien elige la línea
-- al crear el proceso. Ahora cada campo dice además si sale en el bloque
-- «Datos del PAA» de la 3.1, por región y vigencia, aparte de si se ve al
-- elegir: el teléfono del responsable puede servirle al área en el estudio
-- previo sin exhibirse a quien solo busca la línea.
--
-- No cambia lo que el PAA llena en la 3.1 (objeto, línea, plazo, responsable:
-- `CAMPOS_CONTROLADOS`): eso sigue igual. El bloque es de solo lectura y lee
-- la línea de la versión aplicada al proceso, así que se actualiza solo cuando
-- se le aplica una versión nueva.
--
-- Las configuraciones ya guardadas arrancan con lo mismo que el formato
-- propone para una región nueva (`EN_ESTUDIO_PREVIO_POR_DEFECTO`).
-- ============================================================================

BEGIN;

ALTER TABLE hiring.paa_campos_visibles
  ADD COLUMN IF NOT EXISTS en_estudio_previo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN hiring.paa_campos_visibles.en_estudio_previo IS
  'Si el campo sale en el bloque «Datos del PAA» de la 3.1, aparte de si se ve al elegir la línea.';

UPDATE hiring.paa_campos_visibles
   SET en_estudio_previo = true
 WHERE clave IN ('unspsc', 'fuente_recursos', 'valor_vigencia', 'requiere_vigencias_futuras',
                 'estado_vigencias_futuras', 'ubicacion', 'mipyme', 'lotes')
   AND NOT en_estudio_previo;

COMMIT;
