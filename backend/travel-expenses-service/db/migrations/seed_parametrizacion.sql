-- ============================================================================
-- seed_parametrizacion.sql
-- Description: Datos iniciales (idempotentes) para las tablas de
--              parametrización del módulo de viáticos.
--              config_campos_formulario contiene SOLO los campos que el
--              usuario diligencia en el formulario (los datos de identidad
--              y contacto del comisionado se obtienen desde la tabla
--              comisionados al consultarlo por número de documento).
--              Usa ON CONFLICT DO NOTHING sobre las claves únicas.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS travel_expenses;
SET search_path TO travel_expenses, public;

BEGIN;

-- ============================================================================
-- 1) Tipos de documento de soporte
-- ============================================================================
INSERT INTO travel_expenses.tipos_documento_soporte (codigo, nombre, descripcion, activo)
VALUES
  ('CDP',              'CDP - Certificado de Disponibilidad Presupuestal', 'Documento que respalda la disponibilidad presupuestal para la comisión.', TRUE),
  ('RUT',              'RUT - Registro Único Tributario',                  'Registro Único Tributario del comisionado.',                                 TRUE),
  ('CERT_BANCARIA',    'Certificación Bancaria',                           'Certificación de la cuenta bancaria donde se consignarán los viáticos.',     TRUE),
  ('SEGURIDAD_SOCIAL', 'Seguridad Social',                                 'Acreditación de pago de seguridad social vigente.',                          TRUE),
  ('CONTRATO_SECOP',   'Contrato SECOP',                                   'Contrato vigente registrado en SECOP (para contratistas).',                  TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 2) Configuración por tipo de comisionado
--    Nota: NO incluye campos de identidad/contacto pues esos se obtienen
--    automáticamente de travel_expenses.comisionados al consultar por
--    número de documento.
-- ============================================================================
INSERT INTO travel_expenses.config_tipo_comisionado
  (tipo_comisionado, codigo_formulario, campos_obligatorios, campos_opcionales, campos_ocultos, activo)
VALUES
  ('FUNCIONARIO', 'FMT023_FUNCIONARIO',
   '["documentoComisionado","destinoCiudad","destinoDepartamento","fechaInicio","fechaFin","objetoComision","prioridad","rubroPresupuestal","montoViaticos","montoGastosViaje","diasComision"]'::jsonb,
   '["requiereTiquetes"]'::jsonb,
   '[]'::jsonb,
   TRUE),
  ('CONTRATISTA', 'FMT023_CONTRATISTA',
   '["documentoComisionado","destinoCiudad","destinoDepartamento","fechaInicio","fechaFin","objetoComision","prioridad","rubroPresupuestal","montoViaticos","montoGastosViaje","diasComision"]'::jsonb,
   '["requiereTiquetes"]'::jsonb,
   '[]'::jsonb,
   TRUE),
  ('DOCENTE', 'FMT023_DOCENTE',
   '["documentoComisionado","destinoCiudad","destinoDepartamento","fechaInicio","fechaFin","objetoComision","prioridad","rubroPresupuestal","montoViaticos","montoGastosViaje","diasComision"]'::jsonb,
   '["requiereTiquetes"]'::jsonb,
   '[]'::jsonb,
   TRUE),
  ('ESTUDIANTE', 'FMT023_ESTUDIANTE',
   '["documentoComisionado","destinoCiudad","destinoDepartamento","fechaInicio","fechaFin","objetoComision","prioridad","rubroPresupuestal","montoViaticos","montoGastosViaje","diasComision"]'::jsonb,
   '["requiereTiquetes"]'::jsonb,
   '[]'::jsonb,
   TRUE),
  ('INVESTIGADOR', 'FMT023_INVESTIGADOR',
   '["documentoComisionado","destinoCiudad","destinoDepartamento","fechaInicio","fechaFin","objetoComision","prioridad","rubroPresupuestal","montoViaticos","montoGastosViaje","diasComision"]'::jsonb,
   '["requiereTiquetes"]'::jsonb,
   '[]'::jsonb,
   TRUE)
ON CONFLICT (tipo_comisionado) DO NOTHING;

-- ============================================================================
-- 3) Campos del formulario (config_campos_formulario)
--    SOLO los campos que el usuario diligencia en el formulario.
--    Los datos del comisionado (nombre, apellido, email, teléfono) NO se
--    incluyen aquí porque se obtienen automáticamente al consultarlo.
-- ============================================================================
INSERT INTO travel_expenses.config_campos_formulario
  (clave, etiqueta, tipo_campo, placeholder, opciones, grupo, orden, activo)
VALUES
  ('documentoComisionado', 'Número de documento',             'text',     'Ingrese el número de documento y presione Consultar',  NULL,                                                                                                                                                                                                                                                                'identidad',   10, TRUE),
  ('objetoComision',       'Objeto de la comisión',           'textarea', 'Describa el objetivo institucional de la comisión',     NULL,                                                                                                                                                                                                                                                                'comision',    20, TRUE),
  ('destinoCiudad',        'Ciudad de destino',               'text',     'Ciudad donde se realizará la comisión',                 NULL,                                                                                                                                                                                                                                                                'comision',    30, TRUE),
  ('destinoDepartamento',  'Departamento de destino',         'text',     'Departamento de destino',                               NULL,                                                                                                                                                                                                                                                                'comision',    40, TRUE),
  ('fechaInicio',          'Fecha de inicio',                 'date',     'YYYY-MM-DD',                                            NULL,                                                                                                                                                                                                                                                                'comision',    50, TRUE),
  ('fechaFin',             'Fecha de finalización',           'date',     'YYYY-MM-DD',                                            NULL,                                                                                                                                                                                                                                                                'comision',    60, TRUE),
  ('prioridad',            'Prioridad',                       'select',   NULL,                                                    '[{"value":"ALTA","label":"Alta"},{"value":"MEDIA","label":"Media"},{"value":"BAJA","label":"Baja"}]'::jsonb,                                                                                                                                                              'comision',    70, TRUE),
  ('rubroPresupuestal',    'Rubro presupuestal',              'text',     'Código del rubro',                                      NULL,                                                                                                                                                                                                                                                                'presupuesto', 80, TRUE),
  ('montoViaticos',        'Viáticos (COP)',                  'number',   '0.00',                                                  NULL,                                                                                                                                                                                                                                                                'presupuesto', 90, TRUE),
  ('montoGastosViaje',     'Gastos de viaje (COP)',           'number',   '0.00',                                                  NULL,                                                                                                                                                                                                                                                                'presupuesto',100, TRUE),
  ('diasComision',         'Días de comisión',                'number',   '1',                                                     NULL,                                                                                                                                                                                                                                                                'presupuesto',110, TRUE),
  ('requiereTiquetes',     '¿Requiere tiquetes?',             'checkbox', NULL,                                                    NULL,                                                                                                                                                                                                                                                                'tiquetes',   120, TRUE)
ON CONFLICT (clave) DO NOTHING;

-- ============================================================================
-- 4) Asociación tipo_comisionado -> tipo_documento_soporte
-- ============================================================================
INSERT INTO travel_expenses.config_tipo_comisionado_documentos
  (config_tipo_comisionado_id, tipo_documento_soporte_id, tipo_requisito)
SELECT c.id, t.id, v.tipo_requisito
FROM (VALUES
  ('FUNCIONARIO',  'CDP',              'OBLIGATORIO'),
  ('FUNCIONARIO',  'RUT',              'OBLIGATORIO'),
  ('FUNCIONARIO',  'CERT_BANCARIA',    'OBLIGATORIO'),
  ('FUNCIONARIO',  'SEGURIDAD_SOCIAL', 'OBLIGATORIO'),
  ('CONTRATISTA',  'CDP',              'OBLIGATORIO'),
  ('CONTRATISTA',  'RUT',              'OBLIGATORIO'),
  ('CONTRATISTA',  'CERT_BANCARIA',    'OBLIGATORIO'),
  ('CONTRATISTA',  'SEGURIDAD_SOCIAL', 'OBLIGATORIO'),
  ('CONTRATISTA',  'CONTRATO_SECOP',   'OBLIGATORIO'),
  ('DOCENTE',      'CDP',              'OBLIGATORIO'),
  ('DOCENTE',      'RUT',              'OBLIGATORIO'),
  ('DOCENTE',      'CERT_BANCARIA',    'OBLIGATORIO'),
  ('DOCENTE',      'SEGURIDAD_SOCIAL', 'OPCIONAL'),
  ('ESTUDIANTE',   'RUT',              'OBLIGATORIO'),
  ('ESTUDIANTE',   'CERT_BANCARIA',    'OPCIONAL'),
  ('INVESTIGADOR', 'CDP',              'OBLIGATORIO'),
  ('INVESTIGADOR', 'RUT',              'OBLIGATORIO'),
  ('INVESTIGADOR', 'CERT_BANCARIA',    'OBLIGATORIO'),
  ('INVESTIGADOR', 'SEGURIDAD_SOCIAL', 'OPCIONAL')
) AS v(tipo_comisionado, codigo_documento, tipo_requisito)
JOIN travel_expenses.config_tipo_comisionado c ON c.tipo_comisionado = v.tipo_comisionado
JOIN travel_expenses.tipos_documento_soporte  t ON t.codigo           = v.codigo_documento
ON CONFLICT (config_tipo_comisionado_id, tipo_documento_soporte_id) DO NOTHING;

COMMIT;

RESET search_path;