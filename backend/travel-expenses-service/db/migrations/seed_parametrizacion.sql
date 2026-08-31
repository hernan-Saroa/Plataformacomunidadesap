-- ============================================================================
-- seed_parametrizacion.sql
-- Description: Datos iniciales (idempotentes) para las tablas de
--              parametrización del módulo de viáticos:
--                - tipos_documento_soporte
--                - config_tipo_comisionado
--                - config_campos_formulario
--                - config_tipo_comisionado_documentos
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
  ('CDP',             'CDP - Certificado de Disponibilidad Presupuestal', 'Documento que respalda la disponibilidad presupuestal para la comisión.', TRUE),
  ('RUT',             'RUT - Registro Único Tributario',                  'Registro Único Tributario del comisionado.',                                 TRUE),
  ('CERT_BANCARIA',   'Certificación Bancaria',                           'Certificación de la cuenta bancaria donde se consignarán los viáticos.',     TRUE),
  ('SEGURIDAD_SOCIAL','Seguridad Social',                                 'Acreditación de pago de seguridad social vigente.',                          TRUE),
  ('CONTRATO_SECOP',  'Contrato SECOP',                                   'Contrato vigente registrado en SECOP (para contratistas).',                  TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 2) Configuración por tipo de comisionado
-- ============================================================================
INSERT INTO travel_expenses.config_tipo_comisionado
  (tipo_comisionado, codigo_formulario, campos_obligatorios, campos_opcionales, campos_ocultos, activo)
VALUES
  ('FUNCIONARIO', 'FMT023_FUNCIONARIO',
   '["numero_documento","primer_nombre","primer_apellido","email","telefono_contacto","destino_ciudad","destino_departamento","fecha_inicio","fecha_fin","objeto_comision","prioridad","rubro_presupuestal"]'::jsonb,
   '["segundo_nombre","segundo_apellido","requiere_tiquetes"]'::jsonb,
   '["autorizacion_habeas_data"]'::jsonb,
   TRUE),
  ('CONTRATISTA', 'FMT023_CONTRATISTA',
   '["numero_documento","primer_nombre","primer_apellido","email","telefono_contacto","destino_ciudad","destino_departamento","fecha_inicio","fecha_fin","objeto_comision","prioridad","rubro_presupuestal"]'::jsonb,
   '["segundo_nombre","segundo_apellido","requiere_tiquetes"]'::jsonb,
   '[]'::jsonb,
   TRUE),
  ('DOCENTE', 'FMT023_DOCENTE',
   '["numero_documento","primer_nombre","primer_apellido","email","telefono_contacto","destino_ciudad","destino_departamento","fecha_inicio","fecha_fin","objeto_comision","prioridad","rubro_presupuestal"]'::jsonb,
   '["segundo_nombre","segundo_apellido","requiere_tiquetes"]'::jsonb,
   '[]'::jsonb,
   TRUE),
  ('ESTUDIANTE', 'FMT023_ESTUDIANTE',
   '["numero_documento","primer_nombre","primer_apellido","email","destino_ciudad","destino_departamento","fecha_inicio","fecha_fin","objeto_comision","prioridad","rubro_presupuestal"]'::jsonb,
   '["segundo_nombre","segundo_apellido","telefono_contacto","requiere_tiquetes"]'::jsonb,
   '[]'::jsonb,
   TRUE),
  ('INVESTIGADOR', 'FMT023_INVESTIGADOR',
   '["numero_documento","primer_nombre","primer_apellido","email","telefono_contacto","destino_ciudad","destino_departamento","fecha_inicio","fecha_fin","objeto_comision","prioridad","rubro_presupuestal"]'::jsonb,
   '["segundo_nombre","segundo_apellido","requiere_tiquetes"]'::jsonb,
   '[]'::jsonb,
   TRUE)
ON CONFLICT (tipo_comisionado) DO NOTHING;

-- ============================================================================
-- 3) Campos del formulario (config_campos_formulario)
-- ============================================================================
INSERT INTO travel_expenses.config_campos_formulario
  (clave, etiqueta, tipo_campo, placeholder, opciones, grupo, orden, activo)
VALUES
  ('numero_documento',         'Número de documento',             'text',     'Ej. 123456789',                       NULL,                                                       'identidad',     10, TRUE),
  ('primer_nombre',           'Primer nombre',                    'text',     'Ingrese su primer nombre',             NULL,                                                       'identidad',     20, TRUE),
  ('segundo_nombre',          'Segundo nombre',                   'text',     'Ingrese su segundo nombre (opcional)', NULL,                                                       'identidad',     30, TRUE),
  ('primer_apellido',         'Primer apellido',                  'text',     'Ingrese su primer apellido',           NULL,                                                       'identidad',     40, TRUE),
  ('segundo_apellido',        'Segundo apellido',                 'text',     'Ingrese su segundo apellido (opcional)', NULL,                                                     'identidad',     50, TRUE),
  ('email',                   'Correo electrónico',               'email',    'usuario@esap.edu.co',                  NULL,                                                       'contacto',      60, TRUE),
  ('telefono_contacto',       'Teléfono de contacto',             'tel',      '3001234567',                           NULL,                                                       'contacto',      70, TRUE),
  ('destino_ciudad',          'Ciudad de destino',                'text',     'Ciudad donde se realizará la comisión', NULL,                                                       'comision',      80, TRUE),
  ('destino_departamento',    'Departamento de destino',          'text',     'Departamento de destino',              NULL,                                                       'comision',      90, TRUE),
  ('fecha_inicio',            'Fecha de inicio',                  'date',     'YYYY-MM-DD',                           NULL,                                                       'comision',     100, TRUE),
  ('fecha_fin',               'Fecha de finalización',            'date',     'YYYY-MM-DD',                           NULL,                                                       'comision',     110, TRUE),
  ('objeto_comision',         'Objeto de la comisión',            'textarea', 'Describa brevemente el objeto de la comisión', NULL,                                              'comision',     120, TRUE),
  ('prioridad',               'Prioridad',               'select',   NULL,                                    '[{"value":"ALTA","label":"Alta"},{"value":"MEDIA","label":"Media"},{"value":"BAJA","label":"Baja"}]'::jsonb, 'comision',     130, TRUE),
  ('rubro_presupuestal',      'Rubro presupuestal',               'text',     'Código del rubro',                     NULL,                                                       'presupuesto',   140, TRUE),
  ('requiere_tiquetes',       '¿Requiere tiquetes?',              'checkbox', NULL,                                    NULL,                                                       'tiquetes',      150, TRUE),
  ('autorizacion_habeas_data','Autorización Habeas Data',         'checkbox', NULL,                                    NULL,                                                       'legal',         160, TRUE)
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