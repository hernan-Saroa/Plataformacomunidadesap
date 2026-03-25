-- Migration to ensure respuesta_borrador_oc is in legal_management schema

-- 1. Try to move from public if exists
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'respuesta_borrador_oc') THEN
     ALTER TABLE public.respuesta_borrador_oc SET SCHEMA legal_management;
  END IF;
END $$;

-- 2. Create if not exists (in case it was never created)
CREATE TABLE IF NOT EXISTS legal_management.respuesta_borrador_oc (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  requerimiento_id uuid NOT NULL,
  destinatario_nombre varchar(200),
  destinatario_email varchar(200),
  destinatario_cargo varchar(150),
  tipo_respuesta varchar(50),
  contenido text,
  documentos_adjuntos jsonb DEFAULT '[]',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT fk_borrador_requerimiento FOREIGN KEY (requerimiento_id) REFERENCES legal_management.requerimientos_oc(id) ON DELETE CASCADE,
  CONSTRAINT uq_borrador_requerimiento UNIQUE (requerimiento_id)
);

-- 3. Comments
COMMENT ON TABLE legal_management.respuesta_borrador_oc IS 'Almacena borradores de respuestas a requerimientos de órganos de control';
