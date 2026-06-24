-- Migration 348: Add controversia_turno column to hallazgo table
ALTER TABLE control_interno.hallazgo
ADD COLUMN controversia_turno VARCHAR(50) DEFAULT NULL;

UPDATE control_interno.hallazgo
SET controversia_turno = 'auditor'
WHERE estado = 'en-controversia';
