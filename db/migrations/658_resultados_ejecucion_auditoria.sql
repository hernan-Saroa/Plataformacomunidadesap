-- ============================================
-- MIGRATION 658: Resultados de la auditoría en la etapa de Ejecución (EFDS-1636)
-- ============================================
-- En Ejecución el equipo auditor consolida los resultados antes de comunicarlos al
-- auditado. Los hallazgos ya tienen su propia tabla; faltaba dónde registrar las
-- fortalezas, las recomendaciones generales y las conclusiones de la auditoría.
-- Comunicación y los informes leen estos campos desde la auditoría.

ALTER TABLE control_interno.auditoria
  ADD COLUMN IF NOT EXISTS fortalezas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recomendaciones_generales jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS conclusiones text;

COMMENT ON COLUMN control_interno.auditoria.fortalezas IS 'Fortalezas identificadas en la ejecución (lista de textos)';
COMMENT ON COLUMN control_interno.auditoria.recomendaciones_generales IS 'Recomendaciones generales de la auditoría, adicionales a las de cada hallazgo (lista de textos)';
COMMENT ON COLUMN control_interno.auditoria.conclusiones IS 'Conclusiones de la auditoría registradas en la ejecución';
