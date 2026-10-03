SET client_encoding = 'UTF8';

-- ============================================================================
-- MIGRACIÓN: 003_create_cargos_y_dependencias_cargos.sql
-- Objetivo: Catálogo de cargos y relación N:M entre dependencias y cargos
--           (1 cargo puede estar en varias dependencias, 1 dependencia puede
--           tener múltiples cargos asignados).
-- Idempotente y compatible con UTF-8 para nombres con tildes y caracteres especiales.
-- ============================================================================

-- 1. Secuencia y tabla auth.cargos
CREATE SEQUENCE IF NOT EXISTS auth.cargos_id_cargo_seq;

CREATE TABLE IF NOT EXISTS auth.cargos (
  id_cargo BIGINT PRIMARY KEY DEFAULT nextval('auth.cargos_id_cargo_seq'),
  cod_cargo VARCHAR(50) NOT NULL UNIQUE,
  nom_cargo VARCHAR(250) NOT NULL,
  descripcion VARCHAR(500),
  nivel_jerarquico VARCHAR(50) DEFAULT 'Profesional',
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER SEQUENCE auth.cargos_id_cargo_seq OWNED BY auth.cargos.id_cargo;

CREATE INDEX IF NOT EXISTS idx_cargos_codigo ON auth.cargos (cod_cargo);
CREATE INDEX IF NOT EXISTS idx_cargos_activo ON auth.cargos (activo);
CREATE INDEX IF NOT EXISTS idx_cargos_nombre ON auth.cargos (nom_cargo);

-- 2. Tabla intermedia auth.dependencias_cargos (relación N:M)
CREATE TABLE IF NOT EXISTS auth.dependencias_cargos (
  id_dependencia_cargo BIGSERIAL PRIMARY KEY,
  id_dependencia NUMERIC(11,0) NOT NULL REFERENCES auth.dependencias(id_dependencia) ON DELETE CASCADE,
  id_cargo BIGINT NOT NULL REFERENCES auth.cargos(id_cargo) ON DELETE CASCADE,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_dependencias_cargos UNIQUE (id_dependencia, id_cargo)
);

CREATE INDEX IF NOT EXISTS idx_dep_cargos_dep ON auth.dependencias_cargos (id_dependencia);
CREATE INDEX IF NOT EXISTS idx_dep_cargos_cargo ON auth.dependencias_cargos (id_cargo);
CREATE INDEX IF NOT EXISTS idx_dep_cargos_activo ON auth.dependencias_cargos (activo);

-- 3. Seed maestro de cargos institucionales ESAP (idempotente)
INSERT INTO auth.cargos (id_cargo, cod_cargo, nom_cargo, descripcion, nivel_jerarquico, activo, actualizado_en)
VALUES
  (1,  'DIR-GEN',      'Director General',                      'Dirección y representación legal de la Escuela Superior de Administración Pública.',             'Directivo',    true, CURRENT_TIMESTAMP),
  (2,  'SUB-DIR-GEN',  'Subdirector General',                   'Apoyo a la dirección superior y articulación de políticas institucionales.',                     'Directivo',    true, CURRENT_TIMESTAMP),
  (3,  'DEC-FAC',      'Decano de Facultad',                    'Liderazgo y dirección de programas curriculares y líneas de investigación académica.',          'Directivo',    true, CURRENT_TIMESTAMP),
  (4,  'DIR-TERR',     'Director Territorial',                  'Dirección y coordinación operativa de las sedes territoriales y CETAP.',                        'Directivo',    true, CURRENT_TIMESTAMP),
  (5,  'JEF-OFIC-ASES','Jefe de Oficina Asesora',               'Asesoría técnica y estratégica en asuntos jurídicos, de planeación o control institucional.',   'Asesor',       true, CURRENT_TIMESTAMP),
  (6,  'ASESOR-DIR',   'Asesor de Dirección',                   'Acompañamiento especializado en la toma de decisiones directivas.',                             'Asesor',       true, CURRENT_TIMESTAMP),
  (7,  'COORD-ACAD',   'Coordinador Académico',                 'Gestión, seguimiento y supervisión de docentes, mallas curriculares y actividades académicas.', 'Profesional',  true, CURRENT_TIMESTAMP),
  (8,  'PROF-ESP',     'Profesional Especializado',             'Ejecución técnica y formulación de planes, proyectos y procesos misionales.',                   'Profesional',  true, CURRENT_TIMESTAMP),
  (9,  'PROF-UNIV',    'Profesional Universitario',             'Gestión operativa y análisis profesional en las distintas dependencias institucionales.',        'Profesional',  true, CURRENT_TIMESTAMP),
  (10, 'AUD-INT',      'Auditor de Control Interno',            'Evaluación y aseguramiento del sistema de control interno y auditoría de procesos.',             'Profesional',  true, CURRENT_TIMESTAMP),
  (11, 'LID-TAL-HUM',  'Líder de Talento Humano',               'Coordinación de procesos de vinculación, bienestar y desarrollo del personal.',                 'Profesional',  true, CURRENT_TIMESTAMP),
  (12, 'ANAL-FINAN',   'Analista de Presupuesto y Finanzas',    'Programación, control y seguimiento presupuestal, financiero y contable.',                      'Profesional',  true, CURRENT_TIMESTAMP),
  (13, 'TEC-ADMIN',    'Técnico Administrativo',                'Soporte técnico, archivo y registro documental en áreas de gestión administrativa.',            'Técnico',      true, CURRENT_TIMESTAMP),
  (14, 'SEC-EJEC',     'Secretario Ejecutivo',                  'Asistencia ejecutiva, gestión de agenda y atención a comunicaciones oficiales.',                'Asistencial',  true, CURRENT_TIMESTAMP),
  (15, 'ASIST-ADMIN',  'Asistente Administrativo',              'Apoyo logístico, operativo y atención al ciudadano en dependencias institucionales.',           'Asistencial',  true, CURRENT_TIMESTAMP),
  (16, 'AUX-ADMIN',    'Auxiliar Administrativo',               'Apoyo operativo básico, radicación, correspondencia y soporte en oficina.',                     'Asistencial',  true, CURRENT_TIMESTAMP)
ON CONFLICT (cod_cargo) DO UPDATE
SET nom_cargo = EXCLUDED.nom_cargo,
    descripcion = EXCLUDED.descripcion,
    nivel_jerarquico = EXCLUDED.nivel_jerarquico,
    activo = EXCLUDED.activo,
    actualizado_en = CURRENT_TIMESTAMP;

-- Actualizar la secuencia al valor máximo actual
SELECT setval('auth.cargos_id_cargo_seq', COALESCE((SELECT MAX(id_cargo) FROM auth.cargos), 0) + 1, false);

-- 4. Seed de relaciones Dependencia <-> Cargos (N:M)
-- Asignación detallada por código de dependencia si existe
INSERT INTO auth.dependencias_cargos (id_dependencia, id_cargo, activo)
SELECT d.id_dependencia, c.id_cargo, true
FROM auth.dependencias d
JOIN auth.cargos c ON (
  -- Subdirección de Planificación
  (d.cod_dependencia = 'DEP-PLAN-01' AND c.cod_cargo IN ('SUB-DIR-GEN', 'PROF-ESP', 'PROF-UNIV', 'ANAL-FINAN', 'TEC-ADMIN')) OR
  -- Subdirección Académica
  (d.cod_dependencia = 'DEP-ACAD-01' AND c.cod_cargo IN ('SUB-DIR-GEN', 'DEC-FAC', 'COORD-ACAD', 'PROF-ESP', 'ASIST-ADMIN')) OR
  -- Subdirección Administrativa y Financiera
  (d.cod_dependencia = 'DEP-ADM-01' AND c.cod_cargo IN ('SUB-DIR-GEN', 'ANAL-FINAN', 'PROF-UNIV', 'TEC-ADMIN', 'AUX-ADMIN')) OR
  -- Subdirección de Talento Humano
  (d.cod_dependencia = 'DEP-TH-01' AND c.cod_cargo IN ('LID-TAL-HUM', 'PROF-ESP', 'PROF-UNIV', 'TEC-ADMIN', 'SEC-EJEC')) OR
  -- Oficina Asesora Jurídica
  (d.cod_dependencia = 'DEP-OFI-JUR-01' AND c.cod_cargo IN ('JEF-OFIC-ASES', 'ASESOR-DIR', 'PROF-ESP', 'PROF-UNIV', 'SEC-EJEC')) OR
  -- Oficina de Control Interno
  (d.cod_dependencia = 'DEP-CONT-INT-01' AND c.cod_cargo IN ('JEF-OFIC-ASES', 'AUD-INT', 'PROF-UNIV', 'ASIST-ADMIN'))
)
ON CONFLICT (id_dependencia, id_cargo) DO NOTHING;

-- Asegurar que cualquier otra dependencia existente tenga al menos cargos profesionales y asistenciales base
INSERT INTO auth.dependencias_cargos (id_dependencia, id_cargo, activo)
SELECT d.id_dependencia, c.id_cargo, true
FROM auth.dependencias d
CROSS JOIN auth.cargos c
WHERE c.cod_cargo IN ('PROF-ESP', 'PROF-UNIV', 'TEC-ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM auth.dependencias_cargos dc 
    WHERE dc.id_dependencia = d.id_dependencia
  )
ON CONFLICT (id_dependencia, id_cargo) DO NOTHING;
