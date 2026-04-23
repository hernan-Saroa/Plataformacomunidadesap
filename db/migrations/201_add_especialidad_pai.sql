-- Insertar las 12 especialidades (antes hardcodeadas en el frontend)
INSERT INTO control_interno.especialidades_ocig (nombre, descripcion, orden) VALUES
  ('Aprobador PAI', 'Aprobador de procesos administrativos.', 13)
ON CONFLICT (nombre) DO NOTHING;

-- Actualizar registros existentes que tenían roles institucionales al nuevo rol "Aprobador PAI"
UPDATE control_interno.configuracion_profesionales_ocig 
SET rol_ocig = 'Aprobador PAI', updated_at = NOW()
WHERE rol_ocig IN (
  'Rector(a)',
  'Secretario(a) General',
  'Subdirector(a) Académico',
  'Subdirector(a) de Proyección Institucional',
  'Subdirector(a) Alto Gobierno',
  'Jefe Oficina Asesora Jurídica',
  'Jefe Oficina Asesora de Planeación',
  'Miembro del Comité Institucional'
);

-- Verificar resultado
SELECT id_tercero, rol_ocig, activo FROM control_interno.configuracion_profesionales_ocig ORDER BY rol_ocig;