-- ============================================================================
-- MIGRACIÓN 421: guardar la etapa previa a la aprobación de un auto (EFDS-1564)
-- Descripción: al reversar la aprobación de un Pliego de Cargos, el proceso debe
--              volver a la etapa en la que estaba antes de aprobarlo. Se agrega
--              una columna que registra esa etapa (solo cuando la aprobación
--              efectivamente cambió la etapa del proceso).
-- ============================================================================

ALTER TABLE internal_disciplinary_control.legal_autos
    ADD COLUMN IF NOT EXISTS "etapaPreviaAprobacion" character varying(100);
