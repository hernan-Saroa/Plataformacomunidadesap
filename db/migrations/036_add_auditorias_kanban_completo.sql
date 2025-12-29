-- ============================================
-- Migración 036: Extensión completa del Kanban de Auditorías
-- Fecha: 2025-12-20
-- Descripción: Extiende el schema control_interno con todas las funcionalidades
--              del módulo Kanban basadas en GestionAuditoriasKanbanSimple.tsx
--              Diseñado para DATOS REALES, no mockdata
-- ============================================

-- ============================================
-- PARTE 1: AGREGAR CAMPOS A TABLA auditoria
-- ============================================

-- Estado según Kanban (Planeación, Ejecución, Comunicación, Seguimiento, Finalizada)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'estado_kanban'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN estado_kanban VARCHAR(50) CHECK (estado_kanban IN ('Planeación', 'Ejecución', 'Comunicación', 'Seguimiento', 'Finalizada'));
    END IF;
END $$;

-- Semaforo (verde, amarillo, rojo)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'semaforo'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN semaforo VARCHAR(20) CHECK (semaforo IN ('verde', 'amarillo', 'rojo')) DEFAULT 'verde';
    END IF;
END $$;

-- Tipo de auditoría según frontend (regular, territorial, especial)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'tipo_kanban'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN tipo_kanban VARCHAR(50) CHECK (tipo_kanban IN ('regular', 'territorial', 'especial')) DEFAULT 'regular';
    END IF;
END $$;

-- Prioridad (crítica, alta, media, baja)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'prioridad_kanban'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN prioridad_kanban VARCHAR(20) CHECK (prioridad_kanban IN ('crítica', 'alta', 'media', 'baja')) DEFAULT 'media';
    END IF;
END $$;

-- Área objetivo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'area_objetivo'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN area_objetivo VARCHAR(255);
    END IF;
END $$;

-- Permite cambiar objetivos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'permite_cambiar_objetivos'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN permite_cambiar_objetivos BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Campo descripcion (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'descripcion'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN descripcion TEXT;
    END IF;
END $$;

-- Alcance de la auditoría (Paso 2 del formulario)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'alcance'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN alcance TEXT;
    END IF;
END $$;

-- Proceso Auditado (nombre del proceso)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'proceso_auditado'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN proceso_auditado VARCHAR(500);
    END IF;
END $$;

-- Responsable del Área Auditada (nombre completo)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'responsable_area_nombre'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN responsable_area_nombre VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'responsable_area_cargo'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN responsable_area_cargo VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'responsable_area_email'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN responsable_area_email VARCHAR(255);
    END IF;
END $$;

-- Supervisor Asignado (FK a auth.personas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'supervisor_asignado_id'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN supervisor_asignado_id BIGINT REFERENCES auth.personas(id_tercero);
    END IF;
END $$;

-- Fecha de Reunión de Apertura (Paso 2 del formulario)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'fecha_reunion_apertura'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN fecha_reunion_apertura TIMESTAMP;
    END IF;
END $$;

-- Metodología
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'metodologia'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN metodologia TEXT;
    END IF;
END $$;

-- Periodicidad
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'periodicidad'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN periodicidad VARCHAR(20) CHECK (periodicidad IN ('unica', 'trimestral', 'semestral', 'anual')) DEFAULT 'unica';
    END IF;
END $$;

-- Presupuesto Estimado
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'presupuesto_estimado'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN presupuesto_estimado NUMERIC(15, 2);
    END IF;
END $$;

-- Vinculación con Plan Anual
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'vinculada_plan_anual'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN vinculada_plan_anual BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'plan_anual_id'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN plan_anual_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'plan_anual_ano'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN plan_anual_ano INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'rol_decreto_asociado'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN rol_decreto_asociado VARCHAR(255);
    END IF;
END $$;

-- Observaciones adicionales (campo general para notas adicionales)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'observaciones_adicionales'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN observaciones_adicionales TEXT;
    END IF;
END $$;

-- Checklist completados (JSONB para almacenar estado de checkboxes de actividades)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'checklist_completados'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN checklist_completados JSONB;
        
        COMMENT ON COLUMN control_interno.auditoria.checklist_completados IS 
        'Estado de los checkboxes de actividades de auditoría. Formato: {"ep1": true, "ep2": false, ...}';
    END IF;
END $$;

-- Campos para acciones del sistema (archivar, eliminar lógico)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'archivada'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN archivada BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'fecha_archivo'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN fecha_archivo TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'activa'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN activa BOOLEAN DEFAULT true; -- Para soft delete
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'fecha_eliminacion'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN fecha_eliminacion TIMESTAMP;
    END IF;
END $$;

-- Índice para auditorías activas/no archivadas
CREATE INDEX IF NOT EXISTS idx_auditoria_activa ON control_interno.auditoria(activa) WHERE activa = true;
CREATE INDEX IF NOT EXISTS idx_auditoria_archivada ON control_interno.auditoria(archivada) WHERE archivada = false;

-- Campo riesgo_kanban (Alto, Medio, Bajo) - específico del Kanban
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'riesgo_kanban'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN riesgo_kanban VARCHAR(20) CHECK (riesgo_kanban IN ('Alto', 'Medio', 'Bajo'));
    END IF;
END $$;

-- Calificación de riesgo (texto descriptivo como "Riesgo Moderado")
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'calificacion_riesgo'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN calificacion_riesgo VARCHAR(255);
    END IF;
END $$;

-- Última actuación (descripción de la última acción)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'ultima_actuacion'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN ultima_actuacion TEXT;
    END IF;
END $$;

-- Días restantes (calculado)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'dias_restantes'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN dias_restantes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Porcentaje de tiempo (calculado)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'porcentaje_tiempo'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN porcentaje_tiempo INTEGER DEFAULT 0 CHECK (porcentaje_tiempo BETWEEN 0 AND 100);
    END IF;
END $$;

-- Contadores de documentos, informes, tareas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'total_documentos'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN total_documentos INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'total_informes'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN total_informes INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'total_tareas'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN total_tareas INTEGER DEFAULT 0;
    END IF;
END $$;

-- Actividades completas (validación de fase)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'actividades_completas'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN actividades_completas BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'actividades_pendientes'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN actividades_pendientes INTEGER DEFAULT 0 CHECK (actividades_pendientes BETWEEN 0 AND 3);
    END IF;
END $$;

-- Referencias a personas (FK a auth.personas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'auditor_lider_id'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN auditor_lider_id BIGINT REFERENCES auth.personas(id_tercero);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'auditor_asignado_id'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN auditor_asignado_id BIGINT REFERENCES auth.personas(id_tercero);
    END IF;
END $$;

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_auditoria_estado_kanban ON control_interno.auditoria(estado_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_semaforo ON control_interno.auditoria(semaforo);
CREATE INDEX IF NOT EXISTS idx_auditoria_tipo_kanban ON control_interno.auditoria(tipo_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_prioridad_kanban ON control_interno.auditoria(prioridad_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_riesgo_kanban ON control_interno.auditoria(riesgo_kanban);
CREATE INDEX IF NOT EXISTS idx_auditoria_auditor_lider ON control_interno.auditoria(auditor_lider_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_auditor_asignado ON control_interno.auditoria(auditor_asignado_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_supervisor ON control_interno.auditoria(supervisor_asignado_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_plan_anual ON control_interno.auditoria(plan_anual_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_reunion ON control_interno.auditoria(fecha_reunion_apertura);

-- ============================================
-- PARTE 2: TABLA objetivo_auditoria
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.objetivo_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    descripcion TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_objetivo_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_objetivo_auditoria ON control_interno.objetivo_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_objetivo_auditoria_activo ON control_interno.objetivo_auditoria(activo);

COMMENT ON TABLE control_interno.objetivo_auditoria IS 'Objetivos específicos de cada auditoría. Cada auditoría puede tener múltiples objetivos.';

-- ============================================
-- PARTE 3: TABLA equipo_auditor
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.equipo_auditor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    persona_id BIGINT NOT NULL, -- FK a auth.personas
    rol VARCHAR(100) DEFAULT 'Auditor', -- Auditor, Auditor Senior, Profesional Especializado, etc.
    activo BOOLEAN DEFAULT true,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_retiro TIMESTAMP,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_equipo_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipo_persona FOREIGN KEY (persona_id) 
        REFERENCES auth.personas(id_tercero) ON DELETE RESTRICT
);

-- Índice parcial único para evitar duplicados activos (solo para registros activos)
CREATE UNIQUE INDEX IF NOT EXISTS uq_equipo_auditor_persona_activo 
    ON control_interno.equipo_auditor(auditoria_id, persona_id) 
    WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_equipo_auditor_auditoria ON control_interno.equipo_auditor(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_equipo_auditor_persona ON control_interno.equipo_auditor(persona_id);
CREATE INDEX IF NOT EXISTS idx_equipo_auditor_activo ON control_interno.equipo_auditor(activo);

COMMENT ON TABLE control_interno.equipo_auditor IS 'Equipo de auditores asignados a una auditoría. Relación N-N entre auditorías y personas.';
COMMENT ON COLUMN control_interno.equipo_auditor.rol IS 'Rol del auditor en esta auditoría específica: Auditor, Auditor Senior, Auditor Junior, Inspector, Profesional Especializado, etc.';

-- ============================================
-- PARTE 4: TABLA nota_auditoria
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.nota_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    contenido TEXT NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('General', 'Hallazgo', 'Seguimiento', 'Evidencia', 'Recomendación', 'Observación')),
    autor_id BIGINT NOT NULL, -- FK a auth.personas
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    importante BOOLEAN DEFAULT false,
    editada BOOLEAN DEFAULT false,
    fecha_edicion TIMESTAMP,
    editor_id BIGINT, -- FK a auth.personas (si fue editada por otra persona)
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_nota_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE,
    CONSTRAINT fk_nota_autor FOREIGN KEY (autor_id) 
        REFERENCES auth.personas(id_tercero) ON DELETE RESTRICT,
    CONSTRAINT fk_nota_editor FOREIGN KEY (editor_id) 
        REFERENCES auth.personas(id_tercero) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_nota_auditoria ON control_interno.nota_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_nota_autor ON control_interno.nota_auditoria(autor_id);
CREATE INDEX IF NOT EXISTS idx_nota_categoria ON control_interno.nota_auditoria(categoria);
CREATE INDEX IF NOT EXISTS idx_nota_importante ON control_interno.nota_auditoria(importante) WHERE importante = true;
CREATE INDEX IF NOT EXISTS idx_nota_fecha ON control_interno.nota_auditoria(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_nota_fecha_hora ON control_interno.nota_auditoria(fecha DESC, hora DESC);

COMMENT ON TABLE control_interno.nota_auditoria IS 'Notas y observaciones de las auditorías. Similar a un sistema de comentarios con categorización. Las notas marcadas como importantes (importante=true) aparecen destacadas en amarillo.';
COMMENT ON COLUMN control_interno.nota_auditoria.importante IS 'Si es true, la nota se marca como importante y aparece destacada con fondo amarillo en el frontend';
COMMENT ON COLUMN control_interno.nota_auditoria.categoria IS 'Categoría de la nota: General, Hallazgo, Seguimiento, Evidencia, Recomendación, Observación';

-- ============================================
-- PARTE 5: TABLA historial_auditoria
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.historial_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN (
        'creacion', 'cambio_estado', 'asignacion', 'actualizacion', 
        'documento', 'hallazgo', 'nota', 'aprobacion', 'finalizacion'
    )),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    usuario_id BIGINT NOT NULL, -- FK a auth.personas
    accion VARCHAR(255) NOT NULL,
    descripcion TEXT,
    observaciones TEXT,
    documento_adjunto VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    -- Cambios estructurados: Array JSONB con formato [{campo: string, valorAnterior: string, valorNuevo: string}]
    -- Ejemplo: [{"campo": "Progreso", "valorAnterior": "10%", "valorNuevo": "15%"}]
    cambios JSONB DEFAULT '[]'::jsonb,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE,
    CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) 
        REFERENCES auth.personas(id_tercero) ON DELETE RESTRICT
);

-- Índice GIN para búsquedas eficientes en el campo JSONB de cambios
CREATE INDEX IF NOT EXISTS idx_historial_cambios_gin ON control_interno.historial_auditoria USING GIN (cambios);

CREATE INDEX IF NOT EXISTS idx_historial_auditoria ON control_interno.historial_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_historial_usuario ON control_interno.historial_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_tipo ON control_interno.historial_auditoria(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON control_interno.historial_auditoria(fecha DESC, hora DESC);

COMMENT ON TABLE control_interno.historial_auditoria IS 'Historial completo de cambios y eventos de una auditoría. Trazabilidad completa de todas las acciones. El campo cambios almacena un array JSONB con formato: [{"campo": "Progreso", "valorAnterior": "10%", "valorNuevo": "15%"}]';
COMMENT ON COLUMN control_interno.historial_auditoria.cambios IS 'Array JSONB de cambios realizados. Formato: [{"campo": string, "valorAnterior": string, "valorNuevo": string}]. Ejemplo: [{"campo": "Progreso", "valorAnterior": "10%", "valorNuevo": "15%"}]';

-- ============================================
-- PARTE 6: TABLA auditoria_territorial_info
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.auditoria_territorial_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL, -- Ej: "Antioquia - Medellín"
    ciudad VARCHAR(255) NOT NULL,
    departamento VARCHAR(255) NOT NULL,
    direccion TEXT,
    contacto_nombre VARCHAR(255),
    contacto_email VARCHAR(255),
    contacto_telefono VARCHAR(20),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_territorial_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_territorial_auditoria ON control_interno.auditoria_territorial_info(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_territorial_ciudad ON control_interno.auditoria_territorial_info(ciudad);
CREATE INDEX IF NOT EXISTS idx_territorial_departamento ON control_interno.auditoria_territorial_info(departamento);

COMMENT ON TABLE control_interno.auditoria_territorial_info IS 'Información específica de auditorías territoriales (ciudad, departamento, contacto).';

-- ============================================
-- PARTE 7: TABLA auditoria_especial_info
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.auditoria_especial_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL UNIQUE,
    tipo_motivo VARCHAR(100) NOT NULL CHECK (tipo_motivo IN (
        'denuncia', 'ente_control', 'emergencia', 'seguimiento_urgente', 
        'revision_especifica', 'solicitud_ente_control', 'otro'
    )),
    solicitante VARCHAR(255) NOT NULL, -- Ej: "Contraloría General de la República"
    justificacion TEXT NOT NULL,
    fecha_solicitud DATE,
    fecha_aprobacion DATE,
    aprobado_por_id BIGINT, -- FK a auth.personas
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_especial_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE,
    CONSTRAINT fk_especial_aprobado_por FOREIGN KEY (aprobado_por_id) 
        REFERENCES auth.personas(id_tercero) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_especial_auditoria ON control_interno.auditoria_especial_info(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_especial_tipo_motivo ON control_interno.auditoria_especial_info(tipo_motivo);
CREATE INDEX IF NOT EXISTS idx_especial_fecha_solicitud ON control_interno.auditoria_especial_info(fecha_solicitud);

COMMENT ON TABLE control_interno.auditoria_especial_info IS 'Información específica de auditorías especiales (motivo, solicitante, justificación).';

-- ============================================
-- PARTE 8: TABLA actividad_proceso_auditoria
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.actividad_proceso_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    fase VARCHAR(50) NOT NULL CHECK (fase IN ('Planeación', 'Ejecución', 'Comunicación', 'Seguimiento')),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    orden INTEGER NOT NULL CHECK (orden BETWEEN 1 AND 3), -- Máximo 3 actividades por fase
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en-progreso', 'completada')),
    fecha_limite DATE,
    fecha_completacion TIMESTAMP,
    completada_por_id BIGINT, -- FK a auth.personas
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_actividad_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE,
    CONSTRAINT fk_actividad_completada_por FOREIGN KEY (completada_por_id) 
        REFERENCES auth.personas(id_tercero) ON DELETE SET NULL,
    CONSTRAINT uq_actividad_fase_orden UNIQUE (auditoria_id, fase, orden)
);

CREATE INDEX IF NOT EXISTS idx_actividad_auditoria ON control_interno.actividad_proceso_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_actividad_fase ON control_interno.actividad_proceso_auditoria(fase);
CREATE INDEX IF NOT EXISTS idx_actividad_estado ON control_interno.actividad_proceso_auditoria(estado);

COMMENT ON TABLE control_interno.actividad_proceso_auditoria IS 'Actividades del proceso de auditoría. Cada fase tiene hasta 3 actividades requeridas para avanzar.';

-- ============================================
-- PARTE 9: FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar días restantes y porcentaje de tiempo
CREATE OR REPLACE FUNCTION control_interno.calcular_metricas_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    dias_totales INTEGER;
    dias_transcurridos INTEGER;
BEGIN
    -- Calcular días restantes
    IF NEW.fecha_fin IS NOT NULL THEN
        NEW.dias_restantes := GREATEST(0, NEW.fecha_fin - CURRENT_DATE);
    ELSE
        NEW.dias_restantes := 0;
    END IF;

    -- Calcular porcentaje de tiempo transcurrido
    IF NEW.fecha_inicio IS NOT NULL AND NEW.fecha_fin IS NOT NULL THEN
        dias_totales := NEW.fecha_fin - NEW.fecha_inicio;
        dias_transcurridos := CURRENT_DATE - NEW.fecha_inicio;
        
        IF dias_totales > 0 THEN
            NEW.porcentaje_tiempo := LEAST(100, GREATEST(0, (dias_transcurridos * 100) / dias_totales));
        ELSE
            NEW.porcentaje_tiempo := 0;
        END IF;
    ELSE
        NEW.porcentaje_tiempo := 0;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        NEW.porcentaje_tiempo := 0;
        NEW.dias_restantes := 0;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular métricas automáticamente
DROP TRIGGER IF EXISTS trigger_calcular_metricas_auditoria ON control_interno.auditoria;
CREATE TRIGGER trigger_calcular_metricas_auditoria
    BEFORE INSERT OR UPDATE OF fecha_inicio, fecha_fin ON control_interno.auditoria
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.calcular_metricas_auditoria();

-- Función para actualizar actividades_completas y actividades_pendientes
CREATE OR REPLACE FUNCTION control_interno.actualizar_actividades_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    v_auditoria_id UUID;
    v_fase VARCHAR(50);
    total_actividades INTEGER;
    completadas INTEGER;
    pendientes INTEGER;
BEGIN
    -- Obtener el ID de la auditoría desde NEW
    v_auditoria_id := NEW.auditoria_id;
    
    -- Obtener la fase actual de la auditoría
    SELECT estado_kanban INTO v_fase
    FROM control_interno.auditoria
    WHERE id = v_auditoria_id;
    
    -- Si no hay fase, salir
    IF v_fase IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Contar actividades de la fase actual de la auditoría
    SELECT COUNT(*), COUNT(*) FILTER (WHERE estado = 'completada')
    INTO total_actividades, completadas
    FROM control_interno.actividad_proceso_auditoria
    WHERE auditoria_id = v_auditoria_id
      AND fase = v_fase;
    
    pendientes := total_actividades - completadas;
    
    -- Actualizar auditoría
    UPDATE control_interno.auditoria
    SET actividades_completas = (pendientes = 0),
        actividades_pendientes = pendientes
    WHERE id = v_auditoria_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estado de actividades
DROP TRIGGER IF EXISTS trigger_actualizar_actividades ON control_interno.actividad_proceso_auditoria;
CREATE TRIGGER trigger_actualizar_actividades
    AFTER INSERT OR UPDATE OF estado ON control_interno.actividad_proceso_auditoria
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.actualizar_actividades_auditoria();

COMMENT ON FUNCTION control_interno.calcular_metricas_auditoria IS 'Calcula automáticamente días_restantes y porcentaje_tiempo basado en fechas de inicio y fin';
COMMENT ON FUNCTION control_interno.actualizar_actividades_auditoria IS 'Actualiza actividades_completas y actividades_pendientes cuando cambia el estado de una actividad';

-- ============================================
-- PARTE 10: TABLA criterio_auditoria
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.criterio_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    criterio TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_criterio_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_criterio_auditoria ON control_interno.criterio_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_criterio_auditoria_activo ON control_interno.criterio_auditoria(activo);

COMMENT ON TABLE control_interno.criterio_auditoria IS 'Criterios de auditoría (normas, políticas, estándares aplicables)';

-- ============================================
-- PARTE 11: TABLA normatividad_aplicable
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.normatividad_aplicable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    normatividad TEXT NOT NULL, -- Ej: "Decreto 648 de 2017", "Manual de Contratación"
    tipo VARCHAR(100), -- 'decreto', 'ley', 'manual', 'politica', 'otro'
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_normatividad_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_normatividad_auditoria ON control_interno.normatividad_aplicable(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_normatividad_activo ON control_interno.normatividad_aplicable(activo);

COMMENT ON TABLE control_interno.normatividad_aplicable IS 'Normatividad aplicable a la auditoría (decretos, leyes, manuales, políticas)';

-- ============================================
-- PARTE 12: TABLA cronograma_fase_auditoria
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.cronograma_fase_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    fase VARCHAR(50) NOT NULL CHECK (fase IN ('Planeación', 'Ejecución', 'Comunicación', 'Seguimiento')),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    dias_estimados INTEGER NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cronograma_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE,
    CONSTRAINT uq_cronograma_fase UNIQUE (auditoria_id, fase)
);

CREATE INDEX IF NOT EXISTS idx_cronograma_auditoria ON control_interno.cronograma_fase_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_fase ON control_interno.cronograma_fase_auditoria(fase);

COMMENT ON TABLE control_interno.cronograma_fase_auditoria IS 'Cronograma estimado por fase de la auditoría (duración de cada fase)';

-- ============================================
-- PARTE 13: TABLA reunion_apertura
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.reunion_apertura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL UNIQUE,
    fecha TIMESTAMP NOT NULL,
    modalidad VARCHAR(50) NOT NULL CHECK (modalidad IN ('presencial', 'virtual', 'hibrida')),
    lugar VARCHAR(255), -- Para presencial
    enlace_virtual VARCHAR(500), -- Para virtual/híbrida
    agenda JSONB, -- Array de temas a tratar
    participantes JSONB, -- Array de participantes con sus roles
    estado_acta VARCHAR(50) DEFAULT 'pendiente' CHECK (estado_acta IN ('pendiente', 'en_elaboracion', 'firmada', 'aprobada')),
    acta_ruta VARCHAR(500), -- Ruta al archivo del acta
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reunion_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reunion_auditoria ON control_interno.reunion_apertura(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_reunion_fecha ON control_interno.reunion_apertura(fecha);

COMMENT ON TABLE control_interno.reunion_apertura IS 'Información de la reunión de apertura de la auditoría';

-- ============================================
-- PARTE 14: TABLA auditor_perfil
-- ============================================
-- Tabla para información específica de auditores (especialidades, disponibilidad, etc.)
-- No modifica auth.personas para mantener separación de responsabilidades

CREATE TABLE IF NOT EXISTS control_interno.auditor_perfil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id BIGINT NOT NULL UNIQUE, -- FK a auth.personas
    especialidad VARCHAR(255), -- Ej: "Auditoría Financiera", "Control Interno", "Gestión Administrativa"
    cargo VARCHAR(100), -- Ej: "Auditor Líder", "Auditor Senior", "Auditor Junior"
    nivel_experiencia VARCHAR(50) CHECK (nivel_experiencia IN ('Junior', 'Intermedio', 'Senior', 'Líder', 'Jefe')),
    estado_disponibilidad VARCHAR(50) DEFAULT 'Disponible' CHECK (estado_disponibilidad IN ('Disponible', 'Parcial', 'No disponible', 'En licencia')),
    fecha_ultima_actividad DATE,
    observaciones TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditor_perfil_persona FOREIGN KEY (persona_id) 
        REFERENCES auth.personas(id_tercero) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auditor_perfil_persona ON control_interno.auditor_perfil(persona_id);
CREATE INDEX IF NOT EXISTS idx_auditor_perfil_especialidad ON control_interno.auditor_perfil(especialidad);
CREATE INDEX IF NOT EXISTS idx_auditor_perfil_disponibilidad ON control_interno.auditor_perfil(estado_disponibilidad);
CREATE INDEX IF NOT EXISTS idx_auditor_perfil_activo ON control_interno.auditor_perfil(activo) WHERE activo = true;

COMMENT ON TABLE control_interno.auditor_perfil IS 'Perfil profesional de auditores. Almacena información específica como especialidades y disponibilidad.';
COMMENT ON COLUMN control_interno.auditor_perfil.especialidad IS 'Especialidad del auditor (ej: Auditoría Financiera, Control Interno, Gestión Administrativa)';
COMMENT ON COLUMN control_interno.auditor_perfil.estado_disponibilidad IS 'Estado de disponibilidad: Disponible, Parcial, No disponible, En licencia';

-- ============================================
-- PARTE 15: VISTA auditor_disponibilidad
-- ============================================
-- Vista para calcular auditorías en curso y disponibilidad de cada auditor

CREATE OR REPLACE VIEW control_interno.v_auditor_disponibilidad AS
SELECT 
    p.id_tercero AS persona_id,
    p.nom_largo AS nombre,
    p.num_identificacion,
    p.tip_identificacion,
    p.dir_email AS email,
    ap.especialidad,
    ap.cargo,
    ap.nivel_experiencia,
    ap.estado_disponibilidad,
    -- Contar auditorías en curso (donde el auditor es líder, asignado o está en el equipo)
    COALESCE((
        SELECT COUNT(DISTINCT a.id)
        FROM control_interno.auditoria a
        WHERE (a.auditor_lider_id = p.id_tercero 
               OR a.auditor_asignado_id = p.id_tercero
               OR EXISTS (
                   SELECT 1 FROM control_interno.equipo_auditor ea 
                   WHERE ea.auditoria_id = a.id 
                   AND ea.persona_id = p.id_tercero 
                   AND ea.activo = true
               ))
        AND a.estado_kanban NOT IN ('Finalizada', 'Archivada')
        AND COALESCE(a.activa, true) = true
    ), 0) AS auditorias_en_curso,
    -- Contar auditorías como líder
    COALESCE((
        SELECT COUNT(DISTINCT a.id)
        FROM control_interno.auditoria a
        WHERE a.auditor_lider_id = p.id_tercero
        AND a.estado_kanban NOT IN ('Finalizada', 'Archivada')
        AND COALESCE(a.activa, true) = true
    ), 0) AS auditorias_como_lider,
    -- Contar auditorías como asignado
    COALESCE((
        SELECT COUNT(DISTINCT a.id)
        FROM control_interno.auditoria a
        WHERE a.auditor_asignado_id = p.id_tercero
        AND a.estado_kanban NOT IN ('Finalizada', 'Archivada')
        AND COALESCE(a.activa, true) = true
    ), 0) AS auditorias_como_asignado,
    ap.fecha_ultima_actividad,
    ap.observaciones,
    ap.activo,
    ap.created_at,
    ap.updated_at
FROM auth.personas p
LEFT JOIN control_interno.auditor_perfil ap ON p.id_tercero = ap.persona_id
WHERE ap.activo = true OR ap.id IS NULL; -- Incluir personas con y sin perfil activo

COMMENT ON VIEW control_interno.v_auditor_disponibilidad IS 'Vista que muestra auditores con sus especialidades, disponibilidad y conteo de auditorías en curso';

-- ============================================
-- PARTE 16: VISTAS ÚTILES
-- ============================================

-- Vista: Auditorías con información completa del Kanban
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
    -- Responsable del Área Auditada
    a.responsable_area_nombre,
    a.responsable_area_cargo,
    a.responsable_area_email,
    -- Supervisor
    supervisor.id_tercero AS supervisor_asignado_id,
    supervisor.nom_largo AS supervisor_asignado_nombre,
    supervisor.dir_email AS supervisor_asignado_email,
    -- Reunión de Apertura
    a.fecha_reunion_apertura,
    ra.modalidad AS reunion_modalidad,
    ra.estado_acta AS reunion_estado_acta,
    -- Auditor Líder
    lider.id_tercero AS auditor_lider_id,
    lider.nom_largo AS auditor_lider_nombre,
    lider.dir_email AS auditor_lider_email,
    lider_perfil.especialidad AS auditor_lider_especialidad,
    lider_perfil.cargo AS auditor_lider_cargo,
    -- Auditor Asignado
    asignado.id_tercero AS auditor_asignado_id,
    asignado.nom_largo AS auditor_asignado_nombre,
    asignado.dir_email AS auditor_asignado_email,
    asignado_perfil.especialidad AS auditor_asignado_especialidad,
    asignado_perfil.cargo AS auditor_asignado_cargo,
    -- Información territorial (si existe)
    ti.nombre AS territorial_nombre,
    ti.ciudad AS territorial_ciudad,
    ti.departamento AS territorial_departamento,
    -- Información especial (si existe)
    ei.tipo_motivo AS especial_tipo_motivo,
    ei.solicitante AS especial_solicitante,
    ei.justificacion AS especial_justificacion,
    a.fecha_inicio,
    a.fecha_fin,
    a.created_at,
    a.updated_at
FROM control_interno.auditoria a
LEFT JOIN auth.personas lider ON a.auditor_lider_id = lider.id_tercero
LEFT JOIN control_interno.auditor_perfil lider_perfil ON lider.id_tercero = lider_perfil.persona_id AND lider_perfil.activo = true
LEFT JOIN auth.personas asignado ON a.auditor_asignado_id = asignado.id_tercero
LEFT JOIN control_interno.auditor_perfil asignado_perfil ON asignado.id_tercero = asignado_perfil.persona_id AND asignado_perfil.activo = true
LEFT JOIN auth.personas supervisor ON a.supervisor_asignado_id = supervisor.id_tercero
LEFT JOIN control_interno.auditoria_territorial_info ti ON a.id = ti.auditoria_id
LEFT JOIN control_interno.auditoria_especial_info ei ON a.id = ei.auditoria_id
LEFT JOIN control_interno.reunion_apertura ra ON a.id = ra.auditoria_id;

-- Vista: Contadores de auditorías por estado (para el Kanban)
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

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================

