-- ============================================
-- MIGRATION: Add id_user column to disciplinary_professional
-- ============================================

ALTER TABLE internal_disciplinary_control.disciplinary_professional
ADD COLUMN id_user UUID;
