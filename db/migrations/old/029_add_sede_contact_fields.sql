-- Migration: Add contact and capacity fields to sedes table
-- Description: Add tel_sede, email_sede, and other missing fields

ALTER TABLE auth.sedes
ADD COLUMN IF NOT EXISTS tel_sede VARCHAR(50),
ADD COLUMN IF NOT EXISTS email_sede VARCHAR(100),
ADD COLUMN IF NOT EXISTS capacidad_estudiantes INTEGER,
ADD COLUMN IF NOT EXISTS capacidad_docentes INTEGER,
ADD COLUMN IF NOT EXISTS permite_inscripciones BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS permite_matriculas BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visible_portal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS observaciones TEXT;
