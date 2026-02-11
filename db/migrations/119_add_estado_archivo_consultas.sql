-- Migration to add archive fields to consultas_juridicas table
ALTER TABLE legal_management.consultas_juridicas
ADD COLUMN estado_archivo CHARACTER VARYING DEFAULT 'ACTIVO',
ADD COLUMN fecha_archivo TIMESTAMP,
ADD COLUMN usuario_archivo CHARACTER VARYING,
ADD COLUMN motivo_archivo TEXT;
