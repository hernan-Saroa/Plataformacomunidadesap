-- ============================================
-- Schema Unificado para Internal Institutional Control Service
-- Base de datos: PostgreSQL
-- Schema: control_interno (único schema)
-- ============================================

CREATE SCHEMA IF NOT EXISTS control_interno;

-- ============================================
-- Tabla: proceso_auditable
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.proceso_auditable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('estrategico', 'misional', 'apoyo', 'evaluacion')),
    macroproceso VARCHAR(255) NOT NULL,
    responsable VARCHAR(255) NOT NULL,
    dependencia VARCHAR(255) NOT NULL,
    territorial VARCHAR(255),
    evaluacion_riesgo JSONB NOT NULL,
    frecuencia_auditoria VARCHAR(255) NOT NULL,
    ultima_auditoria DATE,
    proxima_auditoria DATE,
    prioridad INTEGER NOT NULL,
    priorizacion_anos INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proceso_auditable_tipo ON control_interno.proceso_auditable(tipo);
CREATE INDEX idx_proceso_auditable_macroproceso ON control_interno.proceso_auditable(macroproceso);
CREATE INDEX idx_proceso_auditable_prioridad ON control_interno.proceso_auditable(prioridad DESC);

-- ============================================
-- Tabla: auditoria_programada
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.auditoria_programada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    proceso_id UUID NOT NULL,
    proceso_codigo VARCHAR(255) NOT NULL,
    proceso_nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('gestion', 'cumplimiento', 'financiera', 'tic', 'desempeno')),
    alcance TEXT NOT NULL,
    proceso_auditar VARCHAR(255) NOT NULL,
    auditor_lider VARCHAR(255) NOT NULL,
    equipo_auditor JSONB NOT NULL,
    fecha_inicio_planeada DATE NOT NULL,
    fecha_fin_planeada DATE NOT NULL,
    duracion_dias INTEGER NOT NULL,
    prioridad VARCHAR(20) NOT NULL CHECK (prioridad IN ('alta', 'media', 'baja')),
    riesgo_inherente VARCHAR(20) NOT NULL CHECK (riesgo_inherente IN ('alto', 'medio', 'bajo')),
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('planeada', 'en_curso', 'completada', 'cancelada')),
    es_territorial BOOLEAN DEFAULT FALSE,
    territorial VARCHAR(255),
    es_especial BOOLEAN DEFAULT FALSE,
    solicitada_por VARCHAR(255),
    motivo_especial TEXT,
    etapas JSONB NOT NULL,
    ampliaciones JSONB,
    fecha_limite_original DATE NOT NULL,
    fecha_limite_actual DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_proceso FOREIGN KEY (proceso_id) 
        REFERENCES control_interno.proceso_auditable(id) ON DELETE RESTRICT
);

CREATE INDEX idx_auditoria_programada_proceso ON control_interno.auditoria_programada(proceso_id);
CREATE INDEX idx_auditoria_programada_estado ON control_interno.auditoria_programada(estado);
CREATE INDEX idx_auditoria_programada_tipo ON control_interno.auditoria_programada(tipo);

-- ============================================
-- Tabla: auditoria
-- Gestión de auditorías del sistema (Kanban, Lista, Calendario)
-- DEBE CREARSE ANTES DE hallazgo y plan_mejoramiento
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(500) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Gestión', 'Control Interno', 'Académica', 'RRHH', 'Financiera', 'TI', 'Cumplimiento', 'Operacional')),
    fase VARCHAR(50) NOT NULL CHECK (fase IN ('planeacion', 'en-curso', 'revision', 'completada')) DEFAULT 'planeacion',
    territorial VARCHAR(255) NOT NULL,
    sede VARCHAR(255) NOT NULL,
    responsable VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
    prioridad VARCHAR(20) NOT NULL CHECK (prioridad IN ('Alta', 'Media', 'Baja')) DEFAULT 'Media',
    hallazgos INTEGER DEFAULT 0 CHECK (hallazgos >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columna descripcion si no existe (para bases de datos existentes)
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS descripcion TEXT;

CREATE INDEX idx_auditoria_codigo ON control_interno.auditoria(codigo);
CREATE INDEX idx_auditoria_tipo ON control_interno.auditoria(tipo);
CREATE INDEX idx_auditoria_fase ON control_interno.auditoria(fase);
CREATE INDEX idx_auditoria_prioridad ON control_interno.auditoria(prioridad);
CREATE INDEX idx_auditoria_territorial ON control_interno.auditoria(territorial);
CREATE INDEX idx_auditoria_fechas ON control_interno.auditoria(fecha_inicio, fecha_fin);

-- ============================================
-- Tabla: hallazgo
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.hallazgo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('critico', 'controversia', 'borrador')),
    estado VARCHAR(255) NOT NULL,
    area VARCHAR(255) NOT NULL,
    auditoria VARCHAR(255) NOT NULL,
    auditoria_id UUID,
    descripcion TEXT NOT NULL,
    criterio_incumplido TEXT NOT NULL,
    normativa_relacionada JSONB NOT NULL,
    evidencias JSONB NOT NULL,
    recomendaciones JSONB NOT NULL,
    fecha_deteccion DATE NOT NULL,
    fecha_notificacion DATE,
    responsable VARCHAR(255),
    fecha_limite_correccion DATE,
    observaciones_controversia TEXT,
    titulo VARCHAR(500),
    gravedad VARCHAR(20) CHECK (gravedad IN ('Crítica', 'Alta', 'Media', 'Baja')),
    fecha_compromiso DATE,
    progreso_cumplimiento INTEGER DEFAULT 0 CHECK (progreso_cumplimiento BETWEEN 0 AND 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hallazgo_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE SET NULL
);

CREATE INDEX idx_hallazgo_categoria ON control_interno.hallazgo(categoria);
CREATE INDEX idx_hallazgo_estado ON control_interno.hallazgo(estado);
CREATE INDEX idx_hallazgo_auditoria ON control_interno.hallazgo(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_hallazgo_gravedad ON control_interno.hallazgo(gravedad);

-- ============================================
-- Tabla: plan_mejoramiento
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.plan_mejoramiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    hallazgo_id UUID,
    hallazgo_codigo VARCHAR(255),
    auditoria_id UUID,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    objetivos JSONB NOT NULL,
    area_responsable VARCHAR(255) NOT NULL,
    responsable_implementacion VARCHAR(255) NOT NULL,
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('borrador', 'revision', 'aprobado', 'en_ejecucion', 'completado', 'vencido', 'rechazado')),
    fecha_creacion DATE,
    fecha_aprobacion DATE,
    fecha_inicio_ejecucion DATE,
    fecha_limite DATE NOT NULL,
    fecha_cierre DATE,
    recursos JSONB,
    indicadores JSONB,
    avance_global INTEGER DEFAULT 0,
    aprobado_por VARCHAR(255),
    observaciones TEXT,
    observaciones_aprobacion TEXT,
    motivo_rechazo TEXT,
    seguimientos JSONB,
    codigo_auditoria VARCHAR(255),
    porcentaje_efectividad INTEGER DEFAULT 0 CHECK (porcentaje_efectividad BETWEEN 0 AND 100),
    seguimientos_realizados INTEGER DEFAULT 0,
    seguimientos_totales INTEGER DEFAULT 4,
    proximo_seguimiento DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_plan_mejoramiento_hallazgo FOREIGN KEY (hallazgo_id) 
        REFERENCES control_interno.hallazgo(id) ON DELETE SET NULL,
    CONSTRAINT fk_plan_mejoramiento_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE SET NULL
);

CREATE INDEX idx_plan_mejoramiento_hallazgo ON control_interno.plan_mejoramiento(hallazgo_id);
CREATE INDEX idx_plan_mejoramiento_estado ON control_interno.plan_mejoramiento(estado);

-- ============================================
-- Tabla: accion_correctiva
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.accion_correctiva (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'correctiva' CHECK (tipo IN ('correctiva', 'preventiva', 'mejora')),
    responsable VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    recursos TEXT,
    indicador VARCHAR(500),
    meta_indicador VARCHAR(500),
    estado VARCHAR(50) NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'en-progreso', 'implementada', 'vencida', 'completada')),
    porcentaje_avance INTEGER DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
    observaciones TEXT,
    evidencias JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accion_correctiva_plan FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE
);

CREATE INDEX idx_accion_correctiva_plan ON control_interno.accion_correctiva(plan_id);
CREATE INDEX idx_accion_correctiva_estado ON control_interno.accion_correctiva(estado);

-- ============================================
-- Tabla: seguimiento_trimestral
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.seguimiento_trimestral (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    trimestre INTEGER NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
    año INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    fecha_seguimiento DATE,
    avance_global INTEGER DEFAULT 0 CHECK (avance_global BETWEEN 0 AND 100),
    porcentaje_cumplimiento INTEGER DEFAULT 0 CHECK (porcentaje_cumplimiento BETWEEN 0 AND 100),
    porcentaje_efectividad INTEGER DEFAULT 0 CHECK (porcentaje_efectividad BETWEEN 0 AND 100),
    acciones_revisadas INTEGER DEFAULT 0,
    acciones_totales INTEGER DEFAULT 0,
    observaciones_generales TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_seguimiento_trimestral_plan FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE
);

CREATE INDEX idx_seguimiento_trimestral_plan ON control_interno.seguimiento_trimestral(plan_id);
CREATE INDEX idx_seguimiento_trimestral_trimestre ON control_interno.seguimiento_trimestral(trimestre, año);

-- ============================================
-- Tabla: registro_seguimiento
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.registro_seguimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accion_id UUID NOT NULL,
    seguimiento_id UUID NOT NULL,
    accion_descripcion TEXT NOT NULL,
    acciones_programadas INTEGER DEFAULT 1,
    acciones_implementadas INTEGER DEFAULT 0,
    puntaje_cumplimiento INTEGER DEFAULT 0 CHECK (puntaje_cumplimiento BETWEEN 0 AND 2),
    controles_implementados VARCHAR(20) NOT NULL CHECK (controles_implementados IN ('SI', 'NO', 'PARCIAL')),
    hallazgo_se_repite VARCHAR(20) NOT NULL CHECK (hallazgo_se_repite IN ('SI', 'NO')),
    puntaje_efectividad INTEGER DEFAULT 0 CHECK (puntaje_efectividad BETWEEN 0 AND 2),
    observaciones TEXT,
    evidencias JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_registro_seguimiento_accion FOREIGN KEY (accion_id) 
        REFERENCES control_interno.accion_correctiva(id) ON DELETE CASCADE,
    CONSTRAINT fk_registro_seguimiento_seguimiento FOREIGN KEY (seguimiento_id) 
        REFERENCES control_interno.seguimiento_trimestral(id) ON DELETE CASCADE
);

CREATE INDEX idx_registro_seguimiento_accion ON control_interno.registro_seguimiento(accion_id);
CREATE INDEX idx_registro_seguimiento_seguimiento ON control_interno.registro_seguimiento(seguimiento_id);

-- ============================================
-- Tabla: seguimiento_plan_mejoramiento
-- ============================================
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
-- Tabla: accion_mejora
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.accion_mejora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('correctiva', 'preventiva', 'mejora')),
    responsable VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'vencida')),
    avance INTEGER NOT NULL,
    evidencias JSONB NOT NULL,
    observaciones TEXT,
    plan_mejoramiento_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accion_plan_mejoramiento FOREIGN KEY (plan_mejoramiento_id) 
        REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE
);

CREATE INDEX idx_accion_mejora_plan ON control_interno.accion_mejora(plan_mejoramiento_id);
CREATE INDEX idx_accion_mejora_estado ON control_interno.accion_mejora(estado);

-- ============================================
-- Tabla: plan_individual
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.plan_individual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    auditoria_id UUID NOT NULL,
    auditoria_codigo VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    alcance TEXT NOT NULL,
    objetivo TEXT NOT NULL,
    proceso_auditar VARCHAR(255) NOT NULL,
    riesgos JSONB NOT NULL,
    criterios_auditoria JSONB NOT NULL,
    normativa_aplicable JSONB NOT NULL,
    equipo_auditor JSONB NOT NULL,
    documentos JSONB NOT NULL,
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('borrador', 'enviado', 'aceptado')),
    fecha_creacion DATE NOT NULL,
    fecha_envio DATE,
    enviado_por VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_plan_individual_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria_programada(id) ON DELETE RESTRICT
);

CREATE INDEX idx_plan_individual_auditoria ON control_interno.plan_individual(auditoria_id);
CREATE INDEX idx_plan_individual_estado ON control_interno.plan_individual(estado);

-- ============================================
-- Tabla: plan_anual
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.plan_anual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    año INTEGER NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    estado VARCHAR(50) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'aprobado', 'en-ejecucion', 'cerrado')),
    fecha_creacion DATE NOT NULL,
    fecha_aprobacion DATE,
    creado_por VARCHAR(255) NOT NULL,
    version VARCHAR(50) DEFAULT '1.0',
    total_actividades INTEGER DEFAULT 0,
    actividades_completadas INTEGER DEFAULT 0,
    porcentaje_cumplimiento INTEGER DEFAULT 0,
    enfoques JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plan_anual_año ON control_interno.plan_anual(año);
CREATE INDEX idx_plan_anual_estado ON control_interno.plan_anual(estado);

-- ============================================
-- Tabla: cronograma_auditoria
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.cronograma_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    codigo VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    proceso VARCHAR(255) NOT NULL,
    nivel_riesgo VARCHAR(20) CHECK (nivel_riesgo IN ('Alto', 'Medio', 'Bajo')),
    trimestre VARCHAR(10) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    auditor_responsable VARCHAR(255),
    horas_estimadas INTEGER NOT NULL,
    estado VARCHAR(50) DEFAULT 'planificado' CHECK (estado IN ('planificado', 'en-ejecucion', 'completada', 'cancelada', 'en-revision')),
    es_territorial BOOLEAN DEFAULT FALSE,
    territorial VARCHAR(255),
    es_especial BOOLEAN DEFAULT FALSE,
    equipo JSONB,
    etapas_cronograma JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cronograma_plan FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_anual(id) ON DELETE CASCADE
);

CREATE INDEX idx_cronograma_plan ON control_interno.cronograma_auditoria(plan_id);
CREATE INDEX idx_cronograma_estado ON control_interno.cronograma_auditoria(estado);
CREATE INDEX idx_cronograma_trimestre ON control_interno.cronograma_auditoria(trimestre);

-- ============================================
-- Tabla: rol_plan_anual
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.rol_plan_anual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    tipo VARCHAR(100) NOT NULL CHECK (tipo IN ('Auditor Líder', 'Auditor', 'Prof. Especializado', 'Prof. Universitario', 'Técnico')),
    nombre VARCHAR(255),
    email VARCHAR(255),
    disponibilidad VARCHAR(50) DEFAULT 'disponible' CHECK (disponibilidad IN ('disponible', 'parcial', 'no-disponible')),
    horas_totales INTEGER DEFAULT 1800,
    horas_asignadas INTEGER DEFAULT 0,
    auditorias_asignadas INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rol_plan FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_anual(id) ON DELETE CASCADE
);

CREATE INDEX idx_rol_plan ON control_interno.rol_plan_anual(plan_id);
CREATE INDEX idx_rol_tipo ON control_interno.rol_plan_anual(tipo);

-- ============================================
-- Tabla: lista_chequeo
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.lista_chequeo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('cumplimiento', 'proceso', 'sistema', 'procedimiento')),
    categoria VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('activa', 'inactiva', 'obsoleta')),
    aplicable_para JSONB NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    items JSONB,
    proceso VARCHAR(255),
    subproceso VARCHAR(255),
    categoria_esap VARCHAR(100) CHECK (categoria_esap IN ('normativa', 'procesos', 'controles', 'riesgos', 'personalizada')),
    normativa_aplicable TEXT,
    objetivo TEXT,
    version_base VARCHAR(50),
    permite_no_aplica BOOLEAN DEFAULT TRUE,
    requiere_evidencias BOOLEAN DEFAULT TRUE,
    genera_hallazgos_automaticos BOOLEAN DEFAULT TRUE,
    auditoria_id UUID,
    nombre_auditoria VARCHAR(500),
    auditor_responsable VARCHAR(255),
    fecha_aplicacion DATE,
    fecha_diligenciamiento DATE,
    items_completados INTEGER DEFAULT 0,
    cumplimiento INTEGER DEFAULT 0 CHECK (cumplimiento BETWEEN 0 AND 100),
    no_cumplimientos INTEGER DEFAULT 0,
    no_aplica INTEGER DEFAULT 0,
    hallazgos_generados INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lista_chequeo_tipo ON control_interno.lista_chequeo(tipo);
CREATE INDEX idx_lista_chequeo_estado ON control_interno.lista_chequeo(estado);

-- ============================================
-- Tabla: version_lista_chequeo
-- ============================================
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

-- ============================================
-- Tabla: seccion_lista_chequeo
-- ============================================
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

-- ============================================
-- Tabla: item_lista_chequeo
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.item_lista_chequeo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER NOT NULL,
    pregunta TEXT NOT NULL,
    criterio TEXT NOT NULL,
    normativa_referencia VARCHAR(255),
    tipo_respuesta VARCHAR(50) NOT NULL CHECK (tipo_respuesta IN ('si_no', 'cumple_no_cumple', 'texto', 'numerico')),
    obligatorio BOOLEAN DEFAULT TRUE,
    peso_calificacion DECIMAL(10,2),
    evidencia_requerida BOOLEAN DEFAULT FALSE,
    lista_chequeo_id UUID NOT NULL,
    seccion_id UUID,
    es_critico BOOLEAN DEFAULT FALSE,
    respuesta VARCHAR(50) CHECK (respuesta IN ('cumple', 'no-cumple', 'no-aplica')),
    observaciones TEXT,
    genera_hallazgo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_lista_chequeo FOREIGN KEY (lista_chequeo_id) 
        REFERENCES control_interno.lista_chequeo(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_seccion FOREIGN KEY (seccion_id) 
        REFERENCES control_interno.seccion_lista_chequeo(id) ON DELETE SET NULL
);

CREATE INDEX idx_item_lista_chequeo_lista ON control_interno.item_lista_chequeo(lista_chequeo_id);
CREATE INDEX idx_item_seccion ON control_interno.item_lista_chequeo(seccion_id);

-- ============================================
-- Tabla: lista_aplicada
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.lista_aplicada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lista_chequeo_id UUID NOT NULL,
    lista_chequeo_codigo VARCHAR(255) NOT NULL,
    lista_chequeo_nombre VARCHAR(255) NOT NULL,
    auditoria_id VARCHAR(255) NOT NULL,
    fecha_aplicacion DATE NOT NULL,
    aplicado_por VARCHAR(255) NOT NULL,
    respuestas JSONB NOT NULL,
    resultado JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lista_aplicada_auditoria ON control_interno.lista_aplicada(auditoria_id);
CREATE INDEX idx_lista_aplicada_fecha ON control_interno.lista_aplicada(fecha_aplicacion DESC);

-- ============================================
-- Tabla: etapa_auditoria
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.etapa_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    etapa VARCHAR(50) NOT NULL CHECK (etapa IN ('planeacion', 'ejecucion', 'comunicacion')),
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('pendiente', 'en_progreso', 'completada')),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    fecha_limite DATE NOT NULL,
    datos JSONB NOT NULL,
    porcentaje_avance INTEGER DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_etapa_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria_programada(id) ON DELETE CASCADE
);

CREATE INDEX idx_etapa_auditoria_auditoria ON control_interno.etapa_auditoria(auditoria_id);
CREATE INDEX idx_etapa_auditoria_estado ON control_interno.etapa_auditoria(estado);

-- ============================================
-- Tabla: actividad_etapa_auditoria
-- ============================================
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
-- Tabla: documento (RF013 - Gestión Documental)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.documento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo_documento VARCHAR(100) NOT NULL CHECK (tipo_documento IN (
        'oficio_anuncio', 'carta_representacion', 'carta_compromiso',
        'programa_individual', 'acta_reunion_apertura', 'acta_reunion_cierre',
        'lista_chequeo', 'evidencia_hallazgo', 'informe_preliminar',
        'informe_final', 'informe_ejecutivo', 'evidencia_plan_mejoramiento', 'otro'
    )),
    etapa VARCHAR(50) CHECK (etapa IN ('planeacion', 'ejecucion', 'comunicacion')),
    auditoria_id UUID,
    hallazgo_id UUID,
    plan_mejoramiento_id UUID,
    ruta_archivo VARCHAR(500) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamanio_bytes BIGINT NOT NULL,
    version INTEGER DEFAULT 1,
    version_anterior_id UUID,
    subido_por VARCHAR(255) NOT NULL,
    hash_archivo VARCHAR(255),
    comprimido BOOLEAN DEFAULT FALSE,
    ruta_servidor_g VARCHAR(500),
    sincronizado_servidor_g BOOLEAN DEFAULT FALSE,
    fecha_sincronizacion TIMESTAMP,
    tipo_reporte VARCHAR(100) CHECK (tipo_reporte IN (
        'plan-anual', 'informe-auditoria', 'plan-mejora', 'acta-apertura', 
        'acta-cierre', 'matriz-hallazgos', 'reporte-ejecutivo', 'reporte-territorial',
        'reporte-gravedad', 'reporte-cumplimiento', 'otro'
    )),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_documento_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria_programada(id) ON DELETE SET NULL,
    CONSTRAINT fk_documento_version FOREIGN KEY (version_anterior_id) 
        REFERENCES control_interno.documento(id) ON DELETE SET NULL
);

CREATE INDEX idx_documento_auditoria ON control_interno.documento(auditoria_id);
CREATE INDEX idx_documento_tipo ON control_interno.documento(tipo_documento);
CREATE INDEX idx_documento_etapa ON control_interno.documento(etapa);

-- ============================================
-- Tabla: plantilla_reporte
-- ============================================
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
-- Tabla: notificacion (RF014 - Sistema de Notificaciones)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.notificacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id VARCHAR(255) NOT NULL,
    tipo_notificacion VARCHAR(100) NOT NULL CHECK (tipo_notificacion IN (
        'anuncio_auditoria', 'recordatorio_plazo', 'alerta_vencimiento',
        'hallazgo_identificado', 'solicitud_evidencia', 'recepcion_documento',
        'aprobacion_plan', 'rechazo_plan', 'controversia_hallazgo',
        'validacion_evidencia', 'otro'
    )),
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviada', 'leida', 'archivada')),
    canal VARCHAR(50) DEFAULT 'sistema' CHECK (canal IN ('email', 'sistema', 'ambos')),
    leida BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMP,
    enviada_email BOOLEAN DEFAULT FALSE,
    fecha_envio_email TIMESTAMP,
    metadata JSONB,
    accion_url VARCHAR(500),
    prioridad VARCHAR(20) DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'critica')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notificacion_usuario ON control_interno.notificacion(usuario_id);
CREATE INDEX idx_notificacion_estado ON control_interno.notificacion(estado);
CREATE INDEX idx_notificacion_created ON control_interno.notificacion(created_at);
CREATE INDEX idx_notificacion_tipo ON control_interno.notificacion(tipo_notificacion);

-- ============================================
-- Tabla: preferencia_notificacion (RF014)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.preferencia_notificacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id VARCHAR(255) UNIQUE NOT NULL,
    notificaciones_email BOOLEAN DEFAULT TRUE,
    notificaciones_sistema BOOLEAN DEFAULT TRUE,
    tipos_notificacion JSONB,
    frecuencia_recordatorios VARCHAR(50) DEFAULT '7',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_preferencia_usuario ON control_interno.preferencia_notificacion(usuario_id);

-- ============================================
-- Tabla: informe_ley (RF012 - Informes de Ley)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.informe_ley (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) CHECK (tipo IN ('ley', 'normativo', 'interno')),
    periodicidad VARCHAR(50) NOT NULL CHECK (periodicidad IN ('mensual', 'trimestral', 'semestral', 'anual')),
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN (
        'pendiente', 'en_proceso', 'en_revision', 'aprobado', 'presentado', 'vencido'
    )),
    dias_restantes INTEGER,
    alerta VARCHAR(50) CHECK (alerta IN ('verde', 'amarillo', 'naranja', 'rojo')),
    area VARCHAR(255) NOT NULL,
    responsable VARCHAR(255) NOT NULL,
    normativa TEXT,
    acciones_sugeridas JSONB,
    historial JSONB NOT NULL,
    proximo_recordatorio TIMESTAMP,
    recordatorios_enviados INTEGER DEFAULT 0,
    formato_template VARCHAR(255),
    datos_integrados JSONB,
    codigo_corto VARCHAR(50) UNIQUE,
    categoria VARCHAR(100) CHECK (categoria IN ('financiero', 'administrativo', 'contractual', 'talento-humano', 'transparencia', 'control')),
    dia_presentacion INTEGER CHECK (dia_presentacion BETWEEN 1 AND 31),
    entidad_destino VARCHAR(500),
    area_responsable VARCHAR(255),
    tiene_plantilla BOOLEAN DEFAULT FALSE,
    url_plantilla VARCHAR(500),
    requiere_aprobacion BOOLEAN DEFAULT TRUE,
    dias_anticipacion_alerta INTEGER DEFAULT 7,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_informe_ley_codigo ON control_interno.informe_ley(codigo);
CREATE INDEX idx_informe_ley_estado ON control_interno.informe_ley(estado);
CREATE INDEX idx_informe_ley_vencimiento ON control_interno.informe_ley(fecha_vencimiento);

-- ============================================
-- Tabla: entrega_informe_ley
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.entrega_informe_ley (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    informe_id UUID NOT NULL,
    periodo VARCHAR(50) NOT NULL,
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
-- Tabla: rol_decreto_648 (RF020 - Configuración)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.rol_decreto_648 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rol_codigo ON control_interno.rol_decreto_648(codigo);

-- ============================================
-- Tabla: rol_decreto_648_template (Plantilla de roles)
-- ============================================
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

-- ============================================
-- Tabla: actividad_rol (RF020)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.actividad_rol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id UUID NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    orden INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_actividad_rol FOREIGN KEY (rol_id) 
        REFERENCES control_interno.rol_decreto_648(id) ON DELETE CASCADE
);

CREATE INDEX idx_actividad_rol ON control_interno.actividad_rol(rol_id);

-- ============================================
-- Tabla: tipo_auditoria (RF020)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.tipo_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tipo_auditoria_codigo ON control_interno.tipo_auditoria(codigo);

-- ============================================
-- Tabla: parametro_sistema (RF020)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.parametro_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave VARCHAR(255) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    categoria VARCHAR(255),
    editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parametro_clave ON control_interno.parametro_sistema(clave);
CREATE INDEX idx_parametro_categoria ON control_interno.parametro_sistema(categoria);

-- ============================================
-- Tabla: plantilla_email (RF020)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.plantilla_email (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    asunto VARCHAR(500) NOT NULL,
    cuerpo TEXT NOT NULL,
    variables_disponibles JSONB,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plantilla_codigo ON control_interno.plantilla_email(codigo);
CREATE INDEX idx_plantilla_activa ON control_interno.plantilla_email(activa);

-- ============================================
-- Tabla: auditoria_gestion (extiende auditoria_programada)
-- ============================================
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
-- Tabla: aprobacion
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.aprobacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE,
    tipo VARCHAR(100) CHECK (tipo IN ('plan-auditoria', 'plan-mejora', 'informe', 'documento')),
    titulo VARCHAR(500),
    descripcion TEXT,
    solicitante VARCHAR(255),
    fecha_solicitud DATE DEFAULT CURRENT_DATE,
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

-- ============================================
-- Fix: Actualizar valores NULL en aprobacion
-- ============================================
-- Este fix corrige valores NULL existentes antes de que TypeORM intente sincronizar
DO $$
BEGIN
    -- Actualizar valores NULL en la columna 'tipo' con un valor por defecto
    UPDATE control_interno.aprobacion 
    SET tipo = 'documento' 
    WHERE tipo IS NULL;

    -- Actualizar valores NULL en la columna 'codigo' con un código generado
    UPDATE control_interno.aprobacion 
    SET codigo = 'APR-' || SUBSTRING(id::text, 1, 8) || '-' || EXTRACT(YEAR FROM created_at)::text
    WHERE codigo IS NULL;

    -- Actualizar valores NULL en la columna 'titulo' con un valor por defecto
    UPDATE control_interno.aprobacion 
    SET titulo = 'Sin título' 
    WHERE titulo IS NULL;

    -- Actualizar valores NULL en la columna 'solicitante' con un valor por defecto
    UPDATE control_interno.aprobacion 
    SET solicitante = 'Usuario no especificado' 
    WHERE solicitante IS NULL;

    -- Actualizar valores NULL en la columna 'fecha_solicitud' con la fecha de creación
    UPDATE control_interno.aprobacion 
    SET fecha_solicitud = created_at::date 
    WHERE fecha_solicitud IS NULL;
END $$;

-- ============================================
-- Tabla: documento_aprobacion
-- ============================================
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
-- Tabla: plan_anual_5_roles (Decreto 648)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.plan_anual_5_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    año INTEGER NOT NULL,
    fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
    responsable VARCHAR(255) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'aprobado', 'en-ejecucion', 'completado')),
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

-- ============================================
-- Tabla: rol_plan_anual_5
-- ============================================
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

-- ============================================
-- Tabla: actividad_plan_anual_5
-- ============================================
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
-- Tablas ESAP (unificadas en control_interno)
-- ============================================

-- Tabla: configuracion_esap
CREATE TABLE IF NOT EXISTS control_interno.configuracion_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave VARCHAR(255) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    categoria VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_config_esap_clave ON control_interno.configuracion_esap(clave);
CREATE INDEX idx_config_esap_categoria ON control_interno.configuracion_esap(categoria);
CREATE INDEX idx_config_esap_activo ON control_interno.configuracion_esap(activo);

-- Tabla: usuarios_esap
CREATE TABLE IF NOT EXISTS control_interno.usuarios_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    cargo VARCHAR(255),
    area VARCHAR(255),
    rol VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_esap_codigo ON control_interno.usuarios_esap(codigo);
CREATE INDEX idx_usuarios_esap_email ON control_interno.usuarios_esap(email);
CREATE INDEX idx_usuarios_esap_activo ON control_interno.usuarios_esap(activo);

-- Tabla: sesiones_esap
CREATE TABLE IF NOT EXISTS control_interno.sesiones_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sesion_usuario FOREIGN KEY (usuario_id) 
        REFERENCES control_interno.usuarios_esap(id) ON DELETE CASCADE
);

CREATE INDEX idx_sesiones_usuario ON control_interno.sesiones_esap(usuario_id);
CREATE INDEX idx_sesiones_token ON control_interno.sesiones_esap(token);
CREATE INDEX idx_sesiones_activa ON control_interno.sesiones_esap(activa);
CREATE INDEX idx_sesiones_expiracion ON control_interno.sesiones_esap(fecha_expiracion);

-- Tabla: logs_auditoria_esap
CREATE TABLE IF NOT EXISTS control_interno.logs_auditoria_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    accion VARCHAR(255) NOT NULL,
    entidad VARCHAR(255),
    entidad_id UUID,
    detalles JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id) 
        REFERENCES control_interno.usuarios_esap(id) ON DELETE SET NULL
);

CREATE INDEX idx_logs_usuario ON control_interno.logs_auditoria_esap(usuario_id);
CREATE INDEX idx_logs_accion ON control_interno.logs_auditoria_esap(accion);
CREATE INDEX idx_logs_entidad ON control_interno.logs_auditoria_esap(entidad);
CREATE INDEX idx_logs_created ON control_interno.logs_auditoria_esap(created_at DESC);

-- Tabla: cache_esap
CREATE TABLE IF NOT EXISTS control_interno.cache_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave VARCHAR(500) UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    fecha_expiracion TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_clave ON control_interno.cache_esap(clave);
CREATE INDEX idx_cache_expiracion ON control_interno.cache_esap(fecha_expiracion);

-- Tabla: plantillas_documentos_esap
CREATE TABLE IF NOT EXISTS control_interno.plantillas_documentos_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo_documento VARCHAR(100) NOT NULL,
    contenido TEXT NOT NULL,
    variables_disponibles JSONB,
    activa BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plantillas_codigo ON control_interno.plantillas_documentos_esap(codigo);
CREATE INDEX idx_plantillas_tipo ON control_interno.plantillas_documentos_esap(tipo_documento);
CREATE INDEX idx_plantillas_activa ON control_interno.plantillas_documentos_esap(activa);

-- Tabla: integraciones_esap
CREATE TABLE IF NOT EXISTS control_interno.integraciones_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL CHECK (tipo IN ('api', 'webhook', 'sftp', 'email', 'otro')),
    configuracion JSONB NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    ultima_sincronizacion TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integraciones_tipo ON control_interno.integraciones_esap(tipo);
CREATE INDEX idx_integraciones_activa ON control_interno.integraciones_esap(activa);

-- ============================================
-- Datos Iniciales
-- ============================================

-- Configuraciones iniciales ESAP
INSERT INTO control_interno.configuracion_esap (clave, valor, descripcion, tipo, categoria) VALUES
('esap_version', '1.0.0', 'Versión del sistema ESAP', 'string', 'sistema'),
('esap_nombre_institucion', 'ESAP', 'Nombre de la institución', 'string', 'sistema'),
('esap_logo_url', '/assets/logo-esap.png', 'URL del logo de la institución', 'string', 'sistema'),
('esap_contacto_email', 'contacto@esap.edu.co', 'Email de contacto', 'string', 'sistema'),
('esap_contacto_telefono', '+57 1 1234567', 'Teléfono de contacto', 'string', 'sistema'),
('esap_timezone', 'America/Bogota', 'Zona horaria', 'string', 'sistema'),
('esap_idioma_default', 'es', 'Idioma por defecto', 'string', 'sistema')
ON CONFLICT (clave) DO NOTHING;

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

-- ============================================
-- Comentarios en tablas
-- ============================================
COMMENT ON SCHEMA control_interno IS 'Schema unificado para el Sistema de Control Interno Institucional';
COMMENT ON TABLE control_interno.proceso_auditable IS 'Procesos auditables del universo de auditorías';
COMMENT ON TABLE control_interno.auditoria_programada IS 'Auditorías programadas en el plan anual';
COMMENT ON TABLE control_interno.hallazgo IS 'Hallazgos identificados en las auditorías';
COMMENT ON TABLE control_interno.plan_mejoramiento IS 'Planes de mejoramiento derivados de hallazgos';
COMMENT ON TABLE control_interno.accion_mejora IS 'Acciones de mejora dentro de un plan';
COMMENT ON TABLE control_interno.plan_individual IS 'Planes individuales de auditoría';
COMMENT ON TABLE control_interno.plan_anual IS 'Planes anuales de auditoría';
COMMENT ON TABLE control_interno.cronograma_auditoria IS 'Cronograma de auditorías del plan anual';
COMMENT ON TABLE control_interno.rol_plan_anual IS 'Roles y disponibilidad de auditores en el plan anual';
COMMENT ON TABLE control_interno.lista_chequeo IS 'Listas de chequeo para auditorías';
COMMENT ON TABLE control_interno.item_lista_chequeo IS 'Items de una lista de chequeo';
COMMENT ON TABLE control_interno.lista_aplicada IS 'Aplicaciones de listas de chequeo en auditorías';
COMMENT ON TABLE control_interno.etapa_auditoria IS 'Etapas de ejecución de auditorías';
COMMENT ON TABLE control_interno.documento IS 'Gestión documental centralizada (RF013)';
COMMENT ON TABLE control_interno.notificacion IS 'Sistema de notificaciones (RF014)';
COMMENT ON TABLE control_interno.preferencia_notificacion IS 'Preferencias de notificación por usuario (RF014)';
COMMENT ON TABLE control_interno.informe_ley IS 'Informes normativos requeridos por ley (RF012)';
COMMENT ON TABLE control_interno.rol_decreto_648 IS 'Roles del Decreto 648 configurable (RF020)';
COMMENT ON TABLE control_interno.actividad_rol IS 'Actividades por rol configurable (RF020)';
COMMENT ON TABLE control_interno.tipo_auditoria IS 'Tipos de auditoría configurables (RF020)';
COMMENT ON TABLE control_interno.parametro_sistema IS 'Parámetros de configuración del sistema (RF020)';
COMMENT ON TABLE control_interno.plantilla_email IS 'Plantillas de correo electrónico (RF020)';
COMMENT ON TABLE control_interno.auditoria IS 'Auditorías del sistema con gestión Kanban, Lista y Calendario';
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
COMMENT ON TABLE control_interno.configuracion_esap IS 'Configuraciones específicas del sistema ESAP';
COMMENT ON TABLE control_interno.usuarios_esap IS 'Usuarios del sistema ESAP';
COMMENT ON TABLE control_interno.sesiones_esap IS 'Sesiones activas de usuarios';
COMMENT ON TABLE control_interno.logs_auditoria_esap IS 'Logs de auditoría de acciones del sistema';
COMMENT ON TABLE control_interno.cache_esap IS 'Cache del sistema ESAP';
COMMENT ON TABLE control_interno.plantillas_documentos_esap IS 'Plantillas de documentos personalizadas';
COMMENT ON TABLE control_interno.integraciones_esap IS 'Configuración de integraciones externas';
