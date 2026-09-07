-- EFDS-1376 — Confirmación de disponibilidad del docente (AC-03).
--
-- El AC-03 ("la decanatura lo contacta para confirmar disponibilidad") no es un
-- flujo de notificaciones: es un paso operativo con REGISTRO de quién confirmó y
-- cuándo. Se guarda sobre la asignación, no en una tabla aparte, porque es un
-- atributo de esa asignación puntual.
--
-- Nulo = no se registró confirmación. No bloquea por sí mismo a nivel de
-- esquema: el gate es de la interfaz (la casilla), y la columna deja la huella.

ALTER TABLE "academic-schedule".asignacion_docente
  ADD COLUMN IF NOT EXISTS disponibilidad_confirmada_por  TEXT,
  ADD COLUMN IF NOT EXISTS disponibilidad_confirmada_en   TIMESTAMPTZ;

COMMENT ON COLUMN "academic-schedule".asignacion_docente.disponibilidad_confirmada_por
  IS 'Quién confirmó que se contactó al docente y está disponible en el periodo (AC-03).';
COMMENT ON COLUMN "academic-schedule".asignacion_docente.disponibilidad_confirmada_en
  IS 'Cuándo se registró la confirmación de disponibilidad (AC-03).';
