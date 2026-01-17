-- ============================================
-- MIGRACIÓN: Agregar columnas faltantes a tabla auditoria
-- ============================================
-- Fecha: 2026-01-09
-- Descripción: Agrega todas las columnas definidas en la entidad que no existían en la BD
--              y corrige tipos de datos incorrectos
-- ============================================

-- Columnas básicas
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS fase VARCHAR(50) DEFAULT 'planeacion';
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS sede VARCHAR(255);
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS responsable VARCHAR(255);
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS prioridad VARCHAR(20) DEFAULT 'Media';

-- Campos de auditor (Foreign Keys a auth.personas)
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS auditor_lider_id BIGINT;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS auditor_asignado_id BIGINT;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS supervisor_asignado_id BIGINT;

-- Estado de archivo (ya existen en migración 064, pero se agregan por si acaso)
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS archivada BOOLEAN DEFAULT false;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS fecha_archivo TIMESTAMP;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT true;
ALTER TABLE control_interno.auditoria ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP;

-- Corregir tipo de columna territorial de BOOLEAN a VARCHAR(255)
-- Primero eliminar las vistas que dependen de territorial
DROP VIEW IF EXISTS control_interno.v_auditorias_kanban_completo CASCADE;
DROP VIEW IF EXISTS control_interno.v_auditorias_por_estado CASCADE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'territorial'
        AND data_type = 'boolean'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ALTER COLUMN territorial TYPE VARCHAR(255) 
        USING CASE 
            WHEN territorial = true THEN 'Territorial'
            WHEN territorial = false THEN 'Nacional'
            ELSE 'Nacional'
        END;
        
        RAISE NOTICE 'Columna territorial convertida de BOOLEAN a VARCHAR(255)';
    END IF;
END $$;

-- Recrear la vista v_auditorias_kanban_completo
CREATE OR REPLACE VIEW control_interno.v_auditorias_kanban_completo AS
SELECT 
    a.id,
    a.codigo,
    a.nombre AS titulo,
    a.descripcion,
    a.estado_kanban AS estado,
    COALESCE(a.tipo_kanban, a.tipo) AS tipo,
    a.riesgo_kanban AS riesgo,
    a.semaforo,
    a.territorial,
    a.prioridad_kanban AS prioridad,
    a.area_objetivo,
    a.proceso_auditado,
    a.alcance,
    a.progreso,
    a.hallazgos AS total_hallazgos,
    a.dias_restantes,
    a.porcentaje_tiempo,
    a.ultima_actuacion,
    a.calificacion_riesgo,
    a.total_documentos,
    a.total_informes,
    a.total_tareas,
    a.actividades_completas,
    a.actividades_pendientes,
    a.responsable_area_nombre,
    a.responsable_area_cargo,
    a.responsable_area_email,
    supervisor.id_tercero AS supervisor_asignado_id,
    supervisor.nom_largo AS supervisor_asignado_nombre,
    supervisor.dir_email AS supervisor_asignado_email,
    a.fecha_reunion_apertura,
    ra.modalidad AS reunion_modalidad,
    ra.estado_acta AS reunion_estado_acta,
    lider.id_tercero AS auditor_lider_id,
    lider.nom_largo AS auditor_lider_nombre,
    lider.dir_email AS auditor_lider_email,
    lider_perfil.especialidad AS auditor_lider_especialidad,
    lider_perfil.cargo AS auditor_lider_cargo,
    asignado.id_tercero AS auditor_asignado_id,
    asignado.nom_largo AS auditor_asignado_nombre,
    asignado.dir_email AS auditor_asignado_email,
    asignado_perfil.especialidad AS auditor_asignado_especialidad,
    asignado_perfil.cargo AS auditor_asignado_cargo,
    ti.nombre AS territorial_nombre,
    ti.ciudad AS territorial_ciudad,
    ti.departamento AS territorial_departamento,
    ei.tipo_motivo AS especial_tipo_motivo,
    ei.solicitante AS especial_solicitante,
    ei.justificacion AS especial_justificacion,
    a.fecha_inicio,
    a.fecha_fin,
    a.created_at,
    a.updated_at
FROM control_interno.auditoria a
LEFT JOIN auth.personas lider ON a.auditor_lider_id::text = lider.id_tercero::text
LEFT JOIN control_interno.auditor_perfil lider_perfil ON lider.id_tercero = lider_perfil.persona_id AND lider_perfil.activo = true
LEFT JOIN auth.personas asignado ON a.auditor_asignado_id::text = asignado.id_tercero::text
LEFT JOIN control_interno.auditor_perfil asignado_perfil ON asignado.id_tercero = asignado_perfil.persona_id AND asignado_perfil.activo = true
LEFT JOIN auth.personas supervisor ON a.supervisor_asignado_id::text = supervisor.id_tercero::text
LEFT JOIN control_interno.auditoria_territorial_info ti ON a.id = ti.auditoria_id
LEFT JOIN control_interno.auditoria_especial_info ei ON a.id = ei.auditoria_id
LEFT JOIN control_interno.reunion_apertura ra ON a.id = ra.auditoria_id;

-- Recrear la vista v_auditorias_por_estado
CREATE OR REPLACE VIEW control_interno.v_auditorias_por_estado AS
SELECT 
    estado_kanban AS estado,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE semaforo = 'verde') AS verdes,
    COUNT(*) FILTER (WHERE semaforo = 'amarillo') AS amarillas,
    COUNT(*) FILTER (WHERE semaforo = 'rojo') AS rojas,
    AVG(progreso) AS progreso_promedio,
    SUM(hallazgos) AS total_hallazgos
FROM control_interno.auditoria
WHERE estado_kanban IS NOT NULL
GROUP BY estado_kanban;

COMMENT ON VIEW control_interno.v_auditorias_kanban_completo IS 'Vista completa de auditorías con toda la información necesaria para el módulo Kanban';
COMMENT ON VIEW control_interno.v_auditorias_por_estado IS 'Vista de contadores de auditorías por estado para el dashboard del Kanban';

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_auditoria_fase ON control_interno.auditoria(fase);
CREATE INDEX IF NOT EXISTS idx_auditoria_prioridad ON control_interno.auditoria(prioridad);
CREATE INDEX IF NOT EXISTS idx_auditoria_auditor_lider ON control_interno.auditoria(auditor_lider_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_auditor_asignado ON control_interno.auditoria(auditor_asignado_id);

-- Comentarios descriptivos
COMMENT ON COLUMN control_interno.auditoria.fase IS 'Fase actual de la auditoría (planeacion, en-curso, revision, completada)';
COMMENT ON COLUMN control_interno.auditoria.sede IS 'Sede donde se realiza la auditoría';
COMMENT ON COLUMN control_interno.auditoria.responsable IS 'Responsable de la auditoría';
COMMENT ON COLUMN control_interno.auditoria.auditor_lider_id IS 'ID del auditor líder (FK a auth.personas)';
COMMENT ON COLUMN control_interno.auditoria.auditor_asignado_id IS 'ID del auditor asignado (FK a auth.personas)';
COMMENT ON COLUMN control_interno.auditoria.supervisor_asignado_id IS 'ID del supervisor asignado (FK a auth.personas)';
