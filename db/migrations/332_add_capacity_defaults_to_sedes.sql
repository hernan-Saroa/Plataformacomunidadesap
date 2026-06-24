-- Migration: Add capacity defaults to sedes
-- Description: Assign capacity defaults to existing sedes to avoid showing 0 in UI metrics

-- Update Sede Central
UPDATE auth.sedes 
SET capacidad_estudiantes = 5000, capacidad_docentes = 500 
WHERE nom_sede ILIKE '%central%';

-- Update all other sedes that have NULL capacities
UPDATE auth.sedes 
SET capacidad_estudiantes = 150, capacidad_docentes = 15 
WHERE capacidad_estudiantes IS NULL OR capacidad_docentes IS NULL;
