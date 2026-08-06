-- ============================================================================
-- Migration: El estudio previo pasa de formulario a documento — HU EFDS-1146
--
-- Hallazgo (Isolución, proceso Adquisición de Bienes y Servicios):
-- la ESAP tiene CUATRO formatos oficiales aprobados del estudio previo, con
-- ~30 secciones, párrafos jurídicos precargados y cuatro firmas. Se diligencian
-- en Word y se firman; no son un formulario web.
--
-- En consecuencia el sistema GESTIONA LA CARGA del documento en vez de
-- reemplazarlo: ofrece el formato que corresponde a la modalidad, exige que se
-- adjunte el estudio diligenciado y guarda unos pocos metadatos para búsqueda,
-- trazabilidad y reportes.
-- ============================================================================

-- ------------------------------------------------- modalidad del proceso ----
-- El formato aplicable depende de la modalidad, así que deja de ser un dato
-- del formulario para ser propiedad del proceso.
ALTER TABLE hiring.procesos
  ADD COLUMN IF NOT EXISTS modalidad varchar(120);

-- ------------------------------------------------- formatos institucionales --
CREATE TABLE IF NOT EXISTS hiring.plantillas (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Código del Sistema Integrado de Gestión (Isolución)
  codigo        varchar(40)  NOT NULL,
  nombre        varchar(400) NOT NULL,
  numeral       varchar(20)  NOT NULL,
  version       varchar(10)  NOT NULL,
  fecha_aprobacion date,
  -- Modalidades a las que aplica el formato; vacío = todas
  modalidades   jsonb        NOT NULL DEFAULT '[]'::jsonb,
  archivo_url   text,
  activo        boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_plantilla_codigo_version UNIQUE (codigo, version)
);

CREATE INDEX IF NOT EXISTS idx_plantillas_numeral
  ON hiring.plantillas(numeral) WHERE activo;

-- Los cuatro formatos vigentes (versión y fecha según Isolución)
INSERT INTO hiring.plantillas (codigo, nombre, numeral, version, fecha_aprobacion, modalidades)
VALUES
  ('BS-FO-047',
   'Estudios previos para procesos de contratación por licitación pública, concurso de méritos, selección abreviada, mínima cuantía y convocatoria 092/2017',
   '3.1', '2', '2024-11-19',
   '["Licitación Pública","Selección Abreviada de Menor Cuantía","Selección Abreviada por Subasta Inversa","Enajenación de Bienes por Subasta","Selección Abreviada por Bolsa Mercantil","Concurso de Méritos Abierto","Concurso de Méritos con Precalificación","Mínima Cuantía","Régimen Especial Decreto 092/2017"]'::jsonb),

  ('BS-FO-046',
   'Estudios previos contratación prestación de servicios profesionales y de apoyo a la gestión',
   '3.1', '2', '2024-11-19',
   '["Contratación Directa"]'::jsonb),

  ('BS-FO-048',
   'Estudios previos para procesos de contratación directa diferente a prestación de servicios profesionales y de apoyo a la gestión con persona natural',
   '3.1', '2', '2024-11-19',
   '["Contratación Directa"]'::jsonb),

  ('BS-FO-061',
   'Estudios previos para procesos adelantados a través de Tienda Virtual del Estado Colombiano',
   '3.1', '1', '2024-11-19',
   '["Selección Abreviada por TVEC"]'::jsonb)
ON CONFLICT (codigo, version) DO NOTHING;

-- --------------------------------------------------------- metadatos 3.1 ----
-- Los 16 campos anteriores intentaban reemplazar el documento. Se reemplazan
-- por los datos que el sistema necesita para buscar, filtrar y reportar; el
-- contenido sustantivo vive en el documento adjunto.
DELETE FROM hiring.campos_formulario WHERE numeral = '3.1';

INSERT INTO hiring.campos_formulario
  (numeral, codigo, etiqueta, ayuda, tipo, obligatorio, grupo, orden, opciones)
VALUES
  ('3.1', 'objeto_contratar', 'Objeto del contrato',
   'Tal como quedó redactado en el estudio previo. Verbo en presente + sustantivo + complemento.',
   'texto_largo', true, 'Identificación', 10, NULL),

  ('3.1', 'area_solicitante', 'Área solicitante',
   'Dependencia que requiere la contratación.',
   'texto', true, 'Identificación', 20, NULL),

  ('3.1', 'responsable_area', 'Responsable del área',
   'Director o jefe de la dependencia solicitante.',
   'texto', true, 'Identificación', 30, NULL),

  ('3.1', 'linea_paa', 'Línea del Plan Anual de Adquisiciones',
   'Si la necesidad no está en el PAA, no continúe hasta su modificación y publicación.',
   'texto', true, 'Identificación', 40, NULL),

  ('3.1', 'modalidad_propuesta', 'Modalidad de selección',
   'Determina cuál de los formatos oficiales aplica.',
   'seleccion', true, 'Contratación', 50,
   '["Licitación Pública","Selección Abreviada de Menor Cuantía","Selección Abreviada por Subasta Inversa","Enajenación de Bienes por Subasta","Selección Abreviada por TVEC","Selección Abreviada por Bolsa Mercantil","Concurso de Méritos Abierto","Concurso de Méritos con Precalificación","Mínima Cuantía","Régimen Especial Decreto 092/2017","Contratación Directa"]'::jsonb),

  ('3.1', 'tipologia_contractual', 'Tipología contractual',
   NULL, 'seleccion', true, 'Contratación', 60,
   '["Prestación de servicios","Prestación de servicios profesionales y de apoyo a la gestión","Suministro","Compraventa","Contrato Interadministrativo","Convenio Interadministrativo","Comodato","Mandato","Convenio Marco","Consultoría / Interventoría","Obra pública","Concesión","Asociación público-privada","Arrendamiento","Convenio de Asociación DL 092/2017","Otros tipos de contrato"]'::jsonb),

  ('3.1', 'fundamento_juridico', 'Fundamento jurídico',
   'Marco normativo que sustenta la contratación (Ley 80/1993, Ley 1150/2007).',
   'seleccion', true, 'Contratación', 70,
   '["Ley 80 de 1993","Ley 1150 de 2007","Ley 80 de 1993 y Ley 1150 de 2007","Decreto 1082 de 2015"]'::jsonb),

  ('3.1', 'valor_estimado', 'Valor estimado del contrato',
   'Presupuesto oficial en pesos, según el análisis del sector.',
   'moneda', true, 'Valor y plazo', 80, NULL),

  ('3.1', 'plazo_ejecucion_dias', 'Plazo de ejecución (días)',
   NULL, 'numero', true, 'Valor y plazo', 90, NULL),

  ('3.1', 'lugar_ejecucion', 'Lugar de ejecución',
   NULL, 'texto', false, 'Valor y plazo', 100, NULL),

  ('3.1', 'requiere_interventoria', 'Requiere interventoría',
   'Los contratos de obra adjudicados por licitación deben contar con interventoría.',
   'seleccion', false, 'Supervisión', 110,
   '["Sí","No"]'::jsonb),

  ('3.1', 'cargo_supervisor', 'Cargo de quien ejercerá la supervisión',
   NULL, 'texto', false, 'Supervisión', 120, NULL)
;

-- ------------------------------------- documento obligatorio de la actividad --
-- El envío a revisión exige el estudio previo firmado; sin él la actividad
-- estaría incompleta aunque los metadatos estén diligenciados.
ALTER TABLE hiring.campos_formulario
  ADD COLUMN IF NOT EXISTS requiere_documento boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN hiring.campos_formulario.requiere_documento IS
  'Reservado para actividades cuyo entregable es un documento, no un dato.';

-- Marca la actividad 3.1 como documental
ALTER TABLE hiring.proceso_actividades
  ADD COLUMN IF NOT EXISTS documento_requerido boolean NOT NULL DEFAULT false;

UPDATE hiring.proceso_actividades
   SET documento_requerido = true
 WHERE numeral = '3.1';
