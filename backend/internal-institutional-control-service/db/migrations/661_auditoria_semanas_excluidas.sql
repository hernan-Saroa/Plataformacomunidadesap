-- ============================================================
-- Migración 661: semanas excluidas del cronograma de la auditoría (EFDS-2132)
-- ============================================================
-- El calendario de programación deja sacar semanas del ciclo 4-4-5 (además
-- de Semana Santa y receso, que se calculan). Las fechas de cada etapa no
-- alcanzan para saberlo, así que se guardan los lunes (YYYY-MM-DD) de las
-- semanas excluidas para pintarlas igual en el formulario y en el Excel.
-- ============================================================

ALTER TABLE control_interno.auditoria
  ADD COLUMN IF NOT EXISTS semanas_excluidas jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN control_interno.auditoria.semanas_excluidas IS
  'Lunes (YYYY-MM-DD) de las semanas que el usuario sacó del cronograma (EFDS-2132)';
