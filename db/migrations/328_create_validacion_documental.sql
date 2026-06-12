-- Migration 328: Create validacion_documental table
-- Schema: academic_work_plan

CREATE TABLE IF NOT EXISTS academic_work_plan.validacion_documental (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id UUID NOT NULL REFERENCES academic_work_plan."Docente"(id) ON DELETE CASCADE,
    campo_rund VARCHAR(100) NOT NULL,
    tipo_documento_soporte VARCHAR(100) NOT NULL,
    id_documento_carpeta UUID,
    estado_documento VARCHAR(30) NOT NULL DEFAULT 'Sin cargar' 
        CHECK (estado_documento IN ('Sin cargar', 'Pendiente', 'Aceptado', 'Rechazado', 'No aplica')),
    fecha_carga TIMESTAMP,
    fecha_validacion TIMESTAMP,
    validado_por VARCHAR(150),
    observacion TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_docente_campo UNIQUE (docente_id, campo_rund)
);

CREATE INDEX IF NOT EXISTS idx_val_docente ON academic_work_plan.validacion_documental(docente_id);
