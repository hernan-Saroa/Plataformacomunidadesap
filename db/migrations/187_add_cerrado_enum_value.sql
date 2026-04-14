-- Migration: Add CERRADO value to disciplinary process estado enum
-- Required because 186 was applied without this ALTER TYPE
ALTER TYPE internal_disciplinary_control.disciplinary_processes_estado_enum ADD VALUE IF NOT EXISTS 'CERRADO';
