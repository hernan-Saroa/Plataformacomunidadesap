-- Migration 151: Add categoria column to documentos table
-- This allows frontend category filtering (actas, evidencias, autos, oficios, etc.)

ALTER TABLE legal_management.documentos 
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'documentos';

-- Backfill existing documents: infer categoria from tipo
UPDATE legal_management.documentos SET categoria = 'actas' WHERE LOWER(tipo) LIKE '%acta%';
UPDATE legal_management.documentos SET categoria = 'evidencias' WHERE LOWER(tipo) LIKE '%evidencia%' OR LOWER(tipo) LIKE '%prueba%';
UPDATE legal_management.documentos SET categoria = 'autos' WHERE LOWER(tipo) LIKE '%auto%';
UPDATE legal_management.documentos SET categoria = 'oficios' WHERE LOWER(tipo) LIKE '%oficio%';
UPDATE legal_management.documentos SET categoria = 'comunicaciones' WHERE LOWER(tipo) LIKE '%comunicacion%' OR LOWER(tipo) LIKE '%memorando%';
UPDATE legal_management.documentos SET categoria = 'notificaciones' WHERE LOWER(tipo) LIKE '%notificacion%' OR LOWER(tipo) LIKE '%citacion%' OR LOWER(tipo) LIKE '%edicto%';
UPDATE legal_management.documentos SET categoria = 'pruebas' WHERE LOWER(tipo) LIKE '%prueba%' OR LOWER(tipo) LIKE '%pericial%' OR LOWER(tipo) LIKE '%testimonial%';
