-- ==========================================
-- ESQUEMA DE BASE DE DATOS - CONTROL INTERNO
-- Para Supabase PostgreSQL
-- ==========================================

-- ==================== EXTENSIONES ====================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== TABLAS PRINCIPALES ====================

-- Tabla: Auditorías
CREATE TABLE auditorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  fase VARCHAR(50) NOT NULL,
  estado VARCHAR(50) NOT NULL,
  
  -- Ubicación
  territorial VARCHAR(100),
  sede VARCHAR(100),
  tipo_sede VARCHAR(50),
  
  -- Asignación
  auditor_lider VARCHAR(200),
  auditor_lider_id UUID,
  equipo_auditor TEXT[], -- Array de nombres
  equipo_auditor_ids UUID[], -- Array de IDs
  
  -- Alcance y objetivos
  alcance TEXT,
  objetivos TEXT,
  riesgos TEXT,
  criterios_auditoria TEXT[],
  normativa_aplicable TEXT[],
  
  -- Fechas
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  -- Fechas por etapa (JSONB para flexibilidad)
  fechas_etapa JSONB,
  
  -- Progreso
  progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  prioridad VARCHAR(20),
  
  -- Relaciones
  proceso_auditable_id UUID,
  programa_anual_id UUID,
  
  -- Hallazgos (contador)
  hallazgos INTEGER DEFAULT 0,
  
  -- Documentos generados
  documentos_generados JSONB,
  
  -- Metadata
  observaciones TEXT,
  creado_por UUID,
  actualizado_por UUID,
  
  -- Índices
  CONSTRAINT chk_fase CHECK (fase IN ('planeacion', 'en-curso', 'revision', 'completada')),
  CONSTRAINT chk_estado CHECK (estado IN ('programada', 'en-planeacion', 'en-ejecucion', 'en-comunicacion', 'cerrada', 'cancelada')),
  CONSTRAINT chk_prioridad CHECK (prioridad IN ('Alta', 'Media', 'Baja'))
);

-- Tabla: Procesos Auditables (Universo)
CREATE TABLE procesos_auditables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_proceso VARCHAR(200) NOT NULL,
  tipo_proceso VARCHAR(50) NOT NULL,
  tipo_sede VARCHAR(50),
  territorial VARCHAR(100),
  responsable_proceso VARCHAR(200),
  responsable_proceso_id UUID,
  
  -- Evaluación de Impacto (1-5)
  impacto_financiero INTEGER CHECK (impacto_financiero >= 1 AND impacto_financiero <= 5),
  impacto_operacional INTEGER CHECK (impacto_operacional >= 1 AND impacto_operacional <= 5),
  impacto_reputacional INTEGER CHECK (impacto_reputacional >= 1 AND impacto_reputacional <= 5),
  impacto_legal INTEGER CHECK (impacto_legal >= 1 AND impacto_legal <= 5),
  impacto_estrategico INTEGER CHECK (impacto_estrategico >= 1 AND impacto_estrategico <= 5),
  
  -- Evaluación de Probabilidad (1-5)
  probabilidad_ocurrencia INTEGER CHECK (probabilidad_ocurrencia >= 1 AND probabilidad_ocurrencia <= 5),
  
  -- Resultados calculados
  impacto_total DECIMAL(3,2),
  nivel_riesgo DECIMAL(5,2),
  clasificacion_riesgo VARCHAR(20),
  año_priorizacion VARCHAR(20),
  
  -- Información adicional
  ultima_auditoria DATE,
  observaciones TEXT,
  estado VARCHAR(50),
  fecha_evaluacion DATE,
  
  -- Metadata
  universo_anual_id UUID,
  creado_por UUID,
  actualizado_por UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  CONSTRAINT chk_tipo_proceso CHECK (tipo_proceso IN ('Misional', 'Apoyo', 'Estratégico', 'Evaluación')),
  CONSTRAINT chk_clasificacion_riesgo CHECK (clasificacion_riesgo IN ('BAJO', 'MEDIO', 'ALTO', 'CRÍTICO')),
  CONSTRAINT chk_estado_proceso CHECK (estado IN ('Evaluado', 'Pendiente', 'En Revisión'))
);

-- Tabla: Universo de Auditorías
CREATE TABLE universo_auditorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  año_fiscal INTEGER NOT NULL,
  version VARCHAR(20),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  responsable VARCHAR(200),
  responsable_id UUID,
  estado VARCHAR(20),
  
  CONSTRAINT chk_estado_universo CHECK (estado IN ('borrador', 'aprobado', 'vigente')),
  UNIQUE(año_fiscal, version)
);

-- Tabla: Auditorías Programadas (Programa Anual)
CREATE TABLE auditorias_programadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  proceso_auditable VARCHAR(200),
  proceso_auditable_id UUID REFERENCES procesos_auditables(id),
  tipo_proceso VARCHAR(50),
  tipo_sede VARCHAR(50),
  territorial VARCHAR(100),
  nivel_riesgo VARCHAR(20),
  año_priorizacion VARCHAR(20),
  
  -- Asignación
  auditor_lider VARCHAR(200),
  auditor_lider_id UUID,
  equipo_auditor TEXT[],
  equipo_auditor_ids UUID[],
  
  -- Programación de fechas por etapa (JSONB)
  fechas JSONB NOT NULL,
  
  estado VARCHAR(50),
  observaciones TEXT,
  
  -- Metadata
  programa_anual_id UUID,
  creado_por UUID,
  actualizado_por UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  CONSTRAINT chk_estado_programada CHECK (estado IN ('Programada', 'En Ejecución', 'Completada', 'Cancelada'))
);

-- Tabla: Programa Anual
CREATE TABLE programa_anual (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  año_fiscal INTEGER NOT NULL,
  version VARCHAR(20),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  responsable VARCHAR(200),
  responsable_id UUID,
  estado VARCHAR(20),
  universo_auditorias_id UUID REFERENCES universo_auditorias(id),
  
  CONSTRAINT chk_estado_programa CHECK (estado IN ('borrador', 'aprobado', 'vigente')),
  UNIQUE(año_fiscal, version)
);

-- Tabla: Hallazgos
CREATE TABLE hallazgos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  auditoria_id UUID REFERENCES auditorias(id) ON DELETE CASCADE,
  auditoria_codigo VARCHAR(20),
  
  tipo VARCHAR(50) NOT NULL,
  gravedad VARCHAR(20) NOT NULL,
  estado VARCHAR(50) NOT NULL,
  
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  criterio_incumplido TEXT,
  evidencia TEXT,
  causa_raiz TEXT,
  impacto TEXT,
  recomendacion TEXT,
  
  fecha_identificacion DATE NOT NULL,
  fecha_cierre DATE,
  
  responsable_area VARCHAR(200),
  responsable_area_id UUID,
  
  plan_mejoramiento_id UUID,
  
  -- Metadata
  creado_por UUID,
  actualizado_por UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  CONSTRAINT chk_tipo_hallazgo CHECK (tipo IN ('No Conformidad', 'Observación', 'Oportunidad de Mejora', 'Fortaleza')),
  CONSTRAINT chk_gravedad CHECK (gravedad IN ('Baja', 'Media', 'Alta', 'Crítica')),
  CONSTRAINT chk_estado_hallazgo CHECK (estado IN ('abierto', 'en-analisis', 'en-plan-mejoramiento', 'cerrado', 'rechazado'))
);

-- Tabla: Planes de Mejoramiento
CREATE TABLE planes_mejoramiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  
  auditoria_id UUID REFERENCES auditorias(id),
  auditoria_codigo VARCHAR(20),
  
  hallazgos_ids UUID[],
  
  responsable VARCHAR(200),
  responsable_id UUID,
  
  fecha_elaboracion DATE,
  fecha_aprobacion DATE,
  
  estado VARCHAR(50),
  porcentaje_avance_general INTEGER DEFAULT 0 CHECK (porcentaje_avance_general >= 0 AND porcentaje_avance_general <= 100),
  
  observaciones TEXT,
  
  -- Metadata
  creado_por UUID,
  actualizado_por UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  CONSTRAINT chk_estado_plan CHECK (estado IN ('borrador', 'aprobado', 'en-ejecucion', 'cerrado'))
);

-- Tabla: Acciones de Mejoramiento
CREATE TABLE acciones_mejoramiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_mejoramiento_id UUID REFERENCES planes_mejoramiento(id) ON DELETE CASCADE,
  hallazgo_id UUID REFERENCES hallazgos(id),
  
  descripcion TEXT NOT NULL,
  responsable VARCHAR(200),
  responsable_id UUID,
  
  fecha_inicio DATE,
  fecha_fin DATE,
  fecha_cumplimiento DATE,
  
  estado VARCHAR(50),
  porcentaje_avance INTEGER DEFAULT 0 CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100),
  
  evidencias TEXT[],
  observaciones TEXT,
  
  -- Metadata
  creado_por UUID,
  actualizado_por UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  CONSTRAINT chk_estado_accion CHECK (estado IN ('programada', 'en-ejecucion', 'completada', 'vencida', 'atrasada'))
);

-- Tabla: Plan Anual 5 Roles
CREATE TABLE plan_anual_5roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  año_fiscal INTEGER NOT NULL UNIQUE,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  responsable VARCHAR(200),
  responsable_id UUID,
  estado VARCHAR(50),
  
  CONSTRAINT chk_estado_plan_5roles CHECK (estado IN ('borrador', 'aprobado', 'en-ejecucion', 'completado'))
);

-- Tabla: Actividades (del Plan Anual 5 Roles)
CREATE TABLE actividades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_anual_id UUID REFERENCES plan_anual_5roles(id) ON DELETE CASCADE,
  rol_id INTEGER NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  responsable VARCHAR(200),
  responsable_id UUID,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado VARCHAR(50),
  porcentaje_avance INTEGER DEFAULT 0 CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100),
  observaciones TEXT,
  prioridad VARCHAR(20),
  
  -- Metadata
  creado_por UUID,
  actualizado_por UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  CONSTRAINT chk_rol_id CHECK (rol_id >= 1 AND rol_id <= 5),
  CONSTRAINT chk_estado_actividad CHECK (estado IN ('pendiente', 'en-progreso', 'completada', 'retrasada')),
  CONSTRAINT chk_prioridad_actividad CHECK (prioridad IN ('Alta', 'Media', 'Baja'))
);

-- Tabla: Listas de Chequeo
CREATE TABLE listas_chequeo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  categoria VARCHAR(50),
  descripcion TEXT,
  
  auditoria_id UUID REFERENCES auditorias(id),
  
  estado VARCHAR(20),
  
  -- Estadísticas (calculadas)
  total_items INTEGER DEFAULT 0,
  items_cumple INTEGER DEFAULT 0,
  items_no_cumple INTEGER DEFAULT 0,
  items_no_aplica INTEGER DEFAULT 0,
  porcentaje_cumplimiento INTEGER DEFAULT 0,
  
  -- Metadata
  creado_por UUID,
  actualizado_por UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  CONSTRAINT chk_estado_lista CHECK (estado IN ('borrador', 'activa', 'archivada'))
);

-- Tabla: Secciones de Lista de Chequeo
CREATE TABLE secciones_lista_chequeo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lista_chequeo_id UUID REFERENCES listas_chequeo(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  orden INTEGER NOT NULL,
  
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Tabla: Items de Lista de Chequeo
CREATE TABLE items_lista_chequeo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seccion_id UUID REFERENCES secciones_lista_chequeo(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  criterio TEXT NOT NULL,
  es_obligatorio BOOLEAN DEFAULT false,
  es_critico BOOLEAN DEFAULT false,
  referencia_normativa VARCHAR(200),
  
  -- Respuesta
  respuesta VARCHAR(20),
  observaciones TEXT,
  evidencia TEXT,
  
  -- Metadata
  creado_por UUID,
  actualizado_por UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  CONSTRAINT chk_respuesta CHECK (respuesta IN ('cumple', 'no-cumple', 'no-aplica') OR respuesta IS NULL)
);

-- Tabla: Informes de Ley
CREATE TABLE informes_ley (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  categoria VARCHAR(50),
  periodicidad VARCHAR(20) NOT NULL,
  descripcion TEXT,
  fundamento_legal TEXT,
  
  responsable VARCHAR(200),
  responsable_id UUID,
  
  dias_anticipacion INTEGER DEFAULT 7,
  activo BOOLEAN DEFAULT true,
  
  -- Metadata
  creado_por UUID,
  actualizado_por UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  CONSTRAINT chk_periodicidad CHECK (periodicidad IN ('mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual'))
);

-- Tabla: Entregas de Informes
CREATE TABLE entregas_informes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  informe_ley_id UUID REFERENCES informes_ley(id) ON DELETE CASCADE,
  periodo VARCHAR(50) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_entrega DATE,
  estado VARCHAR(20) NOT NULL,
  archivo_url TEXT,
  observaciones TEXT,
  
  -- Metadata
  creado_por UUID,
  actualizado_por UUID,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP,
  
  CONSTRAINT chk_estado_entrega CHECK (estado IN ('pendiente', 'en-proceso', 'entregado', 'vencido', 'rechazado'))
);

-- ==================== ÍNDICES ====================

-- Auditorías
CREATE INDEX idx_auditorias_codigo ON auditorias(codigo);
CREATE INDEX idx_auditorias_fase ON auditorias(fase);
CREATE INDEX idx_auditorias_estado ON auditorias(estado);
CREATE INDEX idx_auditorias_fecha_inicio ON auditorias(fecha_inicio);
CREATE INDEX idx_auditorias_programa_anual ON auditorias(programa_anual_id);

-- Procesos Auditables
CREATE INDEX idx_procesos_clasificacion ON procesos_auditables(clasificacion_riesgo);
CREATE INDEX idx_procesos_universo ON procesos_auditables(universo_anual_id);

-- Hallazgos
CREATE INDEX idx_hallazgos_auditoria ON hallazgos(auditoria_id);
CREATE INDEX idx_hallazgos_estado ON hallazgos(estado);
CREATE INDEX idx_hallazgos_gravedad ON hallazgos(gravedad);

-- Planes de Mejoramiento
CREATE INDEX idx_planes_auditoria ON planes_mejoramiento(auditoria_id);
CREATE INDEX idx_planes_estado ON planes_mejoramiento(estado);

-- Acciones
CREATE INDEX idx_acciones_plan ON acciones_mejoramiento(plan_mejoramiento_id);
CREATE INDEX idx_acciones_estado ON acciones_mejoramiento(estado);

-- ==================== FUNCIONES Y TRIGGERS ====================

-- Función para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para todas las tablas
CREATE TRIGGER update_auditorias_updated_at BEFORE UPDATE ON auditorias 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_procesos_updated_at BEFORE UPDATE ON procesos_auditables 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hallazgos_updated_at BEFORE UPDATE ON hallazgos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planes_updated_at BEFORE UPDATE ON planes_mejoramiento 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acciones_updated_at BEFORE UPDATE ON acciones_mejoramiento 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== ROW LEVEL SECURITY (RLS) ====================

-- Habilitar RLS en todas las tablas
ALTER TABLE auditorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE procesos_auditables ENABLE ROW LEVEL SECURITY;
ALTER TABLE hallazgos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_mejoramiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE acciones_mejoramiento ENABLE ROW LEVEL SECURITY;

-- Políticas de ejemplo (ajustar según roles de ESAP)
-- Los usuarios autenticados pueden ver todas las auditorías
CREATE POLICY "Usuarios pueden ver auditorías" ON auditorias
  FOR SELECT USING (auth.role() = 'authenticated');

-- Los usuarios autenticados pueden crear auditorías
CREATE POLICY "Usuarios pueden crear auditorías" ON auditorias
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Los usuarios pueden actualizar auditorías que crearon o están asignadas
CREATE POLICY "Usuarios pueden actualizar sus auditorías" ON auditorias
  FOR UPDATE USING (
    auth.uid() = creado_por OR 
    auth.uid() = auditor_lider_id OR 
    auth.uid() = ANY(equipo_auditor_ids)
  );

-- ==================== VISTAS ÚTILES ====================

-- Vista: Auditorías con estadísticas
CREATE OR REPLACE VIEW v_auditorias_stats AS
SELECT 
  a.*,
  COUNT(h.id) as total_hallazgos,
  COUNT(CASE WHEN h.estado = 'abierto' THEN 1 END) as hallazgos_abiertos
FROM auditorias a
LEFT JOIN hallazgos h ON a.id = h.auditoria_id
GROUP BY a.id;

-- Vista: Resumen de Programa Anual
CREATE OR REPLACE VIEW v_programa_anual_resumen AS
SELECT 
  pa.año_fiscal,
  pa.estado,
  COUNT(ap.id) as total_auditorias,
  COUNT(CASE WHEN ap.estado = 'Programada' THEN 1 END) as programadas,
  COUNT(CASE WHEN ap.estado = 'En Ejecución' THEN 1 END) as en_ejecucion,
  COUNT(CASE WHEN ap.estado = 'Completada' THEN 1 END) as completadas
FROM programa_anual pa
LEFT JOIN auditorias_programadas ap ON pa.id = ap.programa_anual_id
GROUP BY pa.id, pa.año_fiscal, pa.estado;

-- ==================== COMENTARIOS ====================

COMMENT ON TABLE auditorias IS 'Gestión completa de auditorías individuales';
COMMENT ON TABLE procesos_auditables IS 'Procesos evaluados para el Universo de Auditorías';
COMMENT ON TABLE hallazgos IS 'Hallazgos identificados durante auditorías';
COMMENT ON TABLE planes_mejoramiento IS 'Planes de mejoramiento generados a partir de hallazgos';
COMMENT ON TABLE acciones_mejoramiento IS 'Acciones específicas dentro de planes de mejoramiento';
