BEGIN;

DELETE FROM travel_expenses.solicitudes_comision;
DELETE FROM travel_expenses.comisionados;

INSERT INTO travel_expenses.comisionados (numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, email, telefono_contacto, tipo_comisionado, origen_datos, autorizacion_habeas_data, fecha_autorizacion_habeas_data, ip_registro_habeas_data)
VALUES
  ('123456789', 'Juan', 'Pablo', 'Suárez', '', 'juan.pablo.suarez@esap.edu.co', '3001234567', 'FUNCIONARIO', 'HUMANO', true, '2026-01-15'::timestamp, '127.0.0.1'),
  ('1004734004', 'Juan', 'Pablo', 'Suárez', '', 'juan.pablo.suarez2@esap.edu.co', '3007654321', 'CONTRATISTA', 'HUMANO', true, '2026-02-10'::timestamp, '127.0.0.1'),
  ('1019283746', 'Carlos', 'Eduardo', 'Ramírez', 'Gómez', 'carlos.ramirez@esap.edu.co', '3159876543', 'FUNCIONARIO', 'HUMANO', true, '2026-03-05'::timestamp, '127.0.0.1'),
  ('52839102', 'Ana', 'María', 'Gómez', 'Quintero', 'ana.gomez@esap.edu.co', '3204567890', 'DOCENTE', 'HUMANO', true, '2026-03-20'::timestamp, '127.0.0.1'),
  ('79483920', 'Jorge', 'Enrique', 'Vargas', 'Muñoz', 'jorge.vargas@esap.edu.co', '3501234567', 'FUNCIONARIO', 'HUMANO', true, '2026-04-12'::timestamp, '127.0.0.1');

INSERT INTO travel_expenses.solicitudes_comision (consecutivo_unico, comisionado_id, destino_ciudad, destino_departamento, fecha_inicio, fecha_fin, objeto_comision, prioridad, rubro_presupuestal, requiere_tiquetes, estado_solicitud, radicado_fuera_jornada, extemporanea, creado_por_usuario_id)
SELECT
  'COM-2026-0001',
  c.id,
  'Bogotá',
  'Cundinamarca',
  '2026-09-01'::timestamp,
  '2026-09-05'::timestamp,
  'Comision de servicios institucionales',
  'ALTA',
  'Rubro 01',
  false,
  'SOLICITADO',
  false,
  false,
  '00000000-0000-0000-0000-000000000000'::uuid
FROM travel_expenses.comisionados c
WHERE c.numero_documento = '123456789'
UNION ALL
SELECT
  'COM-2026-0002',
  c.id,
  'Medellín',
  'Antioquia',
  '2026-09-10'::timestamp,
  '2026-09-12'::timestamp,
  'Comision de capacitacion docente',
  'MEDIA',
  'Rubro 02',
  true,
  'APROBADO_JEFE',
  false,
  false,
  '00000000-0000-0000-0000-000000000000'::uuid
FROM travel_expenses.comisionados c
WHERE c.numero_documento = '1004734004'
UNION ALL
SELECT
  'COM-2026-0003',
  c.id,
  'Cali',
  'Valle del Cauca',
  '2026-09-15'::timestamp,
  '2026-09-18'::timestamp,
  'Acompanamiento a autoevaluacion institucional',
  'ALTA',
  'Rubro 03',
  true,
  'APROBADO_TALENTO_HUMANO',
  false,
  false,
  '00000000-0000-0000-0000-000000000000'::uuid
FROM travel_expenses.comisionados c
WHERE c.numero_documento = '1019283746'
UNION ALL
SELECT
  'COM-2026-0004',
  c.id,
  'Bucaramanga',
  'Santander',
  '2026-09-20'::timestamp,
  '2026-09-25'::timestamp,
  'Sesion de trabajo territorial',
  'MEDIA',
  'Rubro 04',
  false,
  'EXTEMPORANEA',
  true,
  true,
  '00000000-0000-0000-0000-000000000000'::uuid
FROM travel_expenses.comisionados c
WHERE c.numero_documento = '52839102'
UNION ALL
SELECT
  'COM-2026-0005',
  c.id,
  'Cartagena',
  'Bolívar',
  '2026-10-02'::timestamp,
  '2026-10-06'::timestamp,
  'Inspeccion de programas academicos',
  'ALTA',
  'Rubro 05',
  true,
  'TIQUETES_COMPRADOS',
  false,
  false,
  '00000000-0000-0000-0000-000000000000'::uuid
FROM travel_expenses.comisionados c
WHERE c.numero_documento = '79483920';

COMMIT;
