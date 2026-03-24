-- 156_add_email_threading.sql
-- Adds reply threading columns + NLP entity extraction columns to correos_juridicos

-- Bloque 1: Threading / Reply support
ALTER TABLE legal_management.correos_juridicos
  ADD COLUMN IF NOT EXISTS is_replied BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parent_email_id UUID REFERENCES legal_management.correos_juridicos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thread_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS internet_message_id VARCHAR(500);

-- Bloque 2: NLP entity extraction
ALTER TABLE legal_management.correos_juridicos
  ADD COLUMN IF NOT EXISTS proceso_id_sugerido VARCHAR(100),
  ADD COLUMN IF NOT EXISTS implicado_sugerido VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submodulo_sugerido VARCHAR(100);

-- Index for fast thread lookups
CREATE INDEX IF NOT EXISTS idx_correos_thread_id ON legal_management.correos_juridicos(thread_id);
CREATE INDEX IF NOT EXISTS idx_correos_parent_email ON legal_management.correos_juridicos(parent_email_id);
CREATE INDEX IF NOT EXISTS idx_correos_internet_msg_id ON legal_management.correos_juridicos(internet_message_id);
