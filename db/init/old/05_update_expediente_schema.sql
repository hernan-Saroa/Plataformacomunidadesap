-- 05_update_expediente_schema.sql
-- Add missing columns to support full Judicial Defense requirements

ALTER TABLE legal_management.expedientes
ADD COLUMN IF NOT EXISTS medio_control VARCHAR(255),
ADD COLUMN IF NOT EXISTS juzgado_conocimiento VARCHAR(255),
ADD COLUMN IF NOT EXISTS pretension_demandante TEXT,
ADD COLUMN IF NOT EXISTS acto_administrativo_demandado TEXT,
ADD COLUMN IF NOT EXISTS fecha_notificacion TIMESTAMP,
ADD COLUMN IF NOT EXISTS fecha_admision TIMESTAMP,
ADD COLUMN IF NOT EXISTS fecha_vencimiento_termino TIMESTAMP,
ADD COLUMN IF NOT EXISTS tipo_id_demandante VARCHAR(10),
ADD COLUMN IF NOT EXISTS numero_id_demandante VARCHAR(20),
ADD COLUMN IF NOT EXISTS tipo_id_demandado VARCHAR(10),
ADD COLUMN IF NOT EXISTS numero_id_demandado VARCHAR(20),
ADD COLUMN IF NOT EXISTS etapa_procesal VARCHAR(100) DEFAULT 'RADICACION',
ADD COLUMN IF NOT EXISTS documentos_iniciales_urls TEXT[]; -- Array of URLs for initial docs
