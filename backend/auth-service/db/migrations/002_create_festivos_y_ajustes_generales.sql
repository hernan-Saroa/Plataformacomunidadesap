SET client_encoding = 'UTF8';

-- ============================================================================
-- MIGRACIÓN: 002_create_festivos_y_ajustes_generales.sql
-- Objetivo: Establecer festivos_colombia y configuraciones generales en el
--           esquema maestro 'auth' como catálogo transversal centralizado para
--           toda la plataforma ESAP (viáticos, nómina, contratos, etc.).
-- ============================================================================

-- 1. Crear tabla auth.system_settings para parámetros globales
CREATE TABLE IF NOT EXISTS auth.system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT DEFAULT '',
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sembrar o inicializar el Salario Mínimo Mensual Legal Vigente (SMMLV)
INSERT INTO auth.system_settings (key, value, updated_at)
VALUES ('SALARIO_MINIMO_MENSUAL', '1423500', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

-- 2. Crear tabla auth.festivos_colombia como dato maestro exclusivo en 'auth'
CREATE TABLE IF NOT EXISTS auth.festivos_colombia (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  descripcion VARCHAR(150) NOT NULL,
  origen VARCHAR(150) DEFAULT 'Ley 51/1983',
  regla VARCHAR(50) DEFAULT 'fixed',
  creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_festivos_fecha ON auth.festivos_colombia (fecha);

-- 3. Semillar festivos oficiales de Colombia vigencia 2026 directamente en auth
INSERT INTO auth.festivos_colombia (fecha, descripcion, origen, regla, actualizado_en)
VALUES
  ('2026-01-01', 'Año Nuevo', 'Ley 51/1983 art. 1', 'fixed', CURRENT_TIMESTAMP),
  ('2026-01-12', 'Día de los Reyes Magos', 'Ley 51/1983 art. 2', 'jan-6+emiliani', CURRENT_TIMESTAMP),
  ('2026-03-23', 'Día de San José', 'Ley 51/1983 art. 2', 'mar-19+emiliani', CURRENT_TIMESTAMP),
  ('2026-04-02', 'Jueves Santo', 'Ley 51/1983 art. 1', 'easter-3', CURRENT_TIMESTAMP),
  ('2026-04-03', 'Viernes Santo', 'Ley 51/1983 art. 1', 'easter-2', CURRENT_TIMESTAMP),
  ('2026-05-01', 'Día del Trabajo', 'Ley 51/1983 art. 1', 'fixed', CURRENT_TIMESTAMP),
  ('2026-05-18', 'Ascensión del Señor', 'Ley 51/1983 art. 2', 'easter+39+emiliani', CURRENT_TIMESTAMP),
  ('2026-06-08', 'Corpus Christi', 'Ley 51/1983 art. 2', 'easter+60+emiliani', CURRENT_TIMESTAMP),
  ('2026-06-15', 'Sagrado Corazón de Jesús', 'Ley 51/1983 art. 2', 'easter+68+emiliani', CURRENT_TIMESTAMP),
  ('2026-06-29', 'San Pedro y San Pablo', 'Ley 51/1983 art. 2', 'jun-29+emiliani', CURRENT_TIMESTAMP),
  ('2026-07-20', 'Día de la Independencia', 'Ley 51/1983 art. 1', 'fixed', CURRENT_TIMESTAMP),
  ('2026-08-07', 'Batalla de Boyacá', 'Ley 51/1983 art. 1', 'fixed', CURRENT_TIMESTAMP),
  ('2026-08-17', 'Asunción de la Virgen', 'Ley 51/1983 art. 2', 'aug-15+emiliani', CURRENT_TIMESTAMP),
  ('2026-10-12', 'Día de la Raza', 'Ley 51/1983 art. 2', 'oct-12+emiliani', CURRENT_TIMESTAMP),
  ('2026-11-02', 'Día de Todos los Santos', 'Ley 51/1983 art. 2', 'nov-1+emiliani', CURRENT_TIMESTAMP),
  ('2026-11-16', 'Independencia de Cartagena', 'Ley 51/1983 art. 2', 'nov-11+emiliani', CURRENT_TIMESTAMP),
  ('2026-12-08', 'Inmaculada Concepción', 'Ley 51/1983 art. 1', 'fixed', CURRENT_TIMESTAMP),
  ('2026-12-25', 'Navidad', 'Ley 51/1983 art. 1', 'fixed', CURRENT_TIMESTAMP)
ON CONFLICT (fecha) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    origen = EXCLUDED.origen,
    regla = EXCLUDED.regla,
    actualizado_en = CURRENT_TIMESTAMP;
