-- ============================================================================
-- 035 · Contrato electrónico y aceptación del proponente (actividad 8.1)
--
-- EFDS-1161 (RF-ADJ-03, RF-DOC-03, RF-SIS-05): adjudicado el proceso, la
-- entidad elabora el contrato a partir del formato de su tipología y el
-- proponente lo acepta. Esa aceptación es la que formaliza el vínculo.
--
-- El contrato NO se compone dentro del sistema. Mismo criterio que EFDS-1149
-- con los documentos del proceso: la ESAP tiene formatos aprobados en el SIG
-- que se diligencian fuera y se firman. Autogenerar la minuta exigiría un
-- motor de plantillas y un mapeo campo a campo que los documentos fuente no
-- definen, y dejaría a la entidad suscribiendo un texto que nadie redactó.
-- Aquí se registra cuál formato se usó, quién subió la minuta diligenciada y
-- quién la aceptó, que es lo que el expediente tiene que poder demostrar.
--
-- Primera actividad de la etapa 8. Los numerales ya están en la matriz de la
-- migración 030, así que no se insertan de nuevo.
-- ============================================================================

-- --------------------------------------------- las tipologías de contrato --
-- La historia habla de 16 tipologías sin listarlas, y los documentos fuente que
-- tenemos tampoco las enumeran. Se siembran las que la entidad usa de forma
-- corriente y la carga queda idempotente: cuando Contratación entregue la lista
-- completa se añaden las que falten sin tocar las existentes.
--
-- `numeral_formato` apunta a la biblioteca de formatos del SIG (EFDS-1419) en
-- lugar de guardar aquí una ruta de archivo. Abrir un segundo repositorio de
-- plantillas dejaría dos sitios donde actualizar el mismo formato, y tarde o
-- temprano uno de los dos quedaría viejo.
CREATE TABLE IF NOT EXISTS hiring.tipologias_contrato (
  codigo           varchar(60) PRIMARY KEY,
  nombre           varchar(200) NOT NULL,
  descripcion      text,

  -- Numeral de la matriz cuyo formato del SIG sirve de minuta. Sin llave
  -- foránea a hiring.plantillas: el formato puede no estar cargado todavía y
  -- eso no debe impedir que la tipología exista.
  numeral_formato  varchar(20)  NOT NULL DEFAULT '8.1',

  -- Si la tipología exige garantías. Lo consumirá EFDS-1164; se declara aquí
  -- porque es un atributo de la tipología, no de la legalización.
  exige_garantias  boolean      NOT NULL DEFAULT true,

  activo           boolean      NOT NULL DEFAULT true,
  orden            int          NOT NULL DEFAULT 100
);

COMMENT ON TABLE hiring.tipologias_contrato IS
  'Tipologías de contrato y el formato del SIG que sirve de minuta (EFDS-1161).';

INSERT INTO hiring.tipologias_contrato (codigo, nombre, descripcion, exige_garantias, orden) VALUES
  ('PRESTACION_SERVICIOS_PN',
   'Prestación de servicios profesionales y de apoyo (persona natural)',
   'Contrato con persona natural para actividades profesionales o de apoyo a la gestión.',
   false, 10),
  ('PRESTACION_SERVICIOS_PJ',
   'Prestación de servicios (persona jurídica)',
   'Contrato con persona jurídica para la prestación de servicios.',
   true, 20),
  ('SUMINISTRO',
   'Suministro',
   'Entrega sucesiva de bienes en las cantidades y periodos pactados.',
   true, 30),
  ('COMPRAVENTA',
   'Compraventa',
   'Adquisición de bienes con entrega única.',
   true, 40),
  ('OBRA_PUBLICA',
   'Obra pública',
   'Construcción, mantenimiento o instalación sobre bienes inmuebles de la entidad.',
   true, 50),
  ('CONSULTORIA',
   'Consultoría',
   'Estudios, diagnósticos, diseños e interventoría de proyectos.',
   true, 60),
  ('INTERVENTORIA',
   'Interventoría',
   'Seguimiento técnico, administrativo y financiero a la ejecución de otro contrato.',
   true, 70),
  ('ARRENDAMIENTO',
   'Arrendamiento',
   'Uso y goce de un bien a cambio de un canon.',
   true, 80),
  ('SEGUROS',
   'Seguros',
   'Amparo de los bienes e intereses patrimoniales de la entidad.',
   true, 90),
  ('CONVENIO_ASOCIACION',
   'Convenio de asociación',
   'Asociación con entidades sin ánimo de lucro (Decreto 092 de 2017).',
   false, 100),
  ('CONVENIO_INTERADMINISTRATIVO',
   'Convenio interadministrativo',
   'Cooperación entre entidades públicas para un fin común.',
   false, 110),
  ('COMODATO',
   'Comodato',
   'Préstamo de uso de un bien a título gratuito.',
   false, 120)
ON CONFLICT (codigo) DO NOTHING;

-- ------------------------------------------------------------ el contrato --
CREATE TABLE IF NOT EXISTS hiring.contratos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            uuid         NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  tipologia             varchar(60)  NOT NULL REFERENCES hiring.tipologias_contrato(codigo),

  -- Número de contrato de la entidad, el que va en la minuta. Único en el
  -- sistema porque dos contratos con el mismo número no se pueden distinguir en
  -- ningún archivo, ni el físico ni este.
  numero                varchar(60)  NOT NULL,
  objeto                text         NOT NULL,

  valor                 numeric(18,2) NOT NULL,
  plazo_dias            int,

  -- El proponente adjudicatario. Se copian los datos y no se referencia al
  -- oferente: el contrato dice con quién se contrató ese día, y si mañana se
  -- corrige el registro del oferente, el contrato tiene que seguir diciendo lo
  -- que la minuta dice.
  contratista_documento varchar(40)  NOT NULL,
  contratista_nombre    varchar(300) NOT NULL,
  -- Determina si en la legalización se exige ARL (EFDS-1164, criterio 2). Se
  -- guarda aquí porque es un dato del contratista al momento de contratar, no
  -- una casilla que alguien marque después.
  contratista_tipo      varchar(20)  NOT NULL,

  -- La minuta diligenciada que se subió. Es el documento, no una plantilla.
  minuta_documento_id   uuid         NOT NULL REFERENCES hiring.documentos(id),
  -- De qué formato del SIG salió. Nullable porque la biblioteca puede no tener
  -- cargado el formato de esa tipología todavía, y eso no debe impedir contratar
  -- con un documento elaborado por fuera.
  plantilla_id          uuid         REFERENCES hiring.plantillas(id),

  estado                varchar(20)  NOT NULL DEFAULT 'GENERADO',

  generado_por          varchar(200),
  generado_at           timestamptz  NOT NULL DEFAULT now(),

  -- La aceptación del proponente. Sin quién y cuándo, «el sistema registra la
  -- aceptación» no se sostiene ante una controversia: sería una casilla marcada.
  aceptado_at           timestamptz,
  aceptado_por          varchar(200),
  aceptado_observacion  text,

  rechazado_at          timestamptz,
  rechazado_por         varchar(200),
  motivo_rechazo        text,

  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_contrato_numero UNIQUE (numero),
  CONSTRAINT ck_contrato_tipo_persona CHECK (contratista_tipo IN ('NATURAL', 'JURIDICA')),
  CONSTRAINT ck_contrato_estado CHECK (estado IN ('GENERADO', 'ACEPTADO', 'RECHAZADO')),
  CONSTRAINT ck_contrato_valor CHECK (valor > 0),

  -- Un contrato aceptado tiene siempre cuándo y quién; uno rechazado, además,
  -- por qué. Es lo que separa un estado de una afirmación sin respaldo.
  CONSTRAINT ck_contrato_aceptado CHECK (
    estado <> 'ACEPTADO'
    OR (aceptado_at IS NOT NULL AND aceptado_por IS NOT NULL)
  ),
  CONSTRAINT ck_contrato_rechazado CHECK (
    estado <> 'RECHAZADO'
    OR (rechazado_at IS NOT NULL AND motivo_rechazo IS NOT NULL)
  )
);

-- Un solo contrato por proceso mientras no esté rechazado. Índice parcial y no
-- UNIQUE a secas: si el proponente rechaza la minuta, la entidad corrige y
-- genera otra, y las dos tienen que quedar en el expediente. Un contrato
-- rechazado existió y explica por qué hay dos minutas para el mismo proceso.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contrato_vigente
  ON hiring.contratos (proceso_id)
  WHERE estado <> 'RECHAZADO';

CREATE INDEX IF NOT EXISTS ix_contratos_proceso ON hiring.contratos (proceso_id);

COMMENT ON TABLE hiring.contratos IS
  'Contratos generados a partir del formato de su tipología, con la aceptación del proponente (EFDS-1161).';
