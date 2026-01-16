-- ============================================
-- SCHEMA EXTENDIDO PARA MÓDULOS ESAP
-- Control Interno - Todos los módulos en BD
-- ============================================

-- ============================================
-- 1. PLAN ANUAL 5 ROLES (Decreto 648)
-- ============================================

-- Tabla: rol_decreto_648_template (Plantilla de roles)
CREATE TABLE IF NOT EXISTS control_interno.rol_decreto_648_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_numero INTEGER NOT NULL UNIQUE CHECK (rol_numero BETWEEN 1 AND 5),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rol_template_numero ON control_interno.rol_decreto_648_template(rol_numero);

-- Insertar roles predefinidos del Decreto 648
INSERT INTO control_interno.rol_decreto_648_template (rol_numero, nombre, descripcion, color) VALUES
(1, 'Liderazgo Estratégico', 'Asesorar y acompañar a la alta dirección en la gestión del riesgo y el control', '#3B82F6'),
(2, 'Enfoque hacia la Prevención', 'Fomentar la cultura del autocontrol y promover acciones preventivas', '#10B981'),
(3, 'Relación con Entes de Control', 'Coordinar y facilitar las relaciones con organismos de control externo', '#F59E0B'),
(4, 'Evaluación y Gestión de Riesgos', 'Evaluar la gestión del riesgo institucional y la efectividad de los controles', '#8B5CF6'),
(5, 'Evaluación y Seguimiento', 'Evaluar y hacer seguimiento a la gestión institucional y los procesos', '#EF4444')
ON CONFLICT (rol_numero) DO NOTHING;

-- Tabla: plan_anual_5_roles
CREATE TABLE IF NOT EXISTS control_interno.plan_anual_5_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    año INTEGER NOT NULL,
    fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
    responsable VARCHAR(255) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'en-revision', 'aprobado', 'en-ejecucion', 'completado')),
    porcentaje_cumplimiento_general INTEGER DEFAULT 0,
    total_actividades INTEGER DEFAULT 0,
    actividades_completadas INTEGER DEFAULT 0,
    actividades_en_progreso INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(año)
);

CREATE INDEX idx_plan_anual_5_roles_año ON control_interno.plan_anual_5_roles(año);
CREATE INDEX idx_plan_anual_5_roles_estado ON control_interno.plan_anual_5_roles(estado);

-- Tabla: rol_plan_anual_5
CREATE TABLE IF NOT EXISTS control_interno.rol_plan_anual_5 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    rol_numero INTEGER NOT NULL CHECK (rol_numero BETWEEN 1 AND 5),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    porcentaje_cumplimiento INTEGER DEFAULT 0,
    total_actividades INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rol_plan_5 FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_anual_5_roles(id) ON DELETE CASCADE,
    UNIQUE(plan_id, rol_numero)
);

CREATE INDEX idx_rol_plan_5_plan ON control_interno.rol_plan_anual_5(plan_id);

-- Tabla: actividad_plan_anual_5
CREATE TABLE IF NOT EXISTS control_interno.actividad_plan_anual_5 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    nombre VARCHAR(500) NOT NULL,
    descripcion TEXT,
    responsable VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en-progreso', 'completada', 'retrasada')),
    porcentaje_avance INTEGER DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
    observaciones TEXT,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'Media' CHECK (prioridad IN ('Alta', 'Media', 'Baja')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_actividad_rol_5 FOREIGN KEY (rol_id) 
        REFERENCES control_interno.rol_plan_anual_5(id) ON DELETE CASCADE,
    CONSTRAINT fk_actividad_plan_5 FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_anual_5_roles(id) ON DELETE CASCADE
);

CREATE INDEX idx_actividad_rol_5 ON control_interno.actividad_plan_anual_5(rol_id);
CREATE INDEX idx_actividad_plan_5 ON control_interno.actividad_plan_anual_5(plan_id);
CREATE INDEX idx_actividad_estado_5 ON control_interno.actividad_plan_anual_5(estado);

-- ============================================
-- 2. GESTIÓN DE AUDITORÍAS (Mejorado)
-- ============================================

-- Tabla: auditoria_gestion (extiende auditoria_programada)
CREATE TABLE IF NOT EXISTS control_interno.auditoria_gestion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(500) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    fase VARCHAR(50) NOT NULL DEFAULT 'planeacion' CHECK (fase IN ('planeacion', 'en-curso', 'revision', 'completada')),
    territorial VARCHAR(255),
    sede VARCHAR(255),
    responsable VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    progreso INTEGER DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
    prioridad VARCHAR(20) NOT NULL DEFAULT 'Media' CHECK (prioridad IN ('Alta', 'Media', 'Baja')),
    hallazgos_count INTEGER DEFAULT 0,
    auditoria_programada_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_gestion_programada FOREIGN KEY (auditoria_programada_id) 
        REFERENCES control_interno.auditoria_programada(id) ON DELETE SET NULL
);

CREATE INDEX idx_auditoria_gestion_codigo ON control_interno.auditoria_gestion(codigo);
CREATE INDEX idx_auditoria_gestion_fase ON control_interno.auditoria_gestion(fase);
CREATE INDEX idx_auditoria_gestion_tipo ON control_interno.auditoria_gestion(tipo);

-- ============================================
-- 3. GESTIÓN DE HALLAZGOS (Mejorado)
-- ============================================

-- Ya existe tabla hallazgo, pero agregamos campos adicionales
ALTER TABLE control_interno.hallazgo 
ADD COLUMN IF NOT EXISTS titulo VARCHAR(500),
ADD COLUMN IF NOT EXISTS gravedad VARCHAR(20) CHECK (gravedad IN ('Crítica', 'Alta', 'Media', 'Baja')),
ADD COLUMN IF NOT EXISTS fecha_compromiso DATE,
ADD COLUMN IF NOT EXISTS progreso_cumplimiento INTEGER DEFAULT 0 CHECK (progreso_cumplimiento BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS idx_hallazgo_gravedad ON control_interno.hallazgo(gravedad);

-- ============================================
-- 4. PLANES DE MEJORAMIENTO (Mejorado)
-- ============================================

-- Ya existe plan_mejoramiento, pero agregamos campos
ALTER TABLE control_interno.plan_mejoramiento
ADD COLUMN IF NOT EXISTS codigo_auditoria VARCHAR(255),
ADD COLUMN IF NOT EXISTS porcentaje_efectividad INTEGER DEFAULT 0 CHECK (porcentaje_efectividad BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS seguimientos_realizados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seguimientos_totales INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS proximo_seguimiento DATE;

-- Tabla: seguimiento_plan_mejoramiento
CREATE TABLE IF NOT EXISTS control_interno.seguimiento_plan_mejoramiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    numero_seguimiento INTEGER NOT NULL,
    fecha_seguimiento DATE NOT NULL,
    realizado_por VARCHAR(255) NOT NULL,
    observaciones TEXT,
    cumplimiento INTEGER DEFAULT 0 CHECK (cumplimiento BETWEEN 0 AND 100),
    efectividad INTEGER DEFAULT 0 CHECK (efectividad BETWEEN 0 AND 100),
    acciones_implementadas INTEGER DEFAULT 0,
    acciones_totales INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_seguimiento_plan FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE,
    UNIQUE(plan_id, numero_seguimiento)
);

CREATE INDEX idx_seguimiento_plan ON control_interno.seguimiento_plan_mejoramiento(plan_id);

-- ============================================
-- 5. APROBACIONES (Nueva tabla completa)
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.aprobacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    tipo VARCHAR(100) NOT NULL CHECK (tipo IN ('plan-auditoria', 'plan-mejora', 'informe', 'documento')),
    titulo VARCHAR(500) NOT NULL,
    descripcion TEXT,
    solicitante VARCHAR(255) NOT NULL,
    fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'Media' CHECK (prioridad IN ('Alta', 'Media', 'Baja')),
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'en-revision')),
    territorial VARCHAR(255),
    sede VARCHAR(255),
    relacionado VARCHAR(255),
    documentos_count INTEGER DEFAULT 0,
    aprobado_por VARCHAR(255),
    fecha_aprobacion TIMESTAMP,
    rechazado_por VARCHAR(255),
    fecha_rechazo TIMESTAMP,
    motivo_rechazo TEXT,
    observaciones TEXT,
    area VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_aprobacion_tipo ON control_interno.aprobacion(tipo);
CREATE INDEX idx_aprobacion_estado ON control_interno.aprobacion(estado);
CREATE INDEX idx_aprobacion_prioridad ON control_interno.aprobacion(prioridad);
CREATE INDEX idx_aprobacion_fecha_solicitud ON control_interno.aprobacion(fecha_solicitud DESC);

-- Tabla: documento_aprobacion
CREATE TABLE IF NOT EXISTS control_interno.documento_aprobacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aprobacion_id UUID NOT NULL,
    documento_id UUID,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500),
    tipo_mime VARCHAR(100),
    tamanio_bytes BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doc_aprobacion FOREIGN KEY (aprobacion_id) 
        REFERENCES control_interno.aprobacion(id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_aprobacion_doc FOREIGN KEY (documento_id) 
        REFERENCES control_interno.documento(id) ON DELETE SET NULL
);

CREATE INDEX idx_doc_aprobacion ON control_interno.documento_aprobacion(aprobacion_id);

-- ============================================
-- 6. LISTAS DE CHEQUEO (Mejorado)
-- ============================================

-- Ya existe lista_chequeo, pero agregamos campos
ALTER TABLE control_interno.lista_chequeo
ADD COLUMN IF NOT EXISTS proceso VARCHAR(255),
ADD COLUMN IF NOT EXISTS subproceso VARCHAR(255),
ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) CHECK (categoria IN ('normativa', 'procesos', 'controles', 'riesgos', 'personalizada')),
ADD COLUMN IF NOT EXISTS normativa_aplicable TEXT,
ADD COLUMN IF NOT EXISTS objetivo TEXT,
ADD COLUMN IF NOT EXISTS version_base VARCHAR(50),
ADD COLUMN IF NOT EXISTS permite_no_aplica BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS requiere_evidencias BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS genera_hallazgos_automaticos BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS auditoria_id UUID,
ADD COLUMN IF NOT EXISTS nombre_auditoria VARCHAR(500),
ADD COLUMN IF NOT EXISTS auditor_responsable VARCHAR(255),
ADD COLUMN IF NOT EXISTS fecha_aplicacion DATE,
ADD COLUMN IF NOT EXISTS fecha_diligenciamiento DATE,
ADD COLUMN IF NOT EXISTS items_completados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumplimiento INTEGER DEFAULT 0 CHECK (cumplimiento BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS no_cumplimientos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_aplica INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hallazgos_generados INTEGER DEFAULT 0;

-- Tabla: version_lista_chequeo
CREATE TABLE IF NOT EXISTS control_interno.version_lista_chequeo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lista_id UUID NOT NULL,
    version VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    usuario VARCHAR(255) NOT NULL,
    cambios TEXT NOT NULL,
    motivo_cambio TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_version_lista FOREIGN KEY (lista_id) 
        REFERENCES control_interno.lista_chequeo(id) ON DELETE CASCADE
);

CREATE INDEX idx_version_lista ON control_interno.version_lista_chequeo(lista_id);

-- Tabla: seccion_lista_chequeo
CREATE TABLE IF NOT EXISTS control_interno.seccion_lista_chequeo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lista_id UUID NOT NULL,
    orden INTEGER NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_seccion_lista FOREIGN KEY (lista_id) 
        REFERENCES control_interno.lista_chequeo(id) ON DELETE CASCADE
);

CREATE INDEX idx_seccion_lista ON control_interno.seccion_lista_chequeo(lista_id);

-- Actualizar item_lista_chequeo
ALTER TABLE control_interno.item_lista_chequeo
ADD COLUMN IF NOT EXISTS seccion_id UUID,
ADD COLUMN IF NOT EXISTS es_critico BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS respuesta VARCHAR(50) CHECK (respuesta IN ('cumple', 'no-cumple', 'no-aplica')),
ADD COLUMN IF NOT EXISTS observaciones TEXT,
ADD COLUMN IF NOT EXISTS genera_hallazgo BOOLEAN DEFAULT FALSE,
ADD CONSTRAINT fk_item_seccion FOREIGN KEY (seccion_id) 
    REFERENCES control_interno.seccion_lista_chequeo(id) ON DELETE SET NULL;

CREATE INDEX idx_item_seccion ON control_interno.item_lista_chequeo(seccion_id);

-- ============================================
-- 7. INFORMES DE LEY (Mejorado)
-- ============================================

-- Ya existe informe_ley, pero agregamos campos
ALTER TABLE control_interno.informe_ley
ADD COLUMN IF NOT EXISTS codigo_corto VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) CHECK (categoria IN ('financiero', 'administrativo', 'contractual', 'talento-humano', 'transparencia', 'control')),
ADD COLUMN IF NOT EXISTS dia_presentacion INTEGER CHECK (dia_presentacion BETWEEN 1 AND 31),
ADD COLUMN IF NOT EXISTS entidad_destino VARCHAR(500),
ADD COLUMN IF NOT EXISTS area_responsable VARCHAR(255),
ADD COLUMN IF NOT EXISTS tiene_plantilla BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS url_plantilla VARCHAR(500),
ADD COLUMN IF NOT EXISTS requiere_aprobacion BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS dias_anticipacion_alerta INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- Tabla: entrega_informe_ley
CREATE TABLE IF NOT EXISTS control_interno.entrega_informe_ley (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    informe_id UUID NOT NULL,
    periodo VARCHAR(50) NOT NULL, -- "2025-01", "2025-Q1", "2025-S1", "2025"
    fecha_vencimiento DATE NOT NULL,
    fecha_entrega TIMESTAMP,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en-proceso', 'entregado', 'vencido', 'rechazado')),
    archivo_nombre VARCHAR(255),
    archivo_url VARCHAR(500),
    archivo_tamano BIGINT,
    elaborado_por VARCHAR(255),
    fecha_elaboracion TIMESTAMP,
    aprobado_por VARCHAR(255),
    fecha_aprobacion TIMESTAMP,
    enviado_por VARCHAR(255),
    observaciones TEXT,
    motivo_rechazo TEXT,
    numero_radicado VARCHAR(255),
    fecha_radicacion TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_entrega_informe FOREIGN KEY (informe_id) 
        REFERENCES control_interno.informe_ley(id) ON DELETE CASCADE
);

CREATE INDEX idx_entrega_informe ON control_interno.entrega_informe_ley(informe_id);
CREATE INDEX idx_entrega_estado ON control_interno.entrega_informe_ley(estado);
CREATE INDEX idx_entrega_vencimiento ON control_interno.entrega_informe_ley(fecha_vencimiento);

-- ============================================
-- 8. DOCUMENTOS Y REPORTES (Mejorado)
-- ============================================

-- Ya existe documento, pero agregamos tipos específicos
ALTER TABLE control_interno.documento
ADD COLUMN IF NOT EXISTS tipo_reporte VARCHAR(100) CHECK (tipo_reporte IN (
    'plan-anual', 'informe-auditoria', 'plan-mejora', 'acta-apertura', 
    'acta-cierre', 'matriz-hallazgos', 'reporte-ejecutivo', 'reporte-territorial',
    'reporte-gravedad', 'reporte-cumplimiento', 'otro'
));

-- Tabla: plantilla_reporte
CREATE TABLE IF NOT EXISTS control_interno.plantilla_reporte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    formato VARCHAR(50) NOT NULL CHECK (formato IN ('PDF', 'Excel', 'Word', 'PowerPoint')),
    ruta_template VARCHAR(500),
    variables_disponibles JSONB,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plantilla_tipo ON control_interno.plantilla_reporte(tipo);

-- ============================================
-- 9. CONFIGURACIÓN (Mejorado - ya existe)
-- ============================================

-- Ya existe configuracion con todas las tablas necesarias

-- ============================================
-- 10. ETAPAS DE AUDITORÍA (Mejorado)
-- ============================================

-- Ya existe etapa_auditoria, pero agregamos campos
ALTER TABLE control_interno.etapa_auditoria
ADD COLUMN IF NOT EXISTS porcentaje_avance INTEGER DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS fecha_limite DATE;

-- Tabla: actividad_etapa_auditoria
CREATE TABLE IF NOT EXISTS control_interno.actividad_etapa_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etapa_id UUID NOT NULL,
    nombre VARCHAR(500) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(100) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en-progreso', 'completada')),
    responsable VARCHAR(255),
    fecha_limite DATE,
    completada BOOLEAN DEFAULT FALSE,
    fecha_completacion TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_actividad_etapa FOREIGN KEY (etapa_id) 
        REFERENCES control_interno.etapa_auditoria(id) ON DELETE CASCADE
);

CREATE INDEX idx_actividad_etapa ON control_interno.actividad_etapa_auditoria(etapa_id);

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE control_interno.plan_anual_5_roles IS 'Plan Anual basado en 5 roles del Decreto 648';
COMMENT ON TABLE control_interno.rol_plan_anual_5 IS 'Roles del plan anual (5 roles)';
COMMENT ON TABLE control_interno.actividad_plan_anual_5 IS 'Actividades por rol del plan anual';
COMMENT ON TABLE control_interno.auditoria_gestion IS 'Gestión de auditorías con fases y seguimiento';
COMMENT ON TABLE control_interno.seguimiento_plan_mejoramiento IS 'Seguimientos trimestrales de planes de mejoramiento';
COMMENT ON TABLE control_interno.aprobacion IS 'Sistema de aprobaciones centralizado';
COMMENT ON TABLE control_interno.version_lista_chequeo IS 'Historial de versiones de listas de chequeo';
COMMENT ON TABLE control_interno.seccion_lista_chequeo IS 'Secciones organizadas de listas de chequeo';
COMMENT ON TABLE control_interno.entrega_informe_ley IS 'Entregas de informes de ley por periodo';
COMMENT ON TABLE control_interno.plantilla_reporte IS 'Plantillas para generación de reportes';
COMMENT ON TABLE control_interno.actividad_etapa_auditoria IS 'Actividades dentro de cada etapa de auditoría';

-- ============================================
-- PARÁMETROS DEL SISTEMA (Para evitar valores hardcodeados)
-- ============================================

-- Insertar parámetro para seguimientos trimestrales
INSERT INTO control_interno.parametro_sistema (clave, valor, descripcion, tipo, categoria, editable)
VALUES (
  'seguimientos_trimestrales_totales',
  '4',
  'Número total de seguimientos trimestrales por plan de mejoramiento',
  'number',
  'planes-mejoramiento',
  true
)
ON CONFLICT (clave) DO NOTHING;

