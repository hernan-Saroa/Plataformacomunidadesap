-- ═══════════════════════════════════════════════════════════════
-- Crear tabla de especialidades OCIG para eliminar datos hardcodeados
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS control_interno.especialidades_ocig (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar las 12 especialidades (antes hardcodeadas en el frontend)
INSERT INTO control_interno.especialidades_ocig (nombre, descripcion, orden) VALUES
  ('Auditoría Financiera', 'Revisión y evaluación de estados financieros, procesos contables y gestión presupuestal para asegurar la razonabilidad y cumplimiento normativo.', 1),
  ('Auditoría de Gestión', 'Evaluación de la eficiencia, eficacia y economía en la administración de recursos y cumplimiento de planes institucionales.', 2),
  ('Auditoría TI', 'Revisión de sistemas de información, infraestructura tecnológica, seguridad informática y gobierno de TI.', 3),
  ('Cumplimiento Normativo', 'Verificación del cumplimiento de leyes, decretos, resoluciones y normatividad aplicable a la entidad pública.', 4),
  ('Gestión de Riesgos', 'Evaluación del sistema de gestión de riesgos institucional, identificación de controles y planes de mitigación.', 5),
  ('Control Interno', 'Evaluación del Sistema de Control Interno (MECI), evaluación independiente y seguimiento a planes de mejoramiento.', 6),
  ('Seguridad de la Información', 'Auditoría de políticas de seguridad de la información, protección de datos personales y gestión de incidentes.', 7),
  ('Gestión Tecnológica', 'Evaluación de la gestión tecnológica, transformación digital y proyectos de TI.', 8),
  ('Gestión Pública', 'Evaluación del Modelo Integrado de Planeación y Gestión (MIPG) y políticas de gestión y desempeño institucional.', 9),
  ('Estrategia', 'Evaluación del plan estratégico institucional, indicadores de gestión y cumplimiento de metas.', 10),
  ('Contratación Pública', 'Revisión de procesos contractuales, cumplimiento del estatuto de contratación y supervisión de contratos.', 11),
  ('Gestión Presupuestal', 'Evaluación de la ejecución presupuestal, PAC, vigencias futuras y gestión fiscal.', 12)
ON CONFLICT (nombre) DO NOTHING;

-- Verificar resultado
SELECT id, nombre, descripcion, activo FROM control_interno.especialidades_ocig ORDER BY orden;
