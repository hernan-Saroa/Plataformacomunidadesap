-- Etapa de Revisión (preaprobación) por componente/subsección del PTA, previa a la
-- aprobación definitiva ya existente en academic_work_plan."PtaComponentApproval".
CREATE TABLE IF NOT EXISTS academic_work_plan."PtaComponentReview" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pta_id UUID NOT NULL REFERENCES academic_work_plan."PlanTrabajoAcademico"(id) ON DELETE CASCADE,
    componente VARCHAR(100) NOT NULL, -- mismas claves que PtaComponentApproval.componente
    subseccion VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general' | 'pregrado' | 'posgrado' | 'docencia' | 'academico_administrativas'
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'revisado', 'devuelto'
    revisor_id VARCHAR(100) NULL,
    revisor_nombre VARCHAR(200) NULL,
    revisor_rol VARCHAR(100) NULL,
    comentarios TEXT NULL,
    respuesta_docente TEXT NULL,
    fecha_revision TIMESTAMP NULL,
    scope VARCHAR(50) NULL, -- 'solicitud_edicion' cuando reabre un componente ya aprobado
    scope_id VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pta_componente_subseccion UNIQUE (pta_id, componente, subseccion)
);

CREATE INDEX IF NOT EXISTS idx_pta_component_review_pta_id
    ON academic_work_plan."PtaComponentReview" (pta_id);

-- Registrar los permisos granulares de REVISIÓN (etapa previa a la aprobación).
-- No se asignan a ningún rol aquí: los roles que consumirán estos permisos los
-- crea/gestiona el equipo de QA a través de la administración de roles existente.
DO $$
DECLARE
    v_module_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';

    IF v_module_id IS NOT NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
        VALUES
            (gen_random_uuid(), 'pta.review.academica.pregrado', 'Revisar Docencia - Pregrado', 'Permite revisar (preaprobar) las asignaturas de pregrado del componente de Docencia en el PTA', v_module_id, true),
            (gen_random_uuid(), 'pta.review.academica.posgrado', 'Revisar Docencia - Posgrado', 'Permite revisar (preaprobar) las asignaturas de posgrado del componente de Docencia en el PTA', v_module_id, true),
            (gen_random_uuid(), 'pta.review.investigacion', 'Revisar Componente Investigación', 'Permite revisar (preaprobar) el componente de investigación en el PTA', v_module_id, true),
            (gen_random_uuid(), 'pta.review.extension.capacitacion', 'Revisar Extensión - Dirección de Capacitación', 'Permite revisar (preaprobar) extensión de capacitación', v_module_id, true),
            (gen_random_uuid(), 'pta.review.extension.procesos_seleccion', 'Revisar Extensión - Dirección de Procesos de Selección', 'Permite revisar (preaprobar) extensión de procesos de selección', v_module_id, true),
            (gen_random_uuid(), 'pta.review.extension.fortalecimiento', 'Revisar Extensión - Dirección de Fortalecimiento Gestión Estatal', 'Permite revisar (preaprobar) extensión de fortalecimiento', v_module_id, true),
            (gen_random_uuid(), 'pta.review.extension.alto_gobierno', 'Revisar Extensión - Escuela de Alto Gobierno', 'Permite revisar (preaprobar) extensión de la escuela de alto gobierno', v_module_id, true),
            (gen_random_uuid(), 'pta.review.complementarias.docencia', 'Revisar Complementarias a la Docencia', 'Permite revisar (preaprobar) las actividades complementarias a la docencia', v_module_id, true),
            (gen_random_uuid(), 'pta.review.complementarias.academico_administrativas', 'Revisar Actividades Académico-Administrativas', 'Permite revisar (preaprobar) las actividades académico-administrativas', v_module_id, true),
            (gen_random_uuid(), 'pta.review.all', 'Revisor Integral PTA', 'Permite revisar (preaprobar) cualquier componente/subsección del PTA', v_module_id, true)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;
