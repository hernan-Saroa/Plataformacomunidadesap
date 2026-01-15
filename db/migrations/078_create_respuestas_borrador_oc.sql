-- Crear tabla de borradores de respuestas
CREATE TABLE IF NOT EXISTS respuesta_borrador_oc (
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
  CONSTRAINT fk_borrador_requerimiento FOREIGN KEY (requerimiento_id) REFERENCES requerimientos_oc(id) ON DELETE CASCADE,
  CONSTRAINT uq_borrador_requerimiento UNIQUE (requerimiento_id)
);

-- Comentarios de tabla y columnas
COMMENT ON TABLE respuesta_borrador_oc IS 'Almacena borradores de respuestas a requerimientos de órganos de control';
COMMENT ON COLUMN respuesta_borrador_oc.documentos_adjuntos IS 'Array JSON con nombres/URLs de documentos adjuntos al borrador';
