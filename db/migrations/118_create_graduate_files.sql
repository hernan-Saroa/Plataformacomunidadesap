-- Crear tabla de archivos asociados a graduados
CREATE TABLE IF NOT EXISTS academic_registration.graduate_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graduate_id UUID NOT NULL REFERENCES academic_registration.graduates(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graduate_files_graduate_id
  ON academic_registration.graduate_files (graduate_id);
