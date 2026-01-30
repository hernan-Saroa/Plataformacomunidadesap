CREATE TABLE consulta_juridica_historial (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulta_id uuid NOT NULL REFERENCES consultas_juridicas(id),
  tipo_evento varchar(50) NOT NULL, -- ASIGNACION, CAMBIO_ETAPA, RESPUESTA, NOTIFICACION, etc.
  descripcion text NOT NULL,
  detalle text,
  usuario varchar(150), -- Persona que realizó la acción
  fecha timestamp DEFAULT now()
);

CREATE INDEX idx_consulta_juridica_historial_consulta_id ON consulta_juridica_historial(consulta_id);
