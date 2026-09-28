-- ============================================================================
-- 079 · Los avisos de cada actividad también llegan por correo
--
-- EFDS-1183. En la reunión de validación del módulo se acordó que los avisos
-- van por la campana y por correo, como el resto de la plataforma. Cada
-- actividad decide si los suyos salen también por correo: hay actividades
-- donde un correo por cada documento que se adjunta sería ruido.
--
-- Viene encendido, que es lo que se acordó como estándar. El plazo de cada
-- actividad no necesita columnas nuevas: `plazo_dias` y `alerta_dias_antes`
-- ya existían en hiring.actividades y ahora se usan.
--
-- Reaplicarla no hace nada nuevo.
-- ============================================================================

ALTER TABLE hiring.actividades
  ADD COLUMN IF NOT EXISTS avisos_por_correo boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN hiring.actividades.avisos_por_correo IS
  'Si los avisos de la actividad llegan también al correo institucional de quien los recibe.';
