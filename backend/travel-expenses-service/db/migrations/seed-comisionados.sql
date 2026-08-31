-- ============================================================================
-- seed-comisionados.sql
-- Description: Datos de prueba idempotentes para comisionados y solicitudes.
--              Usa ON CONFLICT DO NOTHING sobre las claves únicas para que
--              pueda ejecutarse varias veces sin duplicar datos.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS travel_expenses;
SET search_path TO travel_expenses, public;

BEGIN;

INSERT INTO travel_expenses.comisionados (
  numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
  email, telefono_contacto, tipo_comisionado, origen_datos,
  autorizacion_habeas_data, fecha_autorizacion_habeas_data, ip_registro_habeas_data
)
VALUES
  ('123456789',   'Juan',   'Pablo',  'Suárez',   '',          'juan.pablo.suarez@esap.edu.co',  '3001234567', 'FUNCIONARIO',  'HUMANO', true, '2026-01-15'::timestamp, '127.0.0.1'),
  ('1004734004',  'Juan',   'Pablo',  'Suárez',   '',          'juan.pablo.suarez2@esap.edu.co', '3007654321', 'CONTRATISTA', 'HUMANO', true, '2026-02-10'::timestamp, '127.0.0.1'),
  ('1019283746',  'Carlos', 'Eduardo','Ramírez',  'Gómez',     'carlos.ramirez@esap.edu.co',    '3159876543', 'FUNCIONARIO',  'HUMANO', true, '2026-03-05'::timestamp, '127.0.0.1'),
  ('52839102',    'Ana',    'María',  'Gómez',    'Quintero',  'ana.gomez@esap.edu.co',         '3204567890', 'DOCENTE',     'HUMANO', true, '2026-03-20'::timestamp, '127.0.0.1'),
  ('79483920',    'Jorge',  'Enrique','Vargas',   'Muñoz',     'jorge.vargas@esap.edu.co',      '3501234567', 'FUNCIONARIO',  'HUMANO', true, '2026-04-12'::timestamp, '127.0.0.1')
ON CONFLICT (numero_documento) DO NOTHING;

INSERT INTO travel_expenses.solicitudes_comision (
  consecutivo_unico, comisionado_id, destino_ciudad, destino_departamento,
  fecha_inicio, fecha_fin, objeto_comision, prioridad, rubro_presupuestal,
  requiere_tiquetes, estado_solicitud, radicado_fuera_jornada, extemporanea,
  creado_por_usuario_id
)
SELECT v.consecutivo_unico, c.id, v.destino_ciudad, v.destino_departamento,
       v.fecha_inicio, v.fecha_fin, v.objeto_comision, v.prioridad, v.rubro_presupuestal,
       v.requiere_tiquetes, v.estado_solicitud, v.radicado_fuera_jornada, v.extemporanea,
       '00000000-0000-0000-0000-000000000000'::uuid
FROM (VALUES
  ('COM-2026-0001', '123456789',  'Bogotá',       'Cundinamarca',     '2026-09-01'::timestamp, '2026-09-05'::timestamp, 'Comision de servicios institucionales',    'ALTA',  'Rubro 01', false, 'SOLICITADO',                false, false),
  ('COM-2026-0002', '1004734004', 'Medellín',     'Antioquia',        '2026-09-10'::timestamp, '2026-09-12'::timestamp, 'Comision de capacitacion docente',          'MEDIA', 'Rubro 02', true,  'APROBADO_JEFE',             false, false),
  ('COM-2026-0003', '1019283746', 'Cali',         'Valle del Cauca',  '2026-09-15'::timestamp, '2026-09-18'::timestamp, 'Acompanamiento a autoevaluacion institucional', 'ALTA', 'Rubro 03', true, 'APROBADO_TALENTO_HUMANO', false, false),
  ('COM-2026-0004', '52839102',   'Bucaramanga',  'Santander',        '2026-09-20'::timestamp, '2026-09-25'::timestamp, 'Sesion de trabajo territorial',             'MEDIA', 'Rubro 04', false, 'EXTEMPORANEA',              true,  true),
   ('COM-2026-0005', '79483920',   'Cartagena',    'Bolívar',          '2026-10-02'::timestamp, '2026-10-06'::timestamp, 'Inspeccion de programas academicos',        'ALTA',  'Rubro 05', true,  'TIQUETES_COMPRADOS',        false, false),
   ('COM-2026-0006', '1019283746', 'Barranquilla', 'Atlántico',        '2026-11-03'::timestamp, '2026-11-07'::timestamp, 'Coomitión de seguimiento al SIC',           'ALTA',  'Rubro 06', false, 'PENDIENTE',                  false, false)
 ) AS v(consecutivo_unico, numero_documento, destino_ciudad, destino_departamento, fecha_inicio, fecha_fin, objeto_comision, prioridad, rubro_presupuestal, requiere_tiquetes, estado_solicitud, radicado_fuera_jornada, extemporanea)
JOIN travel_expenses.comisionados c ON c.numero_documento = v.numero_documento
ON CONFLICT (consecutivo_unico) DO NOTHING;

COMMIT;

RESET search_path;