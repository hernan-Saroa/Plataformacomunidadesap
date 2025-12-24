# 📘 ESPECIFICACIONES TÉCNICAS BACKEND - MÓDULO CONTROL INTERNO DE GESTIÓN (OCIG)

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General](#arquitectura-general)
3. [Modelos de Datos](#modelos-de-datos)
4. [Endpoints API REST](#endpoints-api-rest)
5. [Autenticación y Autorización](#autenticación-y-autorización)
6. [Validaciones y Reglas de Negocio](#validaciones-y-reglas-de-negocio)
7. [Flujos de Trabajo](#flujos-de-trabajo)
8. [Integraciones](#integraciones)
9. [Configuración y Despliegue](#configuración-y-despliegue)
10. [Anexos](#anexos)

---

## 1. Resumen Ejecutivo

### 1.1 Descripción del Módulo

El **Módulo de Control Interno de Gestión (OCIG)** es un sistema integral diseñado para la Escuela Superior de Administración Pública (ESAP) que permite:

- **Gestión de Auditorías Internas**: Planificación, ejecución y seguimiento de auditorías
- **Planeación Anual**: Universo auditable, plan anual y programa anual de auditorías
- **Gestión de Hallazgos**: Registro, clasificación y seguimiento de hallazgos de auditoría
- **Planes de Mejoramiento**: Formulación y seguimiento de acciones correctivas
- **Informes de Ley**: Gestión de informes obligatorios según normativa colombiana
- **Listas de Chequeo**: Biblioteca de listas de chequeo estandarizadas
- **Auditoría de Cambios**: Trazabilidad completa de todas las operaciones
- **Notificaciones**: Sistema de alertas y recordatorios automatizados

### 1.2 Tecnologías Recomendadas

#### Backend
- **Framework**: Node.js con Express.js o NestJS (recomendado)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL 14+ (relacional) + Redis (cache)
- **ORM**: Prisma o TypeORM
- **Autenticación**: JWT + OAuth 2.0
- **Validación**: Zod o Joi
- **Documentación**: Swagger/OpenAPI 3.0
- **Testing**: Jest + Supertest

#### Infraestructura
- **Contenedores**: Docker + Docker Compose
- **Cloud**: AWS, Azure o GCP
- **Storage**: S3-compatible para archivos adjuntos
- **Monitoreo**: Prometheus + Grafana
- **Logs**: Winston + ELK Stack

---

## 2. Arquitectura General

### 2.1 Arquitectura de Capas

```
┌─────────────────────────────────────────┐
│         FRONTEND (React + TS)           │
│      Estado: Zustand + React Query      │
└───────────────┬─────────────────────────┘
                │ HTTP/REST
                │ JSON
┌───────────────▼─────────────────────────┐
│          API GATEWAY / ROUTER           │
│   Autenticación JWT + Rate Limiting     │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│      CAPA DE CONTROLADORES (API)        │
│  • AuditoriasController                 │
│  • HallazgosController                  │
│  • PlaneacionController                 │
│  • InformesController                   │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│      CAPA DE SERVICIOS (Lógica)         │
│  • AuditoriasService                    │
│  • HallazgosService                     │
│  • NotificacionesService                │
│  • ValidacionesService                  │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│     CAPA DE REPOSITORIOS (Datos)        │
│  • AuditoriasRepository                 │
│  • HallazgosRepository                  │
│  • PlaneacionRepository                 │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│          BASE DE DATOS                  │
│  PostgreSQL + Redis (Cache)             │
└─────────────────────────────────────────┘
```

### 2.2 Módulos Principales

```typescript
/src
  /modules
    /auditorias          # Gestión de auditorías
    /planeacion          # Universo, Plan Anual, Programa Anual
    /hallazgos           # Gestión de hallazgos
    /planes-mejoramiento # Planes y acciones de mejoramiento
    /informes-ley        # Informes obligatorios
    /listas-chequeo      # Listas de chequeo estandarizadas
    /notificaciones      # Sistema de alertas
    /auditoria-cambios   # Trazabilidad
    /configuracion       # Configuraciones del módulo
  /common
    /auth               # Autenticación y autorización
    /database           # Configuración DB
    /utils              # Utilidades
    /validators         # Validaciones globales
```

---

## 3. Modelos de Datos

### 3.1 Diagrama Entidad-Relación Simplificado

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Auditoria  │────┬───│   Hallazgo   │────┬───│    Plan     │
│             │    │    │              │    │    │ Mejoramiento│
└─────────────┘    │    └──────────────┘    │    └─────────────┘
                   │                        │
                   │                        │
                   ▼                        ▼
            ┌─────────────┐         ┌─────────────┐
            │ Actividad   │         │   Accion    │
            │  Auditoria  │         │ Mejoramiento│
            └─────────────┘         └─────────────┘

┌──────────────┐         ┌──────────────┐
│   Universo   │────────│   Proceso    │
│  Auditable   │         │  Auditable   │
└──────────────┘         └──────────────┘
                                │
                                │
                                ▼
                         ┌──────────────┐
                         │  Programa    │
                         │    Anual     │
                         └──────────────┘
```

### 3.2 Modelo: Auditoría

**Tabla**: `auditorias`

```sql
CREATE TABLE auditorias (
  -- Identificación
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo                VARCHAR(20) UNIQUE NOT NULL, -- AUD-2025-001
  titulo                VARCHAR(255) NOT NULL,
  descripcion           TEXT,
  
  -- Clasificación
  tipo_auditoria        VARCHAR(50) NOT NULL, -- 'Gestión', 'Cumplimiento', 'Desempeño', etc.
  alcance               TEXT,
  objetivos             JSONB, -- Array de objetivos
  
  -- Planificación
  fecha_inicio_planeada DATE,
  fecha_fin_planeada    DATE,
  fecha_inicio_real     DATE,
  fecha_fin_real        DATE,
  duracion_estimada_dias INTEGER,
  
  -- Auditorías Especiales
  es_auditoria_especial BOOLEAN DEFAULT FALSE,
  vinculada_plan_anual  BOOLEAN DEFAULT FALSE,
  id_plan_anual         UUID REFERENCES plan_anual_5roles(id),
  periodicidad          VARCHAR(20), -- 'única' para especiales
  origen_solicitud      VARCHAR(100), -- 'Rector', 'Procuraduría', etc.
  fecha_solicitud       DATE,
  
  -- Territorial
  es_auditoria_territorial BOOLEAN DEFAULT FALSE,
  id_territorial        UUID REFERENCES territoriales(id),
  nivel_territorial     VARCHAR(50), -- 'regional', 'nacional'
  ciudad                VARCHAR(100),
  departamento          VARCHAR(100),
  
  -- Estado y Progreso
  estado                VARCHAR(50) NOT NULL DEFAULT 'programada',
  -- Estados: 'programada', 'en-planeacion', 'en-ejecucion', 'en-comunicacion', 'cerrada', 'cancelada'
  progreso_porcentaje   INTEGER DEFAULT 0 CHECK (progreso_porcentaje >= 0 AND progreso_porcentaje <= 100),
  
  -- Equipo Auditor
  id_auditor_lider      UUID REFERENCES usuarios(id),
  auditores             JSONB, -- Array de IDs de auditores
  
  -- Áreas/Procesos Auditados
  areas_auditadas       JSONB, -- Array de objetos {id, nombre, responsable}
  procesos_auditados    JSONB, -- Array de procesos
  
  -- Normativa
  marco_normativo       JSONB, -- Array de normas aplicables
  
  -- Estadísticas
  total_hallazgos       INTEGER DEFAULT 0,
  hallazgos_criticos    INTEGER DEFAULT 0,
  hallazgos_altos       INTEGER DEFAULT 0,
  hallazgos_medios      INTEGER DEFAULT 0,
  hallazgos_bajos       INTEGER DEFAULT 0,
  
  -- Workflow
  requiere_aprobacion   BOOLEAN DEFAULT TRUE,
  aprobada_por          UUID REFERENCES usuarios(id),
  fecha_aprobacion      TIMESTAMP,
  observaciones_aprobacion TEXT,
  
  -- Documentación
  documentos_adjuntos   JSONB, -- Array de URLs de archivos
  
  -- Metadatos
  prioridad             VARCHAR(20) DEFAULT 'media', -- 'baja', 'media', 'alta', 'crítica'
  tags                  VARCHAR(255)[], -- Tags para búsqueda
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  actualizado_por       UUID REFERENCES usuarios(id),
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW(),
  eliminado_en          TIMESTAMP, -- Soft delete
  
  -- Índices
  CONSTRAINT estado_valido CHECK (estado IN ('programada', 'en-planeacion', 'en-ejecucion', 'en-comunicacion', 'cerrada', 'cancelada')),
  CONSTRAINT tipo_valido CHECK (tipo_auditoria IN ('Gestión', 'Cumplimiento', 'Desempeño', 'Sistemas', 'Financiera', 'Seguimiento'))
);

-- Índices para optimización
CREATE INDEX idx_auditorias_codigo ON auditorias(codigo);
CREATE INDEX idx_auditorias_estado ON auditorias(estado);
CREATE INDEX idx_auditorias_tipo ON auditorias(tipo_auditoria);
CREATE INDEX idx_auditorias_fecha_inicio ON auditorias(fecha_inicio_planeada);
CREATE INDEX idx_auditorias_auditor_lider ON auditorias(id_auditor_lider);
CREATE INDEX idx_auditorias_creado_en ON auditorias(creado_en DESC);
CREATE INDEX idx_auditorias_eliminado ON auditorias(eliminado_en) WHERE eliminado_en IS NULL;
```

**TypeScript Interface**:

```typescript
interface Auditoria {
  // Identificación
  id: string;
  codigo: string; // AUD-2025-001
  titulo: string;
  descripcion?: string;
  
  // Clasificación
  tipoAuditoria: 'Gestión' | 'Cumplimiento' | 'Desempeño' | 'Sistemas' | 'Financiera' | 'Seguimiento';
  alcance?: string;
  objetivos?: string[];
  
  // Planificación
  fechaInicioPlaneada?: Date;
  fechaFinPlaneada?: Date;
  fechaInicioReal?: Date;
  fechaFinReal?: Date;
  duracionEstimadaDias?: number;
  
  // Auditorías Especiales
  esAuditoriaEspecial: boolean;
  vinculadaPlanAnual: boolean;
  idPlanAnual?: string;
  periodicidad?: string;
  origenSolicitud?: string;
  fechaSolicitud?: Date;
  
  // Territorial
  esAuditoriaTerritorial: boolean;
  idTerritorial?: string;
  nivelTerritorial?: 'regional' | 'nacional';
  ciudad?: string;
  departamento?: string;
  
  // Estado y Progreso
  estado: 'programada' | 'en-planeacion' | 'en-ejecucion' | 'en-comunicacion' | 'cerrada' | 'cancelada';
  progresoPorcentaje: number;
  
  // Equipo Auditor
  idAuditorLider?: string;
  auditores?: { id: string; nombre: string; rol: string }[];
  
  // Áreas/Procesos
  areasAuditadas?: { id: string; nombre: string; responsable: string }[];
  procesosAuditados?: string[];
  
  // Normativa
  marcoNormativo?: { nombre: string; descripcion: string; url?: string }[];
  
  // Estadísticas
  totalHallazgos: number;
  hallazgosCriticos: number;
  hallazgosAltos: number;
  hallazgosMedios: number;
  hallazgosBajos: number;
  
  // Workflow
  requiereAprobacion: boolean;
  aprobadaPor?: string;
  fechaAprobacion?: Date;
  observacionesAprobacion?: string;
  
  // Documentación
  documentosAdjuntos?: { nombre: string; url: string; tipo: string; fecha: Date }[];
  
  // Metadatos
  prioridad: 'baja' | 'media' | 'alta' | 'crítica';
  tags?: string[];
  
  // Auditoría
  creadoPor: string;
  actualizadoPor?: string;
  creadoEn: Date;
  actualizadoEn: Date;
  eliminadoEn?: Date;
}
```

### 3.3 Modelo: Hallazgo

**Tabla**: `hallazgos`

```sql
CREATE TABLE hallazgos (
  -- Identificación
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo                VARCHAR(20) UNIQUE NOT NULL, -- HAL-2025-001
  titulo                VARCHAR(255) NOT NULL,
  descripcion           TEXT NOT NULL,
  
  -- Relaciones
  id_auditoria          UUID REFERENCES auditorias(id) ON DELETE CASCADE,
  id_proceso_auditado   UUID REFERENCES procesos_auditables(id),
  id_area_auditada      UUID REFERENCES areas(id),
  
  -- Clasificación
  tipo_hallazgo         VARCHAR(50) NOT NULL, -- 'No Conformidad', 'Observación', 'Oportunidad de Mejora', 'Fortaleza'
  gravedad              VARCHAR(20) NOT NULL, -- 'Baja', 'Media', 'Alta', 'Crítica'
  categoria             VARCHAR(100),
  
  -- Análisis
  condicion             TEXT, -- ¿Qué pasó?
  criterio              TEXT, -- ¿Qué debería pasar? (norma/política)
  causa                 TEXT, -- ¿Por qué pasó?
  efecto                TEXT, -- ¿Cuál es el impacto?
  
  -- Normativa
  norma_incumplida      VARCHAR(255),
  articulo_incumplido   VARCHAR(100),
  marco_normativo       JSONB,
  
  -- Riesgo
  nivel_riesgo          VARCHAR(20), -- 'Bajo', 'Medio', 'Alto', 'Extremo'
  impacto               VARCHAR(20), -- 'Bajo', 'Medio', 'Alto', 'Crítico'
  probabilidad          VARCHAR(20), -- 'Baja', 'Media', 'Alta'
  
  -- Estado y Seguimiento
  estado                VARCHAR(50) NOT NULL DEFAULT 'abierto',
  -- Estados: 'abierto', 'en-analisis', 'en-plan-mejoramiento', 'cerrado', 'rechazado'
  fecha_identificacion  DATE NOT NULL,
  fecha_cierre          DATE,
  
  -- Responsables
  id_responsable_area   UUID REFERENCES usuarios(id), -- Responsable del área auditada
  id_auditor_reporta    UUID REFERENCES usuarios(id), -- Auditor que registra el hallazgo
  
  -- Plan de Mejoramiento
  requiere_plan         BOOLEAN DEFAULT TRUE,
  id_plan_mejoramiento  UUID REFERENCES planes_mejoramiento(id),
  
  -- Evidencias
  evidencias            JSONB, -- Array de archivos/documentos
  
  -- Seguimiento
  observaciones         TEXT,
  acciones_inmediatas   TEXT,
  
  -- Metadatos
  prioridad             VARCHAR(20) DEFAULT 'media',
  tags                  VARCHAR(255)[],
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  actualizado_por       UUID REFERENCES usuarios(id),
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW(),
  eliminado_en          TIMESTAMP,
  
  -- Constraints
  CONSTRAINT tipo_hallazgo_valido CHECK (tipo_hallazgo IN ('No Conformidad', 'Observación', 'Oportunidad de Mejora', 'Fortaleza')),
  CONSTRAINT gravedad_valida CHECK (gravedad IN ('Baja', 'Media', 'Alta', 'Crítica')),
  CONSTRAINT estado_valido CHECK (estado IN ('abierto', 'en-analisis', 'en-plan-mejoramiento', 'cerrado', 'rechazado'))
);

-- Índices
CREATE INDEX idx_hallazgos_codigo ON hallazgos(codigo);
CREATE INDEX idx_hallazgos_auditoria ON hallazgos(id_auditoria);
CREATE INDEX idx_hallazgos_estado ON hallazgos(estado);
CREATE INDEX idx_hallazgos_gravedad ON hallazgos(gravedad);
CREATE INDEX idx_hallazgos_tipo ON hallazgos(tipo_hallazgo);
CREATE INDEX idx_hallazgos_fecha_identificacion ON hallazgos(fecha_identificacion DESC);
```

**TypeScript Interface**:

```typescript
interface Hallazgo {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  
  // Relaciones
  idAuditoria: string;
  idProcesoAuditado?: string;
  idAreaAuditada?: string;
  
  // Clasificación
  tipoHallazgo: 'No Conformidad' | 'Observación' | 'Oportunidad de Mejora' | 'Fortaleza';
  gravedad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  categoria?: string;
  
  // Análisis
  condicion?: string;
  criterio?: string;
  causa?: string;
  efecto?: string;
  
  // Normativa
  normaIncumplida?: string;
  articuloIncumplido?: string;
  marcoNormativo?: any[];
  
  // Riesgo
  nivelRiesgo?: string;
  impacto?: string;
  probabilidad?: string;
  
  // Estado
  estado: 'abierto' | 'en-analisis' | 'en-plan-mejoramiento' | 'cerrado' | 'rechazado';
  fechaIdentificacion: Date;
  fechaCierre?: Date;
  
  // Responsables
  idResponsableArea?: string;
  idAuditorReporta?: string;
  
  // Plan
  requierePlan: boolean;
  idPlanMejoramiento?: string;
  
  // Evidencias
  evidencias?: any[];
  
  // Metadatos
  observaciones?: string;
  accionesInmediatas?: string;
  prioridad: string;
  tags?: string[];
  
  // Auditoría
  creadoPor: string;
  actualizadoPor?: string;
  creadoEn: Date;
  actualizadoEn: Date;
  eliminadoEn?: Date;
}
```

### 3.4 Modelo: Plan de Mejoramiento

**Tabla**: `planes_mejoramiento`

```sql
CREATE TABLE planes_mejoramiento (
  -- Identificación
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo                VARCHAR(20) UNIQUE NOT NULL, -- PLN-2025-001
  nombre                VARCHAR(255) NOT NULL,
  descripcion           TEXT,
  
  -- Relaciones
  id_hallazgo           UUID REFERENCES hallazgos(id),
  id_auditoria          UUID REFERENCES auditorias(id),
  
  -- Planificación
  fecha_inicio          DATE NOT NULL,
  fecha_fin_esperada    DATE NOT NULL,
  fecha_cierre_real     DATE,
  
  -- Responsables
  id_responsable        UUID REFERENCES usuarios(id) NOT NULL,
  id_area_responsable   UUID REFERENCES areas(id),
  
  -- Estado y Progreso
  estado                VARCHAR(50) NOT NULL DEFAULT 'programado',
  -- Estados: 'programado', 'en-ejecucion', 'completado', 'vencido', 'cancelado'
  progreso_porcentaje   INTEGER DEFAULT 0 CHECK (progreso_porcentaje >= 0 AND progreso_porcentaje <= 100),
  
  -- Análisis
  causa_raiz            TEXT,
  analisis_5por        TEXT, -- Análisis de los 5 por qués
  
  -- Indicadores
  indicador_cumplimiento VARCHAR(255),
  meta_indicador        VARCHAR(100),
  valor_actual          VARCHAR(100),
  
  -- Recursos
  recursos_necesarios   TEXT,
  presupuesto_estimado  DECIMAL(15, 2),
  
  -- Seguimiento
  total_acciones        INTEGER DEFAULT 0,
  acciones_completadas  INTEGER DEFAULT 0,
  
  -- Verificación
  verificado_por        UUID REFERENCES usuarios(id),
  fecha_verificacion    DATE,
  observaciones_verificacion TEXT,
  
  -- Evidencias
  evidencias_cierre     JSONB,
  
  -- Metadatos
  prioridad             VARCHAR(20) DEFAULT 'media',
  tags                  VARCHAR(255)[],
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  actualizado_por       UUID REFERENCES usuarios(id),
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW(),
  eliminado_en          TIMESTAMP,
  
  CONSTRAINT estado_valido CHECK (estado IN ('programado', 'en-ejecucion', 'completado', 'vencido', 'cancelado'))
);

-- Índices
CREATE INDEX idx_planes_codigo ON planes_mejoramiento(codigo);
CREATE INDEX idx_planes_hallazgo ON planes_mejoramiento(id_hallazgo);
CREATE INDEX idx_planes_estado ON planes_mejoramiento(estado);
CREATE INDEX idx_planes_responsable ON planes_mejoramiento(id_responsable);
CREATE INDEX idx_planes_fecha_fin ON planes_mejoramiento(fecha_fin_esperada);
```

### 3.5 Modelo: Acción de Mejoramiento

**Tabla**: `acciones_mejoramiento`

```sql
CREATE TABLE acciones_mejoramiento (
  -- Identificación
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_plan_mejoramiento  UUID REFERENCES planes_mejoramiento(id) ON DELETE CASCADE,
  numero_accion         INTEGER NOT NULL,
  
  -- Descripción
  descripcion           TEXT NOT NULL,
  tipo_accion           VARCHAR(50), -- 'Correctiva', 'Preventiva', 'De mejora'
  
  -- Planificación
  fecha_inicio          DATE NOT NULL,
  fecha_fin_esperada    DATE NOT NULL,
  fecha_finalizacion    DATE,
  
  -- Responsable
  id_responsable        UUID REFERENCES usuarios(id) NOT NULL,
  
  -- Estado y Progreso
  estado                VARCHAR(50) NOT NULL DEFAULT 'programada',
  -- Estados: 'programada', 'en-ejecucion', 'completada', 'vencida', 'atrasada'
  porcentaje_avance     INTEGER DEFAULT 0 CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100),
  
  -- Seguimiento
  observaciones         TEXT,
  dificultades          TEXT,
  
  -- Verificación
  verificada            BOOLEAN DEFAULT FALSE,
  evidencias            JSONB,
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  actualizado_por       UUID REFERENCES usuarios(id),
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT estado_valido CHECK (estado IN ('programada', 'en-ejecucion', 'completada', 'vencida', 'atrasada'))
);

-- Índices
CREATE INDEX idx_acciones_plan ON acciones_mejoramiento(id_plan_mejoramiento);
CREATE INDEX idx_acciones_estado ON acciones_mejoramiento(estado);
CREATE INDEX idx_acciones_responsable ON acciones_mejoramiento(id_responsable);
```

### 3.6 Modelo: Universo Auditable

**Tabla**: `universo_auditorias`

```sql
CREATE TABLE universo_auditorias (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anio                  INTEGER NOT NULL,
  version               INTEGER DEFAULT 1,
  
  -- Estado
  estado                VARCHAR(50) DEFAULT 'borrador', -- 'borrador', 'aprobado', 'vigente'
  
  -- Metadatos
  total_procesos        INTEGER DEFAULT 0,
  total_riesgo_alto     INTEGER DEFAULT 0,
  total_riesgo_medio    INTEGER DEFAULT 0,
  total_riesgo_bajo     INTEGER DEFAULT 0,
  
  -- Aprobación
  aprobado_por          UUID REFERENCES usuarios(id),
  fecha_aprobacion      DATE,
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(anio, version)
);
```

### 3.7 Modelo: Proceso Auditable

**Tabla**: `procesos_auditables`

```sql
CREATE TABLE procesos_auditables (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_universo           UUID REFERENCES universo_auditorias(id) ON DELETE CASCADE,
  
  -- Identificación
  codigo                VARCHAR(50) NOT NULL,
  nombre                VARCHAR(255) NOT NULL,
  descripcion           TEXT,
  
  -- Clasificación
  macroproceso          VARCHAR(100),
  tipo_proceso          VARCHAR(50), -- 'Estratégico', 'Misional', 'Apoyo', 'Evaluación'
  
  -- Responsables
  id_area_responsable   UUID REFERENCES areas(id),
  responsable_nombre    VARCHAR(255),
  responsable_cargo     VARCHAR(255),
  
  -- Análisis de Riesgo
  nivel_riesgo          VARCHAR(20), -- 'Bajo', 'Medio', 'Alto', 'Extremo'
  factor_riesgo         DECIMAL(3, 2), -- 0.00 - 1.00
  requiere_auditoria    BOOLEAN DEFAULT TRUE,
  
  -- Priorización
  prioridad             INTEGER, -- 1 (más alta) - N (más baja)
  criticidad            VARCHAR(20), -- 'Baja', 'Media', 'Alta', 'Crítica'
  
  -- Historial de Auditorías
  ultima_auditoria      DATE,
  frecuencia_sugerida   VARCHAR(50), -- 'Anual', 'Semestral', etc.
  
  -- Observaciones
  observaciones         TEXT,
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_procesos_universo ON procesos_auditables(id_universo);
CREATE INDEX idx_procesos_riesgo ON procesos_auditables(nivel_riesgo);
CREATE INDEX idx_procesos_prioridad ON procesos_auditables(prioridad);
```

### 3.8 Modelo: Plan Anual (5 Roles)

**Tabla**: `plan_anual_5roles`

```sql
CREATE TABLE plan_anual_5roles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anio                  INTEGER NOT NULL UNIQUE,
  
  -- Metadatos
  total_actividades     INTEGER DEFAULT 0,
  actividades_completadas INTEGER DEFAULT 0,
  
  -- Estado
  estado                VARCHAR(50) DEFAULT 'borrador',
  
  -- Aprobación
  aprobado_por          UUID REFERENCES usuarios(id),
  fecha_aprobacion      DATE,
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW()
);
```

### 3.9 Modelo: Actividad (5 Roles)

**Tabla**: `actividades_plan_anual`

```sql
CREATE TABLE actividades_plan_anual (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_plan_anual         UUID REFERENCES plan_anual_5roles(id) ON DELETE CASCADE,
  
  -- Clasificación por Rol
  rol                   VARCHAR(50) NOT NULL, -- 'Rol 1: Gestión', 'Rol 2: Prevención', etc.
  
  -- Descripción
  actividad             TEXT NOT NULL,
  meta                  TEXT,
  indicador             VARCHAR(255),
  
  -- Responsable
  id_responsable        UUID REFERENCES usuarios(id),
  responsable_nombre    VARCHAR(255),
  
  -- Planificación Temporal (Trimestres)
  programado_trim1      BOOLEAN DEFAULT FALSE,
  programado_trim2      BOOLEAN DEFAULT FALSE,
  programado_trim3      BOOLEAN DEFAULT FALSE,
  programado_trim4      BOOLEAN DEFAULT FALSE,
  
  -- Ejecución
  ejecutado_trim1       BOOLEAN DEFAULT FALSE,
  ejecutado_trim2       BOOLEAN DEFAULT FALSE,
  ejecutado_trim3       BOOLEAN DEFAULT FALSE,
  ejecutado_trim4       BOOLEAN DEFAULT FALSE,
  
  -- Progreso
  porcentaje_avance     INTEGER DEFAULT 0,
  estado                VARCHAR(50) DEFAULT 'programada',
  
  -- Observaciones
  observaciones         TEXT,
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_actividades_plan ON actividades_plan_anual(id_plan_anual);
CREATE INDEX idx_actividades_rol ON actividades_plan_anual(rol);
CREATE INDEX idx_actividades_responsable ON actividades_plan_anual(id_responsable);
```

### 3.10 Modelo: Programa Anual

**Tabla**: `programa_anual`

```sql
CREATE TABLE programa_anual (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anio                  INTEGER NOT NULL UNIQUE,
  version               INTEGER DEFAULT 1,
  
  -- Metadatos
  total_auditorias      INTEGER DEFAULT 0,
  auditorias_ejecutadas INTEGER DEFAULT 0,
  
  -- Estado
  estado                VARCHAR(50) DEFAULT 'borrador',
  
  -- Aprobación
  aprobado_por          UUID REFERENCES usuarios(id),
  fecha_aprobacion      DATE,
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW()
);
```

### 3.11 Modelo: Auditoría Programada

**Tabla**: `auditorias_programadas`

```sql
CREATE TABLE auditorias_programadas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_programa_anual     UUID REFERENCES programa_anual(id) ON DELETE CASCADE,
  id_proceso_auditable  UUID REFERENCES procesos_auditables(id),
  
  -- Identificación
  nombre                VARCHAR(255) NOT NULL,
  tipo_auditoria        VARCHAR(50),
  alcance               TEXT,
  
  -- Planificación Temporal
  trimestre             INTEGER CHECK (trimestre >= 1 AND trimestre <= 4),
  mes                   INTEGER CHECK (mes >= 1 AND mes <= 12),
  fecha_estimada        DATE,
  
  -- Recursos
  dias_estimados        INTEGER,
  equipo_auditor        JSONB,
  
  -- Vinculación
  id_auditoria_ejecutada UUID REFERENCES auditorias(id),
  
  -- Estado
  estado                VARCHAR(50) DEFAULT 'programada', -- 'programada', 'en-ejecucion', 'ejecutada', 'reprogramada'
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_auditorias_prog_programa ON auditorias_programadas(id_programa_anual);
CREATE INDEX idx_auditorias_prog_trimestre ON auditorias_programadas(trimestre);
CREATE INDEX idx_auditorias_prog_estado ON auditorias_programadas(estado);
```

### 3.12 Modelo: Lista de Chequeo

**Tabla**: `listas_chequeo`

```sql
CREATE TABLE listas_chequeo (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo                VARCHAR(50) UNIQUE NOT NULL, -- LC-CTL-001
  nombre                VARCHAR(255) NOT NULL,
  descripcion           TEXT,
  
  -- Clasificación
  categoria             VARCHAR(100), -- 'Cumplimiento Normativo', 'Procesos', 'Controles', etc.
  tipo                  VARCHAR(50), -- 'Estándar', 'Personalizada'
  
  -- Contenido (JSON)
  secciones             JSONB NOT NULL, -- Array de secciones con items
  
  -- Estadísticas
  total_items           INTEGER DEFAULT 0,
  items_criticos        INTEGER DEFAULT 0,
  
  -- Estado
  estado                VARCHAR(50) DEFAULT 'activa', -- 'borrador', 'activa', 'archivada'
  
  -- Metadatos
  version               INTEGER DEFAULT 1,
  es_plantilla          BOOLEAN DEFAULT FALSE,
  tags                  VARCHAR(255)[],
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT estado_valido CHECK (estado IN ('borrador', 'activa', 'archivada'))
);

-- Índices
CREATE INDEX idx_listas_codigo ON listas_chequeo(codigo);
CREATE INDEX idx_listas_categoria ON listas_chequeo(categoria);
CREATE INDEX idx_listas_estado ON listas_chequeo(estado);
```

### 3.13 Modelo: Informe de Ley

**Tabla**: `informes_ley`

```sql
CREATE TABLE informes_ley (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo                VARCHAR(50) UNIQUE NOT  -- INF-CHIP, INF-SIRECI, etc.
  nombre                VARCHAR(255) NOT NULL,
  descripcion           TEXT,
  
  -- Clasificación
  categoria             VARCHAR(100), -- 'Financiero', 'Administrativo', 'Contractual', etc.
  tipo_obligacion       VARCHAR(50), -- 'Ley', 'Decreto', 'Resolución'
  
  -- Normativa
  norma_base            VARCHAR(255), -- 'Ley 1474 de 2011'
  articulo              VARCHAR(100),
  
  -- Periodicidad
  periodicidad          VARCHAR(50) NOT NULL, -- 'Mensual', 'Trimestral', 'Semestral', 'Anual'
  
  -- Destinatario
  entidad_destino       VARCHAR(255), -- 'Contraloría', 'Procuraduría', etc.
  contacto_destino      VARCHAR(255),
  
  -- Plazos
  dia_vencimiento       INTEGER, -- Día del mes (para mensuales)
  mes_vencimiento       INTEGER, -- Mes (para anuales)
  dias_anticipacion     INTEGER DEFAULT 7, -- Días para alertar antes del vencimiento
  
  -- Responsable
  id_responsable        UUID REFERENCES usuarios(id),
  responsable_nombre    VARCHAR(255),
  cargo_responsable     VARCHAR(255),
  
  -- Plantilla
  url_plantilla         VARCHAR(500),
  instrucciones         TEXT,
  
  -- Estado
  activo                BOOLEAN DEFAULT TRUE,
  
  -- Auditoría
  creado_por            UUID REFERENCES usuarios(id) NOT NULL,
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_informes_codigo ON informes_ley(codigo);
CREATE INDEX idx_informes_periodicidad ON informes_ley(periodicidad);
CREATE INDEX idx_informes_responsable ON informes_ley(id_responsable);
```

### 3.14 Modelo: Entrega de Informe

**Tabla**: `entregas_informes`

```sql
CREATE TABLE entregas_informes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_informe_ley        UUID REFERENCES informes_ley(id) ON DELETE CASCADE,
  
  -- Período
  periodo               VARCHAR(20), -- '2025-01', '2025-Q1', '2025'
  anio                  INTEGER NOT NULL,
  mes                   INTEGER, -- Para mensuales/bimestrales
  trimestre             INTEGER, -- Para trimestrales
  
  -- Fechas
  fecha_vencimiento     DATE NOT NULL,
  fecha_entrega         DATE,
  fecha_carga           DATE,
  
  -- Estado
  estado                VARCHAR(50) DEFAULT 'pendiente',
  -- Estados: 'pendiente', 'en-proceso', 'entregado', 'vencido', 'rechazado'
  
  -- Archivo
  url_archivo           VARCHAR(500),
  nombre_archivo        VARCHAR(255),
  tamano_bytes          BIGINT,
  
  -- Observaciones
  observaciones         TEXT,
  motivo_rechazo        TEXT,
  
  -- Responsable de carga
  cargado_por           UUID REFERENCES usuarios(id),
  
  -- Auditoría
  creado_en             TIMESTAMP DEFAULT NOW(),
  actualizado_en        TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT estado_valido CHECK (estado IN ('pendiente', 'en-proceso', 'entregado', 'vencido', 'rechazado'))
);

-- Índices
CREATE INDEX idx_entregas_informe ON entregas_informes(id_informe_ley);
CREATE INDEX idx_entregas_periodo ON entregas_informes(periodo);
CREATE INDEX idx_entregas_estado ON entregas_informes(estado);
CREATE INDEX idx_entregas_fecha_venc ON entregas_informes(fecha_vencimiento);
```

### 3.15 Modelo: Notificación

**Tabla**: `notificaciones`

```sql
CREATE TABLE notificaciones (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Destinatarios
  id_usuario            UUID REFERENCES usuarios(id),
  id_rol                UUID REFERENCES roles(id), -- Notificación a todo un rol
  
  -- Tipo y Prioridad
  tipo                  VARCHAR(50) NOT NULL, -- 'info', 'warning', 'error', 'success'
  prioridad             VARCHAR(20) DEFAULT 'media', -- 'baja', 'media', 'alta', 'urgente'
  
  -- Contenido
  titulo                VARCHAR(255) NOT NULL,
  mensaje               TEXT NOT NULL,
  icono                 VARCHAR(50),
  
  -- Relación con entidades
  entidad_tipo          VARCHAR(50), -- 'auditoria', 'hallazgo', 'plan', 'informe'
  entidad_id            UUID,
  url_accion            VARCHAR(500),
  texto_accion          VARCHAR(100),
  
  -- Estado
  leida                 BOOLEAN DEFAULT FALSE,
  fecha_lectura         TIMESTAMP,
  archivada             BOOLEAN DEFAULT FALSE,
  
  -- Canales
  notificacion_app      BOOLEAN DEFAULT TRUE,
  notificacion_email    BOOLEAN DEFAULT FALSE,
  email_enviado         BOOLEAN DEFAULT FALSE,
  fecha_email           TIMESTAMP,
  
  -- Auditoría
  creado_en             TIMESTAMP DEFAULT NOW(),
  
  -- Expiración
  expira_en             TIMESTAMP
);

-- Índices
CREATE INDEX idx_notif_usuario ON notificaciones(id_usuario);
CREATE INDEX idx_notif_leida ON notificaciones(leida);
CREATE INDEX idx_notif_fecha ON notificaciones(creado_en DESC);
CREATE INDEX idx_notif_tipo ON notificaciones(tipo);
```

### 3.16 Modelo: Auditoría de Cambios

**Tabla**: `auditoria_cambios`

```sql
CREATE TABLE auditoria_cambios (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Entidad afectada
  entidad_tipo          VARCHAR(50) NOT NULL, -- 'auditoria', 'hallazgo', 'plan', etc.
  entidad_id            UUID NOT NULL,
  
  -- Tipo de operación
  operacion             VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  
  -- Usuario
  id_usuario            UUID REFERENCES usuarios(id) NOT NULL,
  nombre_usuario        VARCHAR(255),
  email_usuario         VARCHAR(255),
  
  -- Cambios (JSON)
  datos_anteriores      JSONB, -- Estado antes del cambio
  datos_nuevos          JSONB, -- Estado después del cambio
  campos_modificados    VARCHAR(255)[], -- Array de nombres de campos modificados
  
  -- Contexto
  ip_address            VARCHAR(45),
  user_agent            TEXT,
  
  -- Timestamp
  fecha_cambio          TIMESTAMP DEFAULT NOW(),
  
  -- Metadatos
  descripcion_cambio    TEXT,
  modulo                VARCHAR(50) -- 'control-interno'
);

-- Índices
CREATE INDEX idx_audit_entidad ON auditoria_cambios(entidad_tipo, entidad_id);
CREATE INDEX idx_audit_usuario ON auditoria_cambios(id_usuario);
CREATE INDEX idx_audit_fecha ON auditoria_cambios(fecha_cambio DESC);
CREATE INDEX idx_audit_operacion ON auditoria_cambios(operacion);
```

---

## 4. Endpoints API REST

### 4.1 Base URL

```
https://api.esap.edu.co/v1/control-interno
```

### 4.2 Autenticación

Todos los endpoints requieren autenticación mediante JWT Bearer Token:

```http
Authorization: Bearer <jwt_token>
```

### 4.3 Estructura de Respuesta Estándar

#### Respuesta Exitosa

```typescript
{
  "success": true,
  "data": <T>,
  "timestamp": "2025-12-24T10:30:00Z"
}
```

#### Respuesta de Error

```typescript
{
  "success": false,
  "error": {
    "code": "ERR_CODE",
    "message": "Descripción del error",
    "details": {} // Opcional
  },
  "timestamp": "2025-12-24T10:30:00Z"
}
```

#### Respuesta Paginada

```typescript
{
  "success": true,
  "data": <T[]>,
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 100,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": "2025-12-24T10:30:00Z"
}
```

### 4.4 Endpoints: Auditorías

#### **GET** `/auditorias`

Obtener lista de auditorías con filtros y paginación.

**Query Parameters:**
```typescript
{
  page?: number;          // Página (default: 1)
  pageSize?: number;      // Tamaño página (default: 10)
  estado?: string;        // Filtrar por estado
  tipo?: string;          // Filtrar por tipo
  fechaDesde?: string;    // Fecha inicio (ISO 8601)
  fechaHasta?: string;    // Fecha fin (ISO 8601)
  auditorLider?: string;  // ID auditor líder
  search?: string;        // Búsqueda por título/código
  territorial?: string;   // ID territorial
  especial?: boolean;     // Filtrar auditorías especiales
}
```

**Respuesta:**
```typescript
{
  "success": true,
  "data": Auditoria[],
  "pagination": {...}
}
```

---

#### **GET** `/auditorias/:id`

Obtener detalle completo de una auditoría.

**Parámetros URL:**
- `id`: UUID de la auditoría

**Respuesta:**
```typescript
{
  "success": true,
  "data": Auditoria
}
```

---

#### **POST** `/auditorias`

Crear una nueva auditoría.

**Body:**
```typescript
{
  titulo: string;
  descripcion?: string;
  tipoAuditoria: string;
  alcance?: string;
  objetivos?: string[];
  fechaInicioPlaneada?: Date;
  fechaFinPlaneada?: Date;
  esAuditoriaEspecial?: boolean;
  vinculadaPlanAnual?: boolean;
  idPlanAnual?: string;
  periodicidad?: string;
  origenSolicitud?: string;
  esAuditoriaTerritorial?: boolean;
  idTerritorial?: string;
  nivelTerritorial?: string;
  ciudad?: string;
  departamento?: string;
  idAuditorLider?: string;
  auditores?: any[];
  areasAuditadas?: any[];
  procesosAuditados?: string[];
  marcoNormativo?: any[];
  prioridad?: string;
  tags?: string[];
}
```

**Respuesta:**
```typescript
{
  "success": true,
  "data": Auditoria
}
```

---

#### **PUT** `/auditorias/:id`

Actualizar una auditoría existente.

**Parámetros URL:**
- `id`: UUID de la auditoría

**Body:** Campos parciales de `Auditoria`

**Respuesta:**
```typescript
{
  "success": true,
  "data": Auditoria
}
```

---

#### **DELETE** `/auditorias/:id`

Eliminar una auditoría (soft delete).

**Parámetros URL:**
- `id`: UUID de la auditoría

**Respuesta:**
```typescript
{
  "success": true,
  "message": "Auditoría eliminada correctamente"
}
```

---

#### **PATCH** `/auditorias/:id/estado`

Cambiar el estado de una auditoría.

**Parámetros URL:**
- `id`: UUID de la auditoría

**Body:**
```typescript
{
  estado: 'programada' | 'en-planeacion' | 'en-ejecucion' | 'en-comunicacion' | 'cerrada' | 'cancelada';
  observaciones?: string;
}
```

**Respuesta:**
```typescript
{
  "success": true,
  "data": Auditoria
}
```

---

#### **PATCH** `/auditorias/:id/progreso`

Actualizar progreso de una auditoría.

**Parámetros URL:**
- `id`: UUID de la auditoría

**Body:**
```typescript
{
  progreso: number; // 0-100
}
```

**Respuesta:**
```typescript
{
  "success": true,
  "data": Auditoria
}
```

---

#### **POST** `/auditorias/:id/hallazgos`

Crear un hallazgo para una auditoría.

**Parámetros URL:**
- `id`: UUID de la auditoría

**Body:**
```typescript
{
  titulo: string;
  descripcion: string;
  tipoHallazgo: string;
  gravedad: string;
  // ... otros campos de Hallazgo
}
```

**Respuesta:**
```typescript
{
  "success": true,
  "data": Hallazgo
}
```

---

#### **GET** `/auditorias/:id/hallazgos`

Obtener hallazgos de una auditoría.

**Parámetros URL:**
- `id`: UUID de la auditoría

**Respuesta:**
```typescript
{
  "success": true,
  "data": Hallazgo[]
}
```

---

#### **POST** `/auditorias/:id/documentos`

Subir un documento a una auditoría.

**Parámetros URL:**
- `id`: UUID de la auditoría

**Body:** `multipart/form-data`
```typescript
{
  file: File;
  tipo: string; // 'plan', 'informe', 'evidencia', etc.
  descripcion?: string;
}
```

**Respuesta:**
```typescript
{
  "success": true,
  "data": {
    id: string;
    nombre: string;
    url: string;
    tipo: string;
    fecha: Date;
  }
}
```

---

### 4.5 Endpoints: Hallazgos

#### **GET** `/hallazgos`

Obtener lista de hallazgos con filtros.

**Query Parameters:**
```typescript
{
  page?: number;
  pageSize?: number;
  estado?: string;
  gravedad?: string;
  tipo?: string;
  auditoriaId?: string;
  areaId?: string;
  responsableId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}
```

---

#### **GET** `/hallazgos/:id`

Obtener detalle de un hallazgo.

---

#### **POST** `/hallazgos`

Crear un nuevo hallazgo.

---

#### **PUT** `/hallazgos/:id`

Actualizar un hallazgo.

---

#### **DELETE** `/hallazgos/:id`

Eliminar un hallazgo.

---

#### **PATCH** `/hallazgos/:id/estado`

Cambiar estado de un hallazgo.

---

#### **POST** `/hallazgos/:id/plan-mejoramiento`

Crear plan de mejoramiento para un hallazgo.

---

### 4.6 Endpoints: Planes de Mejoramiento

#### **GET** `/planes-mejoramiento`

Obtener lista de planes de mejoramiento.

**Query Parameters:**
```typescript
{
  page?: number;
  pageSize?: number;
  estado?: string;
  responsableId?: string;
  hallazgoId?: string;
  auditoriaId?: string;
  vencimientoDesde?: string;
  vencimientoHasta?: string;
}
```

---

#### **GET** `/planes-mejoramiento/:id`

Obtener detalle de un plan.

---

#### **POST** `/planes-mejoramiento`

Crear un plan de mejoramiento.

---

#### **PUT** `/planes-mejoramiento/:id`

Actualizar un plan.

---

#### **POST** `/planes-mejoramiento/:id/acciones`

Agregar una acción al plan.

**Body:**
```typescript
{
  descripcion: string;
  tipoAccion: string;
  fechaInicio: Date;
  fechaFinEsperada: Date;
  idResponsable: string;
}
```

---

#### **PUT** `/acciones-mejoramiento/:id`

Actualizar una acción.

---

#### **PATCH** `/acciones-mejoramiento/:id/progreso`

Actualizar progreso de una acción.

**Body:**
```typescript
{
  porcentajeAvance: number; // 0-100
  observaciones?: string;
}
```

---

### 4.7 Endpoints: Planeación OCIG

#### **GET** `/universo-auditorias/:year`

Obtener universo auditable del año.

**Parámetros URL:**
- `year`: Año (ejemplo: 2025)

---

#### **POST** `/universo-auditorias`

Crear universo auditable.

**Body:**
```typescript
{
  anio: number;
  version?: number;
}
```

---

#### **POST** `/universo-auditorias/:id/procesos`

Agregar proceso auditable.

**Body:**
```typescript
{
  codigo: string;
  nombre: string;
  descripcion?: string;
  macroproceso?: string;
  tipoProceso?: string;
  idAreaResponsable?: string;
  responsableNombre?: string;
  nivelRiesgo?: string;
  factorRiesgo?: number;
  requiereAuditoria?: boolean;
  prioridad?: number;
  criticidad?: string;
}
```

---

#### **PUT** `/procesos-auditables/:id`

Actualizar proceso auditable.

---

#### **DELETE** `/procesos-auditables/:id`

Eliminar proceso auditable.

---

#### **GET** `/plan-anual-5roles/:year`

Obtener Plan Anual (5 Roles) del año.

---

#### **POST** `/plan-anual-5roles`

Crear Plan Anual.

---

#### **POST** `/plan-anual-5roles/:id/actividades`

Agregar actividad al plan anual.

**Body:**
```typescript
{
  rol: string; // 'Rol 1', 'Rol 2', etc.
  actividad: string;
  meta?: string;
  indicador?: string;
  idResponsable?: string;
  responsableNombre?: string;
  programadoTrim1?: boolean;
  programadoTrim2?: boolean;
  programadoTrim3?: boolean;
  programadoTrim4?: boolean;
}
```

---

#### **GET** `/programa-anual/:year`

Obtener Programa Anual del año.

---

#### **POST** `/programa-anual`

Crear Programa Anual.

---

#### **POST** `/programa-anual/:id/importar-procesos`

Importar procesos desde universo auditable.

**Body:**
```typescript
{
  procesosIds: string[]; // Array de UUIDs de procesos
}
```

---

#### **POST** `/programa-anual/:id/auditorias`

Agregar auditoría al programa.

**Body:**
```typescript
{
  idProcesoAuditable?: string;
  nombre: string;
  tipoAuditoria: string;
  alcance?: string;
  trimestre: number; // 1-4
  mes: number; // 1-12
  fechaEstimada?: Date;
  diasEstimados?: number;
  equipoAuditor?: any[];
}
```

---

#### **PUT** `/auditorias-programadas/:id`

Actualizar auditoría programada.

---

#### **DELETE** `/auditorias-programadas/:id`

Eliminar auditoría del programa.

---

### 4.8 Endpoints: Listas de Chequeo

#### **GET** `/listas-chequeo`

Obtener listas de chequeo.

**Query Parameters:**
```typescript
{
  categoria?: string;
  estado?: string;
  esPlantilla?: boolean;
}
```

---

#### **GET** `/listas-chequeo/:id`

Obtener detalle de lista.

---

#### **POST** `/listas-chequeo`

Crear lista de chequeo.

**Body:**
```typescript
{
  nombre: string;
  descripcion?: string;
  categoria: string;
  tipo: string;
  secciones: Array<{
    id: string;
    titulo: string;
    items: Array<{
      id: string;
      descripcion: string;
      esCritico: boolean;
      respuesta?: 'cumple' | 'no-cumple' | 'no-aplica';
      observaciones?: string;
    }>;
  }>;
  esPlantilla?: boolean;
  tags?: string[];
}
```

---

#### **PUT** `/listas-chequeo/:id`

Actualizar lista de chequeo.

---

### 4.9 Endpoints: Informes de Ley

#### **GET** `/informes-ley`

Obtener catálogo de informes de ley.

**Query Parameters:**
```typescript
{
  categoria?: string;
  periodicidad?: string;
  activo?: boolean;
}
```

---

#### **GET** `/informes-ley/:id`

Obtener detalle de informe.

---

#### **POST** `/informes-ley`

Crear nuevo informe de ley.

---

#### **PUT** `/informes-ley/:id`

Actualizar informe de ley.

---

#### **GET** `/informes-ley/calendario/:year`

Obtener calendario de entregas del año.

**Parámetros URL:**
- `year`: Año (ejemplo: 2025)

**Respuesta:**
```typescript
{
  "success": true,
  "data": Array<{
    informeId: string;
    informeNombre: string;
    periodicidad: string;
    entregas: Array<{
      id: string;
      periodo: string;
      fechaVencimiento: Date;
      estado: string;
      fechaEntrega?: Date;
    }>;
  }>
}
```

---

#### **GET** `/entregas-informes`

Obtener entregas de informes con filtros.

**Query Parameters:**
```typescript
{
  informeId?: string;
  periodo?: string;
  estado?: string;
  anio?: number;
  mes?: number;
  trimestre?: number;
}
```

---

#### **GET** `/entregas-informes/:id`

Obtener detalle de una entrega.

---

#### **POST** `/entregas-informes/:id/cargar`

Cargar archivo de informe.

**Body:** `multipart/form-data`
```typescript
{
  file: File;
  observaciones?: string;
}
```

---

#### **PATCH** `/entregas-informes/:id/estado`

Cambiar estado de entrega.

**Body:**
```typescript
{
  estado: 'pendiente' | 'en-proceso' | 'entregado' | 'vencido' | 'rechazado';
  motivoRechazo?: string;
}
```

---

### 4.10 Endpoints: Notificaciones

#### **GET** `/notificaciones`

Obtener notificaciones del usuario actual.

**Query Parameters:**
```typescript
{
  leida?: boolean;
  tipo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
```

---

#### **GET** `/notificaciones/no-leidas/count`

Obtener contador de notificaciones no leídas.

**Respuesta:**
```typescript
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

#### **PATCH** `/notificaciones/:id/marcar-leida`

Marcar notificación como leída.

---

#### **PATCH** `/notificaciones/marcar-todas-leidas`

Marcar todas las notificaciones como leídas.

---

#### **POST** `/notificaciones`

Crear notificación manual.

**Body:**
```typescript
{
  idUsuario?: string;
  idRol?: string;
  tipo: string;
  prioridad: string;
  titulo: string;
  mensaje: string;
  icono?: string;
  entidadTipo?: string;
  entidadId?: string;
  urlAccion?: string;
  textoAccion?: string;
  notificacionEmail?: boolean;
}
```

---

### 4.11 Endpoints: Auditoría de Cambios

#### **GET** `/auditoria-cambios`

Obtener registro de cambios.

**Query Parameters:**
```typescript
{
  entidadTipo?: string;
  entidadId?: string;
  usuarioId?: string;
  operacion?: 'CREATE' | 'UPDATE' | 'DELETE';
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
}
```

---

#### **GET** `/auditoria-cambios/:entidadTipo/:entidadId`

Obtener historial de cambios de una entidad específica.

**Respuesta:**
```typescript
{
  "success": true,
  "data": Array<{
    id: string;
    operacion: string;
    usuario: {
      id: string;
      nombre: string;
      email: string;
    };
    datosAnteriores?: any;
    datosNuevos?: any;
    camposModificados: string[];
    fechaCambio: Date;
    descripcionCambio?: string;
  }>
}
```

---

### 4.12 Endpoints: Configuración

#### **GET** `/configuracion`

Obtener configuraciones del módulo.

---

#### **PUT** `/configuracion`

Actualizar configuraciones.

---

### 4.13 Endpoints: Dashboard y Estadísticas

#### **GET** `/dashboard/kpis`

Obtener KPIs principales del módulo.

**Query Parameters:**
```typescript
{
  year?: number;
  territorialId?: string;
}
```

**Respuesta:**
```typescript
{
  "success": true,
  "data": {
    auditorias: {
      total: number;
      enEjecucion: number;
      completadas: number;
      programadas: number;
      cumplimiento: number; // %
    };
    hallazgos: {
      total: number;
      criticos: number;
      altos: number;
      medios: number;
      bajos: number;
      porGravedad: {
        critica: number;
        alta: number;
        media: number;
        baja: number;
      };
    };
    planesMejoramiento: {
      total: number;
      enEjecucion: number;
      completados: number;
      vencidos: number;
      avancePromedio: number; // %
    };
    informesLey: {
      total: number;
      entregados: number;
      pendientes: number;
      vencidos: number;
      cumplimiento: number; // %
    };
  }
}
```

---

#### **GET** `/dashboard/graficas`

Obtener datos para gráficas.

**Query Parameters:**
```typescript
{
  tipo: 'auditorias-tiempo' | 'hallazgos-gravedad' | 'planes-avance' | 'informes-cumplimiento';
  year?: number;
}
```

---

#### **GET** `/reportes/auditoria/:id/pdf`

Generar reporte PDF de auditoría.

**Parámetros URL:**
- `id`: UUID de la auditoría

**Respuesta:** Archivo PDF

---

#### **GET** `/reportes/plan-mejoramiento/:id/pdf`

Generar reporte PDF de plan de mejoramiento.

---

#### **GET** `/exportar/auditorias`

Exportar auditorías a Excel.

**Query Parameters:** Filtros similares a `GET /auditorias`

**Respuesta:** Archivo Excel

---

## 5. Autenticación y Autorización

### 5.1 Autenticación JWT

**Proceso de Login:**

1. Usuario envía credenciales a `/auth/login`
2. Backend valida credenciales
3. Si válido, genera JWT con payload:

```typescript
{
  userId: string;
  email: string;
  nombre: string;
  roles: string[];
  permissions: string[];
  territorial?: string; // Si es usuario territorial
  iat: number; // Issued at
  exp: number; // Expiration (24h)
}
```

4. Cliente guarda token y lo envía en cada request

### 5.2 Roles del Módulo

```typescript
enum RolesControlInterno {
  ADMIN_CONTROL_INTERNO = 'admin-control-interno',
  JEFE_CONTROL_INTERNO = 'jefe-control-interno',
  AUDITOR_LIDER = 'auditor-lider',
  AUDITOR = 'auditor',
  AREA_AUDITADA = 'area-auditada',
  CONSULTA = 'consulta' // Solo lectura
}
```

### 5.3 Permisos Granulares

```typescript
interface Permissions {
  // Auditorías
  'auditorias:read': boolean;
  'auditorias:create': boolean;
  'auditorias:update': boolean;
  'auditorias:delete': boolean;
  'auditorias:execute': boolean;
  
  // Hallazgos
  'hallazgos:read': boolean;
  'hallazgos:create': boolean;
  'hallazgos:update': boolean;
  'hallazgos:close': boolean;
  
  // Planes
  'planes:read': boolean;
  'planes:create': boolean;
  'planes:update': boolean;
  'planes:approve': boolean;
  
  // Informes
  'informes:read': boolean;
  'informes:upload': boolean;
  'informes:approve': boolean;
  
  // Planeación
  'planeacion:read': boolean;
  'planeacion:update': boolean;
  'planeacion:approve': boolean;
  
  // Configuración
  'config:read': boolean;
  'config:update': boolean;
}
```

### 5.4 Middleware de Autorización

```typescript
// Ejemplo de middleware
function checkPermission(permission: string) {
  return (req, res, next) => {
    const user = req.user; // Usuario del JWT
    
    if (!user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para realizar esta acción'
        }
      });
    }
    
    next();
  };
}

// Uso:
router.post('/auditorias', 
  authenticate, 
  checkPermission('auditorias:create'), 
  createAuditoria
);
```

---

## 6. Validaciones y Reglas de Negocio

### 6.1 Validaciones de Auditoría

```typescript
// Reglas de validación
const auditoriaValidation = {
  // Campos obligatorios
  required: ['titulo', 'tipoAuditoria'],
  
  // Longitudes
  titulo: { min: 3, max: 255 },
  descripcion: { min: 10, max: 1000 },
  
  // Fechas
  fechas: {
    // Fecha fin debe ser posterior a fecha inicio
    fechaFinPlaneada: (value, data) => {
      if (data.fechaInicioPlaneada && value < data.fechaInicioPlaneada) {
        return 'La fecha fin debe ser posterior a la fecha inicio';
      }
    },
    
    // Auditorías no pueden planificarse en el pasado (excepto especiales)
    fechaInicioPlaneada: (value, data) => {
      if (!data.esAuditoriaEspecial && value < new Date()) {
        return 'No puedes planificar auditorías en el pasado';
      }
    }
  },
  
  // Auditorías Especiales
  especiales: {
    // Si es especial, debe tener origen de solicitud
    origenSolicitud: (value, data) => {
      if (data.esAuditoriaEspecial && !value) {
        return 'Las auditorías especiales requieren origen de solicitud';
      }
    }
  },
  
  // Equipo Auditor
  equipo: {
    // Debe tener al menos un auditor líder
    idAuditorLider: 'required'
  }
};
```

### 6.2 Reglas de Negocio - Auditorías

```typescript
class AuditoriasBusinessRules {
  /**
   * Generar código único para auditoría
   * Formato: AUD-YYYY-XXX
   */
  static async generateCodigo(year: number): Promise<string> {
    const count = await this.countAuditoriasYear(year);
    const numero = (count + 1).toString().padStart(3, '0');
    return `AUD-${year}-${numero}`;
  }
  
  /**
   * Validar cambio de estado
   */
  static validateStateTransition(
    currentState: string,
    newState: string
  ): boolean {
    const validTransitions = {
      'programada': ['en-planeacion', 'cancelada'],
      'en-planeacion': ['en-ejecucion', 'programada', 'cancelada'],
      'en-ejecucion': ['en-comunicacion', 'cancelada'],
      'en-comunicacion': ['cerrada'],
      'cerrada': [], // No se puede cambiar desde cerrada
      'cancelada': [] // No se puede cambiar desde cancelada
    };
    
    return validTransitions[currentState]?.includes(newState) ?? false;
  }
  
  /**
   * Calcular progreso automático basado en actividades
   */
  static calculateProgress(auditoria: Auditoria): number {
    const totalActividades = this.getTotalActividades(auditoria);
    const actividadesCompletadas = this.getActividadesCompletadas(auditoria);
    
    return totalActividades > 0 
      ? Math.round((actividadesCompletadas / totalActividades) * 100)
      : 0;
  }
  
  /**
   * Validar que una auditoría puede cerrarse
   */
  static canClose(auditoria: Auditoria): { valid: boolean; reason?: string } {
    // Debe tener al menos un hallazgo registrado
    if (auditoria.totalHallazgos === 0) {
      return {
        valid: false,
        reason: 'La auditoría debe tener al menos un hallazgo registrado'
      };
    }
    
    // Todos los hallazgos críticos deben tener plan de mejoramiento
    if (auditoria.hallazgosCriticos > 0) {
      const hallazgosCriticosSinPlan = this.getHallazgosCriticosSinPlan(auditoria.id);
      if (hallazgosCriticosSinPlan > 0) {
        return {
          valid: false,
          reason: `Hay ${hallazgosCriticosSinPlan} hallazgos críticos sin plan de mejoramiento`
        };
      }
    }
    
    return { valid: true };
  }
}
```

### 6.3 Reglas de Negocio - Hallazgos

```typescript
class HallazgosBusinessRules {
  /**
   * Generar código único para hallazgo
   * Formato: HAL-YYYY-XXX
   */
  static async generateCodigo(year: number): Promise<string> {
    const count = await this.countHallazgosYear(year);
    const numero = (count + 1).toString().padStart(3, '0');
    return `HAL-${year}-${numero}`;
  }
  
  /**
   * Determinar si un hallazgo requiere plan de mejoramiento obligatorio
   */
  static requiresPlanMejoramiento(hallazgo: Hallazgo): boolean {
    // Hallazgos críticos o altos siempre requieren plan
    if (['Crítica', 'Alta'].includes(hallazgo.gravedad)) {
      return true;
    }
    
    // No conformidades siempre requieren plan
    if (hallazgo.tipoHallazgo === 'No Conformidad') {
      return true;
    }
    
    return false;
  }
  
  /**
   * Calcular nivel de riesgo basado en impacto y probabilidad
   */
  static calculateRiesgo(
    impacto: string,
    probabilidad: string
  ): string {
    const matriz = {
      'Bajo-Baja': 'Bajo',
      'Bajo-Media': 'Bajo',
      'Bajo-Alta': 'Medio',
      'Medio-Baja': 'Bajo',
      'Medio-Media': 'Medio',
      'Medio-Alta': 'Alto',
      'Alto-Baja': 'Medio',
      'Alto-Media': 'Alto',
      'Alto-Alta': 'Extremo',
      'Crítico-Baja': 'Alto',
      'Crítico-Media': 'Extremo',
      'Crítico-Alta': 'Extremo'
    };
    
    return matriz[`${impacto}-${probabilidad}`] || 'Medio';
  }
  
  /**
   * Validar que un hallazgo puede cerrarse
   */
  static canClose(hallazgo: Hallazgo): { valid: boolean; reason?: string } {
    // Si requiere plan, debe tener plan asociado y completado
    if (hallazgo.requierePlan) {
      if (!hallazgo.idPlanMejoramiento) {
        return {
          valid: false,
          reason: 'El hallazgo requiere un plan de mejoramiento'
        };
      }
      
      const plan = this.getPlanMejoramiento(hallazgo.idPlanMejoramiento);
      if (plan.estado !== 'completado') {
        return {
          valid: false,
          reason: 'El plan de mejoramiento debe estar completado'
        };
      }
    }
    
    return { valid: true };
  }
}
```

### 6.4 Reglas de Negocio - Planes de Mejoramiento

```typescript
class PlanesMejoramientoBusinessRules {
  /**
   * Generar código único para plan
   * Formato: PLN-YYYY-XXX
   */
  static async generateCodigo(year: number): Promise<string> {
    const count = await this.countPlanesYear(year);
    const numero = (count + 1).toString().padStart(3, '0');
    return `PLN-${year}-${numero}`;
  }
  
  /**
   * Calcular progreso del plan basado en acciones
   */
  static calculateProgress(plan: PlanMejoramiento): number {
    if (plan.totalAcciones === 0) return 0;
    
    const acciones = this.getAcciones(plan.id);
    const sumaAvances = acciones.reduce((sum, accion) => sum + accion.porcentajeAvance, 0);
    
    return Math.round(sumaAvances / plan.totalAcciones);
  }
  
  /**
   * Determinar estado basado en fechas y avance
   */
  static determineEstado(plan: PlanMejoramiento): string {
    const now = new Date();
    
    // Si está completado, permanece completado
    if (plan.estado === 'completado') {
      return 'completado';
    }
    
    // Si está vencido
    if (now > plan.fechaFinEsperada && plan.progresoPorcentaje < 100) {
      return 'vencido';
    }
    
    // Si está en ejecución
    if (now >= plan.fechaInicio && now <= plan.fechaFinEsperada) {
      return 'en-ejecucion';
    }
    
    // Si aún no inicia
    if (now < plan.fechaInicio) {
      return 'programado';
    }
    
    return plan.estado;
  }
  
  /**
   * Validar que un plan puede marcarse como completado
   */
  static canComplete(plan: PlanMejoramiento): { valid: boolean; reason?: string } {
    // Todas las acciones deben estar completadas
    const accionesIncompletas = this.getAccionesIncompletas(plan.id);
    if (accionesIncompletas.length > 0) {
      return {
        valid: false,
        reason: `Hay ${accionesIncompletas.length} acciones sin completar`
      };
    }
    
    // Debe tener evidencias de cierre
    if (!plan.evidenciasCierre || plan.evidenciasCierre.length === 0) {
      return {
        valid: false,
        reason: 'Se requieren evidencias de cierre del plan'
      };
    }
    
    return { valid: true };
  }
}
```

### 6.5 Reglas de Negocio - Informes de Ley

```typescript
class InformesLeyBusinessRules {
  /**
   * Generar entregas del año basadas en periodicidad
   */
  static generateEntregasAnuales(informe: InformeLey, year: number): EntregaInforme[] {
    const entregas: EntregaInforme[] = [];
    
    switch (informe.periodicidad) {
      case 'Mensual':
        for (let mes = 1; mes <= 12; mes++) {
          entregas.push(this.createEntrega(informe, year, mes));
        }
        break;
        
      case 'Bimestral':
        for (let bimestre = 1; bimestre <= 6; bimestre++) {
          const mes = bimestre * 2;
          entregas.push(this.createEntrega(informe, year, mes));
        }
        break;
        
      case 'Trimestral':
        for (let trimestre = 1; trimestre <= 4; trimestre++) {
          const mes = trimestre * 3;
          entregas.push(this.createEntrega(informe, year, mes));
        }
        break;
        
      case 'Cuatrimestral':
        for (let cuatrimestre = 1; cuatrimestre <= 3; cuatrimestre++) {
          const mes = cuatrimestre * 4;
          entregas.push(this.createEntrega(informe, year, mes));
        }
        break;
        
      case 'Semestral':
        for (let semestre = 1; semestre <= 2; semestre++) {
          const mes = semestre * 6;
          entregas.push(this.createEntrega(informe, year, mes));
        }
        break;
        
      case 'Anual':
        const mes = informe.mesVencimiento || 12;
        entregas.push(this.createEntrega(informe, year, mes));
        break;
    }
    
    return entregas;
  }
  
  /**
   * Calcular fecha de vencimiento
   */
  static calculateFechaVencimiento(
    informe: InformeLey,
    year: number,
    mes: number
  ): Date {
    const dia = informe.diaVencimiento || 15; // Default día 15
    return new Date(year, mes - 1, dia);
  }
  
  /**
   * Determinar estado de entrega basado en fechas
   */
  static determineEstadoEntrega(entrega: EntregaInforme): string {
    const now = new Date();
    
    // Si ya fue entregado
    if (entrega.fechaEntrega) {
      return 'entregado';
    }
    
    // Si está vencido
    if (now > entrega.fechaVencimiento) {
      return 'vencido';
    }
    
    // Si está en proceso (dentro de los días de anticipación)
    const diasAnticipacion = this.getDiasAnticipacion(entrega);
    const fechaAlerta = new Date(entrega.fechaVencimiento);
    fechaAlerta.setDate(fechaAlerta.getDate() - diasAnticipacion);
    
    if (now >= fechaAlerta) {
      return 'en-proceso';
    }
    
    return 'pendiente';
  }
  
  /**
   * Validar archivo cargado
   */
  static validateArchivo(file: File): { valid: boolean; error?: string } {
    // Tamaño máximo 10MB
    if (file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: 'El archivo no debe superar 10 MB'
      };
    }
    
    // Tipos permitidos
    const tiposPermitidos = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!tiposPermitidos.includes(file.type)) {
      return {
        valid: false,
        error: 'Solo se permiten archivos PDF o Excel'
      };
    }
    
    return { valid: true };
  }
}
```

---

## 7. Flujos de Trabajo

### 7.1 Flujo: Crear y Ejecutar Auditoría

```
┌─────────────────────────────────────────────────────────────┐
│  1. CREAR AUDITORÍA                                          │
│  POST /auditorias                                            │
│  - Usuario crea auditoría con datos básicos                 │
│  - Sistema genera código único (AUD-2025-001)               │
│  - Estado inicial: 'programada'                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  2. PLANEACIÓN                                               │
│  PATCH /auditorias/:id/estado → 'en-planeacion'            │
│  - Definir alcance y objetivos                              │
│  - Asignar equipo auditor                                   │
│  - Definir áreas/procesos a auditar                         │
│  - Asociar listas de chequeo                                │
│  - Crear plan de auditoría                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  3. EJECUCIÓN                                                │
│  PATCH /auditorias/:id/estado → 'en-ejecucion'             │
│  - Ejecutar actividades planificadas                        │
│  - Diligenciar listas de chequeo                            │
│  - Registrar hallazgos (POST /auditorias/:id/hallazgos)    │
│  - Cargar evidencias                                        │
│  - Actualizar progreso                                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  4. COMUNICACIÓN DE RESULTADOS                               │
│  PATCH /auditorias/:id/estado → 'en-comunicacion'          │
│  - Generar informe de auditoría                             │
│  - Comunicar hallazgos a áreas auditadas                    │
│  - Solicitar planes de mejoramiento                         │
│  - Revisar y aprobar planes                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  5. CIERRE                                                   │
│  PATCH /auditorias/:id/estado → 'cerrada'                  │
│  - Validar que todos los hallazgos críticos tienen plan    │
│  - Generar reporte final                                    │
│  - Archivar documentación                                   │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Flujo: Gestión de Hallazgos y Planes de Mejoramiento

```
┌─────────────────────────────────────────────────────────────┐
│  1. REGISTRAR HALLAZGO                                       │
│  POST /hallazgos                                            │
│  - Auditor registra hallazgo durante ejecución              │
│  - Sistema genera código (HAL-2025-001)                     │
│  - Clasificar (tipo, gravedad)                              │
│  - Análisis: condición, criterio, causa, efecto            │
│  - Estado inicial: 'abierto'                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ANÁLISIS DEL HALLAZGO                                    │
│  PATCH /hallazgos/:id/estado → 'en-analisis'              │
│  - Área auditada revisa hallazgo                            │
│  - Análisis de causa raíz                                   │
│  - Determinar si requiere plan de mejoramiento              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  3. CREAR PLAN DE MEJORAMIENTO                               │
│  POST /hallazgos/:id/plan-mejoramiento                      │
│  - Responsable crea plan (PLN-2025-001)                     │
│  - Definir objetivos y causa raíz                           │
│  - Agregar acciones de mejoramiento                         │
│  - Asignar responsables y plazos                            │
│  - Definir indicadores de cumplimiento                      │
│  PATCH /hallazgos/:id/estado → 'en-plan-mejoramiento'     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  4. EJECUTAR PLAN                                            │
│  - Responsables ejecutan acciones                           │
│  - Actualizar progreso de acciones                          │
│    PATCH /acciones-mejoramiento/:id/progreso                │
│  - Cargar evidencias de cumplimiento                        │
│  - Sistema calcula progreso del plan automáticamente        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  5. SEGUIMIENTO Y CIERRE                                     │
│  - Control Interno hace seguimiento                         │
│  - Verificar cumplimiento de acciones                       │
│  - Validar evidencias                                       │
│  - Marcar plan como completado                              │
│    PATCH /planes-mejoramiento/:id/estado → 'completado'    │
│  - Cerrar hallazgo                                          │
│    PATCH /hallazgos/:id/estado → 'cerrado'                 │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Flujo: Gestión de Informes de Ley

```
┌─────────────────────────────────────────────────────────────┐
│  INICIO DE AÑO                                               │
│  - Sistema genera automáticamente entregas del año          │
│  - Basado en periodicidad de cada informe                   │
│  - Calcula fechas de vencimiento                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  ALERTAS AUTOMÁTICAS                                         │
│  - Sistema monitorea fechas de vencimiento                  │
│  - Envía notificaciones según días de anticipación:         │
│    • 15 días antes: Alerta anticipada (azul)               │
│    • 7 días antes: Atención (amarillo)                      │
│    • 3 días antes: Urgente (naranja)                        │
│    • Pasada fecha: Vencido (rojo)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  CARGA DE INFORME                                            │
│  POST /entregas-informes/:id/cargar                         │
│  - Responsable carga archivo (PDF/Excel)                    │
│  - Sistema valida formato y tamaño                          │
│  - Cambia estado a 'en-proceso'                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  APROBACIÓN Y ENTREGA                                        │
│  - Jefe Control Interno revisa informe                      │
│  - Si aprueba:                                              │
│    PATCH /entregas-informes/:id/estado → 'entregado'       │
│  - Si rechaza:                                              │
│    PATCH /entregas-informes/:id/estado → 'rechazado'       │
│    (vuelve a 'pendiente' para corrección)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  REGISTRO Y ARCHIVO                                          │
│  - Sistema registra fecha de entrega                        │
│  - Archiva documento en storage                             │
│  - Actualiza KPIs de cumplimiento                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Integraciones

### 8.1 Sistema de Almacenamiento de Archivos (S3)

**Configuración:**
```typescript
interface S3Config {
  bucket: string; // 'esap-control-interno'
  region: string; // 'us-east-1'
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string; // 'https://cdn.esap.edu.co'
}
```

**Estructura de Carpetas:**
```
/control-interno
  /auditorias
    /{auditoria_id}
      /plan
      /evidencias
      /informes
  /hallazgos
    /{hallazgo_id}
      /evidencias
  /planes-mejoramiento
    /{plan_id}
      /evidencias
  /informes-ley
    /{informe_codigo}
      /{year}
        /{periodo}
  /listas-chequeo
    /templates
```

**Operaciones:**
- Upload: Subir archivo con metadatos
- Download: Obtener archivo por URL
- Delete: Eliminar archivo (soft delete)
- List: Listar archivos de una entidad

### 8.2 Sistema de Correo Electrónico

**Eventos que envían email:**
- Creación de auditoría → Notificar a auditor líder
- Hallazgo crítico registrado → Notificar a responsable área
- Plan de mejoramiento vencido → Notificar a responsable
- Informe de ley próximo a vencer → Notificar a responsable
- Cambio de estado de auditoría → Notificar a involucrados

**Plantillas de Email:**
```typescript
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
  variables: Record<string, any>;
}

// Ejemplo: Hallazgo crítico
const hallazgoCriticoTemplate = {
  subject: '🚨 Hallazgo Crítico Registrado - {{codigo}}',
  html: `
    <h2>Nuevo Hallazgo Crítico</h2>
    <p>Se ha registrado un hallazgo crítico en la auditoría <strong>{{auditoriaFin}}</strong>:</p>
    <ul>
      <li><strong>Código:</strong> {{codigo}}</li>
      <li><strong>Título:</strong> {{titulo}}</li>
      <li><strong>Gravedad:</strong> {{gravedad}}</li>
      <li><strong>Área Auditada:</strong> {{area}}</li>
    </ul>
    <p>Por favor, revise el hallazgo y tome las acciones necesarias.</p>
    <a href="{{url}}">Ver Hallazgo</a>
  `
};
```

### 8.3 Sistema de Notificaciones en Tiempo Real (WebSockets)

**Eventos en Tiempo Real:**
```typescript
enum WebSocketEvents {
  // Auditorías
  AUDITORIA_CREATED = 'auditoria:created',
  AUDITORIA_UPDATED = 'auditoria:updated',
  AUDITORIA_STATUS_CHANGED = 'auditoria:status-changed',
  
  // Hallazgos
  HALLAZGO_CREATED = 'hallazgo:created',
  HALLAZGO_CRITICO = 'hallazgo:critico',
  
  // Planes
  PLAN_VENCIDO = 'plan:vencido',
  PLAN_COMPLETED = 'plan:completed',
  
  // Informes
  INFORME_PROXIMO_VENCER = 'informe:proximo-vencer',
  INFORME_VENCIDO = 'informe:vencido',
  
  // Notificaciones
  NUEVA_NOTIFICACION = 'notificacion:nueva'
}
```

**Implementación:**
```typescript
// Server
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  
  // Join user room
  socket.join(`user:${userId}`);
  
  // Emit notification
  io.to(`user:${userId}`).emit('notificacion:nueva', {
    id: '...',
    titulo: '...',
    mensaje: '...'
  });
});

// Client
socket.on('notificacion:nueva', (data) => {
  // Mostrar toast
  toast.success(data.titulo, { description: data.mensaje });
});
```

### 8.4 Integración con Módulo de Usuarios

**Endpoints Requeridos del Módulo de Usuarios:**

```typescript
// GET /api/usuarios/:id
interface Usuario {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  cargo: string;
  dependencia: string;
  roles: string[];
  activo: boolean;
}

// GET /api/areas
interface Area {
  id: string;
  codigo: string;
  nombre: string;
  responsable: Usuario;
  nivel: number;
  areaPadre?: string;
}

// GET /api/territoriales
interface Territorial {
  id: string;
  nombre: string;
  ciudad: string;
  departamento: string;
  nivel: 'regional' | 'nacional';
}
```

### 8.5 Integración con Sistema de Gestión Documental

**Sincronización de Expedientes:**
- Cada auditoría genera un expediente documental
- Código de expediente: `EXP-CIG-{CODIGO_AUDITORIA}`
- Documentos asociados se replican en el sistema documental
- Metadatos: fecha, tipo, responsable, estado

---

## 9. Configuración y Despliegue

### 9.1 Variables de Entorno

```bash
# Aplicación
NODE_ENV=production
PORT=3000
APP_URL=https://esap.edu.co

# Base de Datos
DATABASE_URL=postgresql://user:password@localhost:5432/esap_control_interno
DATABASE_SSL=true
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis (Cache)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TLS=true

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# S3 / Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=esap-control-interno
S3_PUBLIC_URL=https://cdn.esap.edu.co

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notificaciones@esap.edu.co
SMTP_PASSWORD=
EMAIL_FROM=Control Interno ESAP <notificaciones@esap.edu.co>

# WebSockets
WS_ENABLED=true
WS_PORT=3001

# Logs
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Seguridad
CORS_ORIGIN=https://esap.edu.co
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 9.2 Estructura del Proyecto (Recomendada)

```
/backend
  /src
    /modules
      /auditorias
        /controllers
        /services
        /repositories
        /validators
        /types
      /hallazgos
      /planes-mejoramiento
      /planeacion
      /informes-ley
      /listas-chequeo
      /notificaciones
      /auditoria-cambios
      /configuracion
    /common
      /auth
        auth.middleware.ts
        jwt.service.ts
        permissions.guard.ts
      /database
        database.service.ts
        migrations/
        seeds/
      /utils
        pagination.util.ts
        response.util.ts
        date.util.ts
      /validators
        common.validators.ts
      /types
        index.ts
    /config
      database.config.ts
      redis.config.ts
      s3.config.ts
      email.config.ts
    app.module.ts
    main.ts
  /test
    /unit
    /integration
    /e2e
  /docs
    swagger.yaml
  .env.example
  .env
  package.json
  tsconfig.json
  Dockerfile
  docker-compose.yml
```

### 9.3 Docker Configuration

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/esap_ci
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
  
  db:
    image: postgres:14-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=esap_ci
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 9.4 Scripts de Migración

**Ejemplo de Migración (Prisma):**
```typescript
// prisma/migrations/20250101000000_initial/migration.sql

-- CreateTable
CREATE TABLE "auditorias" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "codigo" VARCHAR(20) UNIQUE NOT NULL,
  "titulo" VARCHAR(255) NOT NULL,
  "descripcion" TEXT,
  "tipo_auditoria" VARCHAR(50) NOT NULL,
  "estado" VARCHAR(50) NOT NULL DEFAULT 'programada',
  "creado_en" TIMESTAMP DEFAULT NOW(),
  "actualizado_en" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_auditorias_codigo" ON "auditorias"("codigo");
CREATE INDEX "idx_auditorias_estado" ON "auditorias"("estado");
```

### 9.5 Seeders (Datos Iniciales)

**Ejemplo de Seeder:**
```typescript
// seeds/informes-ley.seed.ts

export const informesLeySeed = [
  {
    codigo: 'INF-CHIP',
    nombre: 'Informe CHIP - Contraloría',
    descripcion: 'Informe Consolidado de Hallazgos e Incumplimientos de Planes de Mejoramiento',
    categoria: 'Transparencia',
    tipoObligacion: 'Ley',
    normaBase: 'Ley 1474 de 2011',
    periodicidad: 'Trimestral',
    entidadDestino: 'Contraloría General de la República',
    diaVencimiento: 15,
    diasAnticipacion: 10,
    activo: true
  },
  {
    codigo: 'INF-SIRECI',
    nombre: 'Informe SIRECI',
    descripcion: 'Sistema de Rendición Electrónica de la Cuenta e Informes',
    categoria: 'Control',
    tipoObligacion: 'Ley',
    normaBase: 'Ley 951 de 2005',
    periodicidad: 'Anual',
    entidadDestino: 'Contraloría General de la República',
    mesVencimiento: 2,
    diaVencimiento: 28,
    diasAnticipacion: 15,
    activo: true
  }
  // ... más informes
];
```

---

## 10. Anexos

### Anexo A: Códigos de Error

```typescript
enum ErrorCodes {
  // Errores Generales (1xxx)
  INTERNAL_SERVER_ERROR = 'ERR_1000',
  VALIDATION_ERROR = 'ERR_1001',
  NOT_FOUND = 'ERR_1002',
  UNAUTHORIZED = 'ERR_1003',
  FORBIDDEN = 'ERR_1004',
  CONFLICT = 'ERR_1005',
  
  // Errores de Auditorías (2xxx)
  AUDITORIA_NOT_FOUND = 'ERR_2001',
  AUDITORIA_INVALID_STATE_TRANSITION = 'ERR_2002',
  AUDITORIA_CANNOT_DELETE = 'ERR_2003',
  AUDITORIA_CANNOT_CLOSE = 'ERR_2004',
  
  // Errores de Hallazgos (3xxx)
  HALLAZGO_NOT_FOUND = 'ERR_3001',
  HALLAZGO_REQUIRES_PLAN = 'ERR_3002',
  HALLAZGO_CANNOT_CLOSE = 'ERR_3003',
  
  // Errores de Planes (4xxx)
  PLAN_NOT_FOUND = 'ERR_4001',
  PLAN_CANNOT_COMPLETE = 'ERR_4002',
  ACCION_NOT_FOUND = 'ERR_4003',
  
  // Errores de Archivos (5xxx)
  FILE_TOO_LARGE = 'ERR_5001',
  FILE_INVALID_TYPE = 'ERR_5002',
  FILE_UPLOAD_FAILED = 'ERR_5003',
  
  // Errores de Permisos (6xxx)
  PERMISSION_DENIED = 'ERR_6001',
  INVALID_ROLE = 'ERR_6002'
}
```

### Anexo B: Estados del Sistema

```typescript
// Estados de Auditoría
type EstadoAuditoria = 
  | 'programada'
  | 'en-planeacion'
  | 'en-ejecucion'
  | 'en-comunicacion'
  | 'cerrada'
  | 'cancelada';

// Estados de Hallazgo
type EstadoHallazgo =
  | 'abierto'
  | 'en-analisis'
  | 'en-plan-mejoramiento'
  | 'cerrado'
  | 'rechazado';

// Estados de Plan de Mejoramiento
type EstadoPlan =
  | 'programado'
  | 'en-ejecucion'
  | 'completado'
  | 'vencido'
  | 'cancelado';

// Estados de Acción de Mejoramiento
type EstadoAccion =
  | 'programada'
  | 'en-ejecucion'
  | 'completada'
  | 'vencida'
  | 'atrasada';

// Estados de Entrega de Informe
type EstadoEntrega =
  | 'pendiente'
  | 'en-proceso'
  | 'entregado'
  | 'vencido'
  | 'rechazado';
```

### Anexo C: Ejemplo de Payload Completo

**Crear Auditoría Completa:**
```json
{
  "titulo": "Auditoría de Gestión al Proceso de Contratación",
  "descripcion": "Evaluación del cumplimiento normativo y eficiencia del proceso de contratación de la entidad",
  "tipoAuditoria": "Gestión",
  "alcance": "Proceso de contratación - Contratos superiores a 100 SMMLV - Vigencia 2024",
  "objetivos": [
    "Evaluar el cumplimiento de la normativa vigente en contratación pública",
    "Verificar la eficiencia y eficacia del proceso de contratación",
    "Identificar oportunidades de mejora en el proceso"
  ],
  "fechaInicioPlaneada": "2025-02-01",
  "fechaFinPlaneada": "2025-02-28",
  "duracionEstimadaDias": 28,
  "esAuditoriaEspecial": false,
  "vinculadaPlanAnual": true,
  "idPlanAnual": "uuid-plan-anual-2025",
  "esAuditoriaTerritorial": false,
  "idAuditorLider": "uuid-auditor-lider",
  "auditores": [
    {
      "id": "uuid-auditor-1",
      "nombre": "Juan Pérez",
      "rol": "Auditor"
    },
    {
      "id": "uuid-auditor-2",
      "nombre": "María García",
      "rol": "Auditor"
    }
  ],
  "areasAuditadas": [
    {
      "id": "uuid-area-1",
      "nombre": "Gestión Contractual",
      "responsable": "Carlos Rodríguez - Jefe de Contratación"
    }
  ],
  "procesosAuditados": [
    "Planeación de la contratación",
    "Selección del contratista",
    "Ejecución contractual",
    "Liquidación de contratos"
  ],
  "marcoNormativo": [
    {
      "nombre": "Ley 1150 de 2007",
      "descripcion": "Por medio de la cual se introducen medidas para la eficiencia y la transparencia en la Ley 80 de 1993",
      "url": "https://..."
    },
    {
      "nombre": "Decreto 1082 de 2015",
      "descripcion": "Decreto Único Reglamentario del Sector Administrativo de Planeación Nacional",
      "url": "https://..."
    }
  ],
  "prioridad": "alta",
  "tags": ["contratación", "gestión", "normativa"]
}
```

### Anexo D: Ejemplo de Respuesta de Dashboard

```json
{
  "success": true,
  "data": {
    "auditorias": {
      "total": 45,
      "enEjecucion": 12,
      "completadas": 28,
      "programadas": 5,
      "cumplimiento": 87.5,
      "porEstado": {
        "programada": 5,
        "en-planeacion": 3,
        "en-ejecucion": 12,
        "en-comunicacion": 2,
        "cerrada": 28,
        "cancelada": 0
      }
    },
    "hallazgos": {
      "total": 156,
      "criticos": 8,
      "altos": 24,
      "medios": 67,
      "bajos": 57,
      "porGravedad": {
        "Crítica": 8,
        "Alta": 24,
        "Media": 67,
        "Baja": 57
      },
      "porTipo": {
        "No Conformidad": 45,
        "Observación": 78,
        "Oportunidad de Mejora": 28,
        "Fortaleza": 5
      }
    },
    "planesMejoramiento": {
      "total": 72,
      "enEjecucion": 35,
      "completados": 32,
      "vencidos": 5,
      "avancePromedio": 68.4
    },
    "informesLey": {
      "total": 48,
      "entregados": 42,
      "pendientes": 4,
      "vencidos": 2,
      "cumplimiento": 91.3
    },
    "tendencias": {
      "hallazgosPorMes": [
        { "mes": "Enero", "cantidad": 12 },
        { "mes": "Febrero", "cantidad": 15 },
        { "mes": "Marzo", "cantidad": 18 }
      ],
      "cumplimientoInformes": [
        { "trimestre": "Q1", "cumplimiento": 95 },
        { "trimestre": "Q2", "cumplimiento": 88 },
        { "trimestre": "Q3", "cumplimiento": 92 }
      ]
    }
  },
  "timestamp": "2025-12-24T10:30:00Z"
}
```

---

## 📞 Contacto y Soporte

**Equipo de Desarrollo:**
- **Arquitecto de Software**: [Nombre]
- **Tech Lead Backend**: [Nombre]
- **DevOps**: [Nombre]

**Documentación Adicional:**
- Swagger/OpenAPI: `https://api.esap.edu.co/docs`
- Repositorio: `https://github.com/esap/control-interno-backend`
- Wiki: `https://wiki.esap.edu.co/control-interno`

---

**Versión del Documento**: 1.0  
**Fecha**: 24 de Diciembre de 2025  
**Módulo**: Control Interno de Gestión (OCIG)  
**Institución**: Escuela Superior de Administración Pública (ESAP)

---

## ✅ Checklist de Implementación

### Fase 1: Setup Inicial (Semana 1-2)
- [ ] Configurar proyecto Node.js + TypeScript
- [ ] Configurar base de datos PostgreSQL
- [ ] Configurar Redis para cache
- [ ] Setup Docker y Docker Compose
- [ ] Configurar ESLint + Prettier
- [ ] Setup testing framework (Jest)
- [ ] Configurar CI/CD pipeline

### Fase 2: Autenticación y Seguridad (Semana 3)
- [ ] Implementar autenticación JWT
- [ ] Implementar middleware de autorización
- [ ] Configurar roles y permisos
- [ ] Implementar rate limiting
- [ ] Configurar CORS
- [ ] Setup de auditoría de cambios

### Fase 3: Módulos Core (Semana 4-6)
- [ ] Módulo de Auditorías
- [ ] Módulo de Hallazgos
- [ ] Módulo de Planes de Mejoramiento
- [ ] Sistema de workflow y cambios de estado
- [ ] Validaciones y reglas de negocio

### Fase 4: Planeación (Semana 7-8)
- [ ] Universo Auditable
- [ ] Plan Anual (5 Roles)
- [ ] Programa Anual
- [ ] Vinculación con auditorías

### Fase 5: Módulos Complementarios (Semana 9-10)
- [ ] Listas de Chequeo
- [ ] Informes de Ley
- [ ] Sistema de entregas y calendario
- [ ] Generación automática de entregas

### Fase 6: Notificaciones e Integraciones (Semana 11)
- [ ] Sistema de notificaciones
- [ ] Integración con email (SMTP)
- [ ] WebSockets para tiempo real
- [ ] Integración con S3 para archivos

### Fase 7: Dashboard y Reportes (Semana 12)
- [ ] Endpoints de KPIs
- [ ] Endpoints de gráficas
- [ ] Generación de PDFs
- [ ] Exportación a Excel

### Fase 8: Testing y Documentación (Semana 13-14)
- [ ] Tests unitarios (80% coverage)
- [ ] Tests de integración
- [ ] Tests E2E críticos
- [ ] Documentación Swagger completa
- [ ] Documentación de código

### Fase 9: Optimización y Deployment (Semana 15-16)
- [ ] Optimización de queries
- [ ] Implementación de cache
- [ ] Setup de monitoring
- [ ] Logs y alertas
- [ ] Deployment a staging
- [ ] Load testing
- [ ] Deployment a producción

---

Este documento proporciona todas las especificaciones necesarias para que el equipo de desarrollo backend pueda implementar completamente el Módulo de Control Interno de Gestión (OCIG).
