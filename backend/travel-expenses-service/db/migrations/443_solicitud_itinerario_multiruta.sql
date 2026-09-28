SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 443_solicitud_itinerario_multiruta.sql
-- Created: 2026-09-22
-- Description:
--   1. Agrega la columna 'itinerario' JSONB a travel_expenses.solicitudes_comision
--      para soportar múltiples rutas/tramos por solicitud con horario militar,
--      tipo de trayecto (SOLO_IDA / IDA_Y_VUELTA), desglose de días y fechas.
--   2. Crea índice GIN para búsquedas y optimización de consultas.
--   3. Ejecuta migración de adecuación (fixing) de solicitudes existentes para que
--      tengan un tramo inicial por defecto sin romper registros históricos.
-- ============================================================================

-- 1. Agregar columna 'itinerario' si no existe
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS itinerario JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Índice GIN sobre columna itinerario
CREATE INDEX IF NOT EXISTS idx_solicitudes_itinerario
  ON travel_expenses.solicitudes_comision USING gin (itinerario);

-- 3. Fixing de retrocompatibilidad:
-- Para solicitudes existentes cuyo itinerario esté vacío ('[]'::jsonb),
-- poblamos un tramo representativo basado en los datos existentes
-- (destino_ciudad, destino_departamento, fecha_inicio, fecha_fin, dias_comision).
UPDATE travel_expenses.solicitudes_comision
SET itinerario = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'origenCiudad', 'Bogotá D.C.',
    'origenDepartamento', 'Cundinamarca',
    'destinoCiudad', COALESCE(NULLIF(destino_ciudad, ''), 'Destino Principal'),
    'destinoDepartamento', COALESCE(NULLIF(destino_departamento, ''), 'Cundinamarca'),
    'tipoTrayecto', 'IDA_Y_VUELTA',
    'fechaSalida', to_char(fecha_inicio, 'YYYY-MM-DD'),
    'fechaLlegada', to_char(fecha_fin, 'YYYY-MM-DD'),
    'diasRuta', COALESCE(dias_comision, 1.0),
    'horarioEstimadoMilitar', '08:00',
    'tipoTransporte', CASE WHEN requiere_tiquetes THEN 'AEREO' ELSE 'TERRESTRE' END
  )
)
WHERE (itinerario IS NULL OR itinerario = '[]'::jsonb)
  AND destino_ciudad IS NOT NULL
  AND fecha_inicio IS NOT NULL
  AND fecha_fin IS NOT NULL;

-- 4. Comentario en el catálogo de base de datos
COMMENT ON COLUMN travel_expenses.solicitudes_comision.itinerario IS
  'Arreglo de tramos/rutas de la comisión (RutaItinerario[]) con origen, destino, trayecto, fechas, días y horario militar estimado.';

RESET search_path;
