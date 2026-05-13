-- Migration 301: Add modalidad and tipo columns to Asignatura table
-- Add string columns 'modalidad' and 'tipo' to academic_work_plan.Asignatura table

ALTER TABLE academic_work_plan."Asignatura"
ADD COLUMN IF NOT EXISTS modalidad VARCHAR(255),
ADD COLUMN IF NOT EXISTS tipo VARCHAR(255);