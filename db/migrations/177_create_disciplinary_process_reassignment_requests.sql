-- Migration: Create disciplinary_process_reassignment_requests table
-- Schema: internal_disciplinary_control
-- Date: 2026-04-01
-- Description: Tabla para solicitudes de reasignación de procesos disciplinarios

-- Create disciplinary_process_reassignment_requests table
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_process_reassignment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL,
    current_professional_id UUID NOT NULL,
    new_professional_id UUID NOT NULL,
    justification TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'URGENTE')),
    status VARCHAR(15) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    jefe_observations TEXT,
    rejection_reason TEXT,
    resolved_at TIMESTAMP,
    requested_by VARCHAR(100) NOT NULL,
    requested_by_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_process_id FOREIGN KEY (process_id) REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE,
    CONSTRAINT fk_current_professional_id FOREIGN KEY (current_professional_id) REFERENCES internal_disciplinary_control.disciplinary_professionals(id) ON DELETE CASCADE,
    CONSTRAINT fk_new_professional_id FOREIGN KEY (new_professional_id) REFERENCES internal_disciplinary_control.disciplinary_professionals(id) ON DELETE CASCADE,
    CONSTRAINT unique_pending_request_per_process EXCLUDE (process_id WITH =) WHERE (status = 'PENDIENTE')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reassignment_requests_process_id ON internal_disciplinary_control.disciplinary_process_reassignment_requests(process_id);
CREATE INDEX IF NOT EXISTS idx_reassignment_requests_current_professional_id ON internal_disciplinary_control.disciplinary_process_reassignment_requests(current_professional_id);
CREATE INDEX IF NOT EXISTS idx_reassignment_requests_new_professional_id ON internal_disciplinary_control.disciplinary_process_reassignment_requests(new_professional_id);
CREATE INDEX IF NOT EXISTS idx_reassignment_requests_status ON internal_disciplinary_control.disciplinary_process_reassignment_requests(status);
CREATE INDEX IF NOT EXISTS idx_reassignment_requests_created_at ON internal_disciplinary_control.disciplinary_process_reassignment_requests(created_at);

-- Add comments
COMMENT ON TABLE internal_disciplinary_control.disciplinary_process_reassignment_requests IS 'Tabla para solicitudes de reasignación de procesos disciplinarios';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.process_id IS 'ID del proceso disciplinario a reasignar';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.current_professional_id IS 'ID del profesional actualmente asignado';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.new_professional_id IS 'ID del profesional solicitado para asignación';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.justification IS 'Justificación de la solicitud de reasignación';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.priority IS 'Prioridad de la solicitud (NORMAL o URGENTE)';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.status IS 'Estado de la solicitud (PENDIENTE, APROBADA, RECHAZADA)';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.jefe_observations IS 'Observaciones del jefe al procesar la solicitud';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.rejection_reason IS 'Motivo de rechazo si aplica';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.resolved_at IS 'Fecha en que se resolvió la solicitud';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.requested_by IS 'Nombre del usuario que solicitó la reasignación';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.requested_by_id IS 'ID del usuario que solicitó la reasignación';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.created_at IS 'Fecha de creación de la solicitud';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_process_reassignment_requests.updated_at IS 'Fecha de última actualización de la solicitud';