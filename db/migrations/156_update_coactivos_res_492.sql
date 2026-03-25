-- Base de Datos: Esquema y Entidades para Resolución 492 (Procesos Coactivos)
-- Creación de la Entidad global para registrar años, meses, y tasas
CREATE TABLE IF NOT EXISTS legal_management.tasas_referencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    valor_tasa NUMERIC(5, 2) NOT NULL,
    tipo_tasa VARCHAR(20) NOT NULL DEFAULT 'DIAN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrando Estados Antiguos de Cobro Coactivo a las Nuevas Etapas Legales
-- Dado que PostgreSQL no soporta ALTER TYPE RENAME VALUE directamente para modificar/eliminar enum sin complicaciones, 
-- el acercamiento estándar es renombrar el tipo antiguo, crear el nuevo y mapear columnas.

ALTER TYPE legal_management.estado_proceso_coactivo RENAME TO estado_proceso_coactivo_old;

CREATE TYPE legal_management.estado_proceso_coactivo AS ENUM (
    'PERSUASIVA', 
    'COACTIVA',
    'MEDIDAS_CAUTELARES',
    'EXCEPCIONES',
    'LIQUIDACION'
);

-- Eliminar el default actual antes de castear
ALTER TABLE legal_management.procesos_coactivos 
  ALTER COLUMN estado DROP DEFAULT;

-- Mapear columnas antiguas a nuevas basado en lógica general (Finalizado -> Liquidacion)
ALTER TABLE legal_management.procesos_coactivos 
  ALTER COLUMN estado TYPE legal_management.estado_proceso_coactivo 
  USING CASE 
    WHEN estado::text = 'FINALIZADO' THEN 'LIQUIDACION'::legal_management.estado_proceso_coactivo 
    WHEN estado::text = 'MANDAMIENTO' THEN 'COACTIVA'::legal_management.estado_proceso_coactivo 
    WHEN estado::text = 'EMBARGO' THEN 'MEDIDAS_CAUTELARES'::legal_management.estado_proceso_coactivo 
    ELSE 'PERSUASIVA'::legal_management.estado_proceso_coactivo 
  END;

ALTER TABLE legal_management.procesos_coactivos 
  ALTER COLUMN estado SET DEFAULT 'PERSUASIVA'::legal_management.estado_proceso_coactivo;

DROP TYPE legal_management.estado_proceso_coactivo_old;

-- Añadiendo campos de fechas y tasas al Proceso Coactivo
ALTER TABLE legal_management.procesos_coactivos 
  ADD COLUMN IF NOT EXISTS fecha_ejecutoria TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS tipo_interes_aplicable VARCHAR(20) DEFAULT 'DIAN',
  ADD COLUMN IF NOT EXISTS valor_costas NUMERIC(15, 2) DEFAULT 0;

-- Añadiendo campos de distribución al Pago Coactivo
ALTER TABLE legal_management.pagos_coactivos 
  ADD COLUMN IF NOT EXISTS abono_capital NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abono_intereses NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abono_costas NUMERIC(15, 2) DEFAULT 0;

-- Añadiendo validación de Título Ejecutivo al Adjunto
ALTER TABLE legal_management.procesos_coactivos_adjuntos
  ADD COLUMN IF NOT EXISTS es_titulo_ejecutivo BOOLEAN DEFAULT FALSE;
