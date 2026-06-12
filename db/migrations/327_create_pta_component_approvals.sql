-- Crear tabla de aprobaciones por componente
CREATE TABLE IF NOT EXISTS academic_work_plan."PtaComponentApproval" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pta_id UUID NOT NULL REFERENCES academic_work_plan."PlanTrabajoAcademico"(id) ON DELETE CASCADE,
    componente VARCHAR(100) NOT NULL, -- 'academica', 'investigacion', 'ext_capacitacion', 'ext_procesos', 'ext_fortalecimiento', 'ext_gobierno', 'ext_secciones', 'complementarias', 'academicas_admin'
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'aprobado', 'devuelto'
    aprobador_id VARCHAR(100) NULL,
    aprobador_nombre VARCHAR(200) NULL,
    aprobador_rol VARCHAR(100) NULL,
    comentarios TEXT NULL,
    fecha_aprobacion TIMESTAMP NULL,
    scope VARCHAR(50) NULL, -- 'cetap', 'territorial', 'nacional'
    scope_id VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pta_componente UNIQUE (pta_id, componente)
);

-- Registrar permisos para cada uno de los componentes de aprobación
DO $$
DECLARE
    v_module_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';
    
    IF v_module_id IS NOT NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
        VALUES
            (gen_random_uuid(), 'pta.approve.academica', 'Aprobar Componente Académica / Docente', 'Permite aprobar el componente de docencia en el PTA', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.investigacion', 'Aprobar Componente Investigación', 'Permite aprobar el componente de investigación en el PTA', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.extension.capacitacion', 'Aprobar Extensión - Dirección de Capacitación', 'Permite aprobar extensión de capacitación', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.extension.procesos_seleccion', 'Aprobar Extensión - Dirección de Procesos de Selección', 'Permite aprobar extensión de procesos de selección', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.extension.fortalecimiento', 'Aprobar Extensión - Dirección de Fortalecimiento Gestión Estatal', 'Permite aprobar extensión de fortalecimiento', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.extension.alto_gobierno', 'Aprobar Extensión - Escuela de Alto Gobierno', 'Permite aprobar extensión de la escuela de alto gobierno', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.extension.secciones_actividades', 'Aprobar Extensión - Secciones y Actividades', 'Permite aprobar las secciones y actividades generales de extensión', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.complementarias', 'Aprobar Actividades Complementarias', 'Permite aprobar el componente de actividades complementarias', v_module_id, true),
            (gen_random_uuid(), 'pta.approve.academicas_admin', 'Aprobar Actividades Académicas y Admin (AADM)', 'Permite aprobar el componente AADM', v_module_id, true)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;
