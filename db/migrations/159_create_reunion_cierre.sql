-- Tabla reunion_cierre (misma estructura que reunion_apertura)
CREATE TABLE IF NOT EXISTS control_interno.reunion_cierre (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    auditoria_id uuid NOT NULL UNIQUE REFERENCES control_interno.auditoria(id) ON DELETE CASCADE,
    fecha timestamp without time zone NOT NULL,
    modalidad character varying(50) NOT NULL CHECK (modalidad IN ('presencial', 'virtual', 'hibrida')),
    lugar character varying(255),
    enlace_virtual character varying(500),
    agenda jsonb,
    participantes jsonb,
    estado_acta character varying(50) DEFAULT 'pendiente' CHECK (estado_acta IN ('pendiente', 'en_elaboracion', 'firmada', 'aprobada')),
    acta_ruta character varying(500),
    observaciones text,
    elaborado_por character varying(255),
    revisado_por character varying(255),
    documento_biblioteca_id uuid REFERENCES control_interno.documento(id) ON DELETE SET NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE control_interno.reunion_cierre IS 'Información de la reunión de cierre de la auditoría';
CREATE INDEX IF NOT EXISTS idx_reunion_cierre_auditoria ON control_interno.reunion_cierre(auditoria_id);

-- Agregar columnas a reunion_apertura para elaborado_por, revisado_por, documento_biblioteca_id
ALTER TABLE control_interno.reunion_apertura
ADD COLUMN IF NOT EXISTS documento_biblioteca_id uuid,
ADD COLUMN IF NOT EXISTS elaborado_por character varying(255),
ADD COLUMN IF NOT EXISTS revisado_por character varying(255);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reunion_apertura_documento_biblioteca') THEN
    ALTER TABLE control_interno.reunion_apertura
    ADD CONSTRAINT fk_reunion_apertura_documento_biblioteca
    FOREIGN KEY (documento_biblioteca_id) REFERENCES control_interno.documento(id) ON DELETE SET NULL;
  END IF;
END $$;
