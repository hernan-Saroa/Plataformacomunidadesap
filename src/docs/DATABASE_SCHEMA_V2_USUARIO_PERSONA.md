# 🎓 Database Schema V2 - USUARIO PERSONA ESAP

**Arquitectura:** Hub-and-Spoke (Usuario Persona como núcleo)  
**Base de Datos:** PostgreSQL 14+ / MySQL 8.0+  
**ORM Recomendado:** Prisma / TypeORM  
**Última actualización:** 17 de Noviembre, 2025

---

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Diagrama ER](#diagrama-er)
- [Tablas Principales](#tablas-principales)
  - [usuarios_base](#usuarios_base)
  - [usuarios_persona_roles](#usuarios_persona_roles)
  - [usuarios_aspirantes](#usuarios_aspirantes)
  - [usuarios_estudiantes](#usuarios_estudiantes)
  - [usuarios_docentes](#usuarios_docentes)
  - [usuarios_administrativos](#usuarios_administrativos)
  - [usuarios_graduados](#usuarios_graduados)
- [Tablas de Soporte](#tablas-de-soporte)
  - [solicitudes_enrolamiento](#solicitudes_enrolamiento)
  - [notificaciones](#notificaciones)
  - [carpeta_digital](#carpeta_digital)
  - [completitud_perfil](#completitud_perfil)
- [Reglas de Negocio](#reglas-de-negocio)
- [Índices y Performance](#índices-y-performance)
- [Migraciones](#migraciones)

---

## 🏗️ Arquitectura

### Concepto: Hub-and-Spoke

```
                     👤 usuarios_base
                         (NÚCLEO)
                             |
         ┌───────────────────┼───────────────────┐
         |                   |                   |
     Aspirante          Estudiante            Docente
         |                   |                   |
    Graduado           Administrativo      Notificaciones
         |                   |                   |
    Carpeta Digital     Certificados         Auditoría
```

**Principios:**
1. **Un documento = Un usuario base** (unicidad por documento)
2. **Múltiples roles simultáneos** (estudiante + docente + graduado)
3. **Evolución temporal** (aspirante → estudiante → graduado)
4. **Trazabilidad completa** (historial de todos los cambios de rol)

---

## 🗺️ Diagrama ER

```
┌─────────────────────┐
│   usuarios_base     │◄──────────────┐
│   (Usuario Persona) │               │
└──────────┬──────────┘               │
           │                          │
           │ 1:N                      │
           │                          │
┌──────────▼───────────────────┐     │
│ usuarios_persona_roles       │     │
│ (Roles Múltiples/Históricos) │     │
└──────────┬───────────────────┘     │
           │                         │
           │ 1:1 (opcional)          │
           │                         │
     ┌─────┴────────┬────────┬──────┴───┬─────────────┐
     │              │        │          │             │
┌────▼───┐   ┌─────▼─┐  ┌──▼──┐  ┌────▼──┐   ┌──────▼──┐
│Aspirantes│ │Estudiantes│ │Docentes│ │Graduados│ │Administrativos│
└──────────┘ └───────────┘ └──────┘ └────────┘ └──────────┘

┌─────────────────────┐       ┌──────────────┐
│ solicitudes_        │       │ notificaciones│
│ enrolamiento        │       └──────────────┘
└─────────────────────┘
        
┌─────────────────────┐       ┌──────────────┐
│ carpeta_digital     │       │ completitud_ │
│                     │       │ perfil       │
└─────────────────────┘       └──────────────┘
```

---

## 📊 Tablas Principales

### `usuarios_base`

**Descripción:** Tabla central - Usuario Persona (núcleo del sistema)

```sql
CREATE TABLE usuarios_base (
  -- Identificador único
  id_usuario CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  -- ==========================================
  -- IDENTIFICACIÓN PERSONAL (OBLIGATORIOS)
  -- ==========================================
  tipo_documento ENUM('CC', 'TI', 'CE', 'PP') NOT NULL,
  numero_documento VARCHAR(20) NOT NULL UNIQUE,
  
  primer_nombre VARCHAR(100) NOT NULL,
  segundo_nombre VARCHAR(100),
  primer_apellido VARCHAR(100) NOT NULL,
  segundo_apellido VARCHAR(100),
  nombre_completo VARCHAR(400) GENERATED ALWAYS AS 
    (CONCAT_WS(' ', primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)) STORED,
  
  -- ==========================================
  -- CONTACTO (OBLIGATORIOS)
  -- ==========================================
  email_personal VARCHAR(255) NOT NULL UNIQUE,
  email_institucional VARCHAR(255) UNIQUE,
  telefono_movil VARCHAR(20) NOT NULL,
  telefono_fijo VARCHAR(20),
  
  -- ==========================================
  -- DATOS PERSONALES COMPLETOS (FASE 2)
  -- ==========================================
  fecha_nacimiento DATE,
  edad INT GENERATED ALWAYS AS (YEAR(CURRENT_DATE) - YEAR(fecha_nacimiento)) STORED,
  genero ENUM('Masculino', 'Femenino', 'Otro', 'Prefiero no decir'),
  estado_civil ENUM('Soltero', 'Casado', 'Unión libre', 'Divorciado', 'Viudo'),
  nacionalidad VARCHAR(100) DEFAULT 'Colombiana',
  lugar_nacimiento VARCHAR(200),
  grupo_sanguineo ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  
  -- ==========================================
  -- DIRECCIÓN Y UBICACIÓN
  -- ==========================================
  direccion_residencia VARCHAR(500),
  ciudad_residencia VARCHAR(100),
  departamento_residencia VARCHAR(100),
  pais_residencia VARCHAR(100) DEFAULT 'Colombia',
  
  -- ==========================================
  -- CONTACTO DE EMERGENCIA
  -- ==========================================
  contacto_emergencia_nombre VARCHAR(200),
  contacto_emergencia_parentesco VARCHAR(50),
  contacto_emergencia_telefono VARCHAR(20),
  
  -- ==========================================
  -- SEGURIDAD Y AUTENTICACIÓN
  -- ==========================================
  password_hash VARCHAR(255) NOT NULL,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP NULL,
  
  -- ==========================================
  -- ESTADO DE CUENTA
  -- ==========================================
  estado_usuario ENUM(
    'pendiente_aprobacion',
    'activo_perfil_incompleto',
    'activo_perfil_completo',
    'inactivo',
    'bloqueado',
    'desactivado'
  ) DEFAULT 'pendiente_aprobacion',
  
  -- ==========================================
  -- COMPLETITUD DE PERFIL
  -- ==========================================
  porcentaje_completitud INT DEFAULT 0,
  ultimo_recordatorio_perfil TIMESTAMP NULL,
  
  -- ==========================================
  -- ACTIVIDAD
  -- ==========================================
  fecha_primer_ingreso TIMESTAMP NULL,
  fecha_ultimo_ingreso TIMESTAMP NULL,
  contador_ingresos INT DEFAULT 0,
  intentos_fallidos_login INT DEFAULT 0,
  bloqueado_hasta TIMESTAMP NULL,
  
  -- ==========================================
  -- ROL PRINCIPAL ACTUAL
  -- ==========================================
  rol_principal ENUM('Aspirante', 'Estudiante', 'Docente', 'Administrativo', 'Graduado'),
  
  -- ==========================================
  -- METADATOS Y AUDITORÍA
  -- ==========================================
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_eliminacion TIMESTAMP NULL,
  creado_por CHAR(36),
  actualizado_por CHAR(36),
  
  -- ==========================================
  -- CONFIGURACIÓN USUARIO
  -- ==========================================
  idioma_preferido ENUM('es', 'en') DEFAULT 'es',
  timezone VARCHAR(50) DEFAULT 'America/Bogota',
  foto_perfil_url VARCHAR(500),
  
  -- ==========================================
  -- ÍNDICES
  -- ==========================================
  INDEX idx_numero_documento (numero_documento),
  INDEX idx_email_personal (email_personal),
  INDEX idx_email_institucional (email_institucional),
  INDEX idx_estado_usuario (estado_usuario),
  INDEX idx_rol_principal (rol_principal),
  INDEX idx_fecha_creacion (fecha_creacion),
  INDEX idx_tipo_documento (tipo_documento, numero_documento),
  
  -- Full-text search
  FULLTEXT INDEX idx_busqueda_nombre (nombre_completo, email_personal),
  
  CONSTRAINT fk_usuarios_creado_por FOREIGN KEY (creado_por) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_usuarios_actualizado_por FOREIGN KEY (actualizado_por) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### `usuarios_persona_roles`

**Descripción:** Gestión de múltiples roles simultáneos con historial completo

```sql
CREATE TABLE usuarios_persona_roles (
  -- Identificador único
  id_rol_usuario CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  -- ==========================================
  -- RELACIÓN CON USUARIO
  -- ==========================================
  id_usuario CHAR(36) NOT NULL,
  
  -- ==========================================
  -- INFORMACIÓN DEL ROL
  -- ==========================================
  tipo_rol ENUM(
    'Aspirante',
    'Estudiante',
    'Docente',
    'Administrativo',
    'Graduado'
  ) NOT NULL,
  
  -- ==========================================
  -- ESTADO DEL ROL
  -- ==========================================
  esta_activo BOOLEAN DEFAULT TRUE,
  es_rol_principal BOOLEAN DEFAULT FALSE,
  
  -- ==========================================
  -- FECHAS Y DURACIÓN
  -- ==========================================
  fecha_activacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_desactivacion TIMESTAMP NULL,
  fecha_expiracion TIMESTAMP NULL,
  
  -- ==========================================
  -- CONTEXTO ADICIONAL (JSON Flexible)
  -- ==========================================
  datos_rol JSON,
  /* Ejemplos:
     Estudiante: {"programa": "Administración Pública", "semestre": 5}
     Docente: {"dedicacion": "Tiempo completo", "area": "Administración"}
     Administrativo: {"cargo": "Coordinador", "dependencia": "Registro"}
  */
  
  -- ==========================================
  -- MOTIVO Y OBSERVACIONES
  -- ==========================================
  motivo_activacion VARCHAR(500),
  motivo_desactivacion VARCHAR(500),
  observaciones TEXT,
  
  -- ==========================================
  -- AUDITORÍA
  -- ==========================================
  activado_por CHAR(36),
  desactivado_por CHAR(36),
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- ==========================================
  -- ÍNDICES
  -- ==========================================
  INDEX idx_id_usuario (id_usuario),
  INDEX idx_tipo_rol (tipo_rol),
  INDEX idx_esta_activo (esta_activo),
  INDEX idx_es_rol_principal (es_rol_principal),
  INDEX idx_fechas (fecha_activacion, fecha_desactivacion),
  INDEX idx_usuario_rol_activo (id_usuario, tipo_rol, esta_activo),
  
  -- Constraint: Solo un rol principal activo por usuario
  UNIQUE KEY uk_un_rol_principal (id_usuario, es_rol_principal) 
    WHERE es_rol_principal = TRUE AND esta_activo = TRUE,
  
  CONSTRAINT fk_roles_usuario FOREIGN KEY (id_usuario) 
    REFERENCES usuarios_base(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_roles_activado_por FOREIGN KEY (activado_por) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_roles_desactivado_por FOREIGN KEY (desactivado_por) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### `usuarios_aspirantes`

**Descripción:** Datos específicos de aspirantes a programas ESAP

```sql
CREATE TABLE usuarios_aspirantes (
  -- Identificador único
  id_aspirante CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_usuario CHAR(36) NOT NULL UNIQUE,
  
  -- ==========================================
  -- ASPIRACIÓN
  -- ==========================================
  programa_interes VARCHAR(200) NOT NULL,
  modalidad_interes ENUM('Presencial', 'Virtual', 'Distancia') NOT NULL,
  sede_interes VARCHAR(100),
  periodo_ingreso_deseado VARCHAR(20),
  fuente_referencia VARCHAR(200),
  
  -- ==========================================
  -- ACADÉMICO PREVIO
  -- ==========================================
  institucion_bachillerato VARCHAR(200),
  ano_graduacion_bachillerato YEAR,
  puntaje_icfes DECIMAL(5,2),
  
  estudios_superiores_previos BOOLEAN DEFAULT FALSE,
  institucion_superior_previa VARCHAR(200),
  programa_superior_previo VARCHAR(200),
  nivel_alcanzado_previo ENUM('Completo', 'Incompleto', 'Cursando'),
  semestres_cursados_previos INT,
  
  -- ==========================================
  -- SOCIOECONÓMICO
  -- ==========================================
  estrato_socioeconomico ENUM('1', '2', '3', '4', '5', '6'),
  pertenece_grupo_etnico BOOLEAN DEFAULT FALSE,
  grupo_etnico VARCHAR(100),
  tiene_discapacidad BOOLEAN DEFAULT FALSE,
  tipo_discapacidad VARCHAR(200),
  victima_conflicto_armado BOOLEAN DEFAULT FALSE,
  requiere_apoyo_financiero BOOLEAN DEFAULT FALSE,
  tipo_apoyo_financiero_requerido VARCHAR(500),
  
  -- ==========================================
  -- DOCUMENTOS
  -- ==========================================
  documento_identidad_url VARCHAR(500),
  foto_3x4_url VARCHAR(500),
  certificado_bachillerato_url VARCHAR(500),
  resultado_icfes_url VARCHAR(500),
  certificado_eps_url VARCHAR(500),
  
  -- ==========================================
  -- ESTADO DEL PROCESO
  -- ==========================================
  estado_aspirante ENUM(
    'Inscrito',
    'Documentos_pendientes',
    'Documentos_completos',
    'Admitido',
    'No_admitido',
    'Matriculado'
  ) DEFAULT 'Inscrito',
  
  fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_decision_admision TIMESTAMP NULL,
  motivo_no_admision TEXT,
  observaciones TEXT,
  
  -- ==========================================
  -- AUDITORÍA
  -- ==========================================
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  creado_por CHAR(36),
  
  INDEX idx_id_usuario (id_usuario),
  INDEX idx_estado_aspirante (estado_aspirante),
  INDEX idx_programa_interes (programa_interes),
  INDEX idx_fecha_inscripcion (fecha_inscripcion),
  
  CONSTRAINT fk_aspirantes_usuario FOREIGN KEY (id_usuario) 
    REFERENCES usuarios_base(id_usuario) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### `usuarios_estudiantes`

**Descripción:** Datos específicos de estudiantes activos

```sql
CREATE TABLE usuarios_estudiantes (
  -- Identificador único
  id_estudiante CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_usuario CHAR(36) NOT NULL,
  
  -- ==========================================
  -- IDENTIFICACIÓN ACADÉMICA
  -- ==========================================
  codigo_estudiante VARCHAR(50) NOT NULL UNIQUE,
  
  -- ==========================================
  -- PROGRAMA ACADÉMICO
  -- ==========================================
  programa_academico VARCHAR(200) NOT NULL,
  nivel_programa ENUM(
    'Técnico',
    'Tecnólogo',
    'Pregrado',
    'Especialización',
    'Maestría',
    'Doctorado'
  ) NOT NULL,
  modalidad ENUM('Presencial', 'Virtual', 'Distancia') NOT NULL,
  jornada ENUM('Diurna', 'Nocturna', 'Fines de semana', 'Flexible'),
  
  -- ==========================================
  -- UBICACIÓN ACADÉMICA
  -- ==========================================
  facultad_escuela VARCHAR(200),
  sede VARCHAR(100) NOT NULL,
  ciudad VARCHAR(100),
  
  -- ==========================================
  -- ESTADO ACADÉMICO
  -- ==========================================
  estado_academico ENUM(
    'Activo',
    'Inactivo_temporal',
    'Aplazado',
    'Egresado_pendiente_grado',
    'Graduado',
    'Retirado',
    'Expulsado'
  ) DEFAULT 'Activo',
  
  -- ==========================================
  -- FECHAS ACADÉMICAS
  -- ==========================================
  fecha_ingreso DATE NOT NULL,
  periodo_ingreso VARCHAR(20),
  fecha_egreso DATE,
  fecha_graduacion DATE,
  duracion_programa_semestres INT,
  
  -- ==========================================
  -- PROGRESO ACADÉMICO
  -- ==========================================
  semestre_actual INT,
  creditos_totales_programa INT,
  creditos_aprobados INT DEFAULT 0,
  creditos_pendientes INT,
  promedio_acumulado DECIMAL(3,2) DEFAULT 0.00,
  
  -- ==========================================
  -- FINANCIERO
  -- ==========================================
  estado_financiero ENUM('Paz_y_salvo', 'Deuda_pendiente') DEFAULT 'Paz_y_salvo',
  tiene_beca BOOLEAN DEFAULT FALSE,
  tipo_beca VARCHAR(100),
  porcentaje_beca DECIMAL(5,2),
  
  -- ==========================================
  -- MATRÍCULA
  -- ==========================================
  esta_matriculado_periodo_actual BOOLEAN DEFAULT FALSE,
  periodo_academico_actual VARCHAR(20),
  fecha_ultima_matricula DATE,
  valor_matricula_actual DECIMAL(15,2),
  fecha_vencimiento_matricula DATE,
  
  -- ==========================================
  -- OBSERVACIONES Y ALERTAS
  -- ==========================================
  observaciones_academicas TEXT,
  alertas_academicas JSON,
  /* Ejemplos:
     {"tipo": "bajo_rendimiento", "promedio": 2.8, "fecha": "2025-10-15"}
     {"tipo": "riesgo_desercion", "motivo": "inasistencias", "fecha": "2025-11-01"}
  */
  
  -- ==========================================
  -- AUDITORÍA
  -- ==========================================
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  creado_por CHAR(36),
  
  INDEX idx_id_usuario (id_usuario),
  INDEX idx_codigo_estudiante (codigo_estudiante),
  INDEX idx_estado_academico (estado_academico),
  INDEX idx_programa (programa_academico),
  INDEX idx_sede (sede),
  INDEX idx_estado_financiero (estado_financiero),
  INDEX idx_semestre_actual (semestre_actual),
  
  CONSTRAINT fk_estudiantes_usuario FOREIGN KEY (id_usuario) 
    REFERENCES usuarios_base(id_usuario) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### `usuarios_docentes`

**Descripción:** Datos específicos de docentes

```sql
CREATE TABLE usuarios_docentes (
  -- Identificador único
  id_docente CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_usuario CHAR(36) NOT NULL,
  
  -- ==========================================
  -- IDENTIFICACIÓN LABORAL
  -- ==========================================
  codigo_docente VARCHAR(50) NOT NULL UNIQUE,
  
  -- ==========================================
  -- INFORMACIÓN LABORAL
  -- ==========================================
  tipo_vinculacion ENUM(
    'Planta',
    'Cátedra',
    'Ocasional',
    'Temporal'
  ) NOT NULL,
  tipo_contrato ENUM(
    'Término_indefinido',
    'Término_fijo',
    'OPS',
    'Prestación_servicios'
  ) NOT NULL,
  fecha_vinculacion DATE NOT NULL,
  fecha_finalizacion_contrato DATE,
  
  dedicacion ENUM(
    'Tiempo_completo',
    'Medio_tiempo',
    'Hora_cátedra'
  ) NOT NULL,
  
  -- ==========================================
  -- CATEGORIZACIÓN ACADÉMICA
  -- ==========================================
  categoria_docente ENUM(
    'Auxiliar',
    'Asistente',
    'Asociado',
    'Titular'
  ),
  escalafon_docente VARCHAR(50),
  
  -- ==========================================
  -- UBICACIÓN LABORAL
  -- ==========================================
  sede_principal VARCHAR(100) NOT NULL,
  facultad_escuela VARCHAR(200),
  departamento_area VARCHAR(200),
  oficina VARCHAR(50),
  extension_telefonica VARCHAR(20),
  
  -- ==========================================
  -- FORMACIÓN ACADÉMICA
  -- ==========================================
  nivel_educativo_maximo ENUM(
    'Pregrado',
    'Especialización',
    'Maestría',
    'Doctorado',
    'Postdoctorado'
  ) NOT NULL,
  titulo_profesional VARCHAR(200) NOT NULL,
  institucion_titulo_profesional VARCHAR(200),
  ano_grado_profesional YEAR,
  
  titulo_postgrado_1 VARCHAR(200),
  institucion_postgrado_1 VARCHAR(200),
  ano_postgrado_1 YEAR,
  
  titulo_postgrado_2 VARCHAR(200),
  institucion_postgrado_2 VARCHAR(200),
  ano_postgrado_2 YEAR,
  
  -- ==========================================
  -- EXPERIENCIA
  -- ==========================================
  anos_experiencia_docente_total INT DEFAULT 0,
  anos_experiencia_esap INT DEFAULT 0,
  areas_especializacion TEXT,
  lineas_investigacion TEXT,
  
  -- ==========================================
  -- INVESTIGACIÓN
  -- ==========================================
  pertenece_grupo_investigacion BOOLEAN DEFAULT FALSE,
  nombre_grupo_investigacion VARCHAR(200),
  categoria_grupo_minciencias VARCHAR(50),
  orcid_id VARCHAR(100),
  google_scholar_id VARCHAR(100),
  cvlac_colciencias_id VARCHAR(100),
  
  es_par_academico BOOLEAN DEFAULT FALSE,
  tiene_certificaciones_especiales BOOLEAN DEFAULT FALSE,
  certificaciones_especiales TEXT,
  
  -- ==========================================
  -- CARGA ACADÉMICA
  -- ==========================================
  horas_docencia_semana INT DEFAULT 0,
  horas_investigacion_semana INT DEFAULT 0,
  horas_administrativas_semana INT DEFAULT 0,
  total_horas_semana INT GENERATED ALWAYS AS 
    (horas_docencia_semana + horas_investigacion_semana + horas_administrativas_semana) STORED,
  
  -- ==========================================
  -- DOCUMENTOS
  -- ==========================================
  hoja_vida_url VARCHAR(500),
  titulos_profesionales_url VARCHAR(500),
  certificados_experiencia_url VARCHAR(500),
  certificado_seguridad_social_url VARCHAR(500),
  contrato_laboral_url VARCHAR(500),
  
  -- ==========================================
  -- EVALUACIÓN
  -- ==========================================
  evaluacion_docente_promedio DECIMAL(3,2),
  fecha_ultima_evaluacion DATE,
  
  -- ==========================================
  -- ESTADO
  -- ==========================================
  estado_laboral ENUM(
    'Activo',
    'Licencia',
    'Suspendido',
    'Retirado'
  ) DEFAULT 'Activo',
  
  -- ==========================================
  -- AUDITORÍA
  -- ==========================================
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  creado_por CHAR(36),
  
  INDEX idx_id_usuario (id_usuario),
  INDEX idx_codigo_docente (codigo_docente),
  INDEX idx_tipo_vinculacion (tipo_vinculacion),
  INDEX idx_sede_principal (sede_principal),
  INDEX idx_estado_laboral (estado_laboral),
  INDEX idx_categoria_docente (categoria_docente),
  
  CONSTRAINT fk_docentes_usuario FOREIGN KEY (id_usuario) 
    REFERENCES usuarios_base(id_usuario) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### `usuarios_administrativos`

**Descripción:** Datos específicos de personal administrativo

```sql
CREATE TABLE usuarios_administrativos (
  -- Identificador único
  id_administrativo CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_usuario CHAR(36) NOT NULL,
  
  -- ==========================================
  -- IDENTIFICACIÓN LABORAL
  -- ==========================================
  codigo_empleado VARCHAR(50) NOT NULL UNIQUE,
  
  -- ==========================================
  -- INFORMACIÓN LABORAL
  -- ==========================================
  cargo_actual VARCHAR(200) NOT NULL,
  dependencia_area VARCHAR(200) NOT NULL,
  tipo_vinculacion ENUM(
    'Planta',
    'Provisional',
    'Contratista',
    'OPS'
  ) NOT NULL,
  tipo_contrato ENUM(
    'Término_indefinido',
    'Término_fijo',
    'OPS',
    'Prestación_servicios'
  ) NOT NULL,
  fecha_vinculacion DATE NOT NULL,
  fecha_finalizacion_contrato DATE,
  
  -- ==========================================
  -- JERARQUÍA
  -- ==========================================
  jefe_directo_id CHAR(36),
  sede_trabajo VARCHAR(100) NOT NULL,
  nivel_jerarquico ENUM(
    'Operativo',
    'Coordinador',
    'Jefe',
    'Director',
    'Decano',
    'Vicerrector',
    'Rector'
  ) NOT NULL,
  
  -- ==========================================
  -- EDUCATIVO
  -- ==========================================
  nivel_educativo ENUM(
    'Bachiller',
    'Técnico',
    'Tecnólogo',
    'Profesional',
    'Especialista',
    'Magíster',
    'Doctor'
  ) NOT NULL,
  titulo_profesional VARCHAR(200),
  institucion_educativa VARCHAR(200),
  ano_grado YEAR,
  
  -- ==========================================
  -- PERMISOS ESPECIALES DEL SISTEMA
  -- ==========================================
  puede_crear_usuarios BOOLEAN DEFAULT FALSE,
  puede_aprobar_solicitudes BOOLEAN DEFAULT FALSE,
  tipos_solicitudes_que_aprueba JSON,
  /* Ejemplos:
     ["certificados", "becas", "traslados"]
  */
  
  tiene_acceso_reportes BOOLEAN DEFAULT FALSE,
  nivel_acceso_reportes ENUM('Básico', 'Intermedio', 'Avanzado', 'Total'),
  
  puede_modificar_configuraciones BOOLEAN DEFAULT FALSE,
  modulos_backoffice_acceso JSON,
  /* Ejemplos:
     ["usuarios", "graduados", "certificados", "reportes"]
  */
  
  -- ==========================================
  -- INFORMACIÓN ADMINISTRATIVA
  -- ==========================================
  horario_laboral VARCHAR(100),
  dias_laborales VARCHAR(100),
  atiende_publico BOOLEAN DEFAULT FALSE,
  extension_telefonica VARCHAR(20),
  email_corporativo VARCHAR(255),
  oficina VARCHAR(50),
  
  -- ==========================================
  -- DOCUMENTOS
  -- ==========================================
  contrato_laboral_url VARCHAR(500),
  certificado_seguridad_social_url VARCHAR(500),
  examen_medico_ingreso_url VARCHAR(500),
  declaracion_bienes_url VARCHAR(500),
  certificado_antecedentes_url VARCHAR(500),
  hoja_vida_url VARCHAR(500),
  
  -- ==========================================
  -- ESTADO
  -- ==========================================
  estado_laboral ENUM(
    'Activo',
    'Vacaciones',
    'Licencia',
    'Suspendido',
    'Retirado'
  ) DEFAULT 'Activo',
  
  -- ==========================================
  -- AUDITORÍA
  -- ==========================================
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  creado_por CHAR(36),
  
  INDEX idx_id_usuario (id_usuario),
  INDEX idx_codigo_empleado (codigo_empleado),
  INDEX idx_cargo (cargo_actual),
  INDEX idx_dependencia (dependencia_area),
  INDEX idx_jefe_directo (jefe_directo_id),
  INDEX idx_estado_laboral (estado_laboral),
  INDEX idx_puede_crear_usuarios (puede_crear_usuarios),
  INDEX idx_puede_aprobar_solicitudes (puede_aprobar_solicitudes),
  
  CONSTRAINT fk_administrativos_usuario FOREIGN KEY (id_usuario) 
    REFERENCES usuarios_base(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_administrativos_jefe FOREIGN KEY (jefe_directo_id) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### `usuarios_graduados`

**Descripción:** Datos específicos de graduados (hereda de estudiante)

```sql
CREATE TABLE usuarios_graduados (
  -- Identificador único
  id_graduado CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_usuario CHAR(36) NOT NULL,
  id_estudiante CHAR(36) NOT NULL, -- Del programa del que se graduó
  
  -- ==========================================
  -- INFORMACIÓN DE GRADO
  -- ==========================================
  fecha_grado DATE NOT NULL,
  titulo_obtenido VARCHAR(200) NOT NULL,
  programa_graduado VARCHAR(200) NOT NULL,
  nivel_programa ENUM(
    'Técnico',
    'Tecnólogo',
    'Pregrado',
    'Especialización',
    'Maestría',
    'Doctorado'
  ) NOT NULL,
  
  modalidad_grado ENUM(
    'Trabajo_de_grado',
    'Práctica',
    'Examen',
    'Cursos_postgrado',
    'Otro'
  ),
  
  distincion ENUM(
    'Ninguna',
    'Cum_laude',
    'Magna_cum_laude',
    'Summa_cum_laude'
  ) DEFAULT 'Ninguna',
  
  -- ==========================================
  -- DOCUMENTACIÓN DE GRADO
  -- ==========================================
  numero_acta_grado VARCHAR(100),
  numero_diploma VARCHAR(100),
  promedio_final DECIMAL(3,2),
  
  acta_grado_url VARCHAR(500),
  diploma_pdf_url VARCHAR(500),
  certificado_paz_y_salvo_total_url VARCHAR(500),
  
  -- ==========================================
  -- SITUACIÓN PROFESIONAL ACTUAL
  -- ==========================================
  esta_trabajando BOOLEAN DEFAULT FALSE,
  empresa_entidad_actual VARCHAR(200),
  cargo_actual VARCHAR(200),
  sector_actual ENUM(
    'Público',
    'Privado',
    'Independiente',
    'ONG',
    'Desempleado',
    'Estudiando'
  ),
  area_desempeno VARCHAR(200),
  
  salario_rango ENUM(
    'Menos_de_2_SMMLV',
    'Entre_2_y_4_SMMLV',
    'Entre_4_y_6_SMMLV',
    'Entre_6_y_10_SMMLV',
    'Más_de_10_SMMLV',
    'Prefiero_no_decir'
  ),
  
  trabajo_relacionado_carrera BOOLEAN,
  tiempo_conseguir_empleo_meses INT,
  ciudad_trabajo VARCHAR(100),
  
  -- ==========================================
  -- EDUCACIÓN CONTINUA
  -- ==========================================
  ha_tomado_cursos_esap BOOLEAN DEFAULT FALSE,
  cursos_tomados JSON,
  
  esta_cursando_otro_programa_esap BOOLEAN DEFAULT FALSE,
  programa_actual_esap VARCHAR(200),
  
  tiene_interes_postgrado BOOLEAN DEFAULT FALSE,
  postgrado_interes VARCHAR(200),
  
  -- ==========================================
  -- VINCULACIÓN CON ESAP
  -- ==========================================
  participa_red_egresados BOOLEAN DEFAULT FALSE,
  fecha_inscripcion_red_egresados DATE,
  
  ha_asistido_eventos_egresados BOOLEAN DEFAULT FALSE,
  numero_eventos_asistidos INT DEFAULT 0,
  
  esta_disponible_como_mentor BOOLEAN DEFAULT FALSE,
  areas_mentoria TEXT,
  
  autoriza_contacto_encuestas BOOLEAN DEFAULT TRUE,
  frecuencia_encuestas_preferida ENUM(
    'Mensual',
    'Trimestral',
    'Semestral',
    'Anual',
    'No_deseo_encuestas'
  ) DEFAULT 'Semestral',
  
  -- ==========================================
  -- RECONOCIMIENTOS Y LOGROS
  -- ==========================================
  reconocimientos_laborales TEXT,
  publicaciones_academicas TEXT,
  premios_distinciones TEXT,
  
  -- ==========================================
  -- AUDITORÍA
  -- ==========================================
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  creado_por CHAR(36),
  
  INDEX idx_id_usuario (id_usuario),
  INDEX idx_id_estudiante (id_estudiante),
  INDEX idx_fecha_grado (fecha_grado),
  INDEX idx_programa_graduado (programa_graduado),
  INDEX idx_esta_trabajando (esta_trabajando),
  INDEX idx_sector_actual (sector_actual),
  INDEX idx_participa_red (participa_red_egresados),
  
  CONSTRAINT fk_graduados_usuario FOREIGN KEY (id_usuario) 
    REFERENCES usuarios_base(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_graduados_estudiante FOREIGN KEY (id_estudiante) 
    REFERENCES usuarios_estudiantes(id_estudiante) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 📦 Tablas de Soporte

### `solicitudes_enrolamiento`

**Descripción:** Solicitudes de registro mediante QR o formulario web

```sql
CREATE TABLE solicitudes_enrolamiento (
  -- Identificador único
  id_solicitud CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  -- ==========================================
  -- DATOS DEL SOLICITANTE
  -- ==========================================
  tipo_documento ENUM('CC', 'TI', 'CE', 'PP') NOT NULL,
  numero_documento VARCHAR(20) NOT NULL,
  
  nombres VARCHAR(200) NOT NULL,
  apellidos VARCHAR(200) NOT NULL,
  email_personal VARCHAR(255) NOT NULL,
  telefono_movil VARCHAR(20) NOT NULL,
  
  -- ==========================================
  -- CONTRASEÑA (hash temporal)
  -- ==========================================
  password_hash VARCHAR(255) NOT NULL,
  
  -- ==========================================
  -- ORIGEN DE LA SOLICITUD
  -- ==========================================
  origen_solicitud ENUM(
    'QR_General',
    'QR_Aspirantes',
    'QR_Docentes',
    'QR_Administrativos',
    'Web_Publica',
    'Admin_Manual'
  ) NOT NULL,
  
  codigo_qr_escaneado VARCHAR(100),
  url_origen VARCHAR(500),
  ip_solicitud VARCHAR(45),
  user_agent TEXT,
  
  -- ==========================================
  -- VALIDACIÓN
  -- ==========================================
  validado_en_bd_esap BOOLEAN DEFAULT FALSE,
  tipo_usuario_detectado ENUM(
    'Aspirante',
    'Estudiante',
    'Docente',
    'Administrativo',
    'Graduado',
    'No_encontrado'
  ),
  datos_encontrados_bd JSON,
  
  -- ==========================================
  -- ESTADO DE LA SOLICITUD
  -- ==========================================
  estado_solicitud ENUM(
    'Pendiente',
    'En_revisión',
    'Aprobada',
    'Rechazada',
    'Expirada'
  ) DEFAULT 'Pendiente',
  
  -- ==========================================
  -- PROCESAMIENTO
  -- ==========================================
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_revision TIMESTAMP NULL,
  fecha_decision TIMESTAMP NULL,
  fecha_expiracion TIMESTAMP NULL,
  
  revisado_por CHAR(36),
  decidido_por CHAR(36),
  
  motivo_rechazo TEXT,
  observaciones_revision TEXT,
  
  -- ==========================================
  -- RESULTADO
  -- ==========================================
  id_usuario_creado CHAR(36),
  
  -- ==========================================
  -- NOTIFICACIONES
  -- ==========================================
  email_confirmacion_enviado BOOLEAN DEFAULT FALSE,
  email_decision_enviado BOOLEAN DEFAULT FALSE,
  sms_enviado BOOLEAN DEFAULT FALSE,
  
  INDEX idx_numero_documento (numero_documento),
  INDEX idx_email_personal (email_personal),
  INDEX idx_estado_solicitud (estado_solicitud),
  INDEX idx_fecha_solicitud (fecha_solicitud),
  INDEX idx_tipo_usuario_detectado (tipo_usuario_detectado),
  INDEX idx_revisado_por (revisado_por),
  
  CONSTRAINT fk_solicitudes_revisado_por FOREIGN KEY (revisado_por) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_solicitudes_decidido_por FOREIGN KEY (decidido_por) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_solicitudes_usuario_creado FOREIGN KEY (id_usuario_creado) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### `notificaciones`

**Descripción:** Sistema de notificaciones dual (in-app + email)

```sql
CREATE TABLE notificaciones (
  -- Identificador único
  id_notificacion CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  -- ==========================================
  -- DESTINATARIO
  -- ==========================================
  id_usuario_destinatario CHAR(36) NOT NULL,
  
  -- ==========================================
  -- CONTENIDO
  -- ==========================================
  tipo_notificacion ENUM(
    -- Enrolamiento
    'solicitud_recibida',
    'cuenta_aprobada',
    'cuenta_rechazada',
    -- Perfil
    'perfil_incompleto',
    'documento_aprobado',
    'documento_rechazado',
    'perfil_completo',
    -- Roles
    'nuevo_rol_activado',
    'rol_desactivado',
    'nuevos_permisos',
    -- Académico
    'nueva_calificacion',
    'horario_publicado',
    'certificado_listo',
    'matricula_por_vencer',
    'inscripcion_abierta',
    -- Financiero
    'pago_procesado',
    'pago_pendiente',
    'beca_aprobada',
    -- Administrativo
    'solicitud_aprobada',
    'solicitud_rechazada',
    'solicitud_pendiente',
    -- Sistema
    'cambio_contrasena',
    'inicio_sesion_inusual',
    'mantenimiento_programado',
    'actualizacion_terminos'
  ) NOT NULL,
  
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  descripcion_corta VARCHAR(500),
  
  -- ==========================================
  -- ACCIÓN
  -- ==========================================
  tiene_accion BOOLEAN DEFAULT FALSE,
  texto_boton_accion VARCHAR(100),
  url_accion VARCHAR(500),
  
  -- ==========================================
  -- METADATOS
  -- ==========================================
  icono VARCHAR(50) DEFAULT 'Bell',
  color VARCHAR(7) DEFAULT '#1e5da8',
  prioridad ENUM('Baja', 'Media', 'Alta', 'Crítica') DEFAULT 'Media',
  categoria VARCHAR(50),
  
  datos_adicionales JSON,
  
  -- ==========================================
  -- ESTADO IN-APP
  -- ==========================================
  leida BOOLEAN DEFAULT FALSE,
  fecha_lectura TIMESTAMP NULL,
  
  archivada BOOLEAN DEFAULT FALSE,
  fecha_archivado TIMESTAMP NULL,
  
  -- ==========================================
  -- ESTADO EMAIL
  -- ==========================================
  email_enviado BOOLEAN DEFAULT FALSE,
  email_entregado BOOLEAN DEFAULT FALSE,
  email_abierto BOOLEAN DEFAULT FALSE,
  email_click BOOLEAN DEFAULT FALSE,
  
  fecha_envio_email TIMESTAMP NULL,
  fecha_apertura_email TIMESTAMP NULL,
  
  -- ==========================================
  -- TIMESTAMPS
  -- ==========================================
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion TIMESTAMP NULL,
  
  -- ==========================================
  -- EMISOR
  -- ==========================================
  creado_por CHAR(36),
  sistema_automatico BOOLEAN DEFAULT TRUE,
  
  INDEX idx_destinatario (id_usuario_destinatario),
  INDEX idx_tipo (tipo_notificacion),
  INDEX idx_leida (leida),
  INDEX idx_prioridad (prioridad),
  INDEX idx_fecha_creacion (fecha_creacion),
  INDEX idx_destinatario_leida (id_usuario_destinatario, leida),
  INDEX idx_destinatario_fecha (id_usuario_destinatario, fecha_creacion DESC),
  
  CONSTRAINT fk_notificaciones_destinatario FOREIGN KEY (id_usuario_destinatario) 
    REFERENCES usuarios_base(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_notificaciones_creador FOREIGN KEY (creado_por) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### `carpeta_digital`

**Descripción:** Documentos digitales del usuario (certificados, diplomas, etc.)

```sql
CREATE TABLE carpeta_digital (
  -- Identificador único
  id_documento CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_usuario CHAR(36) NOT NULL,
  
  -- ==========================================
  -- TIPO DE DOCUMENTO
  -- ==========================================
  tipo_documento ENUM(
    'Certificado_notas',
    'Certificado_estudio',
    'Diploma',
    'Acta_grado',
    'Paz_y_salvo',
    'Constancia',
    'Carnet',
    'Otro'
  ) NOT NULL,
  
  -- ==========================================
  -- INFORMACIÓN DEL DOCUMENTO
  -- ==========================================
  nombre_documento VARCHAR(200) NOT NULL,
  descripcion TEXT,
  numero_documento VARCHAR(100) UNIQUE,
  
  -- ==========================================
  -- ARCHIVO
  -- ==========================================
  url_archivo VARCHAR(500) NOT NULL,
  tamano_archivo_bytes INT,
  tipo_mime VARCHAR(100),
  hash_archivo VARCHAR(255), -- Para verificar integridad
  
  -- ==========================================
  -- METADATOS
  -- ==========================================
  fecha_emision DATE,
  fecha_vencimiento DATE,
  vigencia_permanente BOOLEAN DEFAULT FALSE,
  
  -- ==========================================
  -- VERIFICACIÓN
  -- ==========================================
  codigo_verificacion VARCHAR(50) UNIQUE,
  url_verificacion_publica VARCHAR(500),
  verificable_publicamente BOOLEAN DEFAULT TRUE,
  contador_verificaciones INT DEFAULT 0,
  
  -- ==========================================
  -- ESTADO
  -- ==========================================
  estado_documento ENUM(
    'Activo',
    'Revocado',
    'Expirado',
    'Suspendido'
  ) DEFAULT 'Activo',
  
  motivo_revocacion TEXT,
  fecha_revocacion TIMESTAMP NULL,
  revocado_por CHAR(36),
  
  -- ==========================================
  -- AUDITORÍA
  -- ==========================================
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  creado_por CHAR(36),
  
  INDEX idx_id_usuario (id_usuario),
  INDEX idx_tipo_documento (tipo_documento),
  INDEX idx_codigo_verificacion (codigo_verificacion),
  INDEX idx_estado_documento (estado_documento),
  INDEX idx_fecha_emision (fecha_emision),
  INDEX idx_fecha_vencimiento (fecha_vencimiento),
  
  CONSTRAINT fk_carpeta_usuario FOREIGN KEY (id_usuario) 
    REFERENCES usuarios_base(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_carpeta_creado_por FOREIGN KEY (creado_por) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_carpeta_revocado_por FOREIGN KEY (revocado_por) 
    REFERENCES usuarios_base(id_usuario) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### `completitud_perfil`

**Descripción:** Tracking detallado de completitud de perfil por usuario

```sql
CREATE TABLE completitud_perfil (
  -- Identificador único
  id_completitud CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_usuario CHAR(36) NOT NULL UNIQUE,
  
  -- ==========================================
  -- PORCENTAJES POR SECCIÓN
  -- ==========================================
  porcentaje_total INT DEFAULT 0,
  
  porcentaje_datos_basicos INT DEFAULT 0,
  porcentaje_datos_personales INT DEFAULT 0,
  porcentaje_datos_contacto INT DEFAULT 0,
  porcentaje_datos_rol INT DEFAULT 0,
  porcentaje_documentos INT DEFAULT 0,
  
  -- ==========================================
  -- CAMPOS COMPLETADOS
  -- ==========================================
  campos_obligatorios_totales INT,
  campos_obligatorios_completados INT DEFAULT 0,
  
  campos_importantes_totales INT,
  campos_importantes_completados INT DEFAULT 0,
  
  campos_opcionales_totales INT,
  campos_opcionales_completados INT DEFAULT 0,
  
  -- ==========================================
  -- DOCUMENTOS
  -- ==========================================
  documentos_requeridos_totales INT,
  documentos_subidos INT DEFAULT 0,
  documentos_aprobados INT DEFAULT 0,
  documentos_rechazados INT DEFAULT 0,
  documentos_pendientes INT DEFAULT 0,
  
  -- ==========================================
  -- SEGUIMIENTO
  -- ==========================================
  fecha_ultimo_cambio TIMESTAMP NULL,
  fecha_primera_completitud_100 TIMESTAMP NULL,
  
  numero_recordatorios_enviados INT DEFAULT 0,
  fecha_ultimo_recordatorio TIMESTAMP NULL,
  
  -- ==========================================
  -- DESGLOSE DETALLADO (JSON)
  -- ==========================================
  campos_faltantes JSON,
  /* Ejemplo:
     {
       "obligatorios": ["fecha_nacimiento", "direccion"],
       "importantes": ["contacto_emergencia"],
       "documentos": ["cedula", "foto"]
     }
  */
  
  historial_cambios JSON,
  /* Ejemplo:
     [
       {"fecha": "2025-11-15", "porcentaje": 20, "campos_completados": ["email", "telefono"]},
       {"fecha": "2025-11-16", "porcentaje": 45, "campos_completados": ["direccion", "fecha_nacimiento"]}
     ]
  */
  
  -- ==========================================
  -- AUDITORÍA
  -- ==========================================
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_id_usuario (id_usuario),
  INDEX idx_porcentaje_total (porcentaje_total),
  INDEX idx_fecha_actualizacion (fecha_actualizacion),
  
  CONSTRAINT fk_completitud_usuario FOREIGN KEY (id_usuario) 
    REFERENCES usuarios_base(id_usuario) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🔐 Reglas de Negocio

### 1. Unicidad de Documentos

```sql
-- Constraint: Un documento solo puede estar asociado a un usuario
CREATE UNIQUE INDEX idx_unique_documento 
  ON usuarios_base(tipo_documento, numero_documento) 
  WHERE fecha_eliminacion IS NULL;
```

### 2. Email Institucional Único

```sql
-- Trigger: Generar email institucional automáticamente
DELIMITER $$

CREATE TRIGGER generar_email_institucional
BEFORE INSERT ON usuarios_base
FOR EACH ROW
BEGIN
  DECLARE base_email VARCHAR(255);
  DECLARE counter INT DEFAULT 1;
  DECLARE final_email VARCHAR(255);
  
  -- Generar base: primer_nombre.primer_apellido
  SET base_email = CONCAT(
    LOWER(REPLACE(NEW.primer_nombre, ' ', '')),
    '.',
    LOWER(REPLACE(NEW.primer_apellido, ' ', ''))
  );
  
  SET final_email = CONCAT(base_email, '@esap.edu.co');
  
  -- Verificar si existe, agregar número si es necesario
  WHILE EXISTS(SELECT 1 FROM usuarios_base WHERE email_institucional = final_email) DO
    SET counter = counter + 1;
    SET final_email = CONCAT(base_email, counter, '@esap.edu.co');
  END WHILE;
  
  SET NEW.email_institucional = final_email;
END$$

DELIMITER ;
```

### 3. Completitud de Perfil Automática

```sql
-- Trigger: Actualizar porcentaje de completitud
DELIMITER $$

CREATE TRIGGER actualizar_completitud_perfil
AFTER UPDATE ON usuarios_base
FOR EACH ROW
BEGIN
  DECLARE porcentaje INT;
  DECLARE campos_completados INT DEFAULT 0;
  DECLARE campos_totales INT DEFAULT 20; -- Ajustar según campos obligatorios
  
  -- Contar campos completados
  IF NEW.primer_nombre IS NOT NULL THEN SET campos_completados = campos_completados + 1; END IF;
  IF NEW.segundo_nombre IS NOT NULL THEN SET campos_completados = campos_completados + 1; END IF;
  IF NEW.primer_apellido IS NOT NULL THEN SET campos_completados = campos_completados + 1; END IF;
  -- ... más campos ...
  
  -- Calcular porcentaje
  SET porcentaje = (campos_completados * 100) / campos_totales;
  
  -- Actualizar en usuarios_base
  UPDATE usuarios_base 
  SET porcentaje_completitud = porcentaje 
  WHERE id_usuario = NEW.id_usuario;
  
  -- Actualizar tabla de completitud detallada
  UPDATE completitud_perfil 
  SET 
    porcentaje_total = porcentaje,
    fecha_ultimo_cambio = CURRENT_TIMESTAMP
  WHERE id_usuario = NEW.id_usuario;
END$$

DELIMITER ;
```

### 4. Notificación Automática

```sql
-- Trigger: Crear notificación al aprobar solicitud
DELIMITER $$

CREATE TRIGGER notificar_aprobacion_solicitud
AFTER UPDATE ON solicitudes_enrolamiento
FOR EACH ROW
BEGIN
  IF NEW.estado_solicitud = 'Aprobada' AND OLD.estado_solicitud != 'Aprobada' THEN
    INSERT INTO notificaciones (
      id_notificacion,
      id_usuario_destinatario,
      tipo_notificacion,
      titulo,
      mensaje,
      prioridad,
      sistema_automatico
    ) VALUES (
      UUID(),
      NEW.id_usuario_creado,
      'cuenta_aprobada',
      '¡Tu cuenta ESAP ha sido aprobada!',
      CONCAT('Tu solicitud de enrolamiento ha sido aprobada. Usuario: ', 
        (SELECT email_institucional FROM usuarios_base WHERE id_usuario = NEW.id_usuario_creado)),
      'Alta',
      TRUE
    );
  END IF;
END$$

DELIMITER ;
```

---

## 🚀 Índices y Performance

### Índices Compuestos Críticos

```sql
-- Para búsquedas de usuarios activos
CREATE INDEX idx_usuarios_estado_rol 
  ON usuarios_base(estado_usuario, rol_principal, fecha_creacion DESC);

-- Para roles activos de usuario
CREATE INDEX idx_roles_usuario_activos 
  ON usuarios_persona_roles(id_usuario, esta_activo, tipo_rol);

-- Para notificaciones no leídas
CREATE INDEX idx_notificaciones_pendientes 
  ON notificaciones(id_usuario_destinatario, leida, fecha_creacion DESC)
  WHERE leida = FALSE AND archivada = FALSE;

-- Para solicitudes pendientes
CREATE INDEX idx_solicitudes_pendientes 
  ON solicitudes_enrolamiento(estado_solicitud, fecha_solicitud DESC)
  WHERE estado_solicitud IN ('Pendiente', 'En_revisión');

-- Para carpeta digital activa
CREATE INDEX idx_carpeta_activa 
  ON carpeta_digital(id_usuario, tipo_documento, estado_documento)
  WHERE estado_documento = 'Activo';
```

### Full-Text Search

```sql
-- Búsqueda de usuarios por nombre/email
ALTER TABLE usuarios_base 
  ADD FULLTEXT INDEX idx_busqueda_usuarios (
    nombre_completo, 
    email_personal, 
    email_institucional
  );

-- Uso:
SELECT * FROM usuarios_base 
WHERE MATCH(nombre_completo, email_personal) 
AGAINST('Juan Pérez' IN NATURAL LANGUAGE MODE);
```

### Particionamiento (Para tablas grandes)

```sql
-- Particionar notificaciones por mes
ALTER TABLE notificaciones 
PARTITION BY RANGE (YEAR(fecha_creacion) * 100 + MONTH(fecha_creacion)) (
  PARTITION p202511 VALUES LESS THAN (202512),
  PARTITION p202512 VALUES LESS THAN (202601),
  PARTITION p202601 VALUES LESS THAN (202602),
  -- ... más particiones
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Particionar audit logs por trimestre
ALTER TABLE audit_logs 
PARTITION BY RANGE (YEAR(timestamp) * 10 + QUARTER(timestamp)) (
  PARTITION p20254 VALUES LESS THAN (20261),
  PARTITION p20261 VALUES LESS THAN (20262),
  -- ... más particiones
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

---

## 📦 Migraciones

### Orden de Creación

1. `usuarios_base` (sin FK circulares)
2. `usuarios_persona_roles`
3. `usuarios_aspirantes`
4. `usuarios_estudiantes`
5. `usuarios_docentes`
6. `usuarios_administrativos`
7. `usuarios_graduados`
8. `solicitudes_enrolamiento`
9. `notificaciones`
10. `carpeta_digital`
11. `completitud_perfil`
12. Agregar FK circulares en `usuarios_base` (creado_por, actualizado_por)
13. Crear triggers
14. Crear índices adicionales

### Script de Migración Completo

```bash
# migrations/001_create_usuario_persona_schema.sh

#!/bin/bash

mysql -u root -p esap_db <<EOF

-- 1. Crear usuarios_base
SOURCE migrations/tables/001_usuarios_base.sql;

-- 2. Crear tablas dependientes
SOURCE migrations/tables/002_usuarios_persona_roles.sql;
SOURCE migrations/tables/003_usuarios_aspirantes.sql;
SOURCE migrations/tables/004_usuarios_estudiantes.sql;
SOURCE migrations/tables/005_usuarios_docentes.sql;
SOURCE migrations/tables/006_usuarios_administrativos.sql;
SOURCE migrations/tables/007_usuarios_graduados.sql;

-- 3. Crear tablas de soporte
SOURCE migrations/tables/008_solicitudes_enrolamiento.sql;
SOURCE migrations/tables/009_notificaciones.sql;
SOURCE migrations/tables/010_carpeta_digital.sql;
SOURCE migrations/tables/011_completitud_perfil.sql;

-- 4. Crear triggers
SOURCE migrations/triggers/001_generar_email_institucional.sql;
SOURCE migrations/triggers/002_actualizar_completitud_perfil.sql;
SOURCE migrations/triggers/003_notificar_aprobacion_solicitud.sql;

-- 5. Crear índices adicionales
SOURCE migrations/indexes/001_indices_compuestos.sql;
SOURCE migrations/indexes/002_fulltext_search.sql;

-- 6. Seed data inicial
SOURCE migrations/seeds/001_usuarios_admin_inicial.sql;

EOF

echo "✅ Migración completada exitosamente"
```

### Rollback

```sql
-- migrations/001_create_usuario_persona_schema.down.sql

DROP TABLE IF EXISTS completitud_perfil;
DROP TABLE IF EXISTS carpeta_digital;
DROP TABLE IF EXISTS notificaciones;
DROP TABLE IF EXISTS solicitudes_enrolamiento;
DROP TABLE IF EXISTS usuarios_graduados;
DROP TABLE IF EXISTS usuarios_administrativos;
DROP TABLE IF EXISTS usuarios_docentes;
DROP TABLE IF EXISTS usuarios_estudiantes;
DROP TABLE IF EXISTS usuarios_aspirantes;
DROP TABLE IF EXISTS usuarios_persona_roles;
DROP TABLE IF EXISTS usuarios_base;
```

---

## 🎯 Seed Data Inicial

### Super Administrador

```sql
-- Crear super admin inicial
INSERT INTO usuarios_base (
  id_usuario,
  tipo_documento,
  numero_documento,
  primer_nombre,
  primer_apellido,
  email_personal,
  email_institucional,
  telefono_movil,
  password_hash,
  estado_usuario,
  porcentaje_completitud,
  rol_principal
) VALUES (
  UUID(),
  'CC',
  '1000000001',
  'Admin',
  'ESAP',
  'admin@esap.edu.co',
  'admin.esap@esap.edu.co',
  '3001234567',
  '$2b$10$hashedpassword', -- Cambiar por hash real
  'activo_perfil_completo',
  100,
  'Administrativo'
);

-- Asignar rol administrativo
INSERT INTO usuarios_persona_roles (
  id_rol_usuario,
  id_usuario,
  tipo_rol,
  esta_activo,
  es_rol_principal,
  motivo_activacion
) VALUES (
  UUID(),
  (SELECT id_usuario FROM usuarios_base WHERE numero_documento = '1000000001'),
  'Administrativo',
  TRUE,
  TRUE,
  'Cuenta de administrador inicial del sistema'
);

-- Crear registro administrativo
INSERT INTO usuarios_administrativos (
  id_administrativo,
  id_usuario,
  codigo_empleado,
  cargo_actual,
  dependencia_area,
  tipo_vinculacion,
  tipo_contrato,
  fecha_vinculacion,
  sede_trabajo,
  nivel_jerarquico,
  nivel_educativo,
  puede_crear_usuarios,
  puede_aprobar_solicitudes,
  puede_modificar_configuraciones
) VALUES (
  UUID(),
  (SELECT id_usuario FROM usuarios_base WHERE numero_documento = '1000000001'),
  'EMP-00001',
  'Super Administrador',
  'Tecnología',
  'Planta',
  'Término_indefinido',
  '2025-01-01',
  'Bogotá',
  'Director',
  'Profesional',
  TRUE,
  TRUE,
  TRUE
);
```

---

## 📚 Consultas Útiles

### Ver todos los roles activos de un usuario

```sql
SELECT 
  u.nombre_completo,
  u.email_institucional,
  r.tipo_rol,
  r.es_rol_principal,
  r.fecha_activacion,
  r.datos_rol
FROM usuarios_base u
INNER JOIN usuarios_persona_roles r ON u.id_usuario = r.id_usuario
WHERE u.numero_documento = '1234567890'
  AND r.esta_activo = TRUE
ORDER BY r.es_rol_principal DESC, r.fecha_activacion DESC;
```

### Usuarios con perfil incompleto

```sql
SELECT 
  u.nombre_completo,
  u.email_institucional,
  u.porcentaje_completitud,
  c.campos_obligatorios_completados,
  c.campos_obligatorios_totales,
  c.documentos_pendientes
FROM usuarios_base u
LEFT JOIN completitud_perfil c ON u.id_usuario = c.id_usuario
WHERE u.porcentaje_completitud < 100
  AND u.estado_usuario = 'activo_perfil_incompleto'
ORDER BY u.porcentaje_completitud ASC;
```

### Solicitudes pendientes de aprobación

```sql
SELECT 
  s.id_solicitud,
  s.nombres,
  s.apellidos,
  s.numero_documento,
  s.email_personal,
  s.tipo_usuario_detectado,
  s.fecha_solicitud,
  TIMESTAMPDIFF(HOUR, s.fecha_solicitud, NOW()) as horas_pendientes
FROM solicitudes_enrolamiento s
WHERE s.estado_solicitud = 'Pendiente'
ORDER BY s.fecha_solicitud ASC;
```

### Notificaciones no leídas por usuario

```sql
SELECT 
  COUNT(*) as total_no_leidas,
  tipo_notificacion,
  prioridad
FROM notificaciones
WHERE id_usuario_destinatario = 'UUID-DEL-USUARIO'
  AND leida = FALSE
  AND archivada = FALSE
GROUP BY tipo_notificacion, prioridad
ORDER BY prioridad DESC;
```

---

## ✅ Checklist de Implementación

- [ ] Crear todas las tablas en orden correcto
- [ ] Crear triggers de auditoría y automatización
- [ ] Crear índices y optimizar queries
- [ ] Insertar seed data (admin inicial)
- [ ] Probar flujo completo de enrolamiento QR
- [ ] Probar evolución de roles (estudiante → graduado)
- [ ] Probar sistema de notificaciones
- [ ] Probar completitud de perfil
- [ ] Configurar backups automáticos
- [ ] Documentar APIs que consumen estas tablas

---

**Versión:** 2.0  
**Fecha:** 17 de Noviembre, 2025  
**Autor:** Hernan Camilo Sanchez Ortiz  
**Proyecto:** Super App Universitaria ESAP - Sistema Usuario Persona
