-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 142: Sincronizar tabla lista_chequeo con entidad TypeORM
-- Fecha: 2026-02-22
-- Descripción: Agrega TODAS las columnas faltantes (idempotente - se puede ejecutar múltiples veces)
-- ═══════════════════════════════════════════════════════════════════════════

-- Columnas básicas
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '1.0';
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'activa';
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS aplicable_para JSONB DEFAULT '["gestion", "cumplimiento"]';
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'sistema';
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS items_json JSONB;

-- Columnas de configuración
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS proceso VARCHAR(255);
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS subproceso VARCHAR(255);
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS categoria_esap VARCHAR(100);
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS normativa_aplicable TEXT;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS objetivo TEXT;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS version_base VARCHAR(50);
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS permite_no_aplica BOOLEAN DEFAULT true;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS requiere_evidencias BOOLEAN DEFAULT true;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS genera_hallazgos_automaticos BOOLEAN DEFAULT true;

-- Relaciones
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS tipo_auditoria_id UUID;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT true;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS usos_programados INTEGER DEFAULT 0;

-- Vinculación con auditoría
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS auditoria_id UUID;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS nombre_auditoria VARCHAR(500);
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS auditor_responsable VARCHAR(255);
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS fecha_aplicacion DATE;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS fecha_diligenciamiento DATE;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS items_completados INTEGER DEFAULT 0;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS cumplimiento INTEGER DEFAULT 0;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS no_cumplimientos INTEGER DEFAULT 0;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS no_aplica INTEGER DEFAULT 0;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS hallazgos_generados INTEGER DEFAULT 0;

-- Fases
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS fase_planeacion BOOLEAN DEFAULT false;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS fase_ejecucion BOOLEAN DEFAULT false;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS fase_comunicacion BOOLEAN DEFAULT false;
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS fase_seguimiento BOOLEAN DEFAULT false;

-- Timestamps y soft delete
ALTER TABLE control_interno.lista_chequeo ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Crear índices (idempotente)
CREATE INDEX IF NOT EXISTS idx_lista_chequeo_activa ON control_interno.lista_chequeo(activa);
CREATE INDEX IF NOT EXISTS idx_lista_chequeo_tipo_auditoria ON control_interno.lista_chequeo(tipo_auditoria_id) WHERE tipo_auditoria_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lista_chequeo_deleted_at ON control_interno.lista_chequeo(deleted_at) WHERE deleted_at IS NULL;

-- Log
DO $$ BEGIN RAISE NOTICE '✅ Migración 142: Tabla lista_chequeo sincronizada con entidad TypeORM'; END $$;
