INSERT INTO control_interno.configuracion_profesionales_ocig 
(usuario_id, nombre_completo, cargo, rol, activo, created_at, updated_at) 
VALUES 
('usr-100', 'Carlos Aprobador Gómez', 'Director Control Interno', 'Aprobador PAI', true, NOW(), NOW()),
('usr-101', 'María Aprobador Pérez', 'Auditora Senior', 'Aprobador PAI', true, NOW(), NOW()),
('usr-102', 'Juan Aprobador Rodríguez', 'Evaluador PAI', 'Aprobador PAI', true, NOW(), NOW())
ON CONFLICT DO NOTHING;
