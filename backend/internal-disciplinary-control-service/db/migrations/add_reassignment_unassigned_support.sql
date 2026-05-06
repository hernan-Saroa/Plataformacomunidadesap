-- Migration: Add was_initially_unassigned column to disciplinary_process_reassignment_requests
-- Date: 2026-05-05
-- Description: Allow reassignment requests for processes without assigned professionals

-- Add the new column to track if process was initially unassigned
ALTER TABLE internal_disciplinary_control.disciplinary_process_reassignment_requests
ADD COLUMN IF NOT EXISTS was_initially_unassigned BOOLEAN DEFAULT FALSE;

-- Make current_professional_id nullable to support unassigned processes
ALTER TABLE internal_disciplinary_control.disciplinary_process_reassignment_requests
ALTER COLUMN current_professional_id DROP NOT NULL;

-- Update existing records to set was_initially_unassigned appropriately
-- For records where current_professional_id is NULL, mark as initially unassigned
UPDATE internal_disciplinary_control.disciplinary_process_reassignment_requests
SET was_initially_unassigned = TRUE
WHERE current_professional_id IS NULL;