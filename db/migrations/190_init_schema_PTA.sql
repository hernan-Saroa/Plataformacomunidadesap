--
-- PostgreSQL database dump
--

-- Dumped from database version 16.0
-- Dumped by pg_dump version 16.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Required by defaults like `gen_random_uuid()` used in several tables.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- DROP SCHEMA IF EXISTS academic_work_plan CASCADE;

CREATE SCHEMA academic_work_plan;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AprobacionJefatura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."AprobacionJefatura" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "ptaId" text NOT NULL,
    "jefaturaUserId" text DEFAULT ''::text NOT NULL,
    "jefaturaRol" text DEFAULT 'Jefatura de Zona'::text NOT NULL,
    "territorialId" text NOT NULL,
    "territorialNombre" text,
    decision text DEFAULT 'pendiente'::text NOT NULL,
    comentarios text,
    "camposModificados" jsonb,
    "componentesBloqueados" jsonb,
    "firmaId" text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: Asignatura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Asignatura" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "programaId" text NOT NULL,
    nombre text NOT NULL,
    codigo text,
    creditos integer DEFAULT 3 NOT NULL,
    horas integer DEFAULT 144 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "nucleoTematico" text,
    semestre text
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."AuditLog" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    usuario_id text,
    usuario_nombre text,
    usuario_email text,
    accion text NOT NULL,
    modulo text NOT NULL,
    entidad_tipo text,
    entidad_id text,
    detalles text DEFAULT ''::text NOT NULL,
    resultado text DEFAULT 'EXITO'::text NOT NULL,
    ip_address text
);


--
-- Name: CarpetaDigital; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."CarpetaDigital" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "personaId" text NOT NULL,
    estado text DEFAULT 'ACTIVO'::text NOT NULL,
    "totalDocumentos" integer DEFAULT 0 NOT NULL,
    "documentosRechazados" integer DEFAULT 0 NOT NULL,
    "ultimaActualizacion" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Certificado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Certificado" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "personaId" text NOT NULL,
    tipo text NOT NULL,
    estado text DEFAULT 'PENDIENTE'::text NOT NULL,
    "codigoQR" text,
    "fechaEmision" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Concertacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Concertacion" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "ptaId" text NOT NULL,
    "autorId" text NOT NULL,
    "autorRol" text NOT NULL,
    mensaje text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ConfiguracionSistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."ConfiguracionSistema" (
    clave text NOT NULL,
    valor jsonb NOT NULL,
    descripcion text,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DetallesPta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."DetallesPta" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "ptaId" text NOT NULL,
    "asignaturaId" text NOT NULL,
    grupo text,
    horas integer NOT NULL,
    modalidad text DEFAULT 'PRESENCIAL'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estudiantes integer DEFAULT 25 NOT NULL,
    "territorialId" text,
    "cetapId" text,
    "fechaInicio" date,
    "fechaFin" date,
    observaciones text
);


--
-- Name: Docente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Docente" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "personaId" text NOT NULL,
    "territorialId" text NOT NULL,
    "tipoVinculacion" text NOT NULL,
    dedicacion text NOT NULL,
    estado text DEFAULT 'ACTIVO'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    escalafon text,
    "horasAsignables" integer DEFAULT 0 NOT NULL,
    "sedeId" text,
    "ordenListado" integer,
    "vinculacionDisplay" text,
    "dedicacionDisplay" text,
    "nucleoTematico" text,
    "nivelFormacion" text,
    "perfilAcademicoPro" text,
    "perfilAcademico" text,
    pregrado text,
    especializacion text,
    maestria text,
    doctorado text,
    "posDoctorado" text,
    investigacion text,
    "origenVinculacion" text,
    "actoAdministrativoVinculacion" text,
    "correoInstitucional" text,
    "ultimaEvaluacion" text,
    "situacionAdministrativa" text,
    "fechaInicioVinculacion" timestamp(3) without time zone,
    "fechaFinVinculacion" timestamp(3) without time zone,
    "puntajeSalarial" double precision,
    "edadReferencia" integer,
    "rangoEdad" text
);


--
-- Name: Documento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Documento" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "personaId" text NOT NULL,
    nombre text NOT NULL,
    url text NOT NULL,
    tipo text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    categoria text DEFAULT 'general'::text,
    comentarios text,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    "tamanoBytes" integer DEFAULT 0 NOT NULL,
    "tipoDocumentoId" text,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "versionActual" integer DEFAULT 1 NOT NULL,
    "aprobadoPorId" text,
    "aprobadoPorNombre" text
);


--
-- Name: DocumentoVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."DocumentoVersion" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "documentoId" text NOT NULL,
    version integer NOT NULL,
    url text NOT NULL,
    nombre text NOT NULL,
    "tamanoBytes" integer DEFAULT 0 NOT NULL,
    "creadoPor" text,
    comentarios text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: HistorialEstadoPTA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."HistorialEstadoPTA" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "ptaId" text NOT NULL,
    "estadoAnterior" text,
    "estadoNuevo" text NOT NULL,
    "actorId" text,
    "actorRol" text,
    "detallesTransicion" text,
    comentarios text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer,
    "camposModificados" jsonb,
    "tipoAccion" text,
    "snapshotPta" jsonb
);


--
-- Name: COLUMN "HistorialEstadoPTA"."tipoAccion"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN academic_work_plan."HistorialEstadoPTA"."tipoAccion" IS 'Clasificación de la acción para filtrado en la UI del historial.';


--
-- Name: PTAUserData; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."PTAUserData" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "userId" text NOT NULL,
    tags jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes jsonb DEFAULT '{}'::jsonb NOT NULL,
    pinned jsonb DEFAULT '[]'::jsonb NOT NULL,
    priority jsonb DEFAULT '[]'::jsonb NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: Permiso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Permiso" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    recurso text NOT NULL,
    accion text NOT NULL,
    descripcion text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Persona; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Persona" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "usuarioId" text NOT NULL,
    identificacion text,
    tipo_identificacion text,
    telefono text,
    direccion text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    primer_nombre text,
    segundo_nombre text,
    primer_apellido text,
    segundo_apellido text,
    genero text,
    fecha_nacimiento timestamp(3) without time zone,
    extension_telefonica text,
    correo_alternativo text,
    tipo_usuario text,
    empresa_contratista text,
    dependencia_grupo_programa text,
    ubicacion_fisica text,
    cargo_semestre text,
    nombre_jefe_dependencia text,
    contrato text,
    tiempo_contrato_resolucion text,
    fecha_fin_contrato timestamp(3) without time zone,
    aplicacion text,
    observaciones text
);


--
-- Name: PersonaPrograma; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."PersonaPrograma" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "personaId" text NOT NULL,
    "programaId" text NOT NULL,
    "rolEnPrograma" text DEFAULT 'Estudiante'::text NOT NULL,
    "semestreActual" text,
    estado text DEFAULT 'Activo'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PlanTrabajoAcademico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."PlanTrabajoAcademico" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "docenteId" text NOT NULL,
    periodo text NOT NULL,
    estado text DEFAULT 'BORRADOR'::text NOT NULL,
    "horasTotales" integer DEFAULT 0 NOT NULL,
    observaciones text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "datosEstructurados" jsonb,
    dedicacion text,
    "horasAsignables" integer,
    "semanasVinculacion" integer,
    "tipoVinculacion" text,
    version integer DEFAULT 1 NOT NULL,
    "nivelDevolucion" integer,
    "camposModificadosPorRevisor" jsonb,
    "snapshotAntesRevision" jsonb,
    "motivoDevolucion" text,
    "ultimoActorRol" text
);


--
-- Name: COLUMN "PlanTrabajoAcademico".version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN academic_work_plan."PlanTrabajoAcademico".version IS 'Versión lógica del PTA. Inicia en 1. Incrementa cada vez que el docente re-envía el PTA tras una devolución.';


--
-- Name: COLUMN "PlanTrabajoAcademico"."nivelDevolucion"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN academic_work_plan."PlanTrabajoAcademico"."nivelDevolucion" IS 'Nivel al que regresa el PTA cuando el docente lo re-envíe tras una revisión. 1=Jefatura, 2=Decanatura, 3=G.Profesoral.';


--
-- Name: COLUMN "PlanTrabajoAcademico"."camposModificadosPorRevisor"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN academic_work_plan."PlanTrabajoAcademico"."camposModificadosPorRevisor" IS 'Mapa de campos que el revisor modificó en la última iteración. Usado para highlighting visual en el portal del docente. Se limpia al iniciar la siguiente fase.';


--
-- Name: COLUMN "PlanTrabajoAcademico"."snapshotAntesRevision"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN academic_work_plan."PlanTrabajoAcademico"."snapshotAntesRevision" IS 'Copia de datosEstructurados justo antes de que el revisor lo modificara. Permite comparación visual.';


--
-- Name: Programa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Programa" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    estado text DEFAULT 'ACTIVO'::text NOT NULL,
    nivel text DEFAULT 'PREGRADO'::text NOT NULL,
    facultad text DEFAULT 'Facultad de Pregrado'::text
);


--
-- Name: PtaEvidencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."PtaEvidencia" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "ptaId" text NOT NULL,
    nombre text NOT NULL,
    "tipoArchivo" text NOT NULL,
    "tamanioBytes" integer DEFAULT 0 NOT NULL,
    categoria text,
    "componentePta" text,
    "horasAvance" integer DEFAULT 0 NOT NULL,
    "storagePath" text,
    "storageUrl" text,
    "subidoPor" text,
    descripcion text,
    estado text DEFAULT 'activo'::text NOT NULL,
    "estadoRevision" text DEFAULT 'pendiente'::text NOT NULL,
    "revisadoPor" text,
    "fechaRevision" timestamp with time zone,
    "comentarioRevision" text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: Rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Rol" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    "isSystem" boolean DEFAULT false NOT NULL,
    estado text DEFAULT 'ACTIVO'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RolPermiso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."RolPermiso" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "rolId" text NOT NULL,
    "permisoId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Sede; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Sede" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "territorialId" text NOT NULL,
    nombre text NOT NULL,
    municipio text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    codigo text
);


--
-- Name: SistemaAlerta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."SistemaAlerta" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tipo text NOT NULL,
    severidad text DEFAULT 'ALTA'::text NOT NULL,
    mensaje text NOT NULL,
    "entidadId" text,
    "entidadRef" text,
    resuelta boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: SolicitudPTA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."SolicitudPTA" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "docenteId" text NOT NULL,
    "docenteNombre" text NOT NULL,
    "docenteEmail" text,
    caso text NOT NULL,
    razon text NOT NULL,
    justificacion text NOT NULL,
    "casoLibre" text,
    archivos jsonb,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    "resueltoPor" text,
    "resolucionFecha" timestamp with time zone,
    "resolucionMotivo" text,
    "resolucionAccion" text,
    "territorialNueva" text,
    "horasPtaOriginal" integer,
    "horasPtaNuevo" integer,
    "notificacionLeida" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: Territorial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Territorial" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    nombre text NOT NULL,
    codigo text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."Usuario" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    nombre text,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UsuarioRol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE academic_work_plan."UsuarioRol" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "usuarioId" text NOT NULL,
    "rolId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: AprobacionJefatura; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Asignatura; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."Asignatura" VALUES ('bd56834c-bd92-4e2b-b246-358a7db317e0', 'AP-01', 'Fundamentos de Administración', 'AP101', 3, 144, '2026-03-26 19:07:09.173', '2026-03-26 19:07:09.173', NULL, NULL);
INSERT INTO academic_work_plan."Asignatura" VALUES ('b2127626-a4f0-47f7-9a18-e8e99e55f61f', 'AP-01', 'Políticas Públicas', 'AP201', 3, 144, '2026-03-26 19:07:09.178', '2026-03-26 19:07:09.178', NULL, NULL);
INSERT INTO academic_work_plan."Asignatura" VALUES ('b34e104a-16f6-4940-b14b-d625f4909b9b', 'AP-01', 'Hacienda Pública', 'AP301', 3, 96, '2026-03-26 19:07:09.181', '2026-03-26 19:07:09.181', NULL, NULL);
INSERT INTO academic_work_plan."Asignatura" VALUES ('ad883052-e1d5-452e-ac5d-84ec3d925526', 'AP-01', 'Derecho Constitucional', 'AP401', 3, 144, '2026-03-26 19:07:09.185', '2026-03-26 19:07:09.185', NULL, NULL);
INSERT INTO academic_work_plan."Asignatura" VALUES ('df29b24e-7645-468e-bf4a-cc497a85781f', 'AP_Diurno', 'Organización Pública Colombiana (AP_día)', 'AP_Diurno-ASIG-48', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.05', 'Economía Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7c0f9074-adf6-408a-8c8f-973f80da6a3c', 'AP_Diurno', 'Cultura Y Desarrollo Humano (AP_día)', 'AP_Diurno-ASIG-4', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:24.993', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2a2c4e2e-4b21-4f65-8651-2772882cd752', 'AP_Diurno', 'Demografía (AP_día)', 'AP_Diurno-ASIG-5', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:24.995', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('040d4257-8ce3-4414-9eb9-95d87149ef7d', 'AP_Diurno', 'Derecho Constitucional (AP_día)', 'AP_Diurno-ASIG-6', 4, 192, '2026-03-27 21:06:16.456', '2026-04-02 11:55:24.997', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('92c4b2b2-c8cc-48ac-ba61-9e0b0f9a2c28', 'AP_Diurno', 'Derecho Público I (AP_día)', 'AP_Diurno-ASIG-7', 4, 192, '2026-03-27 21:06:16.456', '2026-04-02 11:55:24.999', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('275683b0-981b-4a1c-b648-a9693e13407a', 'AP_Diurno', 'Derecho Público II (AP_día)', 'AP_Diurno-ASIG-8', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.002', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d7b80f22-8bbc-465f-a3f8-1b2ce086c5a6', 'AP_Diurno', 'Derechos Humanos Y Negociación De Conflictos (AP_día)', 'AP_Diurno-ASIG-10', 2, 96, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.005', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a8c80f57-a7f4-426f-af35-0d32f623707a', 'AP_Diurno', 'Economia Pública I (AP_día)', 'AP_Diurno-ASIG-11', 2, 96, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.007', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c1429b2f-e713-4421-902c-915355dab8ba', 'AP_Diurno', 'Economia Pública II (AP_día)', 'AP_Diurno-ASIG-12', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.008', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('87a3c29f-d430-49bf-acef-69e315cd6db6', 'AP_Diurno', 'Electiva De Énfasis I (AP_día)', 'AP_Diurno-ASIG-13', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.009', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0b58b131-3956-47d9-aad2-6a6af5154a07', 'AP_Diurno', 'Electiva General I (AP_día)', 'AP_Diurno-ASIG-15', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.012', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('29fdf31d-730b-41b5-96dc-435f70f8b865', 'AP_Diurno', 'Electiva General II (AP_día)', 'AP_Diurno-ASIG-16', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.013', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ae697a52-a579-4261-bfad-e7bf0cc04223', 'AP_Diurno', 'Electiva I (AP_día)', 'AP_Diurno-ASIG-17', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.015', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1c87b87f-c7f4-469d-96dd-0bb36ac81925', 'AP_Diurno', 'Estadística I (AP_día)', 'AP_Diurno-ASIG-18', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.016', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('060fb469-0b90-43a6-96c1-5ec541a9c78d', 'AP_Diurno', 'Estadística II (AP_día)', 'AP_Diurno-ASIG-19', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.018', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('b00c582c-f7c1-444e-a9b0-35d25996aec2', 'AP_Diurno', 'Finanzas y análisis financiero público (AP_día)', 'AP_Diurno-ASIG-21', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.022', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5b32be08-3e5d-4cd6-af23-7426dd2a38e4', 'AP_Diurno', 'Formas Asociativas Contemporáneos Del Poder, El Estado Y El Gobierno (AP_día)', 'AP_Diurno-ASIG-22', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.023', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ae55bbeb-1d14-4a38-83c1-4185eb373722', 'AP_Diurno', 'Función Pública Colombiana Y Comparada (AP_día)', 'AP_Diurno-ASIG-23', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.025', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4ef48907-08cb-409e-bbe0-92ab868c8c8b', 'AP_Diurno', 'Fundamentos De Problematización Sobre Lo Público (AP_día)', 'AP_Diurno-ASIG-25', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.027', 'Desarrollo Y Gestión Territorial', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f04b6398-cf28-49e1-9de7-b3c53cbfe3b5', 'AP_Diurno', 'Fundamentos Sociológicos (AP_día)', 'AP_Diurno-ASIG-26', 4, 192, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.028', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('17223d20-ee80-4326-9c19-e86826a18a76', 'AP_Diurno', 'Gerencia Pública Integral (AP_día)', 'AP_Diurno-ASIG-27', 4, 192, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.029', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d39c2405-04da-4702-ad41-35170331bdf4', 'AP_Diurno', 'Gestión De Grupos Y Redes (AP_día)', 'AP_Diurno-ASIG-28', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.03', 'Economía Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6fb7e101-9e80-4772-bd5f-4809fcd992be', 'AP_Diurno', 'Gestión De Servicios Públicos (AP_día)', 'AP_Diurno-ASIG-29', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.032', 'Economía Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9c09d740-8ce7-4ace-b1b8-283efc93cd5f', 'AP_Diurno', 'Gestión Del Territorio Colombiano (AP_día)', 'AP_Diurno-ASIG-31', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.033', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d8e3a3e6-0226-4519-91f4-6383d6bfa992', 'AP_Diurno', 'Historia de la administración pública  (AP_día)', 'AP_Diurno-ASIG-32', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.035', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e0d915f3-c045-4441-88a7-d39d63486511', 'AP_Diurno', 'Historia Del Pensamiento Político (AP_día)', 'AP_Diurno-ASIG-33', 2, 96, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.036', 'Idioma Extranjero', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c46b6e40-5bcd-458d-8961-8bacca5965fa', 'AP_Diurno', 'Historia Del Pensamiento Político (AP_día)', 'AP_Diurno-ASIG-34', 2, 96, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.037', 'Idioma Extranjero', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5761c95b-57a7-4fcb-8777-9a6ad8dd07df', 'AP_Diurno', 'Historia Social Y Política De La Administración Pública Colombiana II (AP_día)', 'AP_Diurno-ASIG-36', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.039', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('84210b57-e361-476b-8088-69f08cc807ea', 'AP_Diurno', 'Idioma I (AP_día)', 'AP_Diurno-ASIG-37', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.04', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('021b34c3-7825-4937-bdde-4b527df6e2b6', 'AP_Diurno', 'Idioma II (AP_día)', 'AP_Diurno-ASIG-38', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.04', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('85cdaed4-1396-4fba-82f1-ae0c331d6d82', 'AP_Diurno', 'Idioma III (AP_día)', 'AP_Diurno-ASIG-39', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.042', 'Fundamentación Cuantitativa', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('3b0135d1-1991-4c84-ad0c-515d6209b5a5', 'AP_Diurno', 'Idioma IV (AP_día)', 'AP_Diurno-ASIG-40', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.043', 'Fundamentación Cuantitativa', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('30a9c316-d460-40a6-9f08-0e440566b77e', 'AP_Diurno', 'Macroeconomía y Política Económica (AP_día)', 'AP_Diurno-ASIG-41', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.044', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8fdac9b0-d0d5-4c54-ad75-a11b2b18bcc4', 'AP_Diurno', 'Matemáticas I (AP_día)', 'AP_Diurno-ASIG-42', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.045', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d9b09bc6-0753-47b4-b170-6d014ecd7d2f', 'AP_Diurno', 'Matemáticas II (AP_día)', 'AP_Diurno-ASIG-44', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.046', 'Problemática Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8406e302-d5a2-4d85-8927-19e1b1555525', 'AP_Diurno', 'Matemáticas Lúdicas (AP_día)', 'AP_Diurno-ASIG-45', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.047', 'Estado Y Poder', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f84d88c0-8bb7-476d-a41c-ca1f5801867a', 'AP_Diurno', 'Opciones De Grado AP', 'AP_Diurno-ASIG-46', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.048', 'Estado Y Poder', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c0ca5d43-5748-4947-9649-a210982a8dd9', 'AP_Diurno', 'Organización Estatal Colombiana (AP_día)', 'AP_Diurno-ASIG-47', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.049', 'Estado Y Poder', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7819e5bf-97db-46bc-85de-a30279de2938', 'AP_Nocturno', 'Fundamentos De Problematización Sobre Lo Público (AP_noche)', 'AP_Nocturno-ASIG-24', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.114', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ffa0a05b-df5b-4358-bb0f-d22ff32238fb', 'AP_Diurno', 'Pensamiento Administrativo Público I (AP_día)', 'AP_Diurno-ASIG-50', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.053', 'Fundamentación Cuantitativa', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0e952a11-7147-4015-9b06-c33a46ed7530', 'AP_Diurno', 'Pensamiento Económico (AP_día)', 'AP_Diurno-ASIG-52', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.055', 'Estado Y Poder', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('596245d1-b645-4211-8d7c-081592f100fc', 'AP_Diurno', 'Pensamiento Sociológico (AP_día)', 'AP_Diurno-ASIG-53', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.056', 'Problemática Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('11b484df-c79a-44a4-ae0d-1b6d9ba7a309', 'AP_Diurno', 'Pensamientos y teorías de la administración pública (AP_día)', 'AP_Diurno-ASIG-54', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.057', 'Problemática Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('55fc7122-51be-46fb-8d82-3498b04cc7d4', 'AP_Diurno', 'Planeación I (AP_día)', 'AP_Diurno-ASIG-55', 2, 96, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.058', 'Idioma Extranjero', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('08a6dea0-3ca8-468c-93f4-dcee1adee214', 'AP_Diurno', 'Planeación II (AP_día)', 'AP_Diurno-ASIG-56', 2, 96, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.059', 'Idioma Extranjero', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('fd05880d-a053-4e73-9500-5d5a59cf79f2', 'AP_Diurno', 'Política Económica Y Social (AP_día)', 'AP_Diurno-ASIG-57', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.061', 'Estado Y Poder', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ee765c9a-fe6e-4c58-85fe-f8c49339a2e4', 'AP_Diurno', 'Políticas Públicas (AP_día)', 'AP_Diurno-ASIG-59', 4, 192, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.063', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7024948b-eb06-4076-8b3c-e008648fedb9', 'AP_Diurno', 'Presupuestos Públicos (AP_día)', 'AP_Diurno-ASIG-60', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.064', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('011b0759-9289-4795-8fa0-55058d7c006e', 'AP_Diurno', 'Problemas Enfoques Del Desarrollo (AP_día)', 'AP_Diurno-ASIG-61', 4, 192, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.066', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('00c60f52-a60c-4862-b16f-08a5d9c5edfb', 'AP_Diurno', 'Problemática Pública Colombiana Contemporánea (AP_día)', 'AP_Diurno-ASIG-62', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.067', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('beb92fab-c983-4908-a22d-1de517acaa54', 'AP_Diurno', 'Proyectos De Desarrollo (AP_día)', 'AP_Diurno-ASIG-63', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.069', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('fc5835fd-69ec-41f5-8d9e-fe8a085e50fc', 'AP_Diurno', 'Seminario De Énfasis (AP_día)', 'AP_Diurno-ASIG-66', 4, 192, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.073', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('03b135db-1947-43e3-a1b9-5530a758f1bd', 'AP_Diurno', 'Seminario de Investigación (AP_día)', 'AP_Diurno-ASIG-67', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.075', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f0c1161c-f172-4253-af06-60ae947cebde', 'AP_Diurno', 'Seminario El Oficio Del Consultor (AP_día)', 'AP_Diurno-ASIG-68', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.076', 'Estado Y Poder', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d7e76ed6-8d4f-4219-9240-0543f3af0490', 'AP_Diurno', 'Sistemas Informáticos (AP_día)', 'AP_Diurno-ASIG-69', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.077', 'Estado Y Poder', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('86161743-cb6a-4271-8a8a-581495ee867b', 'AP_Diurno', 'Taller de Lectoescritura (AP_día)', 'AP_Diurno-ASIG-70', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.078', 'Fundamentación Cuantitativa', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('08caee2f-a46c-49a5-a997-55961943ba8c', 'AP_Diurno', 'Teorías del Estado y regímenes políticos (AP_día)', 'AP_Diurno-ASIG-72', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.081', 'Estado Y Poder', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('aeb5daf1-3a8d-4763-855e-9e5d4d09504f', 'AP_Diurno', 'Teorías Y Problemas Contemporáneos Del Poder Estado Y El Gobierno (AP_día)', 'AP_Diurno-ASIG-73', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.082', 'Problemática Pública', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('53a56ebb-7c9b-4444-9398-43895244e3fa', 'AP_Nocturno', 'Análisis Financiero Público (AP_noche)', 'AP_Nocturno-ASIG-1', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.084', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9f8fe00c-feed-4468-8fe9-f240e946fe15', 'AP_Nocturno', 'Construcción Del Territorio (AP_noche)', 'AP_Nocturno-ASIG-2', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.085', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e7c42a5b-3e1d-49a2-b56f-2fd73f3d0ac9', 'AP_Nocturno', 'Cultura Y Desarrollo Humano (AP_noche)', 'AP_Nocturno-ASIG-4', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.088', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2755ccfe-7ff4-4430-92ad-e0cb9fa79d81', 'AP_Nocturno', 'Derecho Constitucional (AP_noche)', 'AP_Nocturno-ASIG-5', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.09', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5a350d18-7786-4ce0-8dfa-74f9346bdb3a', 'AP_Nocturno', 'Derecho Público I (AP_noche)', 'AP_Nocturno-ASIG-6', 4, 192, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.092', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('efe4f29d-8c48-4988-b3ca-3f3637f754d5', 'AP_Nocturno', 'Derecho Público II (AP_noche)', 'AP_Nocturno-ASIG-7', 4, 192, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.093', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6be3167f-2cb2-4ff5-a526-da55a483668b', 'AP_Nocturno', 'Derecho Público III (AP_noche)', 'AP_Nocturno-ASIG-8', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.094', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('29bf868e-03fe-496e-813f-0410a09b19f7', 'AP_Nocturno', 'Economia Pública I (AP_noche)', 'AP_Nocturno-ASIG-10', 2, 96, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.097', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d2d1cd39-4cc2-4c76-8c00-b0dfcf1c82de', 'AP_Nocturno', 'Economia Pública II (AP_noche)', 'AP_Nocturno-ASIG-11', 2, 96, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.098', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4587f65d-fd81-4936-8dba-efd12726957e', 'AP_Nocturno', 'Electiva De Énfasis I (AP_noche)', 'AP_Nocturno-ASIG-12', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.099', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('491d1017-a4e8-4e81-9367-e89d2449e2a2', 'AP_Nocturno', 'Electiva De Énfasis II (AP_noche)', 'AP_Nocturno-ASIG-13', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.1', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('456c97bd-164c-4d4e-90f2-b4a5dffaddfb', 'AP_Nocturno', 'Electiva General I (AP_noche)', 'AP_Nocturno-ASIG-14', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.102', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7513815a-e5d9-42ed-81d0-7bc2803e37a8', 'AP_Nocturno', 'Electiva I (AP_noche) Nuevo Plan de Estudios', 'AP_Nocturno-ASIG-16', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.105', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2bd99e6c-7d22-4f65-9eab-5b786426f001', 'AP_Nocturno', 'Estadística I (AP_noche)', 'AP_Nocturno-ASIG-17', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.106', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('55243196-f564-407b-abd1-b27c67d5f16a', 'AP_Nocturno', 'Estadística II (AP_noche)', 'AP_Nocturno-ASIG-18', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.107', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('80bd9fb7-9782-4e1d-98c2-0efc69ac0af8', 'AP_Nocturno', 'Finanzas Públicas (AP_noche)', 'AP_Nocturno-ASIG-19', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.109', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('01a265da-d6e6-469f-bf51-fa0e31d17a98', 'AP_Nocturno', 'Formas Asociativas Contemporáneos Del Poder, El Estado Y El Gobierno (AP_noche)', 'AP_Nocturno-ASIG-21', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.11', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('312a9e21-e5e1-41b3-8ccd-9f2a7b16e11d', 'AP_Nocturno', 'Función Pública Colombiana Y Comparada (AP_noche)', 'AP_Nocturno-ASIG-22', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.111', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('af13f71f-bca1-44c0-8b99-871a8d5b912f', 'AP_Nocturno', 'Fundamentos De Economía Pública (AP_noche)', 'AP_Nocturno-ASIG-23', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.113', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('bc63be97-a47d-4723-8545-e253f4e7f647', 'AP_Nocturno', 'Teorías Y Problemas Contemporáneos Del Poder Estado Y El Gobierno (AP_noche)', 'AP_Nocturno-ASIG-72', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.163', 'Estado Y Poder', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('52219ad0-1c1b-4899-85ae-734d2ebe0da0', 'AP_Nocturno', 'Gerencia Pública Integral (AP_noche)', 'AP_Nocturno-ASIG-26', 4, 192, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.116', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('128ca407-152e-42b0-8330-866bd03d62ad', 'AP_Nocturno', 'Gestión De Grupos Y Redes (AP_noche)', 'AP_Nocturno-ASIG-27', 4, 192, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.117', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('cd588997-46dd-4c9b-b8f9-0ce44c85e0fd', 'AP_Nocturno', 'Gestión Del Personal En Organizaciones Públicas (AP_noche)', 'AP_Nocturno-ASIG-29', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.119', 'Economía Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0275523f-10a1-4285-b12a-a9bc73f346bb', 'AP_Nocturno', 'Gestión Del Territorio Colombiano (AP_noche)', 'AP_Nocturno-ASIG-30', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.12', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('59032b1d-e2d9-4859-a9c9-0aafd8f0f62c', 'AP_Nocturno', 'Historia de la administración pública  (AP_noche)', 'AP_Nocturno-ASIG-31', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.121', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('387a456d-ccf9-4a7c-a279-760b774c8a78', 'AP_Nocturno', 'Historia Del Pensamiento Político (AP_noche)', 'AP_Nocturno-ASIG-32', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.123', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5e6c153d-f089-4077-8187-fe021c8fb05c', 'AP_Nocturno', 'Historia Social Y Política De La Administración Pública Colombiana I (AP_noche)', 'AP_Nocturno-ASIG-34', 2, 96, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.124', 'Idioma Extranjero', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('49debe52-89ad-4b65-81d2-3e51fe4ce3e7', 'AP_Nocturno', 'Historia Social Y Política De La Administración Pública Colombiana II (AP_noche)', 'AP_Nocturno-ASIG-35', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.126', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ba006b18-3bc0-4e11-a8e4-327e2594791d', 'AP_Nocturno', 'Idioma I (AP_noche)', 'AP_Nocturno-ASIG-36', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.127', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4eecac32-6365-485c-835f-3173bec284ee', 'AP_Nocturno', 'Idioma II (AP_noche)', 'AP_Nocturno-ASIG-37', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.129', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0d788656-3a62-47aa-8a12-bbbb056d415a', 'AP_Nocturno', 'Idioma III (AP_noche)', 'AP_Nocturno-ASIG-38', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.13', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c5ccbbf6-b3bd-473a-94c3-c514b8f60e12', 'AP_Nocturno', 'Idioma IV (AP_noche)', 'AP_Nocturno-ASIG-39', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.131', 'Fundamentación Cuantitativa', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('00ee0b01-f781-4b07-b5e0-80ce6ee4b389', 'AP_Nocturno', 'Matemática I (AP_noche)', 'AP_Nocturno-ASIG-41', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.132', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('61fdc4a0-f7b1-4323-9ab9-f0234044ff99', 'AP_Nocturno', 'Matemáticas I (AP_noche)', 'AP_Nocturno-ASIG-42', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.133', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('fd4f6dc0-653f-4ab4-88e3-a4b564d9c7ef', 'AP_Nocturno', 'Matemáticas II (AP_noche)', 'AP_Nocturno-ASIG-43', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.134', 'Problemática Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ba9413fc-1f04-4782-8cd8-3d396d348b27', 'AP_Nocturno', 'Matemáticas II (AP_noche) Nuevo Plan de Estudios', 'AP_Nocturno-ASIG-44', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.135', 'Problemática Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7942f8ec-3cc7-4724-bf93-4421487cbc66', 'AP_Nocturno', 'Matemáticas Lúdicas (AP_noche)', 'AP_Nocturno-ASIG-45', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.136', 'Estado Y Poder', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2cf16c94-a74e-4f43-9835-ff64d3ce2bf1', 'AP_Nocturno', 'Opciones De Grado AP', 'AP_Nocturno-ASIG-46', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.137', 'Estado Y Poder', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('58db5589-19c1-446e-8bfd-7f3396ef9383', 'AP_Nocturno', 'Organización Pública Colombiana (AP_noche)', 'AP_Nocturno-ASIG-48', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.14', 'Economía Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('acfffa65-5bb9-46a6-b265-4a4fcd5cc631', 'AP_Nocturno', 'Organzaciones Públicas Y Análisis Organizacional (AP_noche)', 'AP_Nocturno-ASIG-49', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.142', 'Economía Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7050e540-a9b2-4d51-8072-0db62970ef1a', 'AP_Nocturno', 'Pensamiento Administrativo Público I (AP_noche)', 'AP_Nocturno-ASIG-50', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.143', 'Fundamentación Cuantitativa', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('dc9f1de8-b550-4b1a-b98b-260dc11b76c8', 'AP_Nocturno', 'Pensamiento Administrativo Público II (AP_noche)', 'AP_Nocturno-ASIG-51', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.144', 'Fundamentación Cuantitativa', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('39c1520c-22d4-4559-82f4-3320ced710ad', 'AP_Nocturno', 'Pensamiento Económico (AP_noche)', 'AP_Nocturno-ASIG-52', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.145', 'Estado Y Poder', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9cdc211d-6da3-47a1-883f-5817f6f27116', 'AP_Nocturno', 'Pensamientos y teorías de la administración pública (AP_noche)', 'AP_Nocturno-ASIG-54', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.147', 'Problemática Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('143ca9a0-f73a-4552-ac74-50577395cb38', 'AP_Nocturno', 'Planeación Pública I (AP_noche)', 'AP_Nocturno-ASIG-55', 2, 96, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.147', 'Idioma Extranjero', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('56971ec1-0605-4c36-b942-5a2888e15f0a', 'AP_Nocturno', 'Planeación Pública II (AP_noche)', 'AP_Nocturno-ASIG-56', 2, 96, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.148', 'Idioma Extranjero', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('07781dbd-f958-42f4-9f05-7d4d3ead119e', 'AP_Nocturno', 'Política Económica Y Social (AP_noche)', 'AP_Nocturno-ASIG-57', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.149', 'Estado Y Poder', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('747193f9-9d08-4203-b94d-ea980b052c3b', 'AP_Nocturno', 'Políticas Públicas (AP_noche)', 'AP_Nocturno-ASIG-59', 4, 192, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.151', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('90fb8075-3863-4d07-ba1a-fa7c599df875', 'AP_Nocturno', 'Presupuestos Públicos (AP_noche)', 'AP_Nocturno-ASIG-60', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.152', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ed7c7cd1-f9ed-4097-b7d0-72d7b1a1940b', 'AP_Nocturno', 'Problemas Enfoques Del Desarrollo (AP_noche)', 'AP_Nocturno-ASIG-61', 4, 192, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.153', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d00caee5-68a5-4e1a-9739-644c04b1d183', 'AP_Nocturno', 'Problemática Pública Colombiana Contemporánea (AP_noche)', 'AP_Nocturno-ASIG-62', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.155', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f44abbea-95cd-4bd7-9c2b-13027e186fd5', 'AP_Nocturno', 'Proyectos De Desarrollo (AP_noche)', 'AP_Nocturno-ASIG-63', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.156', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9d49a879-5247-4e20-93a2-e708f2837713', 'AP_Nocturno', 'Relaciones Políticas Y Económicas Globales E Internacionales (AP_noche)', 'AP_Nocturno-ASIG-65', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.157', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('288f7208-90eb-404c-8273-780118dae2a0', 'AP_Nocturno', 'Seminario De Énfasis (AP_noche)', 'AP_Nocturno-ASIG-66', 4, 192, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.158', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('3f7b055f-d0a3-4a85-836d-671c60de8f29', 'AP_Nocturno', 'Seminario de Investigación (AP_noche)', 'AP_Nocturno-ASIG-67', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.159', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('05a8cfb9-1cf1-4ae8-87e3-21e99025b399', 'AP_Nocturno', 'Seminario El Oficio Del Consultor (AP_noche)', 'AP_Nocturno-ASIG-68', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.159', 'Estado Y Poder', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0d4916a4-2d86-4a6c-b45f-09a7f7bde98a', 'AP_Nocturno', 'Sistemas Informáticos (AP_noche)', 'AP_Nocturno-ASIG-69', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.16', 'Estado Y Poder', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8679269b-866d-4e06-9998-0f8661707406', 'AP_Nocturno', 'Taller de Lectoescritura (AP_noche)', 'AP_Nocturno-ASIG-70', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.161', 'Fundamentación Cuantitativa', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('49794e70-2db1-44f2-854c-93153cdff47f', 'APT', 'Planeación Del Desarrollo', 'APT-ASIG-49', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.208', 'Economía Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('08b8ca1d-550a-459d-b571-a9145d445edc', 'APT', 'Política Económica', 'APT-ASIG-50', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.208', 'Fundamentación Cuantitativa', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c20b31ad-8e36-4a71-a091-fe90fb1b4d64', 'APT', 'Presupuesto Público', 'APT-ASIG-52', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.21', 'Estado Y Poder', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ee8b8daa-7448-4c65-bc53-23cb23cc5f77', 'APT', 'Problemática Publica Colombiana', 'APT-ASIG-53', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.211', 'Problemática Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('bfebd97d-8929-496f-984d-2ed2a2f54709', 'APT', 'Procesos Económicos Territoriales', 'APT-ASIG-54', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.212', 'Problemática Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6ef4542b-9898-409a-8fea-79c9bbb236a9', 'APT', 'Proyecto Futuro I', 'APT-ASIG-55', 2, 96, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.212', 'Idioma Extranjero', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ebc9add7-6ab9-4cb2-812c-029e2e567bcc', 'APT', 'Proyecto Futuro III', 'APT-ASIG-57', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.213', 'Estado Y Poder', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('15042fd9-2c4e-4e37-8b90-7740508894b7', 'APT', 'Proyecto Futuro IV', 'APT-ASIG-58', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.214', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c1e6a34f-7926-4fb8-9265-a1665a295114', 'APT', 'Proyectos De Desarrollo', 'APT-ASIG-59', 4, 192, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.215', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0ecb49dd-72ea-4342-a711-c751af3c2eb0', 'APT', 'Contabilidad Gubernamental', 'APT-ASIG-3', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.167', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('093a8f5f-4b4b-4b00-b4d8-01d62efbe1aa', 'APT', 'Derecho constitucional', 'APT-ASIG-5', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.169', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5fbd479a-1dc1-4fd0-837f-d0a91fe8844e', 'APT', 'Derecho Constitucional', 'APT-ASIG-6', 4, 192, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.17', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('70072acb-2cca-4c6d-8251-b0a9de7a6426', 'APT', 'Economia De Lo Publico I', 'APT-ASIG-7', 4, 192, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.171', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('29a6338e-8f2d-4f83-a0e2-b69a7c314e8b', 'APT', 'Electiva I', 'APT-ASIG-9', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.173', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e58edfe6-fb70-41eb-96c0-58a48337dcdd', 'APT', 'Electiva II', 'APT-ASIG-10', 2, 96, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.174', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9c0fa268-42dd-4109-b64e-3e1b08a14a7e', 'APT', 'Electiva III', 'APT-ASIG-11', 2, 96, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.175', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0089e812-8f9a-4716-b4eb-9663690a8014', 'APT', 'Electiva IV', 'APT-ASIG-12', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.176', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('fd8585e3-9bd8-4f8e-aa6b-59617c35a03a', 'APT', 'Electiva V', 'APT-ASIG-13', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.177', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4a0e92fe-0906-408f-870d-27fa669ef263', 'APT', 'Escuelas Filosoficas Y Cambios Paradigmaticos  II', 'APT-ASIG-15', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.178', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('824abd65-a7d6-465d-98ff-9efbeee7fc50', 'APT', 'Estadística I', 'APT-ASIG-16', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.179', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('3536aa46-1a55-45e1-82cb-e63d1812fd5e', 'APT', 'Estadistica I', 'APT-ASIG-17', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.18', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7cc8192a-eddb-46ff-b23a-eef95a825474', 'APT', 'Estadística II', 'APT-ASIG-18', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.181', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('00acfb29-859b-4d3d-83d1-36c359797e7d', 'APT', 'Finanzas y análisis financiero público', 'APT-ASIG-20', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.183', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7b24b4f4-34be-4715-9780-8d4dfb8368a4', 'APT', 'Fundamento En Ciencias Sociales', 'APT-ASIG-21', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.184', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0df4b66d-7fce-4278-ac91-59a6d2c067ce', 'APT', 'Fundamentos de economía pública', 'APT-ASIG-22', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.185', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('acedbf64-ef10-4b1f-845c-f94d7070b055', 'APT', 'Fundamentos sociológicos', 'APT-ASIG-24', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.186', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('fa6bcc5e-7013-4f00-b265-76f0151b4400', 'APT', 'Geografía económica y social', 'APT-ASIG-25', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.187', 'Desarrollo Y Gestión Territorial', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4816b04c-8a6d-4521-8eeb-7b023a9e0639', 'APT', 'Geografía física y ambiental', 'APT-ASIG-26', 4, 192, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.188', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('bdce7380-4698-43ce-84e3-a81721c46e7e', 'APT', 'Gerencia Del Talento Humano', 'APT-ASIG-27', 4, 192, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.189', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5d99b84f-2159-4481-8b02-a5349f4ce688', 'APT', 'Gerencias De Los Recursos Fisicos Y Financieros', 'APT-ASIG-29', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.191', 'Economía Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a9104a71-1c8c-4b0a-8fb1-c178fcdf1109', 'APT', 'Gestion De Las Organizaciones Publicas', 'APT-ASIG-30', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.192', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('03636ae8-689c-47b9-826e-dd1b389a44fd', 'APT', 'Gestion Para El Desarrollo', 'APT-ASIG-31', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.193', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5b3b782c-6881-4f06-8219-015027a3a78d', 'APT', 'Gobierno Y Politica Publica', 'APT-ASIG-33', 2, 96, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.195', 'Idioma Extranjero', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f7f10f42-5c04-4b58-a50b-5da4e540aca4', 'APT', 'Historia de la administración pública', 'APT-ASIG-34', 2, 96, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.196', 'Idioma Extranjero', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('95fa52cf-aa22-4f0f-a764-bc3686218f5a', 'APT', 'Introduccon A La Problmematica Pública', 'APT-ASIG-35', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.197', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1a5b3ce8-b91f-4b72-957a-f7caf37e18cb', 'APT', 'Matematica Financiera', 'APT-ASIG-36', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.198', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2af4e278-5386-4f1b-bcef-a899bacc893d', 'APT', 'Matemática I', 'APT-ASIG-37', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.198', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d89e72dd-ee7c-4da0-b7b2-16e91e7d581d', 'APT', 'Matemática I', 'APT-ASIG-38', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.199', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('57813f82-833c-40f3-ab9c-7dae514aae2c', 'APT', 'Matemáticas II', 'APT-ASIG-40', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.201', 'Fundamentación Cuantitativa', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('34b9e7ef-a78a-4841-80b9-4da635725fad', 'APT', 'Metodología de investigación', 'APT-ASIG-41', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.202', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0e0a0ed2-56c8-42d3-bca3-a57435417370', 'APT', 'Micro y macroeconomía', 'APT-ASIG-42', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.203', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a0834121-2e7a-40c1-a121-52a7f2a84830', 'APT', 'Pensamiento Administrativo Público', 'APT-ASIG-44', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.204', 'Problemática Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('678fc08d-37a0-40cb-acaf-7a3ac6f52274', 'APT', 'Pensamiento Administrativo Y Organizaciones Publicas I', 'APT-ASIG-45', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.205', 'Estado Y Poder', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e740e225-9f51-454a-9b4c-1156f001ba5a', 'APT', 'Pensamiento Administrativo Y Organizaciones Publicas II', 'APT-ASIG-46', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.205', 'Estado Y Poder', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0eb19d33-6ae8-4fc9-b38e-8be8e989c402', 'APT', 'Pensamiento Económico', 'APT-ASIG-47', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.206', 'Estado Y Poder', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e8228765-074b-4183-927b-959bef2e0727', 'APT', 'Pensamientos y teorías de la administración pública', 'APT-ASIG-48', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.207', 'Economía Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9572ce65-9ac8-4c47-b135-88ce6bab576d', 'APT', 'Regimen Y Sistema Político', 'APT-ASIG-61', 4, 192, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.217', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('908b17f2-6a25-44ac-bc3f-63a47bea6a15', 'APT', 'Regimen Y Sistema Político Colombiano II', 'APT-ASIG-63', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.218', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('da885acd-e923-4f2c-87cb-10e182b31e8c', 'APT', 'Regimen Y Sistemas Políticos Latinoamericanos', 'APT-ASIG-64', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.219', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('33b8e8fb-8be2-4624-842e-92bf5cb538bb', 'APT', 'Regímenes y sistemas políticos', 'APT-ASIG-65', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.22', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6c60ff18-a096-482c-82a1-4c364d7c0e24', 'APT', 'Seminario De Opciones De Grado APT', 'APT-ASIG-66', 4, 192, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.221', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('33a838fe-18bc-4031-8b3b-aa227add8fd8', 'APT', 'Seminario De Profundización', 'APT-ASIG-67', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.222', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('78ec2c67-a3d6-4da7-bf66-f359fb575ef6', 'APT', 'Seminario Electivo II', 'APT-ASIG-69', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.224', 'Estado Y Poder', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6df9dc0f-d134-4ff2-a793-e3e1cae9e200', 'APT', 'Socialización y cultura', 'APT-ASIG-70', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.225', 'Fundamentación Cuantitativa', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9557f31c-1122-4221-ba12-040dadcea78a', 'APT', 'Tecnicas Del Proyecto Geopolitico', 'APT-ASIG-71', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.226', 'Fundamentación Cuantitativa', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2e2c5363-cf60-4c31-b05c-37b37b47a7e4', 'APT', 'Teoría Del Estado y Del Poder', 'APT-ASIG-72', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.226', 'Estado Y Poder', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f8b42ec7-a2bd-415f-938f-88ba82f82f77', 'APT', 'Teorías de las organizaciones públicas', 'APT-ASIG-74', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.228', 'Problemática Pública', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e756109d-4c00-4365-a133-190b6b7de98e', 'APT', 'Teorias Del Enfoque Espacio Tiempo', 'APT-ASIG-75', 2, 96, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.229', 'Idioma Extranjero', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('edba85d0-69dd-417f-b000-c0c39e36a5e6', 'APT', 'Teorias Y Enfoques Del Desarrollo', 'APT-ASIG-76', 2, 96, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.23', 'Idioma Extranjero', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a0360648-1e06-44fb-9e78-96a955f9903c', 'Alta_Dirección_Del_Estado_ESP', 'La politica de las Politicas Públicas', 'Alta_Dirección_Del_Estado_ESP-ASIG-2', 3, 144, '2026-03-27 21:06:16.518', '2026-04-02 11:55:25.232', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('66297620-2618-4b15-84e2-a8a823feedfc', 'Alta_Dirección_Del_Estado_ESP', 'Priorización y manejo de la agenda', 'Alta_Dirección_Del_Estado_ESP-ASIG-3', 3, 144, '2026-03-27 21:06:16.518', '2026-04-02 11:55:25.233', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('fc9e34ad-90be-4476-aecb-d39662f0aab3', 'Alta_Dirección_Del_Estado_ESP', 'Teorías de crisis', 'Alta_Dirección_Del_Estado_ESP-ASIG-4', 3, 144, '2026-03-27 21:06:16.518', '2026-04-02 11:55:25.233', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2bbf2b8e-b9a3-43d3-a09f-6ad17c817836', 'Alta_Dirección_Del_Estado_ESP', 'Toma de decisiones en entornos críticos', 'Alta_Dirección_Del_Estado_ESP-ASIG-5', 3, 144, '2026-03-27 21:06:16.518', '2026-04-02 11:55:25.234', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d2dc1405-6215-4c1b-a61e-7e7d32a882c1', 'Alta_Dirección_Del_Estado_ESP', 'Control político de las Politicas Públicas', 'Alta_Dirección_Del_Estado_ESP-ASIG-6', 4, 192, '2026-03-27 21:06:16.518', '2026-04-02 11:55:25.235', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('daa2c44c-a712-4c83-aaa0-941a4a0bda45', 'Alta_Dirección_Del_Estado_ESP', 'Manejo de crísis: análisis de casos', 'Alta_Dirección_Del_Estado_ESP-ASIG-8', 3, 144, '2026-03-27 21:06:16.518', '2026-04-02 11:55:25.237', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('550a8935-c613-41db-b5ef-a357f45668af', 'Derechos_Humanos_ESP', 'Análisis de casos I y II', 'Derechos_Humanos_ESP-ASIG-1', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.239', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('dab34513-4c7f-4ae9-8c83-e34e3de7b2f8', 'Derechos_Humanos_ESP', 'Analisis jurisprudencia en derechos humanos', 'Derechos_Humanos_ESP-ASIG-2', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.24', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5f78d171-e59f-4b67-82bc-c26f2a89d8bc', 'Derechos_Humanos_ESP', 'Colombia y la corte penal internacional', 'Derechos_Humanos_ESP-ASIG-4', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.243', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('442a3dc3-5bfe-43a5-a8d2-a4f7fcccb1c0', 'Derechos_Humanos_ESP', 'Derecho Internacional de los Derechos Humanos', 'Derechos_Humanos_ESP-ASIG-5', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.244', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('3994f358-88c1-4b91-8778-2e3a72e3a2ee', 'Derechos_Humanos_ESP', 'Derecho Internacional Humanitario', 'Derechos_Humanos_ESP-ASIG-6', 4, 192, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.245', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('52859a3b-b2a6-4f0b-962b-042a3f1085d6', 'Derechos_Humanos_ESP', 'Desplazamiento forzado en Colombia', 'Derechos_Humanos_ESP-ASIG-7', 4, 192, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.245', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('49793a07-d452-44b5-a59b-112e0f364e28', 'Derechos_Humanos_ESP', 'Enfoques sobre lo público', 'Derechos_Humanos_ESP-ASIG-8', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.246', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('acf7534a-ab2c-423b-8bec-5beb27279452', 'Derechos_Humanos_ESP', 'Mecanismos nacionales de proteccion. Mecanismos alternativos de solucion de conflictos', 'Derechos_Humanos_ESP-ASIG-9', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.247', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('df3db045-91db-49ac-9971-d3ce16945349', 'Derechos_Humanos_ESP', 'Organización Estatal', 'Derechos_Humanos_ESP-ASIG-10', 2, 96, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.248', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4bdcd9b9-4aec-44dd-b4f3-3f8d67724a90', 'Derechos_Humanos_ESP', 'Pedagogia de los derechos humanos', 'Derechos_Humanos_ESP-ASIG-11', 2, 96, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.248', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1526c2d3-2c0f-464f-b83e-0e62da2629a6', 'Derechos_Humanos_ESP', 'Pensamiento Administrativo', 'Derechos_Humanos_ESP-ASIG-12', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.249', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d69c9f8d-4f7e-4a5f-be0d-46bc4ad4d7cd', 'Derechos_Humanos_ESP', 'Políticas Públicas de los Derechos Humanos', 'Derechos_Humanos_ESP-ASIG-13', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.25', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('b050890c-4b8e-4767-8e67-1cd86af04c79', 'Derechos_Humanos_ESP', 'Seminario de Trabajo de grado', 'Derechos_Humanos_ESP-ASIG-14', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.251', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('168a5d87-0acf-4a3c-b599-dc6ed2661549', 'Finanzas_Públicas_ESP', 'Contabilidad pública', 'Finanzas_Públicas_ESP-ASIG-1', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.253', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2ff926ca-0019-4ccb-a170-f1f43740244a', 'Finanzas_Públicas_ESP', 'Contabilidad pública (Virtual)', 'Finanzas_Públicas_ESP-ASIG-2', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.254', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4374b89c-9a1f-46ca-b4f9-b1fce7d1e40b', 'Finanzas_Públicas_ESP', 'Control y seguimiento de la gestión financiera', 'Finanzas_Públicas_ESP-ASIG-3', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.255', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('64feeb68-eb56-4974-93cc-03618ff28abf', 'Finanzas_Públicas_ESP', 'Control y seguimiento de la gestión financiera (Virtual)', 'Finanzas_Públicas_ESP-ASIG-4', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.255', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('dbbb3052-ddfe-4f04-a6ea-d5fabc7e6e3e', 'Finanzas_Públicas_ESP', 'Economía de las finanzas públicas', 'Finanzas_Públicas_ESP-ASIG-5', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.256', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ef55b8da-60f5-4b98-bc14-cecaf90f0687', 'Finanzas_Públicas_ESP', 'Gestión financiera territorial', 'Finanzas_Públicas_ESP-ASIG-7', 4, 192, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.258', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('34baa79a-a28d-436e-8920-2c898b476dad', 'Finanzas_Públicas_ESP', 'Seminario de Integración del conocimiento (Virtual)', 'Finanzas_Públicas_ESP-ASIG-12', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.262', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('265d4b13-5e9b-4f07-9c65-d0d92e9ac8c4', 'Finanzas_Públicas_ESP', 'Seminario gestión del conocimiento', 'Finanzas_Públicas_ESP-ASIG-13', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.262', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1ad7b9f3-524e-4806-a953-dfa096ec62fe', 'Finanzas_Públicas_ESP', 'Seminario gestión del conocimiento (Virtual)', 'Finanzas_Públicas_ESP-ASIG-14', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.263', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c8c06861-c4f5-49ca-841c-4afb70622d22', 'Finanzas_Públicas_ESP', 'Sistemas de informacion para las finanzas públicas (Complementaria)', 'Finanzas_Públicas_ESP-ASIG-15', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.264', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4ed467b4-377e-47a5-a321-82000460658d', 'GEPUR_ESP', 'Enfoques del Desarrollo Urbano y Regional', 'GEPUR_ESP-ASIG-1', 3, 144, '2026-03-27 21:06:16.535', '2026-04-02 11:55:25.267', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9eea9075-6e73-4655-aac1-9111ea250d26', 'GEPUR_ESP', 'Geografía de colombia (Complementaria)', 'GEPUR_ESP-ASIG-2', 3, 144, '2026-03-27 21:06:16.535', '2026-04-02 11:55:25.268', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6233e542-df50-4351-93bd-75af87efeee6', 'GEPUR_ESP', 'Hábitat, urbanismo y ruralidad', 'GEPUR_ESP-ASIG-3', 3, 144, '2026-03-27 21:06:16.535', '2026-04-02 11:55:25.269', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2b8e8861-6d22-4ea6-91f8-ac5ccc72367a', 'GEPUR_ESP', 'Ordenamiento urbano y regional', 'GEPUR_ESP-ASIG-4', 3, 144, '2026-03-27 21:06:16.535', '2026-04-02 11:55:25.269', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9ef98ab8-67b5-4bce-b7c5-43f11bc299bd', 'GEPUR_ESP', 'Planificación del desarrollo urbano y regional', 'GEPUR_ESP-ASIG-5', 3, 144, '2026-03-27 21:06:16.535', '2026-04-02 11:55:25.27', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e2f44bb1-b39a-47df-b969-9fcc3f9b56cd', 'GEPUR_ESP', 'Seminario de Integración del conocimiento', 'GEPUR_ESP-ASIG-6', 4, 192, '2026-03-27 21:06:16.535', '2026-04-02 11:55:25.271', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5abb36d8-5f8a-41d0-b617-60aadfc7bbcc', 'GEPUR_ESP', 'Seminario Gestión del Conocimiento', 'GEPUR_ESP-ASIG-7', 4, 192, '2026-03-27 21:06:16.535', '2026-04-02 11:55:25.272', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('94299ed9-6a2f-4c00-8946-08eed0e45933', 'GEPUR_ESP', 'Territorio, Política Pública y Gobierno', 'GEPUR_ESP-ASIG-8', 3, 144, '2026-03-27 21:06:16.535', '2026-04-02 11:55:25.273', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5352c75c-77da-4860-8a55-f32fa284dfe1', 'Gerencia_Social_ESP', 'Contexto Social Global y Nacional (Virtual)', 'Gerencia_Social_ESP-ASIG-2', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.275', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c39bea9d-60a8-4913-8ea8-617b5ebd34ec', 'Gerencia_Social_ESP', 'Gerencia de la intervención social', 'Gerencia_Social_ESP-ASIG-3', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.276', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6d9903f6-bd37-463b-9b88-30b0f5bae798', 'Gerencia_Social_ESP', 'Gerencia de la intervención social (Virtual)', 'Gerencia_Social_ESP-ASIG-4', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.277', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8b5c14e2-e81b-436b-915f-518c2a9a06d6', 'Gerencia_Social_ESP', 'Objeto y Método de la Gerencia Social', 'Gerencia_Social_ESP-ASIG-5', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.278', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('adb48bb2-708c-4781-b730-839f4018ae04', 'Gerencia_Social_ESP', 'Políticas Públicas', 'Gerencia_Social_ESP-ASIG-7', 4, 192, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.28', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9893f21a-acee-4e47-8aa6-f6219bd14328', 'Gerencia_Social_ESP', 'Políticas Públicas (Virtual)', 'Gerencia_Social_ESP-ASIG-8', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.281', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9aed3c6a-0645-4b22-99b8-cbb58263bbc2', 'Gerencia_Social_ESP', 'Proyectos sociales', 'Gerencia_Social_ESP-ASIG-9', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.282', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('50c89610-879d-4ced-a8e8-84292221d019', 'Gerencia_Social_ESP', 'Proyectos sociales (Virtual)', 'Gerencia_Social_ESP-ASIG-10', 2, 96, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.283', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2e147f53-3263-4aec-a2eb-6d4fef2d9436', 'Gerencia_Social_ESP', 'Retos y oportunidades en el posconflicto colombiano (Complementaria)', 'Gerencia_Social_ESP-ASIG-11', 2, 96, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.284', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('108ae237-7d66-4a2d-afa0-29b131c5084f', 'Gerencia_Social_ESP', 'Seminario de Integración del conocimiento', 'Gerencia_Social_ESP-ASIG-13', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.286', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e246e73e-baa1-4e90-8c46-bae1784b78c5', 'Gerencia_Social_ESP', 'Seminario de Integración del conocimiento (Virtual)', 'Gerencia_Social_ESP-ASIG-14', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.287', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('782556f2-7db2-4235-8f01-71de53763856', 'Gerencia_Social_ESP', 'Seminario gestión del conocimiento', 'Gerencia_Social_ESP-ASIG-15', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.288', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c8e1a32d-0aa6-45fb-a216-88472e3bb9a0', 'Gerencia_Social_ESP', 'Seminario gestión del conocimiento (Virtual)', 'Gerencia_Social_ESP-ASIG-16', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.289', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('540f62b2-e436-48ce-aba6-fbdc56db8766', 'Gestión_Pública_ESP', 'Finanzas públicas, política fiscal y régimen presupuestal', 'Gestión_Pública_ESP-ASIG-1', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.291', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('22bb8f23-5a76-43ab-95b5-4835dae5b24d', 'Gestión_Pública_ESP', 'Finanzas públicas, política fiscal y régimen presupuestal (Virtual)', 'Gestión_Pública_ESP-ASIG-2', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.292', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('22c5afe7-fb2e-48d9-a5ec-0faadc72a3d3', 'Gestión_Pública_ESP', 'Gerencia de proyectos de inversión pública', 'Gestión_Pública_ESP-ASIG-3', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.293', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7d0a638a-cbb9-4a75-90dc-64edcdb095f0', 'Gestión_Pública_ESP', 'Gestión integral de recursos públicos  Unidad 3: gestión de la contratación', 'Gestión_Pública_ESP-ASIG-5', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.295', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('bdfc681b-563d-40b7-a8cc-fd1ccda1a446', 'Gestión_Pública_ESP', 'Gestión integral de recursos públicos  Unidad 3: gestión de la contratación (Virtual)', 'Gestión_Pública_ESP-ASIG-6', 4, 192, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.295', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d1be317b-ce8c-476a-8465-5a740290b26f', 'Gestión_Pública_ESP', 'Gestión integral de recursos públicos Unidad 1: gestión del talento humano', 'Gestión_Pública_ESP-ASIG-7', 4, 192, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.296', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d2b73bca-9aba-47e2-bc09-ea1529016154', 'Gestión_Pública_ESP', 'Gestión integral de recursos públicos Unidad 1: gestión del talento humano (Virtual)', 'Gestión_Pública_ESP-ASIG-8', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.297', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8d5f1845-4d2d-4c75-b461-9ca3c2317ae0', 'Economía_Pública', 'Historia Económica General', 'Economía_Pública-ASIG-30', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.414', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7a03450e-9973-4fee-a96a-e1aa74450582', 'Finanzas_Públicas_ESP', 'Régimen tributario nacional y territorial', 'Finanzas_Públicas_ESP-ASIG-9', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.259', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('924bc601-6244-4bbe-9ec0-3a7a9c0f7ba1', 'Finanzas_Públicas_ESP', 'Régimen tributario nacional y territorial (Virtual)', 'Finanzas_Públicas_ESP-ASIG-10', 2, 96, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.26', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a2b30d0e-9f1e-4e99-9852-d905578d6ef5', 'Gestión_Pública_ESP', 'Seminario de Integración del conocimiento', 'Gestión_Pública_ESP-ASIG-15', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.303', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('291480e3-ff9a-4969-bcd9-6458a8396087', 'Gestión_Pública_ESP', 'Seminario de Integración del conocimiento (Virtual)', 'Gestión_Pública_ESP-ASIG-16', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.304', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7ee0e2dd-32f4-4724-becd-022a5c07ea68', 'Gestión_Pública_ESP', 'Seminario gestión del conocimiento (Virtual)', 'Gestión_Pública_ESP-ASIG-18', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.306', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a919a5ff-a72e-4eb2-8ba0-1114ca4b9e10', 'Gestión_Pública_ESP', 'Sistemas de Gestión, Evaluación e Información (Complementaria)', 'Gestión_Pública_ESP-ASIG-19', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.307', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e90434dc-4d62-4394-a8d0-7956064faa5d', 'Gestión_Pública_ESP', 'Sistemas de Gestión, Evaluación e Información (Complementaria) (Virtual)', 'Gestión_Pública_ESP-ASIG-20', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.308', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('64cf1f9b-9614-42c0-bdce-4bb2e82359c4', 'Proyectos_de_Desarrollo_ESP', 'Evaluación económica, social y ambiental de proyectos', 'Proyectos_de_Desarrollo_ESP-ASIG-1', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.31', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4e7f1454-3bdc-4088-91fb-a0f7e97a4c32', 'Proyectos_de_Desarrollo_ESP', 'Evaluación económica, social y ambiental de proyectos (Virtual)', 'Proyectos_de_Desarrollo_ESP-ASIG-2', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.311', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('df45d6f8-7e62-4a81-9686-7ff75902f11b', 'Proyectos_de_Desarrollo_ESP', 'Evaluación financiera de proyectos (Virtual)', 'Proyectos_de_Desarrollo_ESP-ASIG-4', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.312', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6e2f39c6-2b01-4c17-b917-8f3c43e993f6', 'Proyectos_de_Desarrollo_ESP', 'Financiación y cofinanciación de proyectos (Complementaria)', 'Proyectos_de_Desarrollo_ESP-ASIG-5', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.313', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('897bbde3-0f25-477c-b492-acbd2747c651', 'Proyectos_de_Desarrollo_ESP', 'Financiación y cofinanciación de proyectos (Complementaria) (Virtual)', 'Proyectos_de_Desarrollo_ESP-ASIG-6', 4, 192, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.314', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('38870a9e-8f92-458d-8de7-a6bc54635c90', 'Proyectos_de_Desarrollo_ESP', 'Gerencia de proyectos', 'Proyectos_de_Desarrollo_ESP-ASIG-7', 4, 192, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.315', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8a12e04a-0b36-4d10-9b22-a46616560706', 'Proyectos_de_Desarrollo_ESP', 'Gerencia de proyectos (Virtual)', 'Proyectos_de_Desarrollo_ESP-ASIG-8', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.315', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('75f942e7-c1b4-48f7-b8c9-0d37c70b0eeb', 'Proyectos_de_Desarrollo_ESP', 'Identificación y preparación de proyectos', 'Proyectos_de_Desarrollo_ESP-ASIG-9', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.316', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f57cd2c3-4c92-4457-ab0b-d23867c3e660', 'Proyectos_de_Desarrollo_ESP', 'Métodos probabilísticos y econométricos', 'Proyectos_de_Desarrollo_ESP-ASIG-11', 2, 96, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.318', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2e6af2ab-6aed-4737-b236-30d0b495264f', 'Proyectos_de_Desarrollo_ESP', 'Métodos probabilísticos y econométricos (Virtual)', 'Proyectos_de_Desarrollo_ESP-ASIG-12', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.318', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1af6d0d4-285c-4a31-bcfe-b1cdfaa67bb7', 'Proyectos_de_Desarrollo_ESP', 'Seminario de Integración del conocimiento', 'Proyectos_de_Desarrollo_ESP-ASIG-13', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.319', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5f00f822-f635-42c3-816b-ebd0e74ab39a', 'Proyectos_de_Desarrollo_ESP', 'Seminario de Integración del conocimiento (Virtual)', 'Proyectos_de_Desarrollo_ESP-ASIG-14', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.32', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('83a8b880-808e-4f2c-8cd2-cc71810cc6da', 'Proyectos_de_Desarrollo_ESP', 'Seminario gestión del conocimiento', 'Proyectos_de_Desarrollo_ESP-ASIG-15', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.321', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('fb95a076-b139-44c8-934c-a4b06aa09cd2', 'Maestria_DDHH_y_Posconflicto', 'Concepciones y transformaciones del Estado', 'Maestria_DDHH_y_Posconflicto-ASIG-1', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.324', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('109e2be6-8ecf-4298-860b-efe26f8b90ff', 'Maestria_DDHH_y_Posconflicto', 'Teorías y enfoques de los derechos humanos', 'Maestria_DDHH_y_Posconflicto-ASIG-2', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.325', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('858a7079-92b0-4dda-ba7c-2414667ebce0', 'Maestria_DDHH_y_Posconflicto', 'Sistemas internacionales de protección de los derechos humanos', 'Maestria_DDHH_y_Posconflicto-ASIG-3', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.325', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('671ecc86-40df-4b10-86f3-a589e2667981', 'Maestria_DDHH_y_Posconflicto', 'Derecho Internacional Humanitario y desafíos de los conflictos armados contemporáneos', 'Maestria_DDHH_y_Posconflicto-ASIG-4', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.327', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('97fc55b7-d956-45d8-af2c-cca1341bfc32', 'Maestria_DDHH_y_Posconflicto', 'Seminario de trabajo de grado I', 'Maestria_DDHH_y_Posconflicto-ASIG-5', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.329', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('55b17d46-24f9-43db-a196-e49aa7272f07', 'Maestria_DDHH_y_Posconflicto', 'Gestión organizacional de los derechos humanos', 'Maestria_DDHH_y_Posconflicto-ASIG-7', 4, 192, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.331', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f225c408-7496-43a1-8818-da4a23397d84', 'Maestria_DDHH_y_Posconflicto', 'Políticas públicas con enfoque de derechos humanos', 'Maestria_DDHH_y_Posconflicto-ASIG-8', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.332', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('802ea4c0-b464-40bb-9c25-d20575692d22', 'Maestria_DDHH_y_Posconflicto', 'Políticas de inclusión y gestión de la transición', 'Maestria_DDHH_y_Posconflicto-ASIG-9', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.339', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5b07d699-447e-4bec-8665-7f6c2e1afede', 'Maestria_DDHH_y_Posconflicto', 'Seminario de trabajo de grado II', 'Maestria_DDHH_y_Posconflicto-ASIG-10', 2, 96, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.34', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('11e6115c-cf1f-451d-8942-6b3a05ce2acc', 'Maestria_DDHH_y_Posconflicto', 'Desafíos de la transición y del posconflicto', 'Maestria_DDHH_y_Posconflicto-ASIG-11', 2, 96, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.341', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('edf995e2-3352-4228-ba4e-384aab3713e6', 'Maestria_DDHH_y_Posconflicto', '1.Teorías y gestión para la resolución de los conflictos I', 'Maestria_DDHH_y_Posconflicto-ASIG-12', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.342', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1fde99bc-016b-4a1c-aa6b-9f5ff7d3fe87', 'Gestión_Pública_ESP', 'Innovación y gestión del conocimiento en la gestión pública', 'Gestión_Pública_ESP-ASIG-11', 2, 96, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.3', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('69c7ab87-c7d4-42e5-b654-340dede132a4', 'Gestión_Pública_ESP', 'Innovación y gestión del conocimiento en la gestión pública (Virtual)', 'Gestión_Pública_ESP-ASIG-12', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.301', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('69cf224d-1d67-43dd-a967-6051844eaba9', 'Gestión_Pública_ESP', 'Politicas públicas', 'Gestión_Pública_ESP-ASIG-13', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.301', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6dad8b1a-60bc-4f97-825e-dcc2aaf89d9c', 'Gestión_Pública_ESP', 'Politicas públicas (Virtual)', 'Gestión_Pública_ESP-ASIG-14', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.302', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('09701200-7ce5-4752-9542-5e57f1eaa18b', 'Maestria_AdministraciónPública_DISTANCIA', 'Análisis de los Procesos de Descentralización y Desarrollo Local', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-2', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.354', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('90e440cc-9327-4818-a54b-6235f312edeb', 'Maestria_AdministraciónPública_DISTANCIA', 'El desarrollo local regional y las políticas públicas', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-3', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.354', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d09b1309-1d3a-4256-b8d1-e801f18f6242', 'Maestria_AdministraciónPública_DISTANCIA', 'Elementos para la estructuración de políticas públicas', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-4', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.355', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6fa561a2-ed92-42c4-b3c8-b0a64dc02cb4', 'Maestria_AdministraciónPública_DISTANCIA', 'Enfoques Teóricos del Estado, el Gobierno y las Políticas Públicas', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-5', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.356', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c06d7270-0c06-444f-96d5-17c83fff6e61', 'Maestria_AdministraciónPública_DISTANCIA', 'Enfoques y teorías de la administración Pública II', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-7', 4, 192, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.358', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0ab7641a-3fae-4d23-96dd-53c24f4175a5', 'Maestria_AdministraciónPública_DISTANCIA', 'Enfoques y Teorías de la Organización', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-8', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.358', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a40dd8a6-369b-49fe-8a38-be3febffe46f', 'Maestria_AdministraciónPública_DISTANCIA', 'Finanzas Públicas y Política Fiscal', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-9', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.359', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9d34e4d9-af5b-4aac-80d3-81af0ca7979a', 'Maestria_AdministraciónPública_DISTANCIA', 'Gerencia y Gestión Pública', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-10', 2, 96, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.36', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('860c0e76-d22a-490f-abe5-e42e194dd24e', 'Maestria_AdministraciónPública_DISTANCIA', 'Gobernabilidad y Políticas Públicas en Colombia', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-11', 2, 96, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.361', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('638c65fd-3489-4cbc-a674-2a79c121feb5', 'Maestria_AdministraciónPública_DISTANCIA', 'Política económica y finanzas públicas', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-13', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.363', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4270f4d8-332d-4522-b118-c5ad051747eb', 'Maestria_AdministraciónPública_DISTANCIA', 'Seminario de trabajo II', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-14', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.363', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('b9cfb313-590b-4c02-8e9e-56618cc17232', 'Maestria_AdministraciónPública_DISTANCIA', 'Seminario Trabajo de Grado III', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-16', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.365', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('06186f7e-b833-45b1-a92a-9425d9a7bc0d', 'Maestria_AdministraciónPública_DISTANCIA', 'Seminario Trabajo de Grado IV', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-17', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.366', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('09925ff9-df81-4c7a-ab19-35443e278796', 'Maestria_AdministraciónPública_DISTANCIA', 'Teorías y Enfoques del Desarrollo Local y Descentralización', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-18', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.367', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a26407d9-1fd9-41a5-a3ac-c66ddb2d2c35', 'Maestria_AdministraciónPública_PRESENCIAL', 'Avance de Tesis', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-1', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.369', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2ed2227c-fe3d-482a-a5b8-b9decc1bc1a7', 'Maestria_AdministraciónPública_PRESENCIAL', 'Economía Publica y Política Fiscal', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-2', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.37', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ae945f45-3c23-4025-8ef2-f64738f3a987', 'Maestria_AdministraciónPública_PRESENCIAL', 'Electiva I: Política Ambiental', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-3', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.371', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7acd4c3d-ec38-4e1b-aaec-c7683cc7fb08', 'Maestria_AdministraciónPública_PRESENCIAL', 'Electiva III: Intervención Económica del Estado', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-5', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.373', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('bddb0cfd-23b6-4246-9563-1398ed26e384', 'Maestria_AdministraciónPública_PRESENCIAL', 'Estado, Gobierno y Gobernabilidad', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-6', 4, 192, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.373', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ec9d0737-61e3-4f2f-97d4-5c696c061e0c', 'Maestria_AdministraciónPública_PRESENCIAL', 'Formulación y Gestión de las Políticas Públicas', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-7', 4, 192, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.374', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1ece3111-f8fa-457b-b339-1d74986e4d19', 'Maestria_AdministraciónPública_PRESENCIAL', 'Laboratorio de Análisis y Gestión de Organizaciones Públicas', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-8', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.375', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0c02ef5e-070d-483e-ae29-4d1df84d77e7', 'Maestria_DDHH_y_Posconflicto', '2. Educación y Derechos Humanos I', 'Maestria_DDHH_y_Posconflicto-ASIG-15', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.345', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ac729945-e320-4a45-8c0f-704b2715d01c', 'Maestria_DDHH_y_Posconflicto', 'Seminario de trabajo de grado III', 'Maestria_DDHH_y_Posconflicto-ASIG-16', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.346', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d0197196-df81-47cd-9819-9bbec6bccad4', 'Maestria_DDHH_y_Posconflicto', 'Justicia verdad reparación y garantía de no repetición', 'Maestria_DDHH_y_Posconflicto-ASIG-17', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.346', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('306be0fe-7e87-4314-84c8-207256a59695', 'Maestria_DDHH_y_Posconflicto', '1.Teorías y gestión para la resolución de los conflictos II', 'Maestria_DDHH_y_Posconflicto-ASIG-18', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.347', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6006e26d-b39b-47de-aef4-6dfc67418188', 'Maestria_DDHH_y_Posconflicto', '2. Sistematización y diálogo de experiencias relacionadas con el conflicto armado II', 'Maestria_DDHH_y_Posconflicto-ASIG-19', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.348', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('518f110d-32db-46b3-854d-394bdb8d5d4c', 'Maestria_DDHH_y_Posconflicto', '1. Acción humanitaria y derechos de las víctimas II', 'Maestria_DDHH_y_Posconflicto-ASIG-20', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.349', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2f304232-d2e0-4345-a7ff-0966de56c247', 'Maestria_DDHH_y_Posconflicto', '2. Educación y Derechos Humanos II', 'Maestria_DDHH_y_Posconflicto-ASIG-21', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.35', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('334bab18-66d6-4923-b856-6b7829725639', 'Maestria_DDHH_y_Posconflicto', 'Seminario de trabajo de grado IV', 'Maestria_DDHH_y_Posconflicto-ASIG-22', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.351', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('bf7bb771-6b25-4fc9-8708-ac24b640e3cf', 'Maestria_AdministraciónPública_PRESENCIAL', 'Metodologías Cualitativas y Estrategias de Escritura', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-15', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.382', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('3c90def3-6e19-4c61-ab8a-05dff30d8544', 'Maestria_AdministraciónPública_PRESENCIAL', 'Métodos y Paquetes Informáticos Cuantitativos', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-16', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.383', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('34957a68-8d10-478b-ae98-f47e19ce9b52', 'Maestria_AdministraciónPública_PRESENCIAL', 'Problemas y Desafíos del Ordenamiento y la Descentralización Territorial', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-17', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.384', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e5175011-9272-4e75-84f5-9b2f2ce369f5', 'Maestria_AdministraciónPública_PRESENCIAL', 'Proceso Político, Gestión y Presupuesto Público', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-18', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.385', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a48c5d9a-9064-4c82-8639-39c6b21a30b2', 'Maestria_AdministraciónPública_PRESENCIAL', 'Tendencias y Experiencias Contemporáneas en Administración Pública', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-19', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.385', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5519e26d-586a-408d-8005-7846e86d0914', 'Maestria_AdministraciónPública_PRESENCIAL', 'Teorías y Gestión del Desarrollo Territorial', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-20', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.386', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1e5d8fed-fa47-4471-979e-fd196e6f42ad', 'Economía_Pública', 'Algebra Lineal y Cálculo', 'Economía_Pública-ASIG-1', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.388', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1467b6ad-d514-43dc-9ebb-a6daa5e40f71', 'Economía_Pública', 'Bienes Públicos, Servicios Públicos y Regulación', 'Economía_Pública-ASIG-2', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.389', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e9d1078b-a768-4982-84d0-b220d3185890', 'Economía_Pública', 'Calculo Diferencial', 'Economía_Pública-ASIG-3', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.39', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('b9aa9815-4a85-42e5-bf3c-6dcb84f9b462', 'Economía_Pública', 'Calculo Integral - Probabilidad', 'Economía_Pública-ASIG-4', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.391', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a49223af-1ab1-4f1d-80ac-facdf9aff5a0', 'Economía_Pública', 'Constitución y Democracia', 'Economía_Pública-ASIG-5', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.392', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('b61a7da6-f261-475f-854d-1ac99fa9ec92', 'Economía_Pública', 'Contabilidad
Gubernamental', 'Economía_Pública-ASIG-6', 4, 192, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.393', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('998c83ba-2665-4027-9e71-cd55c20df11e', 'Economía_Pública', 'Contratación pública', 'Economía_Pública-ASIG-7', 4, 192, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.394', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('40046440-1332-4106-9b51-8c03e1e0ef2a', 'Economía_Pública', 'Curso Electivo 1', 'Economía_Pública-ASIG-8', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.395', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('016b5b12-16ff-44fa-b114-17ac4d9d78a6', 'Economía_Pública', 'Curso Electivo 3', 'Economía_Pública-ASIG-10', 2, 96, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.397', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('234f8439-ad06-4f07-bd3c-34009f088187', 'Economía_Pública', 'Déficit fiscal y
deuda pública', 'Economía_Pública-ASIG-11', 2, 96, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.398', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('91e08c5a-9bf3-4080-b8f8-a24fb8b1996d', 'Economía_Pública', 'Derecho Administrativo', 'Economía_Pública-ASIG-12', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.398', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('87128038-06df-4d5c-89a0-05fa1e5436d8', 'Economía_Pública', 'Desarrollo Económico y Regional', 'Economía_Pública-ASIG-13', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.399', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d1898d50-1d24-48db-b67d-5c303b1b62f4', 'Economía_Pública', 'Econometría 1', 'Economía_Pública-ASIG-14', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.4', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('dc07f78f-c537-417a-b990-683e511926e4', 'Economía_Pública', 'Economía Ambiental y Desarrollo Sostenible', 'Economía_Pública-ASIG-16', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.402', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('78b9155f-7fee-4557-8e30-f271b98540fa', 'Economía_Pública', 'Economía Política', 'Economía_Pública-ASIG-17', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.403', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2a45fce0-c80a-47b6-8f81-a8581154ef50', 'Economía_Pública', 'Español y construcción textos en Economía', 'Economía_Pública-ASIG-18', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.404', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('32e51f1e-f7a4-441d-9992-43cdff6b12e1', 'Economía_Pública', 'Estadística (Economía)', 'Economía_Pública-ASIG-19', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.405', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ee430310-6f6d-4149-9c2a-d9c80a7a05c9', 'Economía_Pública', 'Fundamentos Administración Pública.', 'Economía_Pública-ASIG-21', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.406', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c221e719-07f3-45d0-a1c9-a91321513365', 'Economía_Pública', 'Fundamentos de Contabilidad', 'Economía_Pública-ASIG-22', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.407', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('3245b6d7-2379-4c21-bef3-8aff8707c9aa', 'Economía_Pública', 'Fundamentos Economía Pública', 'Economía_Pública-ASIG-23', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.408', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8718c137-4bbb-4512-b5da-33dd28093cb8', 'Economía_Pública', 'Gasto Público y GPS (nacional, territorial y Organizaciones Públicas)', 'Economía_Pública-ASIG-24', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.408', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0d10758e-7cd0-4e9f-bef6-d9d87bcad61d', 'Economía_Pública', 'Gestión Financiera pública.', 'Economía_Pública-ASIG-25', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.41', 'Desarrollo Y Gestión Territorial', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6b7ed040-8267-4f47-b2dd-e60fc0a42c96', 'Economía_Pública', 'Historia del Análisis Económico', 'Economía_Pública-ASIG-27', 4, 192, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.412', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('74c4d255-61d7-476b-a066-4c1be071a191', 'Economía_Pública', 'Historia del Pensamiento Económico', 'Economía_Pública-ASIG-28', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.413', 'Economía Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('abdce95e-9e44-4325-a6b3-f0428caa369b', 'Economía_Pública', 'Historia Económica de Colombia', 'Economía_Pública-ASIG-29', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.414', 'Economía Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('b15c3bb7-1490-49fd-8a17-564f6abcd1ac', 'Maestria_AdministraciónPública_PRESENCIAL', 'Laboratorio de Evaluación de Políticas Públicas', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-10', 2, 96, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.377', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('fd7a5774-9726-40bb-a205-82e1e53c4334', 'Maestria_AdministraciónPública_PRESENCIAL', 'Laboratorio de Reformas de la Administración Pública', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-13', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.38', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('38e90541-e405-4aba-b20d-6e059716ed92', 'Maestria_AdministraciónPública_PRESENCIAL', 'Laboratorio de Técnicas de Investigación de Bienestar y Pobreza', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-14', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.381', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('80e46409-4942-47a2-849d-499c67218200', 'APT', 'Actores sociales y diferencia identitaria', 'APT-ASIG-1', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.165', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f67dd45c-1dd3-495d-9598-198d5003db26', 'Economía_Pública', 'Introducción a la Economía Colombiana', 'Economía_Pública-ASIG-32', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.416', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('3ece67ae-e8e2-4b0f-b33f-67431715c689', 'Economía_Pública', 'Introducción a la Macroeconomía', 'Economía_Pública-ASIG-33', 2, 96, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.417', 'Idioma Extranjero', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2e233f3f-7bf1-4564-9b49-2280310c409f', 'Economía_Pública', 'Macroeconomía 2', 'Economía_Pública-ASIG-36', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.419', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f5864207-bc88-4f81-a15c-977662cc35ec', 'Economía_Pública', 'Macroeconomía 3', 'Economía_Pública-ASIG-37', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.42', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('45a1d63a-ad79-42d1-bf2b-c9607f7ef26f', 'Economía_Pública', 'Métodos Matemáticos para Economistas', 'Economía_Pública-ASIG-38', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.421', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c796c4ee-454f-4738-acc8-07802ba954ab', 'Economía_Pública', 'Microeconomía 2', 'Economía_Pública-ASIG-39', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.421', 'Fundamentación Cuantitativa', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('85aa7abf-e037-4ac2-b626-0d0fbc1736d5', 'Economía_Pública', 'Opción de Grado', 'Economía_Pública-ASIG-41', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.423', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('478cd528-ff90-426d-965a-76495980db80', 'Economía_Pública', 'Política Económica y Social', 'Economía_Pública-ASIG-42', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.424', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ea010932-59e2-4110-a095-3f2af8c55f4a', 'Economía_Pública', 'Política, Estado y Gobierno', 'Economía_Pública-ASIG-43', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.425', 'Problemática Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('b8547d0f-2090-49b8-bed4-12709fda1921', 'Economía_Pública', 'Presupuesto Público (Nacional, Territorial.', 'Economía_Pública-ASIG-44', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.426', 'Problemática Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('2965bf6c-adb8-465b-9340-ec7a122ca325', 'AP_Diurno', 'Análisis Financiero Público (AP_día)', 'AP_Diurno-ASIG-1', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:24.986', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ca29f606-51f6-47b3-95e7-75b127e075a8', 'AP_Diurno', 'Control De La Gestión Pública (AP_día)', 'AP_Diurno-ASIG-3', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:24.991', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8adc31c9-d68b-4700-9c47-d719f7f0ca86', 'AP_Diurno', 'Derecho Público III (AP_día)', 'AP_Diurno-ASIG-9', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.004', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('b9e7c5ea-b0ec-48f1-a7b6-fc7b0147f4a0', 'AP_Diurno', 'Electiva De Énfasis II (AP_día)', 'AP_Diurno-ASIG-14', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.011', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('74d90000-22ae-45fb-b36d-84d5673736e3', 'AP_Diurno', 'Finanzas Públicas (AP_día)', 'AP_Diurno-ASIG-20', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.02', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4f1edb9f-5288-49f8-9eb3-3c7ff80093ef', 'AP_Diurno', 'Fundamentos De Economía Pública (AP_día)', 'AP_Diurno-ASIG-24', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.025', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('38b7c1d5-9f1b-4590-8436-3f1dae59b925', 'AP_Diurno', 'Gestión Del Personal En Organizaciones Públicas (AP_día)', 'AP_Diurno-ASIG-30', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.033', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('210d36f1-610a-41cc-8b16-cbc446207126', 'AP_Diurno', 'Historia Social Y Política De La Administración Pública Colombiana I (AP_día)', 'AP_Diurno-ASIG-35', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.038', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f6c577c2-d594-499b-a8d4-076697f42ebb', 'AP_Diurno', 'Matemáticas I (AP_día)', 'AP_Diurno-ASIG-43', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.045', 'Problemática Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('fa2d571d-3323-46a5-88d7-98e728de9435', 'AP_Diurno', 'Organzaciones Públicas Y Análisis Organizacional (AP_día)', 'AP_Diurno-ASIG-49', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.051', 'Economía Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e26032f4-461e-4515-b774-8a4d697eb115', 'AP_Diurno', 'Pensamiento Administrativo Público II (AP_día)', 'AP_Diurno-ASIG-51', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.054', 'Fundamentación Cuantitativa', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('77f74430-738b-4825-9929-249f949e6be9', 'AP_Diurno', 'Políticas Ambientales Y Desarrollo En Colombia (AP_día)', 'AP_Diurno-ASIG-58', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.062', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ecdeb8ad-29b9-4624-9248-8628ccdcfafa', 'AP_Diurno', 'Relaciones Nacionales Intergubernamentales En Colombia (AP_día)', 'AP_Diurno-ASIG-64', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.071', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('aa1baf18-3787-4cf7-8c90-14e8a3a706db', 'AP_Diurno', 'Teoría De Las Organizaciones (AP_día)', 'AP_Diurno-ASIG-71', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.079', 'Fundamentación Cuantitativa', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('57795ed1-3cc9-4134-9fd4-a638df3ad2f5', 'AP_Nocturno', 'Control De La Gestión Pública (AP_noche)', 'AP_Nocturno-ASIG-3', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.087', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6f08ee43-d8d5-4d96-add4-de36918b08fc', 'AP_Nocturno', 'Derechos Humanos Y Negociación De Conflictos (AP_noche)', 'AP_Nocturno-ASIG-9', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.095', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ceeef803-d540-4520-aee5-87b538717e73', 'AP_Nocturno', 'Electiva General II (AP_noche)', 'AP_Nocturno-ASIG-15', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.103', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9c9edcc4-9433-42c2-aad7-d57d5c617ebc', 'AP_Nocturno', 'Finanzas y análisis financiero público (AP_noche)', 'AP_Nocturno-ASIG-20', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.109', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9305fe85-5995-411e-ba21-3dafdc4201ea', 'AP_Nocturno', 'Fundamentos Sociológicos (AP_noche)', 'AP_Nocturno-ASIG-25', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.115', 'Desarrollo Y Gestión Territorial', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('05130e25-d6ee-4afa-a43c-af60ecd7d8cc', 'AP_Nocturno', 'Gestión De Servicios Públicos (AP_noche)', 'AP_Nocturno-ASIG-28', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.118', 'Economía Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6bfd2561-b3a4-424d-99c9-4598ec0dac5e', 'AP_Nocturno', 'Historia del pensamiento político (AP_noche) Nuevo Plan de Estudios', 'AP_Nocturno-ASIG-33', 2, 96, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.123', 'Idioma Extranjero', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7592852e-636c-4fc6-bf12-9be0afabf097', 'AP_Nocturno', 'Macroeconomía y Política Económica (AP_noche)', 'AP_Nocturno-ASIG-40', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.132', 'Fundamentación Cuantitativa', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('22542f22-eb15-4a98-9f38-37f0fe0c4b74', 'AP_Nocturno', 'Organización Estatal Colombiana (AP_noche)', 'AP_Nocturno-ASIG-47', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.138', 'Estado Y Poder', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a4c60996-640f-4ae0-9be4-23a9a04a0408', 'AP_Nocturno', 'Pensamiento Sociológico (AP_noche)', 'AP_Nocturno-ASIG-53', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.145', 'Problemática Pública', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('491d2f73-c29f-450a-89df-d33b78d3a896', 'AP_Nocturno', 'Políticas Ambientales Y Desarrollo En Colombia (AP_noche)', 'AP_Nocturno-ASIG-58', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.15', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8ad6385d-f621-41fc-81e6-f6bb4b71591c', 'AP_Nocturno', 'Relaciones Nacionales Intergubernamentales En Colombia (AP_noche)', 'AP_Nocturno-ASIG-64', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.156', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1695bdca-1774-44c1-b3ef-93469a084309', 'AP_Nocturno', 'Teoría De Las Organizaciones (AP_noche)', 'AP_Nocturno-ASIG-71', 3, 144, '2026-03-27 21:06:16.48', '2026-04-02 11:55:25.162', 'Fundamentación Cuantitativa', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('cdec9139-f384-4921-8128-62094e132258', 'APT', 'Economia De Lo Publico II', 'APT-ASIG-8', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.172', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('e4ab77c8-88a1-4973-b7f7-2d54e051b93a', 'APT', 'Escuelas Filosoficas Y Cambios Paradigmaticos  I', 'APT-ASIG-14', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.178', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('74c8ff66-66ca-472a-b5c6-8e990a5df08f', 'APT', 'Finanzas Públicas', 'APT-ASIG-19', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.182', 'Economía Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('54f50f29-f4fa-4147-a5b6-1c00bf8de0b0', 'APT', 'Fundamentos del Estado y el poder', 'APT-ASIG-23', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.185', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8139cd13-6d16-4452-8731-2e6b8aa04f3f', 'APT', 'Gerencia Pública Integral', 'APT-ASIG-28', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.19', 'Economía Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6c8b9d93-19a6-4563-a0fc-6ef5fea4c58a', 'APT', 'Globalización, Geoestrategia Y Relaciones Internacionales', 'APT-ASIG-32', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.194', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4859911e-fb2f-4b1b-9155-1a5137b3558a', 'APT', 'Matemática II', 'APT-ASIG-39', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.2', 'Fundamentación Cuantitativa', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8efb07cd-4702-48a1-a8c4-f580d1495669', 'APT', 'Política Pública Territorial', 'APT-ASIG-51', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.209', 'Fundamentación Cuantitativa', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('af7ab07d-bca7-4bcb-b79a-dfcc97b2cb4c', 'APT', 'Proyecto Futuro II', 'APT-ASIG-56', 2, 96, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.213', 'Idioma Extranjero', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('48770b7c-9b9d-41b1-b777-3a8ca0660add', 'APT', 'Regimen Del Servidor Público', 'APT-ASIG-60', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.216', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('59747fba-e9b2-4a7d-8e4d-53d2c434d564', 'APT', 'Regimen Y Sistema Político Colombiano I', 'APT-ASIG-62', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.218', 'Nuevo Plan de Estudios AP', '3');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7bdbaf60-b262-47fe-b842-4328cccf4ee2', 'APT', 'Seminario Electivo I', 'APT-ASIG-68', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.223', 'Estado Y Poder', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d35ea814-f431-4046-9ea6-4812cb0d2325', 'APT', 'Teoria Y Enfoque Del Desarrollo Territorial', 'APT-ASIG-73', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.227', 'Problemática Pública', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d51adbe6-dbb2-424f-8652-ffe939599dbf', 'Alta_Dirección_Del_Estado_ESP', 'Enfoque de Toma de decisiones', 'Alta_Dirección_Del_Estado_ESP-ASIG-1', 3, 144, '2026-03-27 21:06:16.518', '2026-04-02 11:55:25.231', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8bccc381-fd39-484f-8d0d-c9f27fe6c8a5', 'Alta_Dirección_Del_Estado_ESP', 'Control del manejo de agenda', 'Alta_Dirección_Del_Estado_ESP-ASIG-7', 4, 192, '2026-03-27 21:06:16.518', '2026-04-02 11:55:25.236', 'Nuevo Plan de Estudios AP', '6');
INSERT INTO academic_work_plan."Asignatura" VALUES ('5875d2dd-7161-4d06-b9a0-9772e274691a', 'Derechos_Humanos_ESP', 'Visión Histórica y Filosófica de los Derechos Humanos', 'Derechos_Humanos_ESP-ASIG-15', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.251', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0a6b5659-7b01-4292-b6df-db27139418e9', 'Finanzas_Públicas_ESP', 'Economía de las finanzas públicas (Virtual)', 'Finanzas_Públicas_ESP-ASIG-6', 4, 192, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.257', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('7fa067ce-1431-4e21-a68f-a121697f327d', 'Finanzas_Públicas_ESP', 'Gestión financiera territorial (Virtual)', 'Finanzas_Públicas_ESP-ASIG-8', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.259', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('04d9c460-12b4-4ff5-84ed-e7cfe27fcc18', 'Finanzas_Públicas_ESP', 'Seminario de Integración del conocimiento', 'Finanzas_Públicas_ESP-ASIG-11', 2, 96, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.261', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6ba14c64-877b-4b18-828b-739b6183fa2c', 'Finanzas_Públicas_ESP', 'Sistemas de informacion para las finanzas públicas (Complementaria) (Virtual)', 'Finanzas_Públicas_ESP-ASIG-16', 3, 144, '2026-03-27 21:06:16.531', '2026-04-02 11:55:25.265', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('902d0fd1-3a47-41e6-adb6-071fb5576067', 'Gerencia_Social_ESP', 'Contexto Social Global y Nacional', 'Gerencia_Social_ESP-ASIG-1', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.274', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c5d6961a-5888-4875-bea5-a5d1802ee053', 'Gerencia_Social_ESP', 'Objeto y Método de la Gerencia Social (Virtual)', 'Gerencia_Social_ESP-ASIG-6', 4, 192, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.279', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('989a9110-6892-4733-8bdb-1bfaee86182b', 'Gerencia_Social_ESP', 'Retos y oportunidades en el posconflicto colombiano (Complementaria) (Virtual)', 'Gerencia_Social_ESP-ASIG-12', 3, 144, '2026-03-27 21:06:16.538', '2026-04-02 11:55:25.285', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ca930f96-287a-4ebb-b0eb-8fa5461b21a2', 'Gestión_Pública_ESP', 'Gerencia de proyectos de inversión pública (Virtual)', 'Gestión_Pública_ESP-ASIG-4', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.294', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('afa0c73c-d42f-4769-ae07-c61a24958b1d', 'Gestión_Pública_ESP', 'Gestión integral de recursos públicos Unidad 2: gestión de bienes y recursos físicos
y Unidad 4: gestión de la información', 'Gestión_Pública_ESP-ASIG-9', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.298', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f3b203d5-4be7-4ec8-be7c-07fc36f6d5fa', 'Gestión_Pública_ESP', 'Gestión integral de recursos públicos Unidad 2: gestión de bienes y recursos físicos
y Unidad 4: gestión de la información (Virtual)', 'Gestión_Pública_ESP-ASIG-10', 2, 96, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.299', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('1331e972-11e9-4da2-9822-343cb5914247', 'Gestión_Pública_ESP', 'Seminario gestión del conocimiento', 'Gestión_Pública_ESP-ASIG-17', 3, 144, '2026-03-27 21:06:16.544', '2026-04-02 11:55:25.305', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('f1bdddb8-35aa-4c0b-a2d8-97faa7e04b6a', 'Proyectos_de_Desarrollo_ESP', 'Evaluación financiera de proyectos', 'Proyectos_de_Desarrollo_ESP-ASIG-3', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.311', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('694a37f6-7271-47c5-8987-1467c7861055', 'Proyectos_de_Desarrollo_ESP', 'Identificación y preparación de proyectos (Virtual)', 'Proyectos_de_Desarrollo_ESP-ASIG-10', 2, 96, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.317', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('c450b88d-4006-4b4a-9554-7fe6406a36d0', 'Proyectos_de_Desarrollo_ESP', 'Seminario gestión del conocimiento (Virtual)', 'Proyectos_de_Desarrollo_ESP-ASIG-16', 3, 144, '2026-03-27 21:06:16.55', '2026-04-02 11:55:25.322', 'Problemática Pública', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('00ea6fc8-0aec-4f2d-9580-0045281d6e0f', 'Maestria_DDHH_y_Posconflicto', 'Nuevos escenarios, institucionalidades y sujetos sociales para la gestión de lo público', 'Maestria_DDHH_y_Posconflicto-ASIG-6', 4, 192, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.33', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d14e9b59-1c7e-4bb7-867f-2194ef8d9b0c', 'Maestria_DDHH_y_Posconflicto', '2. Sistematización y diálogo de experiencias relacionadas con el conflicto armado I', 'Maestria_DDHH_y_Posconflicto-ASIG-13', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.344', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('84febc71-003a-4935-b27d-2a10bebfbcdd', 'Maestria_DDHH_y_Posconflicto', '1. Acción humanitaria y derechos de las víctimas I', 'Maestria_DDHH_y_Posconflicto-ASIG-14', 3, 144, '2026-03-27 21:06:16.556', '2026-04-02 11:55:25.344', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6f01b6b8-2fd2-4139-833c-03bbc37b0790', 'Maestria_AdministraciónPública_DISTANCIA', 'Análisis de casos del territorio', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-1', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.353', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('db974fab-824f-4ff4-913e-5537e24ee4e9', 'APT', 'Derecho Administrativo', 'APT-ASIG-4', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.168', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d1ac309b-c437-4b95-b149-7b4c4bb163b6', 'Maestria_AdministraciónPública_PRESENCIAL', 'Laboratorio de Planificación y Gestión Financiera Territorial', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-12', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.379', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d1c6d194-8e9f-4967-ade0-0be27328c496', 'Maestria_AdministraciónPública_PRESENCIAL', 'Teorías y Problemas de la Administración Publica', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-21', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.387', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('aafdf86f-f6a1-4150-8703-6794d3fd886f', 'Economía_Pública', 'Curso electivo 2', 'Economía_Pública-ASIG-9', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.396', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d3321ca3-ab59-49fc-8a2d-467436666842', 'Economía_Pública', 'Teoría de Juegos', 'Economía_Pública-ASIG-45', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.427', 'Estado Y Poder', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('3cef5ecc-3457-46af-89d6-062a81b121d4', 'APT', 'Construcción Del Conocimiento', 'APT-ASIG-2', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.166', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a7d248b3-4e6f-4f2b-bf3e-ddc3f47a95de', 'APT', 'Organización Del Estado Colombiano Y Formas Asociativas Del Estado A Nivel Territorial', 'APT-ASIG-43', 3, 144, '2026-03-27 21:06:16.503', '2026-04-02 11:55:25.203', 'Problemática Pública', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('a882e084-a52f-4512-8680-f303b0b3624b', 'Derechos_Humanos_ESP', 'Categorias derechos: civiles y politicos - derechos economicos, sociales y culturales. - derechos colectivos - derechos de las minorias', 'Derechos_Humanos_ESP-ASIG-3', 3, 144, '2026-03-27 21:06:16.525', '2026-04-02 11:55:25.242', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('00e7fcb7-b2c2-45f3-a584-b83d3a2b6b17', 'Maestria_AdministraciónPública_DISTANCIA', 'Enfoques y Teorías de la Administración Pública', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-6', 4, 192, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.357', 'Nuevo Plan de Estudios AP', '4');
INSERT INTO academic_work_plan."Asignatura" VALUES ('8bdc0224-6762-427a-a1af-1e91b865c14f', 'Maestria_AdministraciónPública_DISTANCIA', 'Los Problemas de Gobernabilidad y Políticas Públicas: las especificidades de América Latina', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-12', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.362', 'Fundamentación Cuantitativa', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('ecbb0b2f-a1b3-4954-b5ab-dc2ff712288d', 'Economía_Pública', 'Econometría 2', 'Economía_Pública-ASIG-15', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.401', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d1f10f2f-f501-482a-94fc-45ee90a47d3d', 'Economía_Pública', 'Formulación y Evaluación Económica y Social de Proyectos', 'Economía_Pública-ASIG-20', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.405', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('581bbd23-9a19-47e4-b308-d96d56c179d9', 'Maestria_AdministraciónPública_DISTANCIA', 'Seminario Trabajo de Grado I', 'Maestria_AdministraciónPública_DISTANCIA-ASIG-15', 3, 144, '2026-03-27 21:06:16.562', '2026-04-02 11:55:25.364', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('0989d6f0-8f65-4635-a21f-0701eab16fa2', 'Maestria_AdministraciónPública_PRESENCIAL', 'Electiva II: Indicadores de Gobernabilidad', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-4', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.372', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('37f94da0-b289-44f7-b764-1d4975e9a429', 'Maestria_AdministraciónPública_PRESENCIAL', 'Laboratorio de elaboración y aprobación del proyecto de investigación', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-9', 3, 144, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.376', 'Estado Y Poder', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('4e805575-6f86-4a8b-abf6-5c02e5365101', 'Economía_Pública', 'Gestión y Gerencia Pública.', 'Economía_Pública-ASIG-26', 4, 192, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.411', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('dff77b84-b739-48f7-9d49-6a06f8d8b9a8', 'Economía_Pública', 'Ingresos Públicos (y Tributación) (Nacional, territorial', 'Economía_Pública-ASIG-31', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.415', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('6926caf0-e128-4b26-8193-9aee05a38072', 'Maestria_AdministraciónPública_PRESENCIAL', 'Laboratorio de Función Pública Colombiana y Comparada', 'Maestria_AdministraciónPública_PRESENCIAL-ASIG-11', 2, 96, '2026-03-27 21:06:16.57', '2026-04-02 11:55:25.378', 'Idioma Extranjero', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('51b64029-13e8-4caa-9c14-40eb16ee2b3d', 'Economía_Pública', 'Introducción a la Microeconomía', 'Economía_Pública-ASIG-34', 2, 96, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.418', 'Idioma Extranjero', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('19f43ec6-3230-484a-930a-aba85016300e', 'Economía_Pública', 'Laboratorio de Excel, Stata, SPSS, Matlab, R, SAS', 'Economía_Pública-ASIG-35', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.419', 'Nuevo Plan de Estudios AP', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('d78db468-872e-4ddc-8730-634f4447586a', 'Economía_Pública', 'Microeconomía 3', 'Economía_Pública-ASIG-40', 3, 144, '2026-03-27 21:06:16.578', '2026-04-02 11:55:25.422', 'Fundamentación Cuantitativa', '2');
INSERT INTO academic_work_plan."Asignatura" VALUES ('3c177e33-654a-4d2e-9a6f-7af51436861e', 'AP_Diurno', 'Constitución Del Territorio (AP_día)', 'AP_Diurno-ASIG-2', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:24.989', 'Nuevo Plan de Estudios AP', '1');
INSERT INTO academic_work_plan."Asignatura" VALUES ('9b1f147c-ce6b-4322-8bb2-a475c90845c6', 'AP_Diurno', 'Relaciones Políticas Y Económicas Globales E Internacionales (AP_día)', 'AP_Diurno-ASIG-65', 3, 144, '2026-03-27 21:06:16.456', '2026-04-02 11:55:25.072', 'Nuevo Plan de Estudios AP', '3');


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."AuditLog" VALUES ('8c4ee68d-c2d5-4644-ab9d-23a7d838d6d5', '2026-04-17 16:18:24.435', '809a97a1-95de-4065-97c4-63a4715861bb', 'Super Usuario ESAP', 'superuser@esap.edu.co', 'LOGIN', 'Autenticación', NULL, NULL, 'Inicio de sesión exitoso con rol Administrador del Sistema', 'EXITO', '::ffff:127.0.0.1');
INSERT INTO academic_work_plan."AuditLog" VALUES ('83cc6845-505d-4cd9-b3ce-cf18160b3488', '2026-04-17 16:18:24.467', NULL, 'Usuario del Sistema', 'N/A', 'CREAR NUEVO REGISTRO', 'Sistema General', NULL, NULL, '[200] URL: /api/auth/signin | Payload: {"email":"superuser@esap.edu.co","password":"***"}', 'EXITO', '::ffff:127.0.0.1');


--
-- Data for Name: CarpetaDigital; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('bf253919-e12c-4098-871e-33bf152869b6', '1afeb586-20db-41a5-b479-b6e6d790d13a', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.247', '2026-03-27 11:58:09.247', '2026-03-27 11:58:09.247');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('93ac7f31-98fd-46f6-8405-66c393948f5b', '76e853c5-43c3-46e8-b6d5-fade54b86b4e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.248', '2026-03-27 11:58:09.249', '2026-03-27 11:58:09.249');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('7a6a8b2f-a21f-42aa-b01b-b3f2a48f05a3', '5ae49041-ab60-423f-bcdd-e3c92eaa7b74', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.25', '2026-03-27 11:58:09.25', '2026-03-27 11:58:09.25');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('de97ff77-2d76-4abc-82e9-ed5aaacbe54f', '6c3fbc2e-a340-4c6c-8713-b2504a61724a', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.251', '2026-03-27 11:58:09.251', '2026-03-27 11:58:09.251');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('45b74c15-8667-4292-8dbb-238a6d40d667', 'd0485c84-090f-436d-a0e4-1f10a16c5982', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.252', '2026-03-27 11:58:09.253', '2026-03-27 11:58:09.253');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f73c940a-b9d9-4b73-95b6-a3ed484ad3e9', 'a4a05ca0-92ad-404c-8984-4fb4804f341e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.254', '2026-03-27 11:58:09.254', '2026-03-27 11:58:09.254');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('069f93ca-7de8-4e32-bc8a-ae67513a5c68', 'bb0fa654-b47e-4027-8d4a-702ea16f68e4', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.255', '2026-03-27 11:58:09.255', '2026-03-27 11:58:09.255');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('c3aa3b6a-60c9-4b26-846e-604579a617b7', 'b5f76552-b139-498e-a7ab-15ccbd59d344', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.256', '2026-03-27 11:58:09.257', '2026-03-27 11:58:09.257');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('39bffc38-01c5-4fa0-8d40-6b60d236761a', 'c0e9b107-0d5d-40bd-bad6-f3f47af56ea3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.258', '2026-03-27 11:58:09.258', '2026-03-27 11:58:09.258');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('6627451d-e2e2-4f7f-9bc3-f43e44b4c20b', '2ae67770-3d2b-4c99-85d3-f89529815e81', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.259', '2026-03-27 11:58:09.259', '2026-03-27 11:58:09.259');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('bf81b036-d613-4760-93e7-ee81fdd5a830', 'd73e4f73-d548-4ccb-90a1-583f537d1f65', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.26', '2026-03-27 11:58:09.26', '2026-03-27 11:58:09.26');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ae9d0e84-2bed-419c-97d4-d6ebe5f6f2a5', '0e75092b-11cb-4df9-9a4a-f6af01cdd9cb', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.261', '2026-03-27 11:58:09.261', '2026-03-27 11:58:09.261');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8edff896-b54b-48ad-a678-c6752e06358d', '5a1d387a-540e-4958-bbc0-40dc16a4dd2b', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.262', '2026-03-27 11:58:09.262', '2026-03-27 11:58:09.262');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0afe9790-a749-44a0-b2ea-a2ea3de67b8d', '1e819bcd-5ee1-4966-90a0-857d164e8d12', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.263', '2026-03-27 11:58:09.263', '2026-03-27 11:58:09.263');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('427668e1-123a-4838-9b0e-e8d8e8ed66d2', 'b2bb0151-b229-4eac-95a5-f7635ea9493d', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.264', '2026-03-27 11:58:09.264', '2026-03-27 11:58:09.264');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('c59908bc-a797-420d-8e4c-f08331f0bcb3', 'e1034723-ebb5-4c94-b1d0-b8ab3bb3d23e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.265', '2026-03-27 11:58:09.266', '2026-03-27 11:58:09.266');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('506fc8de-6464-4bee-b62c-13f65d896cb0', 'b937612f-1048-435c-b9d6-9243f6f640fd', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.266', '2026-03-27 11:58:09.267', '2026-03-27 11:58:09.267');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('3a2c2f13-7d0a-4a14-8960-120e1f4a9ee7', 'ad7d911a-648d-4a5a-9db2-e0089e67131b', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.267', '2026-03-27 11:58:09.267', '2026-03-27 11:58:09.267');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d78ad827-3225-4b58-89f5-b476ffde895f', '78e5d74d-cbf7-4e1d-b2f8-81577edbef90', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.268', '2026-03-27 11:58:09.268', '2026-03-27 11:58:09.268');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('99c8dc29-6ed9-44ad-9f74-0c902fd815af', '78acddad-d796-4ee6-bf61-12ea2f264efa', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.269', '2026-03-27 11:58:09.269', '2026-03-27 11:58:09.269');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('217c6b81-f3a9-4a93-b7c1-0edda25ea35e', '1ab69561-c144-41f6-8287-4cf20c57b153', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.27', '2026-03-27 11:58:09.27', '2026-03-27 11:58:09.27');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('6808b6e7-e755-447a-9f70-9faeda31c6f4', 'e530f9a8-3506-4666-bb97-3bd72740acb2', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.271', '2026-03-27 11:58:09.272', '2026-03-27 11:58:09.272');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('b45702bd-e735-41c9-80d5-e5375d735438', '38bfb836-b0dd-4d69-b4b6-544c3390f904', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.273', '2026-03-27 11:58:09.273', '2026-03-27 11:58:09.273');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('12180b33-f9b2-4cc4-917a-9bd9cce110d3', '590b300a-a584-4939-a78a-b8dc85a1e3cf', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.274', '2026-03-27 11:58:09.274', '2026-03-27 11:58:09.274');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8ab00d3a-2091-43f3-9214-1e9af0818c85', '7850e4ad-e701-47c8-be57-2c974e40259d', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.275', '2026-03-27 11:58:09.275', '2026-03-27 11:58:09.275');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('3543ea38-4765-4b8b-bb33-195d8ed94847', 'f22dbac3-6d8c-4ada-984f-b64771fb62e9', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.276', '2026-03-27 11:58:09.276', '2026-03-27 11:58:09.276');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('5cc22c66-388f-4d00-8f04-bdcf2541436d', 'da2336f7-261e-48e7-9615-d79313e585dd', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.277', '2026-03-27 11:58:09.277', '2026-03-27 11:58:09.277');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('4c1245c4-0f01-40aa-8b6e-e019bf82042d', '82f2e6a3-86dc-4276-9258-b9e64e774d9e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.278', '2026-03-27 11:58:09.278', '2026-03-27 11:58:09.278');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('4f50c1c4-2ccf-4cc2-ba0d-a67674cdbb27', '026f1dea-a0e6-422f-be37-88cccb7d4084', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.28', '2026-03-27 11:58:09.28', '2026-03-27 11:58:09.28');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('6cc7bc3b-8753-4c22-97b4-9eb2ad2fa642', '64f2b1d1-7c44-4f01-bb51-c62fd244a134', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.281', '2026-03-27 11:58:09.281', '2026-03-27 11:58:09.281');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('16f98231-51a8-4939-8bc9-1ac7a426dc4c', 'cb5652cb-cd6a-4c2f-8d7e-4ce8b362ba18', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.282', '2026-03-27 11:58:09.282', '2026-03-27 11:58:09.282');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0dd2df78-530e-4542-a1f9-91f1e6b811a8', 'c686223b-74e5-4992-85e8-342c9d607ae2', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.284', '2026-03-27 11:58:09.284', '2026-03-27 11:58:09.284');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a544d658-0643-481f-9f46-742df46200da', 'd7b2a0d8-ff59-437a-9c06-c08e13a94e58', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.286', '2026-03-27 11:58:09.286', '2026-03-27 11:58:09.286');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('573e1a59-95c3-44f5-a029-31eab93b90ab', '11230545-aabc-4891-bb6d-22e60231d7b3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.287', '2026-03-27 11:58:09.287', '2026-03-27 11:58:09.287');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('16714754-9da7-489d-a50d-af07d0294915', '65064788-054e-4005-aa1c-52004dbde891', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.288', '2026-03-27 11:58:09.288', '2026-03-27 11:58:09.288');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('6aec2c85-3926-4fb6-8a69-ff64186bc2b8', '40971ede-34e8-4aec-962d-095e458c14e3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.289', '2026-03-27 11:58:09.289', '2026-03-27 11:58:09.289');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('777e44fc-95e6-4095-8002-a7c2bc2375b6', '4e9a5bd2-fc22-47ff-a699-1119e9b31107', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.29', '2026-03-27 11:58:09.29', '2026-03-27 11:58:09.29');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('dc1bc24b-626f-471c-99dd-5620b9683776', 'a1205d98-9dd0-40da-bab0-2387787e5fab', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.291', '2026-03-27 11:58:09.291', '2026-03-27 11:58:09.291');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('00cd0fab-582d-4780-a872-0fb1db09a74b', '22c8ff96-4d5d-4f42-9b6a-00d441a49a47', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.292', '2026-03-27 11:58:09.292', '2026-03-27 11:58:09.292');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('14fe9a15-8e85-4594-8d2f-414953043ac7', '8eba3099-66f6-4f09-b839-f87947c7afb4', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.293', '2026-03-27 11:58:09.294', '2026-03-27 11:58:09.294');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('93d79aa2-a8b1-402f-a2b1-1aaf6a5bc620', '1bf011dc-1049-4177-8c84-31a4c7f2bc95', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.295', '2026-03-27 11:58:09.295', '2026-03-27 11:58:09.295');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8382343f-b75a-47cb-916b-2fd3591ddee5', 'f6be6dae-834e-4ccd-9930-cc181c8df520', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.296', '2026-03-27 11:58:09.296', '2026-03-27 11:58:09.296');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('3adf8913-41ab-4430-ab61-a694b1afc3c1', 'f99c5af4-14ad-4d0b-a01d-c76926c418b7', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.297', '2026-03-27 11:58:09.297', '2026-03-27 11:58:09.297');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d03ccf8f-d8f3-41a2-8aeb-ebffae6267a4', '36e6be44-9086-45c6-8a8c-e9927c640e85', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.298', '2026-03-27 11:58:09.298', '2026-03-27 11:58:09.298');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('3e9eb652-fb92-4296-aaad-15562bb01b14', 'c0def6b8-ac1b-4a05-9c4b-bb516d50c5c3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.301', '2026-03-27 11:58:09.301', '2026-03-27 11:58:09.301');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('6a7a4459-ef64-4e01-a4f7-b79e0a331996', 'b37f8cdc-b3f2-45a6-9f98-d42c83960faf', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.302', '2026-03-27 11:58:09.302', '2026-03-27 11:58:09.302');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8e55e223-d5bb-4d35-94ed-465c7c35d1dd', '4c707726-b263-4e6e-ac14-2ff1b149e8b3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.303', '2026-03-27 11:58:09.303', '2026-03-27 11:58:09.303');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('871275c3-88f6-4085-a048-d6c8d2c97563', '76c5ccc9-fcac-4e37-b48e-6adb17fda918', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.304', '2026-03-27 11:58:09.304', '2026-03-27 11:58:09.304');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('de44cdf7-1f48-4dc1-abd0-f92e4fe78380', 'ff83e2f6-353e-488e-ae38-36c2ff8885f3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.305', '2026-03-27 11:58:09.305', '2026-03-27 11:58:09.305');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('6bf99151-fc2e-4286-b407-bf86ffdfd245', '0050bccd-b22d-4efa-b4eb-e9e40aa04ebe', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.307', '2026-03-27 11:58:09.307', '2026-03-27 11:58:09.307');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('84c028f8-e03d-41f5-b5e9-27499e63bb1f', 'a52a3ba4-4813-40c5-9e58-4c61e4985e77', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.308', '2026-03-27 11:58:09.308', '2026-03-27 11:58:09.308');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('dbad6d09-38e2-4eab-bb42-ea1e75460d3c', '6ccf5c7a-9f77-49da-b073-2971f7f0287b', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.309', '2026-03-27 11:58:09.309', '2026-03-27 11:58:09.309');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('49b46ec9-3801-4db5-8fd2-57c29c5099d5', '922df5f1-44df-4250-8ed2-9e9539a54c0a', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.309', '2026-03-27 11:58:09.309', '2026-03-27 11:58:09.309');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('dc1af934-f75c-40b4-9c42-0478310d06bf', '7a7795d9-2878-4f6d-a08a-2e3ca9114b0e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.31', '2026-03-27 11:58:09.31', '2026-03-27 11:58:09.31');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('3c43869d-9d80-46c9-a81c-40dfb688aff5', '97aec771-7098-4c12-8c79-6d3ab676b410', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.311', '2026-03-27 11:58:09.311', '2026-03-27 11:58:09.311');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('6261f6e8-a70b-4ae4-b591-310edc948782', 'b2bac93f-873c-4c8a-9a0e-2492e2f21bc8', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.313', '2026-03-27 11:58:09.313', '2026-03-27 11:58:09.313');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('739b781f-0efd-4ab2-a0b6-79048c5595da', 'db0b3f7d-7f11-47b2-b3b4-d81057fc0f48', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.314', '2026-03-27 11:58:09.314', '2026-03-27 11:58:09.314');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('9cf84091-3238-491c-87db-c16a74117c88', '2045b1cc-5059-406c-9e86-a511ba2746f4', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.315', '2026-03-27 11:58:09.315', '2026-03-27 11:58:09.315');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('693153f2-ccf9-43ec-ba16-3d62f81b0af6', '497eecec-fa0e-4c14-824a-a272a430bbe4', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.316', '2026-03-27 11:58:09.316', '2026-03-27 11:58:09.316');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('74f50d09-fe42-4ca7-9642-6801bd5e3771', '03dca840-af27-41ef-98bb-dc89aedccf48', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.317', '2026-03-27 11:58:09.317', '2026-03-27 11:58:09.317');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('1a9bfce6-062c-4a10-be7a-7bc25909a12e', '3b14bb7f-644f-4725-b99d-2fd40a198e81', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.318', '2026-03-27 11:58:09.318', '2026-03-27 11:58:09.318');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('e40d4cde-61c6-4119-bd11-e325e3316dfd', 'ff417a4f-c491-4ded-95c0-1e7be0817e70', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.319', '2026-03-27 11:58:09.319', '2026-03-27 11:58:09.319');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('46ed6624-2f76-4fb2-a86c-35118b09852c', '4aaa3e85-e02a-4b11-81ce-74ea0cb532fb', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.32', '2026-03-27 11:58:09.32', '2026-03-27 11:58:09.32');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('9079f579-cb91-43e0-8570-fff8da1d6866', 'c86b5fcf-01c9-48cc-87ee-c2f5b298f338', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.321', '2026-03-27 11:58:09.321', '2026-03-27 11:58:09.321');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0adae204-74ea-4b26-b2c4-79e93bc31686', '04fd58c9-d750-4749-9f31-448b9ede6b06', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.322', '2026-03-27 11:58:09.322', '2026-03-27 11:58:09.322');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('9e4d238f-bcc6-4989-9e5c-d7cb90eee3c0', '5a1737ff-3478-40fd-90ec-4520de7a3e98', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.323', '2026-03-27 11:58:09.323', '2026-03-27 11:58:09.323');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('023ec589-c1e1-4747-aa48-b676e5bae726', 'ee098e6e-214b-401b-a44f-a96cb1f6b2ea', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.324', '2026-03-27 11:58:09.324', '2026-03-27 11:58:09.324');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('1fb5833e-43ec-4cfc-9e25-2744f65aeb38', 'beb4fbbe-d3e8-449e-b247-de22c5080629', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.324', '2026-03-27 11:58:09.324', '2026-03-27 11:58:09.324');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('4b532ca9-b39b-4e4d-a511-8d299ef321ce', '43c32b53-560e-4699-8f4f-9522088ea756', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.325', '2026-03-27 11:58:09.325', '2026-03-27 11:58:09.325');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('e06d99cd-4530-491c-bfdb-089a1124d454', 'a3439c66-fbcd-4105-b140-b1a7c89889c0', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.326', '2026-03-27 11:58:09.326', '2026-03-27 11:58:09.326');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('2c93879b-c992-4252-9de3-734cebaf3538', 'e58ef382-d828-4383-bb7f-1c1956f7a1b4', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.327', '2026-03-27 11:58:09.327', '2026-03-27 11:58:09.327');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('c26ea4ff-5dac-430d-900d-c75f3a46ae1d', '928c733a-b636-472f-921a-698e01f4fd1c', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.328', '2026-03-27 11:58:09.328', '2026-03-27 11:58:09.328');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a11d5c2f-22ea-4d22-9b22-9a7b77b333bd', '58034ad5-118e-4627-9917-c0a6c1c917e4', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.329', '2026-03-27 11:58:09.329', '2026-03-27 11:58:09.329');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('5d797c0f-1ae5-4a11-a72c-de5e3ae3e25b', '460f161c-6eab-4a58-8e07-41dc8c85e934', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.329', '2026-03-27 11:58:09.329', '2026-03-27 11:58:09.329');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('671de2b2-d874-4bfd-97a2-b1d035e44e15', '292bd213-1359-40a3-960a-f825881fe551', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.33', '2026-03-27 11:58:09.33', '2026-03-27 11:58:09.33');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('920ee8a4-2820-4bf9-94c9-30b247d517a4', '9381e496-b4f0-4c22-84c6-d41e10b48d05', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.331', '2026-03-27 11:58:09.331', '2026-03-27 11:58:09.331');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('85bf59ef-62ce-48fc-a3b1-00a6a4959954', '135196aa-a596-4ce3-9459-2e09c66e551b', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.332', '2026-03-27 11:58:09.332', '2026-03-27 11:58:09.332');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ec42cfb5-98ef-489c-aec6-a800421ed6aa', 'c0fce145-7d7f-4f92-871d-f4336796d1a8', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.333', '2026-03-27 11:58:09.333', '2026-03-27 11:58:09.333');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('390e330b-dcaf-4592-b094-a74450646e4b', '7cde361c-93ae-4aa2-bfc1-8cf63a397a86', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.334', '2026-03-27 11:58:09.334', '2026-03-27 11:58:09.334');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('e821468c-1f99-458d-be35-d4b027044d2c', 'ebeed9ed-ab12-4b3b-8dbf-5b7b020cdb31', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.335', '2026-03-27 11:58:09.335', '2026-03-27 11:58:09.335');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('fe3c2a39-7128-4a98-9edd-47490b8c3c0a', '39aa5c10-e593-4432-9c82-ee14f02055bc', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.336', '2026-03-27 11:58:09.336', '2026-03-27 11:58:09.336');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0d2b1563-1245-47d0-bd5d-a793a8313501', 'feb6d44a-e850-43ee-bc63-6fab7f55fd50', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.337', '2026-03-27 11:58:09.337', '2026-03-27 11:58:09.337');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('57c57bf6-4224-4f0f-bd67-ae0392ef1935', '80d8ac21-2ea5-47d0-842a-c39d2f7f7fde', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.338', '2026-03-27 11:58:09.338', '2026-03-27 11:58:09.338');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ccb121cd-245a-4a57-a0a7-a607c92d27c9', '9d99597b-aef5-4c66-927a-7e669c71d109', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.341', '2026-03-27 11:58:09.341', '2026-03-27 11:58:09.341');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('2bc590ea-184c-4352-a451-d3fc74b415d9', 'd7133bb9-cbc9-4353-b506-536092cd0181', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.342', '2026-03-27 11:58:09.342', '2026-03-27 11:58:09.342');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('703f9406-c504-4f76-a573-0a522d4e419e', 'ddd186df-bb69-4a89-ab53-908a02fcdea5', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.343', '2026-03-27 11:58:09.343', '2026-03-27 11:58:09.343');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('96934174-693d-4cf3-a1ee-992d7a73aa6e', 'a7f2e2e8-6201-4a3d-b1d5-465e1882aa78', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.343', '2026-03-27 11:58:09.344', '2026-03-27 11:58:09.344');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('9efbbb70-5f67-4d9b-a013-e0564ce501a7', '7e45426a-c9f0-4d23-90dc-5f7be88c4d63', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.344', '2026-03-27 11:58:09.345', '2026-03-27 11:58:09.345');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('516bb8b6-7e7d-4489-86ad-d1bc5ff352cd', '63b112da-105f-4db9-9d4d-9da0813156f3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.347', '2026-03-27 11:58:09.347', '2026-03-27 11:58:09.347');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('1c66148b-3083-4633-b832-effc6d2ce7e4', '2bc60755-5847-4d9e-83e5-a4074bc0d052', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.348', '2026-03-27 11:58:09.348', '2026-03-27 11:58:09.348');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('1a1d9c03-cbce-4372-aea5-12b63dda3bef', 'bffa578e-b295-4425-9d5a-e2ab7d37a4b0', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.35', '2026-03-27 11:58:09.35', '2026-03-27 11:58:09.35');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('c3447aae-5118-4e92-a1ca-61040b2696fb', 'bf551e06-9f6f-45c9-aec4-c7615ad0b410', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.351', '2026-03-27 11:58:09.351', '2026-03-27 11:58:09.351');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('2eb46273-6e16-4084-8d55-22ebd04a7556', 'b4236e08-5269-411d-bbd0-1bed6e843f62', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.352', '2026-03-27 11:58:09.352', '2026-03-27 11:58:09.352');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('16605ee6-f8f0-4e8f-9176-daeaa59e1a9c', 'a8f17f38-4a06-456b-ba33-1d36a94645de', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.353', '2026-03-27 11:58:09.353', '2026-03-27 11:58:09.353');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('07f9626e-5499-44ba-8d4f-a68f5d68f8ff', '72f89b73-9f95-4d56-b1b0-1c4aa3c9cce6', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.354', '2026-03-27 11:58:09.354', '2026-03-27 11:58:09.354');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d969c9c3-9fe7-43c6-a272-91f80707409f', '71a26227-5a6d-466c-967d-601b053a6647', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.355', '2026-03-27 11:58:09.355', '2026-03-27 11:58:09.355');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('5a8cec6a-cd62-4efc-bc8a-8deb673f0ce9', '178cacd9-6074-414e-896e-440df254921d', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.356', '2026-03-27 11:58:09.356', '2026-03-27 11:58:09.356');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('768659d6-552c-408d-9d54-ef9eaf07e176', '3ec1a2f9-99dc-4a31-bb02-dd447be15f24', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.357', '2026-03-27 11:58:09.357', '2026-03-27 11:58:09.357');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8a1bd314-c78e-4e15-9a26-a509ab8bab06', '839e96d8-159d-43d6-ad8a-2cdc3a4bc9d9', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.358', '2026-03-27 11:58:09.358', '2026-03-27 11:58:09.358');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ba6fb644-079e-4e00-a062-32dbdc1bc6d3', '79f55dc2-371c-4c7f-8ee8-44808d45a378', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.358', '2026-03-27 11:58:09.358', '2026-03-27 11:58:09.358');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('9a51763f-9ccd-44c2-98fd-8185b612de61', '8dbed962-e349-4ec5-9179-1363488e85bd', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.359', '2026-03-27 11:58:09.359', '2026-03-27 11:58:09.359');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('603dface-8efe-457c-8f3c-7013a250655c', '26cdc7f9-0f92-4214-9327-ecdea53aeeac', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.36', '2026-03-27 11:58:09.36', '2026-03-27 11:58:09.36');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a569d1f8-1e17-415f-818f-2e4a1c079742', '81d8e029-08c2-4c4d-8122-614e9c08ced5', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.361', '2026-03-27 11:58:09.361', '2026-03-27 11:58:09.361');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f84d5dd2-c1f0-4ee6-b91e-baf0c27f0700', 'af9a2ca8-5a48-478f-8abd-f17bed7a9b27', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.362', '2026-03-27 11:58:09.362', '2026-03-27 11:58:09.362');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d2eb8381-1192-4d39-bdf6-2f0fdd3a1c5f', '8e5defaa-87b4-448a-91a3-224f5ad232c1', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.363', '2026-03-27 11:58:09.363', '2026-03-27 11:58:09.363');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('2ac2c893-25a1-4651-a8ac-80aefaf34d70', 'f20c1373-a4ad-4701-8897-f9bc1e5e746e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.364', '2026-03-27 11:58:09.364', '2026-03-27 11:58:09.364');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('9145aa8d-be76-4cb6-9c8e-7102bc68556e', '7e07d54a-b880-4a73-bd21-64d66035feb6', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.364', '2026-03-27 11:58:09.365', '2026-03-27 11:58:09.365');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f0a353aa-535e-424e-86a0-7291ff65699e', '7f2258ec-f62a-46e1-9f4d-05acf8c9a28d', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.365', '2026-03-27 11:58:09.365', '2026-03-27 11:58:09.365');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f7734e40-51c0-4384-a8e0-7c73ea7b0d72', '61072a61-4501-4d21-9c21-0878928ea143', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.366', '2026-03-27 11:58:09.366', '2026-03-27 11:58:09.366');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('c5e553d9-230f-4baa-b5b0-74b81fc88aed', '75d0d8db-41ee-4ea9-97fd-8ffc54c0b02a', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.367', '2026-03-27 11:58:09.367', '2026-03-27 11:58:09.367');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ed701c6b-3465-40f2-bb95-29f57d3d4216', '55bb68f0-a34b-4f44-b821-1764959e08ac', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.368', '2026-03-27 11:58:09.368', '2026-03-27 11:58:09.368');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0ba3223a-1d05-4aab-a957-2b5d2339dc62', 'f193734f-5f6e-44da-8add-e4d698e97c05', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.369', '2026-03-27 11:58:09.369', '2026-03-27 11:58:09.369');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d100386b-2091-4cca-993a-7f1d69e6ae6b', '3813cc9c-c914-45a9-a336-9d3bcdc65595', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.37', '2026-03-27 11:58:09.37', '2026-03-27 11:58:09.37');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('4ebdc128-9d1e-4a7b-aa62-c0fe3461efc7', '0ee7fedd-35fe-4352-b8a2-ea7a86315235', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.371', '2026-03-27 11:58:09.371', '2026-03-27 11:58:09.371');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('93d9a88c-169b-4296-9bb1-7d83f024c117', '218810fc-8a53-4d5d-82da-d4822f80c671', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.372', '2026-03-27 11:58:09.372', '2026-03-27 11:58:09.372');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a34ca2f1-1823-4669-bceb-5ae1459fbd8b', 'de21007b-7320-47bc-bfd3-97bd5fac82e1', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.373', '2026-03-27 11:58:09.373', '2026-03-27 11:58:09.373');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('de5a8c87-e64a-403e-9c9e-f010d582f2da', 'e442c818-6abf-4a12-b36a-1c90618ad4b4', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.373', '2026-03-27 11:58:09.373', '2026-03-27 11:58:09.373');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('4329e1fe-96fc-420d-b145-ba46dedf6aee', '03bcc04c-7553-4ffb-87d6-e5da59ee4371', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.374', '2026-03-27 11:58:09.374', '2026-03-27 11:58:09.374');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f30aaae2-1b64-424a-b039-93d471dac128', 'dda07397-3ec9-4f3c-b44f-51ba0eab860c', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.375', '2026-03-27 11:58:09.375', '2026-03-27 11:58:09.375');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('2b7871b3-dc4a-48f6-8182-53192b9b9212', '08e39286-23b6-4312-aef7-d88647511e63', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.376', '2026-03-27 11:58:09.376', '2026-03-27 11:58:09.376');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('61dccf65-81e7-41aa-bfe9-9dc687faccbc', '951350f9-494d-4369-bcde-9d8db8c4b9e1', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.377', '2026-03-27 11:58:09.377', '2026-03-27 11:58:09.377');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('e354de24-7a78-4bba-9103-33b1ff0bb3f7', 'b5c540bb-9ec9-42a9-85cb-df15390debe7', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.378', '2026-03-27 11:58:09.378', '2026-03-27 11:58:09.378');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0c7821c2-a3fc-47a1-9ebe-facdcdd7cbee', 'd5121a9d-ab44-4ab4-a78b-e3826690fabe', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.378', '2026-03-27 11:58:09.379', '2026-03-27 11:58:09.379');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d4c1faa3-8e97-4722-85a8-f3774c5658c0', 'a517d93e-a26a-4840-8678-dd1476cfb930', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.379', '2026-03-27 11:58:09.379', '2026-03-27 11:58:09.379');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('b1918caf-62fd-45f0-981c-b3da3c667fd6', '4ac90b7a-a710-4b0e-80ca-dd9a6748829f', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.38', '2026-03-27 11:58:09.38', '2026-03-27 11:58:09.38');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('cd5b0b32-45de-40be-a38b-c75d6fa94435', '9f485e0a-b0ec-4d97-9969-e4c71c56c961', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.381', '2026-03-27 11:58:09.381', '2026-03-27 11:58:09.381');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('9cdfcbd6-3e5f-4968-90f8-5f29176a9388', '4656dbcb-9715-4314-a813-567e2340715d', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.382', '2026-03-27 11:58:09.382', '2026-03-27 11:58:09.382');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('b9996962-cd2b-4374-919f-d0083238fab7', '300e4bc3-abd1-4d57-b21f-efd09c3755e8', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.383', '2026-03-27 11:58:09.383', '2026-03-27 11:58:09.383');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a8d3c2fa-7d7f-4da2-ac5b-d919c53c01f8', '34a17eeb-fd19-45b0-9765-ecebd3251fa2', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.384', '2026-03-27 11:58:09.384', '2026-03-27 11:58:09.384');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('b9d9aea6-1e31-4e29-85b3-397d819e7d87', 'ba34494b-5a68-41a4-a4b2-bd55b9d138df', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.384', '2026-03-27 11:58:09.384', '2026-03-27 11:58:09.384');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('79d14646-e599-45c8-83f0-1ca5a02cc2ab', 'a02d1371-1d45-4c47-b4d1-b0ce6c13a444', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.385', '2026-03-27 11:58:09.385', '2026-03-27 11:58:09.385');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a1039ce5-6cc4-4d32-91e3-f8fccb67542b', '2f9b01ee-eaeb-4525-8f92-6f077ec10941', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.386', '2026-03-27 11:58:09.386', '2026-03-27 11:58:09.386');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('3ac9fa8d-272b-43db-8dee-252519c7fe93', 'db3ce1e4-df5c-4556-8867-1e0ab9d1c656', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.387', '2026-03-27 11:58:09.387', '2026-03-27 11:58:09.387');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('6c0e94be-5f3a-4584-9244-7b1ccef73407', 'c44a6699-2911-45ac-8ebe-6503d04d68e7', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.387', '2026-03-27 11:58:09.387', '2026-03-27 11:58:09.387');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('c76987f3-fe0d-4b40-838d-9cd813df63e4', '9ed8fcad-4531-4919-ab1b-e12f51cf3bb4', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.388', '2026-03-27 11:58:09.388', '2026-03-27 11:58:09.388');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('9aaefa4f-f82d-4ebb-b1fc-7bf67ba048ea', '5c6f8191-2845-41c4-b5b3-2b55d3aa688f', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.389', '2026-03-27 11:58:09.389', '2026-03-27 11:58:09.389');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('4ee2737b-3dc7-42ea-8467-fe65347be36f', 'f85fb5e5-af38-40d6-ba37-29ba2124573c', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.39', '2026-03-27 11:58:09.39', '2026-03-27 11:58:09.39');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('490a107f-71c3-42b4-8861-2394857cf532', 'e097f9cb-5c70-47c7-8682-b4536b37ae93', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.391', '2026-03-27 11:58:09.391', '2026-03-27 11:58:09.391');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('3fea7047-09b7-4354-b33f-e2e068bfd324', 'e59fd812-aa69-405a-b010-07c23a90871c', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.392', '2026-03-27 11:58:09.392', '2026-03-27 11:58:09.392');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ecf0cc43-79de-407c-9e03-f9c09fd6b0db', '3bddebb0-6355-472c-801e-4cc0df3bc577', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.392', '2026-03-27 11:58:09.392', '2026-03-27 11:58:09.392');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ad03fb60-df07-4eb0-9209-01c3d5888a61', 'b4621252-3aa3-4bf9-b1ae-91d3cc3382d0', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.393', '2026-03-27 11:58:09.393', '2026-03-27 11:58:09.393');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('705c619e-c7b4-42e5-8358-2262fe85070b', '0e6a78df-d7ce-4109-8251-c9d5a8df2992', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.394', '2026-03-27 11:58:09.394', '2026-03-27 11:58:09.394');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a7513147-93c1-4d05-8c11-07695eb0106c', '289a296e-d6c7-4ecc-aa51-16f72a8d8f55', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.395', '2026-03-27 11:58:09.395', '2026-03-27 11:58:09.395');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a8ffd2f9-8044-4c97-b4a8-0dbba4bac31a', '6771bd28-df31-47a5-b291-069c99781d5c', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.396', '2026-03-27 11:58:09.396', '2026-03-27 11:58:09.396');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('15ab7f26-2d7f-462d-9ac3-407748de75b1', '177e1211-b74c-485d-a679-ea272966a2d8', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.397', '2026-03-27 11:58:09.397', '2026-03-27 11:58:09.397');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('e4ef056e-645a-4132-81c5-9789cf298b53', '4be90b8f-8758-4e9d-96cc-cbd4361848ba', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.398', '2026-03-27 11:58:09.398', '2026-03-27 11:58:09.398');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0358a06a-e282-493f-b822-634e74947a8c', '84707cdd-96a6-4aa2-b168-3cb81e96b1a5', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.399', '2026-03-27 11:58:09.399', '2026-03-27 11:58:09.399');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('352e305b-5f7c-4d2e-9ea0-cfd6480c3ca2', 'c028824a-b3ab-4d42-a47c-0684c14fd735', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.4', '2026-03-27 11:58:09.4', '2026-03-27 11:58:09.4');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('33fcfb36-0249-4ef1-b20c-48ba249c484f', 'ea82b18d-d043-48b2-b303-da376cc4b9c2', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.401', '2026-03-27 11:58:09.401', '2026-03-27 11:58:09.401');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('82563ea9-a8f0-4af8-af7b-cf1bf7c01c0d', '26b67704-8dcf-4e34-b2e7-95784a5a5589', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.401', '2026-03-27 11:58:09.401', '2026-03-27 11:58:09.401');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('805ea3e6-9df7-4a58-894f-eb60f01d0f56', 'c4d2e762-cea7-4a43-86ab-5cf957c49625', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.402', '2026-03-27 11:58:09.402', '2026-03-27 11:58:09.402');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('226db9dd-b766-43f2-aa83-48afdd32c504', '6e8d0c57-9923-4dcf-966c-9d0fd806a6b4', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.403', '2026-03-27 11:58:09.403', '2026-03-27 11:58:09.403');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('1813718a-ac46-4413-a26f-abddd976a06b', '53359cb7-b88d-4045-bd82-5fb17dd9ddb1', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.404', '2026-03-27 11:58:09.404', '2026-03-27 11:58:09.404');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('6b5c2f46-7f19-4ec0-baf3-95f24766a2f8', '915339bc-1e29-46f8-9f96-8de39e8b3b2e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.405', '2026-03-27 11:58:09.405', '2026-03-27 11:58:09.405');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ecd43fa5-d7f9-42e8-b146-7964c533157a', 'ea5559de-8808-4db1-9244-0b0d96c0712a', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.406', '2026-03-27 11:58:09.406', '2026-03-27 11:58:09.406');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8409573c-d05e-448b-88b5-acca7a466b07', '8d54c425-5672-455b-8b6d-89294ec3347a', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.407', '2026-03-27 11:58:09.407', '2026-03-27 11:58:09.407');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('05534118-9198-45c7-9aea-16cd40995dfd', 'c55004f1-c07b-4da9-a388-0c85ce6b7119', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.408', '2026-03-27 11:58:09.408', '2026-03-27 11:58:09.408');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f883cc2f-42af-4c9d-9096-f7b7184de459', '312969ed-25d4-42c4-a976-dc5003a5b48e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.409', '2026-03-27 11:58:09.409', '2026-03-27 11:58:09.409');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('388bebcd-391c-4581-b7a2-11b43f4bc33d', '283cf188-1d6c-4d1a-bcc4-bf71ac2553a3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.41', '2026-03-27 11:58:09.41', '2026-03-27 11:58:09.41');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('b240d40f-867e-438b-8e5e-2713210265be', '9a2c97e5-0590-441f-b983-2e07d5a070e8', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.411', '2026-03-27 11:58:09.411', '2026-03-27 11:58:09.411');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('4172f90b-ec2f-40ba-9498-345ea583d701', 'fe5a8a87-5ff5-430f-9649-7f61171a0464', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.412', '2026-03-27 11:58:09.412', '2026-03-27 11:58:09.412');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('cab83bc3-63ee-45ae-aaa7-3a47a1fed98b', 'b89c58d1-f94c-4d9b-bea8-28c4deb282dd', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.412', '2026-03-27 11:58:09.413', '2026-03-27 11:58:09.413');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ff84c6fe-473f-4514-b81c-bc30719ee272', 'fdff2b4c-f843-42e2-a8da-5bc5caf05ea5', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.413', '2026-03-27 11:58:09.413', '2026-03-27 11:58:09.413');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('1de2a9bd-1d30-4b47-a91f-da615a371957', '23fe706c-d664-4af2-8931-69fa819d79b2', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.414', '2026-03-27 11:58:09.414', '2026-03-27 11:58:09.414');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('3dc304f1-6fc6-4e56-9c6f-f4dc9dd65ceb', '310ecef1-6912-436e-a284-fba41ffd5ed3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.415', '2026-03-27 11:58:09.415', '2026-03-27 11:58:09.415');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('2adab5ef-6c54-4321-aefe-e279c9ef7213', '03929b5c-3d75-43a7-9c32-9ee0e52321b0', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.415', '2026-03-27 11:58:09.416', '2026-03-27 11:58:09.416');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('822fadcd-8477-4362-92da-00abd5c1485a', '00e4057f-39d7-4752-ac64-bef87f3b262f', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.416', '2026-03-27 11:58:09.416', '2026-03-27 11:58:09.416');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('aabf4d5d-bf00-4174-8ab2-a4e44492e0d1', '2b619363-91c6-4469-9215-f20f7980fbe6', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.417', '2026-03-27 11:58:09.417', '2026-03-27 11:58:09.417');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('82118b31-d6ee-4e17-8375-d42e94ab1bfc', '4c90f65a-3cbb-47d9-8cb6-d5c83be4b76e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.418', '2026-03-27 11:58:09.418', '2026-03-27 11:58:09.418');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('69c7e4ea-186a-4434-87e7-3efdcbd2e51a', '02772e69-2f8f-4bee-89b0-ed58c0c5f05c', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.419', '2026-03-27 11:58:09.419', '2026-03-27 11:58:09.419');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('69a1b03f-2bf6-4cbd-ad8f-25cb1e0b1650', '58d24390-a1b5-4ede-8f23-f153b612a848', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.42', '2026-03-27 11:58:09.42', '2026-03-27 11:58:09.42');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('04bbe539-0078-4545-853e-c1ee937fb5d7', '7be300ac-0532-468f-a31c-5f806d95c796', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.421', '2026-03-27 11:58:09.421', '2026-03-27 11:58:09.421');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('999f3281-7bb6-4120-8df5-e8abe42151a2', '2e862c2d-768a-4871-bc8f-7fdf232b8746', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.422', '2026-03-27 11:58:09.422', '2026-03-27 11:58:09.422');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('b0b52433-ba21-4c07-959b-f6f942643782', '896ba81d-fe8a-409c-b643-5821e3a8da91', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.422', '2026-03-27 11:58:09.423', '2026-03-27 11:58:09.423');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('61359085-3cfa-48e2-8c43-d099351fdb29', 'b14e6c9b-66c7-4527-8a26-1e66e89d254f', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.424', '2026-03-27 11:58:09.424', '2026-03-27 11:58:09.424');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d11c38ae-fbdb-49d7-b46b-dedaad50d501', '8edbcb20-fb8a-4a6c-b947-717a6e28f837', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.425', '2026-03-27 11:58:09.425', '2026-03-27 11:58:09.425');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('28e4e1b4-e693-4662-9929-938b5779412a', 'f1be1855-6b7f-458d-a1c6-75cb5eebc3e0', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.426', '2026-03-27 11:58:09.426', '2026-03-27 11:58:09.426');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('815d7430-e241-4eff-bafc-c0267fe29eaa', '6b920c10-c017-4990-b9a3-96d5501b9614', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.427', '2026-03-27 11:58:09.427', '2026-03-27 11:58:09.427');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('9f8d1a81-b7eb-4ff4-ad51-83dcc7e95e54', '38c5a6af-632f-455c-b6e7-1d53cf2aa485', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.428', '2026-03-27 11:58:09.428', '2026-03-27 11:58:09.428');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('7fa32d58-9aad-4399-b736-c46854701981', '96314219-521c-4526-b3e2-4156cecf1168', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.429', '2026-03-27 11:58:09.429', '2026-03-27 11:58:09.429');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('85c7ecfa-183e-439e-979d-876afddb1072', '59530aef-45d1-45ef-acff-78c5ca36d5bd', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.429', '2026-03-27 11:58:09.429', '2026-03-27 11:58:09.429');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('344852fd-5a5d-4a87-80de-34941290273f', '4533ad1a-c286-42c5-bcab-b1f5cd4c8199', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.43', '2026-03-27 11:58:09.43', '2026-03-27 11:58:09.43');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d6c4564e-9335-48ea-8b7a-ce79c6d7c552', '5e66d8ae-9af2-4132-b7d2-84e44f08b1d1', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.431', '2026-03-27 11:58:09.431', '2026-03-27 11:58:09.431');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('bd9ee2f4-80c4-45bd-ab01-d7b94fa76377', 'a1ed71b3-f896-4600-93f3-8e030eb1cd02', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.432', '2026-03-27 11:58:09.432', '2026-03-27 11:58:09.432');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0185e3f4-bb14-4534-9b53-c6af4781a8e5', '6267ce7e-d484-456f-8c50-9c6b3f7945b6', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.433', '2026-03-27 11:58:09.433', '2026-03-27 11:58:09.433');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f6799221-50c7-4e04-8196-2ca5b1cb7218', '28abf35b-5f00-4c10-9a3a-5b2a7bdea49f', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.433', '2026-03-27 11:58:09.433', '2026-03-27 11:58:09.433');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('04131093-a1a0-4822-962b-6c0fa2bf9a5d', '5d99dfed-325d-4c7f-8c7e-aeb92ef59823', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.434', '2026-03-27 11:58:09.434', '2026-03-27 11:58:09.434');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('e2608b42-7520-410b-a4d6-33176093f05c', 'a4fa9eb3-08d1-45b0-b716-79bf8778bdb3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.435', '2026-03-27 11:58:09.435', '2026-03-27 11:58:09.435');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('9ef4e683-3d13-45e0-a6fb-a246d16070f9', '68b82d91-086d-45cb-83dc-ed4278d47aa5', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.435', '2026-03-27 11:58:09.435', '2026-03-27 11:58:09.435');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('b97ce66c-5824-4f8e-a490-ddad012424f9', '0345895a-6c9e-4e63-872d-d87e6b8f8b8e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.436', '2026-03-27 11:58:09.436', '2026-03-27 11:58:09.436');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0ca60b9f-5aee-4133-8e90-8418e230afb4', '0a0dbe97-bcc6-4e95-bd8e-5799d765d7c1', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.437', '2026-03-27 11:58:09.437', '2026-03-27 11:58:09.437');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('4e4ad10f-fb71-4fa9-8a3b-c7e38b486aa8', '27dd223f-59d1-4423-a3de-17143b6bdda2', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.438', '2026-03-27 11:58:09.438', '2026-03-27 11:58:09.438');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ecf326da-1b6f-4fec-8f6b-4085767dfe0c', '180a6109-a5f0-4746-89ed-a347931a9bf2', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.439', '2026-03-27 11:58:09.439', '2026-03-27 11:58:09.439');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ec106755-28cb-4d58-bc2a-ba86a2c31fda', 'eb7ab2a3-9a14-4f9a-a21e-6c54ad441cba', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.439', '2026-03-27 11:58:09.44', '2026-03-27 11:58:09.44');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a7f42743-e253-47b1-81bf-280bca3c188d', '27cf9e9f-d13c-4c87-b59a-bc8ff3be66cc', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.44', '2026-03-27 11:58:09.44', '2026-03-27 11:58:09.44');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d17d153d-6c5f-4dd3-a780-316e40ac9b39', 'fc65d26e-549f-44e6-8173-68e6e51e8711', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.441', '2026-03-27 11:58:09.441', '2026-03-27 11:58:09.441');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a2c3294a-a83f-4c5d-9f17-d06f63623ace', '49fbc622-b0b9-4bd5-88ad-32b07413e852', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.442', '2026-03-27 11:58:09.442', '2026-03-27 11:58:09.442');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('baaff8c3-1aeb-49dd-ad96-f22877bf7820', 'fc4ff27d-22a4-412d-99d7-0e030f8b72a4', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.442', '2026-03-27 11:58:09.443', '2026-03-27 11:58:09.443');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8bdaa21b-0875-431f-8880-aae943fb7e24', '6eae4cae-357c-4485-9e78-a07264727055', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.443', '2026-03-27 11:58:09.443', '2026-03-27 11:58:09.443');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ca519512-247f-40ea-b834-e36ac4f3a69b', 'd00bf1ef-a28b-4753-9cab-0dfbe98ef56d', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.444', '2026-03-27 11:58:09.444', '2026-03-27 11:58:09.444');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('534dca66-f21c-4dc9-b01f-6e1e240e1711', 'c1314d2c-c2b0-4d48-998f-1ce68edcb763', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.445', '2026-03-27 11:58:09.445', '2026-03-27 11:58:09.445');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0901c994-30b2-423e-889c-f534f6a21ceb', '1915b28f-1921-44e2-ac2c-c9afaef9e702', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.446', '2026-03-27 11:58:09.446', '2026-03-27 11:58:09.446');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f3ff9821-080a-4840-8435-d76c362c0a67', '21752518-1d2f-4506-b686-6ea9c46e8f0c', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.446', '2026-03-27 11:58:09.447', '2026-03-27 11:58:09.447');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('3d0bf606-d8ad-4976-aa49-69b7d71eb3df', 'b1ac082e-806d-420e-b71b-aac40d6a4553', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.447', '2026-03-27 11:58:09.447', '2026-03-27 11:58:09.447');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ba15573b-8ce3-4606-bc9d-96d17a372985', 'e20d04c8-c1c8-4058-9d0b-2a1dd91de5c8', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.448', '2026-03-27 11:58:09.448', '2026-03-27 11:58:09.448');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('173ab916-ab06-4ee8-8102-d12cbd47c73b', '362bfc91-b224-400f-9d57-d01de20fd7cb', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.449', '2026-03-27 11:58:09.449', '2026-03-27 11:58:09.449');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d9ca0027-e364-45d5-8861-6bc9712c6d51', 'f9ac8aa1-a208-4fe3-a9fc-80eee917350f', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.45', '2026-03-27 11:58:09.45', '2026-03-27 11:58:09.45');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('add33b3f-70df-46c2-a86e-0463f7a91607', '9f00f67a-1d02-48ca-8957-e0cab6633213', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.451', '2026-03-27 11:58:09.451', '2026-03-27 11:58:09.451');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('71afcab1-d805-41f7-9ce0-4437dfbc22fa', 'dbe63a8f-3bec-4d49-b2f8-755f8daf91a2', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.451', '2026-03-27 11:58:09.452', '2026-03-27 11:58:09.452');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('334de938-fda8-4298-a98c-340e9b13f42f', '48009f5f-f147-4db6-ba9e-27b2ce152ece', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.452', '2026-03-27 11:58:09.453', '2026-03-27 11:58:09.453');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('c66e1d52-9e31-472b-a692-26dadc1a17f4', 'a6980a9c-afda-4cb1-a48a-3f4e444727bc', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.453', '2026-03-27 11:58:09.453', '2026-03-27 11:58:09.453');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('dabff8e9-3937-47da-ae5e-ee9cc1f4266b', 'fd216357-0a06-4ddc-9e1d-19e3b5ea4f4e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.454', '2026-03-27 11:58:09.454', '2026-03-27 11:58:09.454');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('aa3fa883-667c-4aaa-b6d8-e180350d32e1', 'c3332cbd-2660-4e62-be77-90e7846cfb29', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.455', '2026-03-27 11:58:09.455', '2026-03-27 11:58:09.455');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('063a3d4e-9d87-4d2a-bba5-1db5253bcf37', '3cbaf3e0-17bd-4ace-88f2-9e96ab86be22', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.456', '2026-03-27 11:58:09.456', '2026-03-27 11:58:09.456');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0de1cae1-706b-49f8-a445-e1fd57958243', '865d6329-42e3-461a-8d37-0dbaeba64d2c', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.456', '2026-03-27 11:58:09.457', '2026-03-27 11:58:09.457');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('4ca9aa15-f7b0-44be-be76-250ab4af02e9', 'e2c860fc-ae7f-449b-8f61-1a4fa89915c7', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.457', '2026-03-27 11:58:09.457', '2026-03-27 11:58:09.457');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f539d521-581b-4ed0-a540-47d2d46d2568', '39f2b349-59fe-413f-b312-9c6860b99a0f', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.458', '2026-03-27 11:58:09.458', '2026-03-27 11:58:09.458');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('369baa89-4a5c-481f-a4a5-3231f7d8b9b4', '6af91ece-e995-4879-aa27-3e17addc6184', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.459', '2026-03-27 11:58:09.459', '2026-03-27 11:58:09.459');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8067a7cf-3af8-4082-8717-7c322f4b2988', '5892df9a-59e9-45fc-82ab-4d5c61b149b7', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.46', '2026-03-27 11:58:09.46', '2026-03-27 11:58:09.46');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('b4bb9c83-f8f2-4233-a793-8f5f274fa09d', '389e5a27-e424-42ec-bcb5-32031b38e2f8', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.461', '2026-03-27 11:58:09.461', '2026-03-27 11:58:09.461');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('2c60e858-f06d-4256-8073-4806563189dc', '82af1ea6-cb91-4295-b052-d35bf7dc0983', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.462', '2026-03-27 11:58:09.462', '2026-03-27 11:58:09.462');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('25d408af-efdc-4823-85bb-59549cf78525', 'cb75b7f9-87e9-4f4f-b2ad-89e6a8c99fb6', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.463', '2026-03-27 11:58:09.463', '2026-03-27 11:58:09.463');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a81d1c24-8940-4482-9bf0-9cccc5c5aad7', '34a3d999-d91a-459c-87f6-fce06fd1e589', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.464', '2026-03-27 11:58:09.464', '2026-03-27 11:58:09.464');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('1b66dd0f-de82-451d-bfff-748a18129c33', 'ce6cbb1b-cd86-40db-b017-b22c84115def', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.465', '2026-03-27 11:58:09.465', '2026-03-27 11:58:09.465');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8ed562aa-5141-472b-9da8-84a9a085323f', '9feb7085-604a-460c-a38a-082587ea0227', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.466', '2026-03-27 11:58:09.466', '2026-03-27 11:58:09.466');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f7c0f068-6f2e-4c31-9a45-fb7a72062731', 'ea0993eb-6c0a-432c-88ed-201095a0d0d1', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.467', '2026-03-27 11:58:09.467', '2026-03-27 11:58:09.467');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('498a63ba-fb86-484d-8005-ff5df4640553', 'e42f6ea0-95d8-4bb0-b343-db11d2baeefc', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.467', '2026-03-27 11:58:09.468', '2026-03-27 11:58:09.468');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('c8b9071e-60d4-47f3-877c-9a4780394e2e', 'cfea5933-2291-4961-ab60-1dc11642f947', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.468', '2026-03-27 11:58:09.468', '2026-03-27 11:58:09.468');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('26c926f4-3e6c-4fdf-9828-089a596dc88c', 'f5b7479d-45cb-4cd2-937a-359ff3812b3a', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.469', '2026-03-27 11:58:09.469', '2026-03-27 11:58:09.469');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a332ac99-1e83-4af5-a1cd-1d3506a10646', 'dab55c2e-517c-441e-a2a4-b6e8eac2a77c', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.47', '2026-03-27 11:58:09.47', '2026-03-27 11:58:09.47');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('35645405-456f-4f88-80cf-d9846b5c0b13', '4cca1b00-c70d-40ba-866d-cc5b2df52a62', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.471', '2026-03-27 11:58:09.471', '2026-03-27 11:58:09.471');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('350d150b-df08-4764-9b04-f6c2e0dea72c', 'f1e69e3f-5c8d-4cd3-8b4c-f2f452f7b311', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.471', '2026-03-27 11:58:09.471', '2026-03-27 11:58:09.471');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('c87507b6-d6a4-43f7-8459-c8465fda1d69', 'fbe7bc22-f8d8-42cc-a27b-39e40b32a4aa', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.472', '2026-03-27 11:58:09.472', '2026-03-27 11:58:09.472');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('514bca70-c1a6-489e-bba3-f17d526f1ea7', 'af4e2dc3-dc63-4207-baaf-cd627949a81e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.473', '2026-03-27 11:58:09.473', '2026-03-27 11:58:09.473');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('5e335699-2f4b-4b84-ac33-e988cf49dff4', 'eca6cfac-fc55-4acf-857a-6124aa3c8882', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.474', '2026-03-27 11:58:09.474', '2026-03-27 11:58:09.474');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('b5a04d60-2fdb-486c-ac9f-ef62aa494a44', '6d3c8465-9a11-4ce3-8c66-c008673ac864', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.475', '2026-03-27 11:58:09.475', '2026-03-27 11:58:09.475');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d0a29a4a-008c-475c-a302-379c468997a6', '5cd8ae84-58ac-4eb7-92aa-8e5817663e15', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.475', '2026-03-27 11:58:09.475', '2026-03-27 11:58:09.475');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('fb4f33ff-d6f6-4af8-b60f-a00f373235f6', '9c1ce751-4a64-42a5-b716-337d0feec8d3', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.476', '2026-03-27 11:58:09.476', '2026-03-27 11:58:09.476');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('36032f0d-35ad-4db7-8a57-3313e50dcc26', '31b00b1a-13d1-48cd-8f4b-9cc925e772ca', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.477', '2026-03-27 11:58:09.477', '2026-03-27 11:58:09.477');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('2b0d8df4-b5d3-4f54-a715-62ea7f54afef', 'dfa311a8-a149-4c5b-99b3-ac55ec733bb2', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.477', '2026-03-27 11:58:09.477', '2026-03-27 11:58:09.477');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('1ef49ba4-4a00-4e2f-9ac4-5a2250e6202c', '384961a1-7ce2-4e91-807c-7d1900c5d68f', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.478', '2026-03-27 11:58:09.478', '2026-03-27 11:58:09.478');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f1c06e1b-8312-4aa0-b7c7-b164582431c1', '41319690-e5d8-4773-abe9-c9d14e5f7b7d', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.479', '2026-03-27 11:58:09.479', '2026-03-27 11:58:09.479');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('23545f6c-de60-42da-a9c6-0bb08693fd46', '7e9ea205-5d04-4afa-885d-d21384a73f70', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.48', '2026-03-27 11:58:09.48', '2026-03-27 11:58:09.48');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('7e805662-ed16-4cf5-ba1a-c01810321f56', 'cdacac1f-1f2b-4866-b9a7-324df5bbe389', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.481', '2026-03-27 11:58:09.481', '2026-03-27 11:58:09.481');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('728e7e30-fea5-4438-9f47-fb4bdba85b37', 'c426fd74-4a4b-49da-b9d6-2dd318224cee', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.482', '2026-03-27 11:58:09.482', '2026-03-27 11:58:09.482');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('abe9cfa3-dfb3-4d8c-8aa6-064927c0135e', '4ada26cb-c74b-40c6-8c8a-91a2b40af1fd', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.483', '2026-03-27 11:58:09.484', '2026-03-27 11:58:09.484');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('96e8302c-45d9-457a-868c-505c8fe3ca50', '1e62791b-04eb-4d40-be3d-5dd0c7ec7aca', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.485', '2026-03-27 11:58:09.485', '2026-03-27 11:58:09.485');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('6cfdaaf9-17ca-4cc2-a3a6-b79ae5fcd446', 'c51c0c13-ee51-44b5-aaf8-101d91754a61', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.485', '2026-03-27 11:58:09.486', '2026-03-27 11:58:09.486');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('826e7c73-aaf1-47de-b082-51579df9d388', '2169bdc2-2c0a-4e01-90b1-ed639bd2f55a', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.486', '2026-03-27 11:58:09.487', '2026-03-27 11:58:09.487');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('c2bfb54e-15c4-4f6f-a58f-8a4481612d23', '6d3b3113-820e-4016-8f79-47997fb22e07', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.487', '2026-03-27 11:58:09.488', '2026-03-27 11:58:09.488');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('e59c3404-0bc6-491b-b3f1-f683b58f0a5b', '5bd23955-4388-4f31-b47b-290cb6db320e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.488', '2026-03-27 11:58:09.489', '2026-03-27 11:58:09.489');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('b0c6f95a-6506-4bf5-896d-78c032b29e6f', '465b428a-91b6-4029-be6e-91af7cb3726e', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.489', '2026-03-27 11:58:09.489', '2026-03-27 11:58:09.489');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('218c15ce-654a-41e3-9b90-60a0699081c7', '5c62edc9-900c-461c-81da-196052f34dce', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.49', '2026-03-27 11:58:09.49', '2026-03-27 11:58:09.49');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('80420caa-a3ee-48c1-bdf7-2e02b2fc266d', 'eac56751-79b5-4d38-be9e-89a45920f73b', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.491', '2026-03-27 11:58:09.491', '2026-03-27 11:58:09.491');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('12be3c17-3cbe-435a-a77b-04f52759fdc2', 'cd68de03-d036-41b8-b351-21d23f3cbb71', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.492', '2026-03-27 11:58:09.492', '2026-03-27 11:58:09.492');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('e609274c-06a7-4a52-b533-2f8f03e9cbf3', '2b68b6ac-a0f7-4188-9bbe-ed892fb62fa9', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.493', '2026-03-27 11:58:09.493', '2026-03-27 11:58:09.493');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('bd2bd794-1bdd-4ce5-8651-d367de184f44', 'b6d22915-b1d2-4363-9d8e-1588c9f98279', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.494', '2026-03-27 11:58:09.494', '2026-03-27 11:58:09.494');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('06b12597-f589-46a2-83f5-4a7d505c760f', 'a7d2a7d0-a62b-45b2-a20a-767f32174b70', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.495', '2026-03-27 11:58:09.495', '2026-03-27 11:58:09.495');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('17b0ce32-4f39-4e95-a8b6-1f63f1d07881', 'f5a7c8b2-9990-491f-a7d2-42b0d2eceb83', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.496', '2026-03-27 11:58:09.496', '2026-03-27 11:58:09.496');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0405316e-9e3d-4b94-8e22-df6ab1d9eb7b', 'efb35da5-863e-4187-9a8c-4ec1eac13d35', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.497', '2026-03-27 11:58:09.497', '2026-03-27 11:58:09.497');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ab21a9b8-3cd5-4d5d-b370-d1c40812c96c', 'bbcd1d01-9c0f-4159-8284-9f385061ac2b', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.498', '2026-03-27 11:58:09.498', '2026-03-27 11:58:09.498');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('5da41b5d-1dea-44f3-9663-faf37533e748', 'c9fba493-dd06-42b0-8047-db9cd1bf4a94', 'ACTIVO', 0, 0, '2026-03-27 11:58:09.499', '2026-03-27 11:58:09.499', '2026-03-27 11:58:09.499');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8514c9a8-7580-4301-93a1-eb259ac2505c', '187f32db-5cf6-4771-aa9e-4f8ccf17b8de', 'ACTIVO', 0, 0, '2026-04-02 21:12:14.33', '2026-04-02 21:12:14.33', '2026-04-02 21:12:14.33');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('fd923cb1-a5d4-4850-902f-619fe8e2e1f8', '7e4500a1-f831-4f36-b7d7-d8d4141ba917', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a0de207a-e358-4cb3-a5e1-3fd56fff4082', '36c81744-c8f8-4cc4-bbdb-ac39c90a27bf', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('485d6f10-024f-4393-89b1-d88cb3adf166', '02446e79-3071-409c-b2bf-7f53e6403a7e', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('a11adf20-207f-4fcd-91e2-4a5448be5759', 'd5ed4395-2c5e-42fb-93d8-ef6b7f42ac55', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('0f121452-bf80-479c-8dde-632e38779d20', '090cfac2-46f0-4d35-b86d-6b27c7e4aace', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('f416434a-345f-427b-8ed9-93a387ee8b98', 'd50d25db-7812-44f4-8902-2fc75c53d3b0', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('d9cff8e4-61d1-47cb-a5f0-3d84e4cdef9c', '08f1f4fa-e68a-4fde-8282-63c733b8525c', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('8129d00c-ba18-40ab-9005-031c191fc45c', 'e3a06490-0a57-42e2-968a-6e2fcb7046e0', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('ef87b9cf-2b35-4613-8aa4-085a5c7dba0e', '1f62fd97-2d38-46f9-8069-70efc9cde5cc', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('48745a75-f967-4a86-bff8-9aac6aa9fd33', '0727262e-8435-4230-ad55-79539bf2b9cd', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('cf409788-480d-4f59-aee7-c561ded2d486', '713308d4-921b-4526-8ba0-276969120754', 'ACTIVO', 0, 0, '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('5286534f-cc70-43ef-bdcf-21b7f600c81e', '89767cb5-402c-4c1f-a992-cf3991b86a3c', 'ACTIVO', 2, 0, '2026-04-16 12:45:06.204', '2026-03-27 11:58:09.242', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('407c325e-d620-42de-bb61-babff4a9d524', 'f40bed8e-597b-4b66-9bd9-75a6123b80db', 'ACTIVO', 0, 0, '2026-03-31 20:47:34.648', '2026-03-31 20:47:34.648', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('87142956-5778-4adc-ac80-395cb420a459', 'a08f7596-d928-4746-a2b3-c2b0729a1cfc', 'ACTIVO', 0, 0, '2026-04-02 21:06:55.53', '2026-04-02 21:06:55.53', '2026-04-16 12:45:06.204');
INSERT INTO academic_work_plan."CarpetaDigital" VALUES ('660dd899-809c-4196-aa25-69c0e6b519d0', '52543b09-4b64-410f-9530-e2907b448080', 'ACTIVO', 0, 0, '2026-04-04 13:12:28.957', '2026-04-04 13:12:28.957', '2026-04-16 12:45:06.204');


--
-- Data for Name: Certificado; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Concertacion; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ConfiguracionSistema; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."ConfiguracionSistema" VALUES ('tipos_documentos', '[{"id": "1775312183077", "activo": true, "nombre": "Copia Cedula", "categoria": "personal", "es_sistema": false, "tamano_max_mb": 5, "formatos_permitidos": ["pdf", "jpg"], "requiere_validacion": true}]', NULL, '2026-04-04 14:16:23.081');
INSERT INTO academic_work_plan."ConfiguracionSistema" VALUES ('checklist_templates', '[{"id": "1775312212165", "color": "#2962FF", "icono": "book", "items": [{"nombre": "Copia Cedula", "categoria": "personal", "obligatorio": true, "requiere_validacion": true}], "activo": true, "nombre": "Carpeta Docente", "categoria": "personal", "created_at": "2026-04-04T14:16:52.165Z", "descripcion": "Documentos para docentes", "asignaciones": [{"tipo": "todos", "valor": ""}]}]', NULL, '2026-04-04 14:16:52.165');
INSERT INTO academic_work_plan."ConfiguracionSistema" VALUES ('pta_rules_v2', '{"inv_roles": [{"id": "ROL_001", "nombre": "INVESTIGADOR LÍDER DE PROYECTO", "pct_max": 50, "horas_max": 400}, {"id": "ROL_002", "nombre": "COINVESTIGADOR", "pct_max": 37.5, "horas_max": 300}, {"id": "ROL_003", "nombre": "ASISTENTE DE INVESTIGACIÓN NIVEL II", "pct_max": 25, "horas_max": 200}], "ext_secciones": [{"key": "capacitacion", "color": "#059669", "label": "Capacitación (SNPI)", "orden": 1}, {"key": "seleccion", "color": "#0284C7", "label": "Selección (SNPI)", "orden": 2}, {"key": "fortalecimiento", "color": "#7C3AED", "label": "Fortalecimiento (SNPI)", "orden": 3}, {"key": "laboratorio_innovacion", "color": "#0E7490", "label": "Laboratorio de Innovación", "orden": 4}, {"key": "investigacion_aplicada", "color": "#15803D", "label": "Investigación Aplicada", "orden": 5}, {"key": "alto_gobierno", "color": "#B45309", "label": "Alto Gobierno (EAG)", "orden": 6}], "ext_actividades": {"seleccion": [{"id": "SEL_01", "nombre": "Revisión y validación de estructuras de prueba", "items": [{"nombre": "Capacitación sobre la prueba", "tipo": "fija", "horas": 1}, {"nombre": "Sesiones de validación", "tipo": "por_unidad", "horas": 2, "unidad": "sesión"}]}, {"id": "SEL_02", "nombre": "Definición y operacionalización de constructos", "items": [{"nombre": "Capacitación sobre la prueba", "tipo": "fija", "horas": 1}, {"nombre": "Sesiones de validación", "tipo": "por_unidad", "horas": 2, "unidad": "sesión"}]}, {"id": "SEL_03", "nombre": "Construcción y validación de casos", "items": [{"nombre": "Capacitación", "tipo": "fija", "horas": 2}, {"nombre": "Construcción de casos", "tipo": "por_unidad", "horas": 4, "unidad": "caso"}, {"nombre": "Sesiones de revisión de casos", "tipo": "por_unidad", "horas": 3, "unidad": "caso"}, {"nombre": "Sesiones de validación de casos", "tipo": "por_unidad", "horas": 3, "unidad": "caso"}]}, {"id": "SEL_04", "nombre": "Validación de ítems", "items": [{"nombre": "Capacitación", "tipo": "fija", "horas": 2}, {"nombre": "Sesiones de revisión", "tipo": "por_unidad", "horas": 1, "unidad": "ítem"}]}, {"id": "SEL_05", "nombre": "Análisis de evidencias de validez en instrumentos de medición", "items": [{"nombre": "Capacitación sobre la prueba", "tipo": "fija", "horas": 1}, {"nombre": "Sesiones de revisión", "tipo": "por_unidad", "horas": 1.5, "unidad": "semana"}]}, {"id": "SEL_06", "nombre": "Grupos de discusión sobre instrumentos de medición", "items": [{"nombre": "Capacitación sobre la prueba", "tipo": "fija", "horas": 1}, {"nombre": "Sesiones de revisión", "tipo": "por_unidad", "horas": 1.5, "unidad": "semana"}]}, {"id": "SEL_07", "nombre": "Jurados — Prueba de Conocimientos (Componente escrito)", "items": [{"nombre": "Asistir a capacitación virtual para la Jornada", "tipo": "fija", "horas": 2}, {"nombre": "Asistir y fungir como Jurado (Jornada completa)", "tipo": "fija", "horas": 12}]}, {"id": "SEL_08", "nombre": "Jurados — Prueba de Conocimientos (Pruebas de ejecución / oral)", "items": [{"nombre": "Asistir a capacitación virtual para la Jornada", "tipo": "fija", "horas": 2}, {"nombre": "Asistir y fungir como Jurado (Jornada completa)", "tipo": "fija", "horas": 12}]}, {"id": "SEL_09", "nombre": "Jurados — Valoración de Antecedentes", "items": [{"nombre": "Asistir a capacitación virtual para la Jornada", "tipo": "fija", "horas": 2}, {"nombre": "Revisión y validación de hojas de vida", "tipo": "por_unidad", "horas": 1.5, "unidad": "hoja de vida"}]}, {"id": "SEL_10", "nombre": "Jurados — Entrevista", "items": [{"nombre": "Asistir a capacitación virtual para la Jornada", "tipo": "fija", "horas": 2}, {"nombre": "Aplicación y registro de entrevistas", "tipo": "por_unidad", "horas": 1.5, "unidad": "entrevista"}]}, {"id": "SEL_11", "nombre": "Jurados — Reclamaciones / Recursos de reposición", "items": [{"nombre": "Asistir a capacitación virtual para la Jornada", "tipo": "fija", "horas": 2}, {"nombre": "Revisión y respuesta a reclamaciones", "tipo": "por_unidad", "horas": 2, "unidad": "reclamación"}]}]], "capacitacion": [{"id": "CAP_01", "nombre": "Orientación de Talleres", "max_horas": 16}, {"id": "CAP_02", "nombre": "Orientación de Seminarios", "max_horas": 32}, {"id": "CAP_03", "nombre": "Orientación de Cursos", "max_horas": 64}, {"id": "CAP_04", "nombre": "Orientación de Diplomados", "max_horas": 160}], "alto_gobierno": [{"id": "EAG_01", "nombre": "Coaching directivo", "max_horas": 200}, {"id": "EAG_02", "nombre": "Formación estratégica", "max_horas": 200}, {"id": "EAG_03", "nombre": "Gestión del conocimiento", "max_horas": 200}, {"id": "EAG_04", "nombre": "Desarrollo de contenidos", "max_horas": 120}], "fortalecimiento": [{"id": "FOR_01", "nombre": "Línea temática con municipios", "max_horas": 80}, {"id": "FOR_02", "nombre": "Batería de indicadores", "max_horas": 80}, {"id": "FOR_03", "nombre": "Planeación y desarrollo", "max_horas": 40}, {"id": "FOR_04", "nombre": "Elaboración de instrumentos", "max_horas": 40}, {"id": "FOR_05", "nombre": "Análisis y diagnóstico institucional — trabajo de campo", "max_horas": 80}, {"id": "FOR_06", "nombre": "Análisis y diagnóstico institucional — externo/interno", "max_horas": 80}, {"id": "FOR_07", "nombre": "Análisis y diagnóstico institucional — producción documento", "max_horas": 100}, {"id": "FOR_08", "nombre": "Arquitectura institucional", "max_horas": 100}, {"id": "FOR_09", "nombre": "Elaboración de actos administrativos", "max_horas": 40}], "investigacion_aplicada": [{"id": "INV_AP_01", "nombre": "Elaboración de documentos técnicos", "max_horas": 60}, {"id": "INV_AP_02", "nombre": "Elaboración de Plan de Trabajo", "max_horas": 6}, {"id": "INV_AP_03", "nombre": "Generación de Nuevo Conocimiento / Desarrollo Tecnológico", "max_horas": 60}, {"id": "INV_AP_04", "nombre": "Asistencia a eventos de extensión", "max_horas": 8}, {"id": "INV_AP_05", "nombre": "Procesos de evaluación de desempeño", "max_horas": 4}], "laboratorio_innovacion": [{"id": "LAB_01", "nombre": "Componente Fijo — Participación en Laboratorio", "max_horas": 120}, {"id": "LAB_02", "nombre": "Componente Fijo — Gestión administrativa del Laboratorio", "max_horas": 100}, {"id": "LAB_03", "nombre": "Componente Variable — Diseño e implementación (por actividad)", "max_horas": 120}]}, "inv_actividades": [{"id": "INV_01", "nombre": "Líder de Semillero de Investigación", "horas_max": 120}, {"id": "INV_02", "nombre": "Enlace Territorial de Investigaciones", "horas_max": 200}, {"id": "INV_03", "nombre": "Líder / Director de Grupo de Investigación", "horas_max": 200}, {"id": "INV_04", "nombre": "Par evaluador de propuestas de proyecto — por propuesta", "horas_max": 20}, {"id": "INV_05", "nombre": "Par evaluador de resultados / productos — por resultado", "horas_max": 20}, {"id": "INV_06", "nombre": "Diseño de cursos de formación investigativa — por curso", "horas_max": 32}, {"id": "INV_07", "nombre": "Capacitador de cursos de formación investigativa — por curso", "horas_max": 32}, {"id": "INV_08", "nombre": "Producción de artículos científicos", "horas_max": 96}, {"id": "INV_09", "nombre": "Producción de libro (mínimo 3 capítulos)", "horas_max": 144}], "aadm_actividades": [{"id": "AA_01", "nombre": "Comisión de servicio — dentro del país", "max_horas": null, "consumeTotalidad": true}, {"id": "AA_02", "nombre": "Comisión de servicio — fuera del país", "max_horas": null, "consumeTotalidad": true}, {"id": "AA_03", "nombre": "Comisión de estudio", "max_horas": null, "consumeTotalidad": true}, {"id": "AA_04", "nombre": "Año Sabático o Semestre de Perfeccionamiento", "max_horas": null, "consumeTotalidad": true}, {"id": "AA_05", "nombre": "Cargo Directivo Académico-Administrativo", "max_horas": null, "consumeTotalidad": true}, {"id": "AA_06", "nombre": "Misiones profesorales", "max_horas": 200, "consumeTotalidad": false}, {"id": "AA_07", "nombre": "Actividades de Acreditación Institucional", "max_horas": 64, "consumeTotalidad": false}, {"id": "AA_08", "nombre": "Organización Doctorado — Coordinador Comisión Doctoral (Parcial)", "max_horas": 200, "consumeTotalidad": false}, {"id": "AA_08_EXC", "nombre": "Organización Doctorado — Coordinador Comisión Doctoral (Exclusiva)", "max_horas": null, "consumeTotalidad": true}, {"id": "AA_09", "nombre": "Organización Doctorado — Comisionado Comité Científico", "max_horas": 60, "consumeTotalidad": false}, {"id": "AA_10", "nombre": "Organización Doctorado — Evaluación aspirantes (por aspirante)", "max_horas": 10, "consumeTotalidad": false}, {"id": "AA_11", "nombre": "Organización Doctorado — Ajuste Micro currículo y Alistamiento (por asignatura)", "max_horas": 100, "consumeTotalidad": false}, {"id": "AA_12", "nombre": "Organización Doctorado — Gestor (Internacionalización o Extensión)", "max_horas": 100, "consumeTotalidad": false}], "comp_actividades": [{"id": "COMP_01", "nombre": "Acompañamiento pregrado (monografía) — AP: por estudiante/grupo", "seccion": "Acompañamiento Pregrado y Posgrado", "max_horas": 20}, {"id": "COMP_02", "nombre": "Acompañamiento pregrado (monografía) — APT (9° sem)", "seccion": "Acompañamiento Pregrado y Posgrado", "max_horas": 10}, {"id": "COMP_03", "nombre": "Acompañamiento pregrado (monografía) — APT (10° sem)", "seccion": "Acompañamiento Pregrado y Posgrado", "max_horas": 10}, {"id": "COMP_04", "nombre": "Acompañamiento pregrado (práctica/proyecto) — AP: por estudiante/grupo", "seccion": "Acompañamiento Pregrado y Posgrado", "max_horas": 20}, {"id": "COMP_05", "nombre": "Acompañamiento pregrado (práctica/proyecto) — APT: por estudiante/grupo", "seccion": "Acompañamiento Pregrado y Posgrado", "max_horas": 16}, {"id": "COMP_06", "nombre": "Acompañamiento seminario de grado — Maestrías: por estudiante/grupo", "seccion": "Acompañamiento Pregrado y Posgrado", "max_horas": 18}, {"id": "COMP_07", "nombre": "Dirección de trabajos de grado — Maestrías: por estudiante/grupo", "seccion": "Acompañamiento Pregrado y Posgrado", "max_horas": 30}, {"id": "COMP_08", "nombre": "Actualización / creación de unidades didácticas: por unidad", "seccion": "Diseño y Desarrollo Curricular", "max_horas": 120}, {"id": "COMP_09", "nombre": "Elaboración de micro currículos: por micro currículo", "seccion": "Diseño y Desarrollo Curricular", "max_horas": 10}, {"id": "COMP_10", "nombre": "Elaboración REA \"Comunidades que Aprenden\"", "seccion": "Diseño y Desarrollo Curricular", "max_horas": 60}, {"id": "COMP_11", "nombre": "Preguntas para pruebas ECAES: por pregunta", "seccion": "Diseño y Desarrollo Curricular", "max_horas": 3}, {"id": "COMP_12", "nombre": "Cursos de repetición y nivelación en posgrados: por curso", "seccion": "Diseño y Desarrollo Curricular", "max_horas": 32}, {"id": "COMP_13", "nombre": "Coordinación de Escuela Doctoral", "seccion": "Coordinación y Eventos Académicos", "max_horas": 80}, {"id": "COMP_14", "nombre": "Líder académico de campo de conocimiento (Pregrado)", "seccion": "Coordinación y Eventos Académicos", "max_horas": 100}, {"id": "COMP_15", "nombre": "Líder académico de posgrados", "seccion": "Coordinación y Eventos Académicos", "max_horas": 200}, {"id": "COMP_16", "nombre": "Participación como expositor en eventos académicos", "seccion": "Coordinación y Eventos Académicos", "max_horas": 30}, {"id": "COMP_17", "nombre": "Participación en cuerpos colegiados en representación docente", "seccion": "Coordinación y Eventos Académicos", "max_horas": 40}, {"id": "COMP_18", "nombre": "Participación en escenarios académicos institucionales: por evento", "seccion": "Coordinación y Eventos Académicos", "max_horas": 5}, {"id": "COMP_19", "nombre": "Examen de habilitación o segundo calificador: grupo (máx 10h)", "seccion": "Evaluaciones y Jurados", "max_horas": 10}, {"id": "COMP_20", "nombre": "Examen de habilitación o segundo calificador: individual (3h)", "seccion": "Evaluaciones y Jurados", "max_horas": 3}, {"id": "COMP_21", "nombre": "Examen de homologación / suficiencia: por estudiante/grupo", "seccion": "Evaluaciones y Jurados", "max_horas": 6}, {"id": "COMP_22", "nombre": "Jurado concurso docente no vinculado (TC/MT): por aspirante", "seccion": "Evaluaciones y Jurados", "max_horas": 5}, {"id": "COMP_23", "nombre": "Jurado concurso docente vinculado a carrera: por aspirante", "seccion": "Evaluaciones y Jurados", "max_horas": 5}, {"id": "COMP_24", "nombre": "Jurado trabajo de grado — Maestrías", "seccion": "Evaluaciones y Jurados", "max_horas": 12}, {"id": "COMP_25", "nombre": "Jurado valoración de productos académicos / investigativos: por producto", "seccion": "Evaluaciones y Jurados", "max_horas": 20}, {"id": "COMP_26", "nombre": "Miembro Sindicato Docente — Titular (directivas / subdirectivas)", "seccion": "Sindicatos y Formación Docente", "max_horas": 320}, {"id": "COMP_27", "nombre": "Miembro Sindicato Docente — Suplente (directivas / subdirectivas)", "seccion": "Sindicatos y Formación Docente", "max_horas": 160}, {"id": "COMP_28", "nombre": "Participación en actividades formativas — Desarrollo Profesoral (Plan Anual)", "seccion": "Sindicatos y Formación Docente", "max_horas": 48}, {"id": "COMP_29", "nombre": "Producción académica independiente (papers, ensayos, innovación ped.)", "seccion": "Sindicatos y Formación Docente", "max_horas": 80}]}', 'Reglas de dimensionamiento y topes para el Plan de Trabajo Académico (Circular 003)', '2026-04-16 12:44:23.561');


--
-- Data for Name: DetallesPta; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Docente; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."Docente" VALUES ('867261d3-fdd1-46c3-b52e-2a6dce8ff0f0', '7e4500a1-f831-4f36-b7d7-d8d4141ba917', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CARRERA', 'TIEMPO_COMPLETO', 'ACTIVO', '2026-03-27 13:26:28.458', '2026-03-30 15:43:52.702', NULL, 0, '2e2aa2eb-4da7-49ca-bd29-8304733915a8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0e38717f-2b85-4716-998b-c9d79e6857d5', '713308d4-921b-4526-8ba0-276969120754', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CARRERA', 'TIEMPO_COMPLETO', 'ACTIVO', '2026-03-27 13:26:28.483', '2026-03-30 15:43:52.705', NULL, 0, '366e772b-87c2-416a-b450-c1530fc16bba', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a5a476e3-fd17-457b-b1c9-9982b76dc14b', 'd50d25db-7812-44f4-8902-2fc75c53d3b0', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'OCASIONAL', 'TIEMPO_COMPLETO', 'ACTIVO', '2026-03-27 13:26:28.478', '2026-03-30 15:20:42.117', NULL, 0, '47e63923-6a9d-475f-a7a1-8ded2fa5e1f7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('03e02b65-3f27-4c7e-b4dc-e5076b3ed12e', '090cfac2-46f0-4d35-b86d-6b27c7e4aace', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TIEMPO_COMPLETO', 'ACTIVO', '2026-03-27 13:26:28.488', '2026-03-30 15:20:42.125', NULL, 0, '3ea4d9eb-8e07-4122-ba3f-a61210419378', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e78be570-013b-4429-9bba-03b9af8be104', 'ba34494b-5a68-41a4-a4b2-bd55b9d138df', 'e634988f-413f-4668-95ff-4e79259440ca', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.95', '2026-03-30 15:20:42.127', 'Asistente', 800, '89c0c197-2deb-4749-a089-3df23253424f', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('d52bb9f4-1f9f-4826-bdb0-9082066a4b9f', 'd5121a9d-ab44-4ab4-a78b-e3826690fabe', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.91', '2026-03-30 15:20:42.129', 'Titular', 800, '0b9cbde1-653e-48a6-8049-6f6a3861e567', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a0173cec-afe9-4041-9626-68c778679bf3', '3813cc9c-c914-45a9-a336-9d3bcdc65595', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.857', '2026-03-30 15:20:42.131', 'Titular', 800, 'a6132073-1834-417e-8b83-a881ba6777ae', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('5debd66e-79c7-4e49-9577-7b237bb65d6d', '78e5d74d-cbf7-4e1d-b2f8-81577edbef90', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.369', '2026-03-30 15:20:42.132', 'Titular', 800, 'a4566a84-a808-4162-802d-ac4acb787775', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c22d5602-a415-4fd0-a311-cf3e89fd01b5', '28abf35b-5f00-4c10-9a3a-5b2a7bdea49f', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.235', '2026-03-30 15:20:42.144', 'Asociado', 800, 'baa4552c-920e-4f36-9533-134c709169d0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('8cc99b1b-ac7f-4d30-af42-26d912e3605e', '7cde361c-93ae-4aa2-bfc1-8cf63a397a86', 'e634988f-413f-4668-95ff-4e79259440ca', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.684', '2026-03-30 15:20:42.155', 'Auxiliar', 800, '722721a7-69e4-434e-8513-bce4dddeced6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('47b54331-7416-426c-a662-4788f4911d3f', 'bbcd1d01-9c0f-4159-8284-9f385061ac2b', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.558', '2026-03-30 15:20:42.167', 'Asistente', 800, '0b9cbde1-653e-48a6-8049-6f6a3861e567', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('dfa0ac4c-5f7b-40f5-b4f1-e9d9dc33c41d', 'b1ac082e-806d-420e-b71b-aac40d6a4553', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.312', '2026-03-30 15:20:42.178', 'Auxiliar', 800, 'd69391ea-b896-473e-ac6b-e151de720dff', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('93f565c4-c163-420b-82cf-ed41d5fc899b', '865d6329-42e3-461a-8d37-0dbaeba64d2c', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.361', '2026-03-30 15:20:42.187', 'Asociado', 800, '1d9c7bd1-1b60-498f-8f8a-6ba9ddc003c5', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('1f2b5503-d2f4-418d-9c6a-d443767501d5', '928c733a-b636-472f-921a-698e01f4fd1c', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.649', '2026-03-30 15:20:42.198', 'Auxiliar', 800, '49face67-a6f8-433d-8fe0-fb236c248c79', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('ad672575-8fcd-4d09-8063-b7959bc631c3', '5c6f8191-2845-41c4-b5b3-2b55d3aa688f', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.989', '2026-03-30 15:20:42.249', 'Auxiliar', 800, 'a698778d-4866-4d9a-b642-1d8d25f2d054', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('50b65f11-1111-4f80-8337-a791603d20bb', 'f9ac8aa1-a208-4fe3-a9fc-80eee917350f', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.326', '2026-03-30 15:20:42.255', 'Titular', 800, '60a6d13a-631a-40bc-9f34-b797540e9333', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('03ae14d4-4750-4b1d-95cb-bd59a7aa11c2', 'e42f6ea0-95d8-4bb0-b343-db11d2baeefc', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.412', '2026-03-30 15:20:42.263', 'Asistente', 800, '0e01121a-934a-4db5-b3fe-787ba1f9dbf1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('9870042c-4266-4569-bf8f-873531297a9c', 'a7d2a7d0-a62b-45b2-a20a-767f32174b70', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.546', '2026-03-30 15:20:42.273', 'Titular', 800, 'b2b1ecfa-aeba-47bd-b343-a3113d46724a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('de4e0d63-691d-4863-ab0a-e41399825ca1', '6d3c8465-9a11-4ce3-8c66-c008673ac864', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.453', '2026-03-30 15:20:42.287', 'Auxiliar', 800, '43b774e5-c5f5-46c6-9823-1412ddb470f3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('80a58aca-1918-4788-b2bc-6b1e6ce84a4c', 'b6d22915-b1d2-4363-9d8e-1588c9f98279', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.542', '2026-03-30 15:20:42.294', 'Asistente', 800, '797857a1-a223-4786-a653-4717168ae3c4', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('102e09a7-3092-4698-afaf-d7442a9f67bd', '2f9b01ee-eaeb-4525-8f92-6f077ec10941', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.964', '2026-03-30 15:20:42.3', 'Titular', 800, '02f4b8da-a205-4f2c-a9df-a6b4e3dcecf7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('58541ec9-c291-4fe9-8ff3-16e052695c80', '89767cb5-402c-4c1f-a992-cf3991b86a3c', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.247', '2026-03-30 15:20:42.302', 'Asociado', 800, 'e0d2b39c-9da6-4244-87f0-8760f5f0a7ed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('3f0e6b1c-850b-4322-b744-0cd9d97e1b20', 'f99c5af4-14ad-4d0b-a01d-c76926c418b7', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.497', '2026-03-30 15:20:42.307', 'Auxiliar', 800, '5d6977df-5ab2-4adf-9067-22e2312dca4f', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e7a18c4b-3dfe-4e66-a73c-5bf981f13c03', 'dbe63a8f-3bec-4d49-b2f8-755f8daf91a2', '704438d5-b8c8-425f-9325-f76adf80f00d', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.335', '2026-03-30 15:20:42.315', 'Auxiliar', 800, '79795303-d637-4d78-a6c6-514833af324b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('27220ff6-1b06-4d10-9919-d6a7fe02ca0c', 'bffa578e-b295-4425-9d5a-e2ab7d37a4b0', '704438d5-b8c8-425f-9325-f76adf80f00d', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.745', '2026-03-30 15:20:42.325', 'Auxiliar', 800, 'facd4a76-4190-421e-befd-ba53e522011e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('3aaabdb6-9477-4eba-8b6a-e648d175accb', '6eae4cae-357c-4485-9e78-a07264727055', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.29', '2026-03-30 15:20:42.331', 'Titular', 800, 'd717283e-5d6a-4e0c-96ea-e3f7278eca3e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c5732912-ed99-41aa-954a-331429c47216', 'f5a7c8b2-9990-491f-a7d2-42b0d2eceb83', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.549', '2026-03-30 15:20:42.339', 'Auxiliar', 800, 'f30aaf75-8325-481d-aa77-1844e1187cdb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('cfe47381-74f4-4ef5-b328-a798e4dac31b', '1915b28f-1921-44e2-ac2c-c9afaef9e702', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.303', '2026-03-30 15:20:42.343', 'Asociado', 800, '2748f80e-909c-45a7-8ddb-dbf0ffab568d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('3241b9c1-5cc2-4b07-860f-f62a2bc36f3d', '82af1ea6-cb91-4295-b052-d35bf7dc0983', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.387', '2026-03-30 15:20:42.35', 'Titular', 800, 'dbc27ba9-9553-4220-a19b-22aa943ba56a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('f163f8ef-8697-49d1-aab3-72c1f13e5d8f', '03929b5c-3d75-43a7-9c32-9ee0e52321b0', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.14', '2026-03-30 15:20:42.358', 'Asociado', 800, '523a9f93-f3f8-433e-9b85-af311e6cce4f', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('1c9c7d4e-fe4c-40de-8135-d11119b56479', 'db0b3f7d-7f11-47b2-b3b4-d81057fc0f48', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.568', '2026-03-30 15:20:42.136', 'Asistente', 800, 'baa4552c-920e-4f36-9533-134c709169d0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('44330419-0daa-401d-ae1b-ea54db4ea3ef', '9d99597b-aef5-4c66-927a-7e669c71d109', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.708', '2026-03-30 15:20:42.14', 'Titular', 800, 'baf522ea-12f7-4886-8e43-b5af7d7dd4e0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('2eac2cf7-159b-4cf3-86ad-b606571eaf7f', 'a52a3ba4-4813-40c5-9e58-4c61e4985e77', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.539', '2026-03-30 15:20:42.142', 'Asociado', 800, 'd7d2c1dd-5d3c-453b-8ffc-5308bd841bf2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a0e6ce8e-9adf-4c1d-bcc8-84d8eb75583f', 'e1034723-ebb5-4c94-b1d0-b8ab3bb3d23e', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.35', '2026-03-30 15:20:42.146', 'Titular', 800, '89c0c197-2deb-4749-a089-3df23253424f', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('5a1435e6-7ac3-4da8-bf83-3fc891116464', 'd00bf1ef-a28b-4753-9cab-0dfbe98ef56d', 'e634988f-413f-4668-95ff-4e79259440ca', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.293', '2026-03-30 15:20:42.147', 'Auxiliar', 800, '89c0c197-2deb-4749-a089-3df23253424f', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('85d5f921-83a1-43f0-8b3a-66a160ef1ebc', '465b428a-91b6-4029-be6e-91af7cb3726e', 'e634988f-413f-4668-95ff-4e79259440ca', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.522', '2026-03-30 15:20:42.149', 'Asistente', 800, '3ea4d9eb-8e07-4122-ba3f-a61210419378', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('2704b2f7-0940-4a18-8448-ae19865b6306', '27dd223f-59d1-4423-a3de-17143b6bdda2', 'e634988f-413f-4668-95ff-4e79259440ca', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.261', '2026-03-30 15:20:42.15', 'Auxiliar', 800, 'bd4e3084-f6ee-4232-987e-6f5db12b57eb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('3f299a64-e6f5-4b5c-9160-0c278ba58f90', 'cdacac1f-1f2b-4866-b9a7-324df5bbe389', 'e634988f-413f-4668-95ff-4e79259440ca', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.487', '2026-03-30 15:20:42.152', 'Titular', 800, '4277c227-daaa-45ad-8a02-95e66b5faf6c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('4db6d7eb-2f6f-4555-89da-e1da8a394afe', '1bf011dc-1049-4177-8c84-31a4c7f2bc95', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.488', '2026-03-30 15:20:42.153', 'Titular', 800, '9d94a940-3446-4b6d-9440-5f1ce86b6d06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('5a8fc26c-0202-4a0c-b81f-32bd4e004310', 'bb0fa654-b47e-4027-8d4a-702ea16f68e4', 'e634988f-413f-4668-95ff-4e79259440ca', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.3', '2026-03-30 15:20:42.157', 'Auxiliar', 800, '9d94a940-3446-4b6d-9440-5f1ce86b6d06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('7ee622e5-d34d-4dc5-a889-4ba1a2b34c40', 'c86b5fcf-01c9-48cc-87ee-c2f5b298f338', 'e634988f-413f-4668-95ff-4e79259440ca', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.61', '2026-03-30 15:20:42.158', 'Asistente', 800, 'c28b9712-6daa-4331-98f8-0553cda705e8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('2ff74628-47de-4668-b151-5681dfd4e480', '3ec1a2f9-99dc-4a31-bb02-dd447be15f24', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.782', '2026-03-30 15:20:42.159', 'Asociado', 800, 'f2ec4269-0b53-4002-b8e0-5f5babb23606', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('1a5cd3c8-7c1a-4f9c-a692-dfe8d2f4da4f', 'a6980a9c-afda-4cb1-a48a-3f4e444727bc', 'e634988f-413f-4668-95ff-4e79259440ca', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.344', '2026-03-30 15:20:42.161', 'Auxiliar', 800, '3ea4d9eb-8e07-4122-ba3f-a61210419378', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('14f04103-62b0-41b6-92b9-fefad0e7474f', '4ada26cb-c74b-40c6-8c8a-91a2b40af1fd', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.494', '2026-03-30 15:20:42.164', 'Asociado', 800, 'f2ec4269-0b53-4002-b8e0-5f5babb23606', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('1c126d09-1cb6-4518-8f3f-bdc1ea9a695c', '6d3b3113-820e-4016-8f79-47997fb22e07', 'e634988f-413f-4668-95ff-4e79259440ca', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.512', '2026-03-30 15:20:42.166', 'Auxiliar', 800, '3ea4d9eb-8e07-4122-ba3f-a61210419378', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a4ce9bda-363a-4fe2-987c-1e77bf132fa3', '48009f5f-f147-4db6-ba9e-27b2ce152ece', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.339', '2026-03-30 15:20:42.168', 'Asistente', 800, '31d616dc-78a3-41f3-85e6-e16ae1108f2e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('fe1e5f2a-9b15-4e76-807d-759da9b63390', '40971ede-34e8-4aec-962d-095e458c14e3', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.46', '2026-03-30 15:20:42.17', 'Asistente', 800, '5d9ed3c7-af74-4094-900e-8d05472f0411', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('3b873096-3e92-4e3b-9db5-3b54683dfd42', '00e4057f-39d7-4752-ac64-bef87f3b262f', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.144', '2026-03-30 15:20:42.172', 'Asistente', 800, '75bb2830-2570-42b4-aabe-99d5efa9add6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c207fd7d-f085-4675-94c4-ca0d4d7c1dd1', '68b82d91-086d-45cb-83dc-ed4278d47aa5', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.248', '2026-03-30 15:20:42.173', 'Titular', 800, '75bb2830-2570-42b4-aabe-99d5efa9add6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('b3dbf19f-f6f1-42de-953b-e1393e5cba13', '82f2e6a3-86dc-4276-9258-b9e64e774d9e', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.419', '2026-03-30 15:20:42.175', 'Asociado', 800, '56ba3c70-288e-4a8e-8d45-2411b4794df8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('fe6ad7b3-4b58-47c7-a383-33cf578eb122', 'dab55c2e-517c-441e-a2a4-b6e8eac2a77c', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.426', '2026-03-30 15:20:42.181', 'Asistente', 800, 'f5b9ca00-bd87-4fb4-886c-bef1c3784688', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('59f03f6e-5778-49dd-ac1c-c8c905f745e9', '2b68b6ac-a0f7-4188-9bbe-ed892fb62fa9', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.537', '2026-03-30 15:20:42.182', 'Titular', 800, 'ee412135-2136-456f-a65c-a9a3a4dd10cb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a7fd187e-ae3f-4b96-a6e5-e31c93561686', '1ab69561-c144-41f6-8287-4cf20c57b153', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.38', '2026-03-30 15:20:42.182', 'Titular', 800, 'd69391ea-b896-473e-ac6b-e151de720dff', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a823a119-2f91-4e0c-a09f-073858e1a5fe', '590b300a-a584-4939-a78a-b8dc85a1e3cf', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.396', '2026-03-30 15:20:42.183', 'Asociado', 800, '31d616dc-78a3-41f3-85e6-e16ae1108f2e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('942d0c17-fcf0-471d-98c2-0561241a88c4', '0a0dbe97-bcc6-4e95-bd8e-5799d765d7c1', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.256', '2026-03-30 15:20:42.185', 'Asociado', 800, '2ca706f5-e6e9-490e-98f9-8e8f5704defe', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('fbf3f215-d8ed-40d5-b172-c0f6b47a0b5d', '362bfc91-b224-400f-9d57-d01de20fd7cb', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.322', '2026-03-30 15:20:42.186', 'Auxiliar', 800, '3abd2416-031e-4d7a-99d6-cb94a90effac', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('fe15c1d6-1715-4cc3-aa2f-58d9fc4063b2', 'cb75b7f9-87e9-4f4f-b2ad-89e6a8c99fb6', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.391', '2026-03-30 15:20:42.189', 'Auxiliar', 800, '928db4a5-bff2-48e4-ac69-a406e018db26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('85d81c61-27a4-4812-a56d-2f5b37d7f234', '9f485e0a-b0ec-4d97-9969-e4c71c56c961', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.926', '2026-03-30 15:20:42.191', 'Auxiliar', 800, '38fe4a24-0642-4031-b6fc-d4ba056561c0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('989c3fd0-c81f-46c4-871c-7fb0792bb303', 'd7133bb9-cbc9-4353-b506-536092cd0181', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.713', '2026-03-30 15:20:42.193', 'Auxiliar', 800, '28256c62-0ca7-4eb5-9a92-4fd1e7963c7e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('daf127fe-1fbe-4741-aee4-4262ded48a90', '2b619363-91c6-4469-9215-f20f7980fbe6', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.148', '2026-03-30 15:20:42.194', 'Asistente', 800, '928db4a5-bff2-48e4-ac69-a406e018db26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('bc46abb4-3707-4ca3-903e-9682536fa045', 'a7f2e2e8-6201-4a3d-b1d5-465e1882aa78', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.725', '2026-03-30 15:20:42.196', 'Titular', 800, '2254d76b-ba18-49e1-9d3e-dc577c5c0ce1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('51a45d6c-67d0-4b3f-a44c-ac0430e7f9d3', 'eac56751-79b5-4d38-be9e-89a45920f73b', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.529', '2026-03-30 15:20:42.2', 'Titular', 800, '49face67-a6f8-433d-8fe0-fb236c248c79', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('05beb470-97d0-435e-9c3f-c8a29680e205', '177e1211-b74c-485d-a679-ea272966a2d8', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.035', '2026-03-30 15:20:42.201', 'Titular', 800, '3513ba2f-cb8d-46ad-97a5-40c32785074e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('b22c1bca-7f6c-4729-bdb2-39f16919d1d4', 'c55004f1-c07b-4da9-a388-0c85ce6b7119', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.097', '2026-03-30 15:20:42.202', 'Titular', 800, 'a4566a84-a808-4162-802d-ac4acb787775', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a5df5855-15c6-4e81-86d7-eb92b6fdf684', '6771bd28-df31-47a5-b291-069c99781d5c', 'e634988f-413f-4668-95ff-4e79259440ca', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.03', '2026-03-30 15:20:42.203', 'Asistente', 800, '9d94a940-3446-4b6d-9440-5f1ce86b6d06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e028468e-6b8c-467c-a1e2-892928b33d35', '3bddebb0-6355-472c-801e-4cc0df3bc577', 'e634988f-413f-4668-95ff-4e79259440ca', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.008', '2026-03-30 15:20:42.203', 'Asistente', 800, '3ea4d9eb-8e07-4122-ba3f-a61210419378', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('5db3fd25-2e8c-49ac-8c52-5de0df08eaa2', '289a296e-d6c7-4ecc-aa51-16f72a8d8f55', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.024', '2026-03-30 15:20:42.204', 'Auxiliar', 800, '52f39ef9-a166-432c-ad52-9e681b63578b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('247376f4-74b9-4303-9d3c-a74c4aa371f8', 'fe5a8a87-5ff5-430f-9649-7f61171a0464', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.117', '2026-03-30 15:20:42.205', 'Titular', 800, '38fe4a24-0642-4031-b6fc-d4ba056561c0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0e73abf4-b151-46dc-b746-403f978e6feb', '312969ed-25d4-42c4-a976-dc5003a5b48e', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.102', '2026-03-30 15:20:42.206', 'Asistente', 800, '1d9c7bd1-1b60-498f-8f8a-6ba9ddc003c5', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('aecf3867-8463-4f34-8468-fcb0ef556281', '9a2c97e5-0590-441f-b983-2e07d5a070e8', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.112', '2026-03-30 15:20:42.207', 'Asociado', 800, 'a6132073-1834-417e-8b83-a881ba6777ae', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('cc937e3d-48a6-4dc9-a09d-4b3e49537338', '72f89b73-9f95-4d56-b1b0-1c4aa3c9cce6', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.767', '2026-03-30 15:20:42.209', 'Asistente', 800, '928db4a5-bff2-48e4-ac69-a406e018db26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('4b308754-138d-4fb4-a17b-74acb669c3a3', '64f2b1d1-7c44-4f01-bb51-c62fd244a134', '593b49db-ba20-410d-8608-9b71af83d2b5', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.43', '2026-03-30 15:20:42.21', 'Titular', 800, '1aebcf7c-3c2a-4980-b0b9-15ee2e6ed0f0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('fe7f1ea8-b031-46fa-a425-6f3139887144', '84707cdd-96a6-4aa2-b168-3cb81e96b1a5', '593b49db-ba20-410d-8608-9b71af83d2b5', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.045', '2026-03-30 15:20:42.212', 'Asociado', 800, 'ca917969-bcc8-4139-ab42-9ab064ed8df1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('bdc711e1-1289-42d6-aec1-c36e19e31a1e', 'b937612f-1048-435c-b9d6-9243f6f640fd', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.357', '2026-03-30 15:20:42.213', 'Asistente', 800, '1aebcf7c-3c2a-4980-b0b9-15ee2e6ed0f0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('555a1e7b-6082-49e9-9f87-c7fabc5bfe8b', '65064788-054e-4005-aa1c-52004dbde891', '593b49db-ba20-410d-8608-9b71af83d2b5', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.455', '2026-03-30 15:20:42.215', 'Asociado', 800, 'bb9ad041-d585-4adf-a8cd-3d8811301ac3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('bebca179-ec82-4874-9c68-21b37f3a862a', '80d8ac21-2ea5-47d0-842a-c39d2f7f7fde', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.703', '2026-03-30 15:20:42.366', 'Auxiliar', 800, '0d6ccb73-d29c-495f-b844-fd81e64c57a2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('604933b5-2e42-4f03-ab6d-3c6d200dc3cd', 'db3ce1e4-df5c-4556-8867-1e0ab9d1c656', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.97', '2026-03-30 15:43:52.714', 'Auxiliar', 800, '725e9497-eaf1-477d-9641-ac40e76cc93e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('919ced00-4a94-48e8-9d6d-a19fa22b1c0b', '2169bdc2-2c0a-4e01-90b1-ed639bd2f55a', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.508', '2026-03-30 15:43:52.724', 'Asociado', 800, '6bf8f714-d066-4e4c-90d1-462b43dccf61', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('9cdde8a0-e3a4-486c-8e73-869d1fae2c58', 'de21007b-7320-47bc-bfd3-97bd5fac82e1', '593b49db-ba20-410d-8608-9b71af83d2b5', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.873', '2026-03-30 15:43:52.729', 'Asociado', 800, 'bb9ad041-d585-4adf-a8cd-3d8811301ac3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a5778af0-7258-4025-b64f-3e892dc9149a', 'e442c818-6abf-4a12-b36a-1c90618ad4b4', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.877', '2026-03-30 15:43:52.729', 'Titular', 800, 'a6e941a0-c7c4-4507-a785-6c262ac5e53d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('8ca977bb-a4fc-47d8-a918-84bcb475c1af', 'a02d1371-1d45-4c47-b4d1-b0ce6c13a444', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.957', '2026-03-30 15:43:52.733', 'Asociado', 800, 'e0d2b39c-9da6-4244-87f0-8760f5f0a7ed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('1923a29f-3e91-431a-8f0d-069e2d4fa7bc', 'b89c58d1-f94c-4d9b-bea8-28c4deb282dd', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.121', '2026-03-30 15:43:52.738', 'Titular', 800, 'da019b96-1508-4945-b093-5c7bdf703cd0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('75b14333-d3a4-4c1a-b646-2f9d268b8714', 'd73e4f73-d548-4ccb-90a1-583f537d1f65', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.321', '2026-03-30 15:43:52.742', 'Asistente', 800, '38fe4a24-0642-4031-b6fc-d4ba056561c0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('456012ab-b240-4bf7-8bab-564d619179af', '2045b1cc-5059-406c-9e86-a511ba2746f4', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.573', '2026-03-30 15:43:52.748', 'Asistente', 800, '22b3d543-dc6c-4033-a5f9-35c79c5a726d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('08efc889-4811-4524-befa-7f61eb65fe2a', '135196aa-a596-4ce3-9459-2e09c66e551b', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.674', '2026-03-30 15:43:52.753', 'Titular', 800, '0d6ccb73-d29c-495f-b844-fd81e64c57a2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('077dce36-ae55-4082-889f-acdd3849ea97', 'af9a2ca8-5a48-478f-8abd-f17bed7a9b27', '4017ab74-7e31-494a-b7a2-4e77baf6fa73', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.811', '2026-03-30 15:43:52.761', 'Titular', 800, '0de76540-1ba8-42ad-8ab7-34ca00219792', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c471655a-f766-4f9e-aea4-492eae958b66', '187f32db-5cf6-4771-aa9e-4f8ccf17b8de', '324f6a0b-c8ea-4bb6-9ac2-c6226182c763', 'ADMINISTRATIVO', 'TIEMPO_COMPLETO', 'ACTIVO', '2026-03-31 15:34:18.318', '2026-03-31 15:34:18.318', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('10b56c82-23c1-40ae-bcfb-759497930862', 'e3a06490-0a57-42e2-968a-6e2fcb7046e0', '324f6a0b-c8ea-4bb6-9ac2-c6226182c763', 'ADMINISTRATIVO', 'TIEMPO_COMPLETO', 'ACTIVO', '2026-03-31 15:34:18.325', '2026-03-31 15:34:18.325', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('85642384-a572-4ac9-a10f-a24d4f06b562', '36c81744-c8f8-4cc4-bbdb-ac39c90a27bf', '324f6a0b-c8ea-4bb6-9ac2-c6226182c763', 'ADMINISTRATIVO', 'TIEMPO_COMPLETO', 'ACTIVO', '2026-03-31 15:34:18.327', '2026-03-31 15:34:18.327', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0523bf5a-475d-4102-b501-d1fe5bc56bf9', '1f62fd97-2d38-46f9-8069-70efc9cde5cc', '89006b1d-d4df-4604-9afc-7b450d9e6ab4', 'DIRECTIVO', 'TIEMPO_COMPLETO', 'ACTIVO', '2026-03-31 19:29:39.479', '2026-03-31 19:29:39.479', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('2339e7de-4a40-42a0-897f-5a5d72b22170', 'd5ed4395-2c5e-42fb-93d8-ef6b7f42ac55', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'DIRECTIVO', 'TIEMPO_COMPLETO', 'ACTIVO', '2026-03-31 19:29:39.493', '2026-03-31 19:29:39.493', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('ffc09d77-504b-4e2a-b040-caad82ec9727', '08f1f4fa-e68a-4fde-8282-63c733b8525c', 'a8efc316-bf6f-42ba-a247-39097d81d781', 'DIRECTIVO', 'TIEMPO_COMPLETO', 'ACTIVO', '2026-03-31 19:29:39.5', '2026-03-31 19:29:39.5', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a0d95f09-e425-44dd-b839-25fc0e8fa1b8', '2bc60755-5847-4d9e-83e5-a4074bc0d052', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.741', '2026-03-30 15:20:42.228', 'Titular', 800, 'bb9ad041-d585-4adf-a8cd-3d8811301ac3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('24c811fc-6d93-4219-8557-2585aac41bc2', 'f85fb5e5-af38-40d6-ba37-29ba2124573c', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.994', '2026-03-30 15:20:42.23', 'Asistente', 800, '30a496ca-d52c-4f3b-9413-7163c6328d8e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('f8c1ce29-cf02-483a-b5e8-6c1eaf5be91f', '75d0d8db-41ee-4ea9-97fd-8ffc54c0b02a', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.842', '2026-03-30 15:20:42.217', 'Asociado', 800, 'bd4e3084-f6ee-4232-987e-6f5db12b57eb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('4277cf24-4512-4545-821f-a4dd722448fc', '61072a61-4501-4d21-9c21-0878928ea143', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.836', '2026-03-30 15:20:42.219', 'Asistente', 800, '3abd2416-031e-4d7a-99d6-cb94a90effac', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('39d3fc6f-466b-4066-ac10-a7403c0a0dc4', 'e097f9cb-5c70-47c7-8682-b4536b37ae93', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.999', '2026-03-30 15:20:42.222', 'Titular', 800, '1aebcf7c-3c2a-4980-b0b9-15ee2e6ed0f0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('5075a7d9-7937-4a86-a22f-dced67fbbdf1', 'f6be6dae-834e-4ccd-9930-cc181c8df520', '593b49db-ba20-410d-8608-9b71af83d2b5', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.493', '2026-03-30 15:20:42.224', 'Titular', 800, '0df3d5e3-26e7-48bc-96a6-6ce4eb60ede3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('f7dc3ece-392b-4741-aa8e-06e4c4f15e7c', '8edbcb20-fb8a-4a6c-b947-717a6e28f837', '593b49db-ba20-410d-8608-9b71af83d2b5', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.184', '2026-03-30 15:20:42.225', 'Titular', 800, '81c10159-6df1-4f4d-9966-ea3ec5f2452b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e21a6176-5935-4c96-a8d5-cc54ccd28309', 'c426fd74-4a4b-49da-b9d6-2dd318224cee', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.491', '2026-03-30 15:20:42.227', 'Auxiliar', 800, 'fdc74219-7514-4704-9900-47780166531a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('33352ad8-8c23-43fe-a4cd-5a4277610fc3', 'da2336f7-261e-48e7-9615-d79313e585dd', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.413', '2026-03-30 15:20:42.227', 'Auxiliar', 800, 'fdc74219-7514-4704-9900-47780166531a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0ad49cf5-4383-48de-979b-aa8588583e59', '9381e496-b4f0-4c22-84c6-d41e10b48d05', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.669', '2026-03-30 15:20:42.231', 'Auxiliar', 800, '66142c05-971a-4cfd-9fc7-7464b90c3b54', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('198cb802-a30b-4a2c-9bfe-6278fa91841a', 'e58ef382-d828-4383-bb7f-1c1956f7a1b4', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.643', '2026-03-30 15:20:42.231', 'Asistente', 800, '6d62c9ab-9eb1-4f86-ac9e-13b94785ac62', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('b704c776-ec2f-4b66-ac03-e592644bd60f', 'fc4ff27d-22a4-412d-99d7-0e030f8b72a4', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.285', '2026-03-30 15:20:42.232', 'Asociado', 800, 'a588fa28-6e7f-48d5-a06d-403979886f73', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('8778aff5-48d4-4dfd-97f8-65a878a95c63', 'ce6cbb1b-cd86-40db-b017-b22c84115def', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.399', '2026-03-30 15:20:42.233', 'Auxiliar', 800, 'ed65ebf6-d47d-4b69-930d-25de9c2bdcf2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('80b39fbb-0d20-4ea9-9552-e145844d17a3', '7850e4ad-e701-47c8-be57-2c974e40259d', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.401', '2026-03-30 15:20:42.234', 'Titular', 800, 'a588fa28-6e7f-48d5-a06d-403979886f73', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('6f77ee39-235e-455d-85e3-c07830fa8cb8', '8eba3099-66f6-4f09-b839-f87947c7afb4', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.481', '2026-03-30 15:20:42.236', 'Asociado', 800, 'a588fa28-6e7f-48d5-a06d-403979886f73', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('16f713e9-f0ed-4120-8479-ae2715d52561', '39aa5c10-e593-4432-9c82-ee14f02055bc', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.693', '2026-03-30 15:20:42.237', 'Titular', 800, '6d62c9ab-9eb1-4f86-ac9e-13b94785ac62', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('de65dd08-8806-4643-8d58-340a7876b4a7', '5cd8ae84-58ac-4eb7-92aa-8e5817663e15', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.458', '2026-03-30 15:20:42.238', 'Asistente', 800, '6d62c9ab-9eb1-4f86-ac9e-13b94785ac62', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('6dff1490-efd4-44e2-bb01-7daa245129e9', 'c9fba493-dd06-42b0-8047-db9cd1bf4a94', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.562', '2026-03-30 15:20:42.239', 'Auxiliar', 800, 'a3f998d2-911c-437b-b165-c8c0f4cf5b9c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('bbcaeeee-3210-4dea-a504-10c42fc3191c', 'b5c540bb-9ec9-42a9-85cb-df15390debe7', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.905', '2026-03-30 15:20:42.245', 'Asociado', 800, '66142c05-971a-4cfd-9fc7-7464b90c3b54', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('2b0de1bb-ea92-4c4a-9a18-3b2f43e82a70', '2e862c2d-768a-4871-bc8f-7fdf232b8746', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.171', '2026-03-30 15:20:42.246', 'Titular', 800, 'ed65ebf6-d47d-4b69-930d-25de9c2bdcf2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('7f47aa43-b9db-4411-a587-4daed24adaa2', '5bd23955-4388-4f31-b47b-290cb6db320e', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.518', '2026-03-30 15:20:42.248', 'Asistente', 800, 'ed65ebf6-d47d-4b69-930d-25de9c2bdcf2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('3b623bff-2578-4f86-9b26-6622504270ec', '026f1dea-a0e6-422f-be37-88cccb7d4084', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.424', '2026-03-30 15:20:42.249', 'Asistente', 800, '6d62c9ab-9eb1-4f86-ac9e-13b94785ac62', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('8b95b96e-02a4-436b-bac0-4b1d5dc94da2', '951350f9-494d-4369-bcde-9d8db8c4b9e1', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.901', '2026-03-30 15:43:52.707', 'Auxiliar', 800, 'a6132073-1834-417e-8b83-a881ba6777ae', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('18c43ada-4102-49b8-a334-002acfb83a09', 'cd68de03-d036-41b8-b351-21d23f3cbb71', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.534', '2026-03-30 15:43:52.708', 'Asociado', 800, 'bd4e3084-f6ee-4232-987e-6f5db12b57eb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('71679857-8b77-4400-aaa9-32665187f376', '78acddad-d796-4ee6-bf61-12ea2f264efa', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.374', '2026-03-30 15:43:52.709', 'Auxiliar', 800, 'ee412135-2136-456f-a65c-a9a3a4dd10cb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('9e0fbb55-2f68-43a3-9de1-dc9c2bc14921', '6ccf5c7a-9f77-49da-b073-2971f7f0287b', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.544', '2026-03-30 15:43:52.71', 'Asociado', 800, 'daa86233-b3cb-4272-8392-b84b6e1f698b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('fff28b11-2731-422c-a0bd-76be37c813ea', '178cacd9-6074-414e-896e-440df254921d', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.778', '2026-03-30 15:43:52.712', 'Titular', 800, '2a6d3f7b-8681-4e49-b48c-c4785964a986', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('353dbe37-92b5-48a8-b579-755d651fde5d', 'a4fa9eb3-08d1-45b0-b716-79bf8778bdb3', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.244', '2026-03-30 15:43:52.713', 'Titular', 800, 'c32a2c8d-2c41-4deb-b5f3-7c9e57c110fd', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e4b91127-b11c-4471-a3dd-8cc18a1bd31c', '5a1d387a-540e-4958-bbc0-40dc16a4dd2b', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.333', '2026-03-30 15:20:42.25', 'Asistente', 800, 'ab77f311-f41a-42d2-9949-fa3de1f81746', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('af61c6f5-f939-4493-ac32-8139eb2c672a', 'f5b7479d-45cb-4cd2-937a-359ff3812b3a', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.422', '2026-03-30 15:20:42.251', 'Titular', 800, '56c29a31-63e4-4465-85cd-ca08ce6a72ca', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('08b62fac-0e1b-4d55-81b2-c0240022f195', '04fd58c9-d750-4749-9f31-448b9ede6b06', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.615', '2026-03-30 15:20:42.253', 'Titular', 800, '7d93e9a4-10e1-4c18-abe8-26fb34a2d034', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('8441ffda-17d0-4d94-af1f-ef01342b0de3', '4c90f65a-3cbb-47d9-8cb6-d5c83be4b76e', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.153', '2026-03-30 15:20:42.254', 'Asistente', 800, 'e23d6530-f4cc-4c86-9d39-8b5fe992e267', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('af895555-a0d3-4afa-a794-5d87be1ecef7', 'ddd186df-bb69-4a89-ab53-908a02fcdea5', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.72', '2026-03-30 15:20:42.256', 'Auxiliar', 800, 'f30233d2-e169-4bae-a7f4-0da75ddd6cbf', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('afcd3083-1f02-46fd-916a-a9b3ce3ff148', 'b14e6c9b-66c7-4527-8a26-1e66e89d254f', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.18', '2026-03-30 15:20:42.257', 'Asistente', 800, '8af1d1cb-0ad2-41fc-8593-fb71786c9885', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('dcf7890c-0a5f-4c36-8c2e-1ddc621a1486', '7a7795d9-2878-4f6d-a08a-2e3ca9114b0e', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.554', '2026-03-30 15:20:42.258', 'Asociado', 800, 'ab77f311-f41a-42d2-9949-fa3de1f81746', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('79df87b4-d5ac-4d42-8497-c9acae9574e0', '59530aef-45d1-45ef-acff-78c5ca36d5bd', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.211', '2026-03-30 15:20:42.259', 'Asociado', 800, '7d93e9a4-10e1-4c18-abe8-26fb34a2d034', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('cc6d1ce0-42d3-4bf0-9258-611434747e92', '34a3d999-d91a-459c-87f6-fce06fd1e589', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.395', '2026-03-30 15:20:42.26', 'Asistente', 800, '56c29a31-63e4-4465-85cd-ca08ce6a72ca', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('bc3caccd-39a9-447d-a924-d0c162259003', '6af91ece-e995-4879-aa27-3e17addc6184', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.373', '2026-03-30 15:20:42.262', 'Auxiliar', 800, 'e2b904a0-e232-4179-8fdd-86fbd0ae6de8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a1dd642d-c295-40fa-bb48-2c1f3011c25c', 'd7b2a0d8-ff59-437a-9c06-c08e13a94e58', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.445', '2026-03-30 15:20:42.265', 'Auxiliar', 800, '7d93e9a4-10e1-4c18-abe8-26fb34a2d034', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('798aa860-a6d1-4dab-a750-2550768321c6', '1e819bcd-5ee1-4966-90a0-857d164e8d12', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.339', '2026-03-30 15:20:42.268', 'Titular', 800, 'f45c0c42-7c7d-4174-a7f0-c38724346769', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('ef88a787-948a-4962-82c6-958bdb261888', 'e530f9a8-3506-4666-bb97-3bd72740acb2', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.386', '2026-03-30 15:20:42.269', 'Auxiliar', 800, 'bd745ff3-1e70-4d0f-8d8c-417673d91d63', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('1cd24e50-4f01-4ce9-bd98-b6dba2e67b4b', 'b2bac93f-873c-4c8a-9a0e-2492e2f21bc8', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.563', '2026-03-30 15:20:42.271', 'Asistente', 800, 'bd745ff3-1e70-4d0f-8d8c-417673d91d63', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('367830c0-bdf6-4867-b00f-ab55c5bd8b18', '27cf9e9f-d13c-4c87-b59a-bc8ff3be66cc', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.272', '2026-03-30 15:20:42.272', 'Titular', 800, 'df051b54-68e7-4805-b597-5c5c1d598bfb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('4d096936-462a-4f31-8c7b-a1c2f5692340', '26b67704-8dcf-4e34-b2e7-95784a5a5589', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.06', '2026-03-30 15:20:42.275', 'Asistente', 800, 'b2b1ecfa-aeba-47bd-b343-a3113d46724a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('5a1935bf-b6b1-4d83-8b36-ba2014d341d5', '2ae67770-3d2b-4c99-85d3-f89529815e81', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.317', '2026-03-30 15:20:42.277', 'Auxiliar', 800, 'a63b4fce-1efc-4237-99fd-6433aa39ec1e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('96ff78f9-58a8-46f2-9a5b-0c7a17970491', 'b2bb0151-b229-4eac-95a5-f7635ea9493d', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.345', '2026-03-30 15:20:42.278', 'Auxiliar', 800, 'bd745ff3-1e70-4d0f-8d8c-417673d91d63', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('6654865b-0859-41cd-9f5d-75f0a3e29194', 'c0fce145-7d7f-4f92-871d-f4336796d1a8', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.679', '2026-03-30 15:20:42.279', 'Auxiliar', 800, 'a63b4fce-1efc-4237-99fd-6433aa39ec1e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('b7bdb4a7-5412-4cff-96ec-35f68c096c48', '4533ad1a-c286-42c5-bcab-b1f5cd4c8199', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.215', '2026-03-30 15:20:42.283', 'Auxiliar', 800, '9b3e40cb-e832-4b50-9ddb-69153db02bc7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('b9a3a673-a1c0-4cb4-9712-5808133053d9', 'e2c860fc-ae7f-449b-8f61-1a4fa89915c7', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.364', '2026-03-30 15:20:42.286', 'Asistente', 800, 'b9da1596-90cc-43f8-8a3f-2c5c20ad2092', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('081e8778-e471-45af-b532-e1258cbac3f8', '53359cb7-b88d-4045-bd82-5fb17dd9ddb1', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.076', '2026-03-30 15:20:42.288', 'Auxiliar', 800, '106deb76-6b5d-4a98-b47c-6d7455eae8e1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('d0fd7ebd-133c-4426-b61d-5eef19b4cda4', '283cf188-1d6c-4d1a-bcc4-bf71ac2553a3', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.107', '2026-03-30 15:20:42.289', 'Auxiliar', 800, '4614e5de-bff1-40bc-a500-3b90ca44c1c9', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('7c07eb11-e0a9-4021-a3e5-ab3eadd510c2', '7e07d54a-b880-4a73-bd21-64d66035feb6', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.826', '2026-03-30 15:20:42.29', 'Titular', 800, '9b3e40cb-e832-4b50-9ddb-69153db02bc7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('44534e36-dece-4ed6-b707-ce5818915f37', '4ac90b7a-a710-4b0e-80ca-dd9a6748829f', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.921', '2026-03-30 15:20:42.291', 'Asistente', 800, '4614e5de-bff1-40bc-a500-3b90ca44c1c9', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('61fd5bc8-99af-4d70-97d1-ddefd1737668', '839e96d8-159d-43d6-ad8a-2cdc3a4bc9d9', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.787', '2026-03-30 15:20:42.293', 'Asistente', 800, 'a63b4fce-1efc-4237-99fd-6433aa39ec1e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c08da186-a37d-4262-aa74-c14cd7ac1a3b', '58d24390-a1b5-4ede-8f23-f153b612a848', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.162', '2026-03-30 15:20:42.294', 'Asociado', 800, 'a49789ae-0a36-4c9d-bf99-bd3ef2a8ca0c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e1912565-1d99-4911-8c10-e5adc43a2ace', 'c44a6699-2911-45ac-8ebe-6503d04d68e7', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.976', '2026-03-30 15:20:42.295', 'Asociado', 800, 'e81fedd2-5e04-4a36-a3d7-241469e4d6b2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('1f724a12-38a6-4e94-9d48-76f80946ff25', 'a1205d98-9dd0-40da-bab0-2387787e5fab', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.471', '2026-03-30 15:20:42.297', 'Asistente', 800, '412f4f7b-b043-4d81-a64e-0b974fb4a04b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('2ddb4326-578c-4879-b3a8-c04ab586ce15', '36e6be44-9086-45c6-8a8c-e9927c640e85', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.501', '2026-03-30 15:20:42.297', 'Titular', 800, '46841c00-2a4d-4aa9-8b0d-ed7ff8e0c183', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c91e5eb1-f086-489b-ad57-c358197add8e', '460f161c-6eab-4a58-8e07-41dc8c85e934', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.659', '2026-03-30 15:20:42.298', 'Asociado', 800, '0b1ce3ff-50b3-488a-a971-bd46a848f780', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('43342d6a-a2f6-4fcd-b9ed-9da609d15c2a', 'f1e69e3f-5c8d-4cd3-8b4c-f2f452f7b311', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.435', '2026-03-30 15:20:42.299', 'Asistente', 800, 'f1a5f4bb-e7b0-4ccd-b369-03e4f4472dc3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('b28072f3-e2eb-42a5-b842-cc52e0b422d5', '6c3fbc2e-a340-4c6c-8713-b2504a61724a', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.282', '2026-03-30 15:20:42.304', 'Titular', 800, 'e0d2b39c-9da6-4244-87f0-8760f5f0a7ed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('995e4277-95df-44a1-920a-778840dc709c', 'ff83e2f6-353e-488e-ae38-36c2ff8885f3', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.528', '2026-03-30 15:20:42.305', 'Titular', 800, '56387180-e375-4512-ab40-6ce508e1b1d1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a1042514-567a-4239-b85b-70f007cbf39e', '915339bc-1e29-46f8-9f96-8de39e8b3b2e', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.082', '2026-03-30 15:20:42.306', 'Asociado', 800, '56387180-e375-4512-ab40-6ce508e1b1d1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('5f1bff1d-ffe8-4d7a-81ed-a4e29b56785d', 'c0def6b8-ac1b-4a05-9c4b-bb516d50c5c3', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.507', '2026-03-30 15:20:42.307', 'Asistente', 800, '9d1ac8d4-e3a4-4ea8-acca-e69f0f271ef1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('222020e6-6df4-41ad-a250-40a5923ecd92', '02772e69-2f8f-4bee-89b0-ed58c0c5f05c', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.157', '2026-03-30 15:20:42.309', 'Asistente', 800, '56387180-e375-4512-ab40-6ce508e1b1d1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0056de81-cfec-4cc3-b210-d57f7799614a', '5892df9a-59e9-45fc-82ab-4d5c61b149b7', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.378', '2026-03-30 15:20:42.31', 'Titular', 800, 'e0d2b39c-9da6-4244-87f0-8760f5f0a7ed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('bc1dc56d-26d4-427c-9fb8-9fa2629f7233', '1e62791b-04eb-4d40-be3d-5dd0c7ec7aca', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.499', '2026-03-30 15:20:42.311', 'Auxiliar', 800, '901237c1-ff01-4335-a67b-d8333d7d20cc', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('129a4d22-3780-4459-9b7c-28f3777ec1b4', '4aaa3e85-e02a-4b11-81ce-74ea0cb532fb', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.605', '2026-03-30 15:20:42.312', 'Asistente', 800, '5220afbf-a02c-4b8c-bba4-630c126237e9', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('da76ddf1-7c39-44a4-91b2-bdab51e064c9', 'beb4fbbe-d3e8-449e-b247-de22c5080629', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.63', '2026-03-30 15:20:42.313', 'Asociado', 800, '497cf0e2-f5fb-4ce3-8b4f-95d8759f747b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('7c61fb8c-4c61-4cde-bd6e-b867ca69c6e0', 'bf551e06-9f6f-45c9-aec4-c7615ad0b410', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.751', '2026-03-30 15:20:42.314', 'Asistente', 800, '22b3d543-dc6c-4033-a5f9-35c79c5a726d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('ea35ba55-7838-40dc-bfd2-1923b0b897d2', 'c3332cbd-2660-4e62-be77-90e7846cfb29', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.352', '2026-03-30 15:20:42.317', 'Titular', 800, 'd4a8c927-b43a-4cab-9c26-8287f3ceadff', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('9eb515e8-b58d-4337-92d2-50f4335c8092', '4cca1b00-c70d-40ba-866d-cc5b2df52a62', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.431', '2026-03-30 15:20:42.318', 'Titular', 800, '9bce65b7-c4c0-48c3-9330-d09fae21a97a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('9bc0a003-6f14-4e6d-b542-6ded96328e14', 'b5f76552-b139-498e-a7ab-15ccbd59d344', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.305', '2026-03-30 15:20:42.319', 'Asociado', 800, 'facd4a76-4190-421e-befd-ba53e522011e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0754598f-ec6a-4538-9d24-c7b9639db9e7', 'b37f8cdc-b3f2-45a6-9f98-d42c83960faf', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.511', '2026-03-30 15:20:42.32', 'Asociado', 800, '79795303-d637-4d78-a6c6-514833af324b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('74b15494-ee29-452f-87ec-0c19bbd0a086', 'eca6cfac-fc55-4acf-857a-6124aa3c8882', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.449', '2026-03-30 15:20:42.323', 'Asistente', 800, 'b49b631c-c895-4385-9422-c1d9249b0428', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('7d248972-35f4-4e56-ae91-b4ee95c34a79', '08e39286-23b6-4312-aef7-d88647511e63', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.895', '2026-03-30 15:20:42.324', 'Auxiliar', 800, 'a53fffd8-2fe5-4abe-bccf-64696816f57b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('48891998-21a0-4ece-9978-ac46f0417f2c', '39f2b349-59fe-413f-b312-9c6860b99a0f', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.368', '2026-03-30 15:20:42.326', 'Auxiliar', 800, '9bce65b7-c4c0-48c3-9330-d09fae21a97a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('6b9f985b-7efa-4271-b1f3-53a35f196f5d', 'af4e2dc3-dc63-4207-baaf-cd627949a81e', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.445', '2026-03-30 15:20:42.327', 'Asociado', 800, '9bce65b7-c4c0-48c3-9330-d09fae21a97a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('b8c48b46-a7fe-4121-a040-d6ca60b82498', '03bcc04c-7553-4ffb-87d6-e5da59ee4371', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.882', '2026-03-30 15:20:42.327', 'Asociado', 800, 'b68c97d2-0fbe-4fd3-aed7-99302a7e75d7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0e734f56-b8d1-4c69-8812-3c8ba028c565', 'ad7d911a-648d-4a5a-9db2-e0089e67131b', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.362', '2026-03-30 15:20:42.328', 'Asociado', 800, 'd4a8c927-b43a-4cab-9c26-8287f3ceadff', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('01e1c719-2843-47b8-8c33-648019f1df2b', '43c32b53-560e-4699-8f4f-9522088ea756', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.634', '2026-03-30 15:20:42.329', 'Titular', 800, '5a7abd0c-d4b2-4c50-9a0a-ffc326622896', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('49a17425-b006-4ff6-8af8-018b26b306da', '7f2258ec-f62a-46e1-9f4d-05acf8c9a28d', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.831', '2026-03-30 15:20:42.331', 'Asistente', 800, 'd717283e-5d6a-4e0c-96ea-e3f7278eca3e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('8658e37e-b657-48b9-9a32-c9c62ff3cfc5', '497eecec-fa0e-4c14-824a-a272a430bbe4', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.578', '2026-03-30 15:20:42.332', 'Asistente', 800, '2e2aa2eb-4da7-49ca-bd29-8304733915a8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('5b1eb7b8-0ece-4c46-8d49-85f831256e86', '63b112da-105f-4db9-9d4d-9da0813156f3', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.736', '2026-03-30 15:20:42.333', 'Asistente', 800, '366e772b-87c2-416a-b450-c1530fc16bba', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0b22c6a8-8fac-4130-9e83-ae30aae8c1ab', '6b920c10-c017-4990-b9a3-96d5501b9614', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.193', '2026-03-30 15:20:42.334', 'Asociado', 800, 'f2abe169-c0be-41db-a69a-4bc26111217e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('3fe9409d-9390-4abc-a73b-8ccfcd7a1d53', '5d99dfed-325d-4c7f-8c7e-aeb92ef59823', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.239', '2026-03-30 15:20:42.335', 'Asistente', 800, '65a19bd1-b810-43d0-a94c-545863385f33', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('32a6b3b8-b01e-41ca-b6df-78eb652dbebf', 'e20d04c8-c1c8-4058-9d0b-2a1dd91de5c8', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.318', '2026-03-30 15:20:42.336', 'Asistente', 800, '366e772b-87c2-416a-b450-c1530fc16bba', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('2c780643-ffec-4f99-9300-055a177114fa', '7be300ac-0532-468f-a31c-5f806d95c796', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.166', '2026-03-30 15:43:52.715', 'Asociado', 800, '4277c227-daaa-45ad-8a02-95e66b5faf6c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0f14ef5c-39ee-484a-94b2-23231b3fd9a0', '31b00b1a-13d1-48cd-8f4b-9cc925e772ca', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.466', '2026-03-30 15:43:52.716', 'Titular', 800, '9d1206e8-e9bd-4070-bb8c-8e75db85128c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a1ffdfb8-8fbc-4e65-9a30-90a0e3d8ad45', 'dda07397-3ec9-4f3c-b44f-51ba0eab860c', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.888', '2026-03-30 15:43:52.717', 'Asociado', 800, 'aab8af69-4082-49ae-97f0-da112666ee1b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0f339425-470a-4d8f-a9df-ba42d43b1b8e', '292bd213-1359-40a3-960a-f825881fe551', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.664', '2026-03-30 15:43:52.718', 'Titular', 800, '37ace1d3-595c-4e10-8570-1e77a410044a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('f8132e48-04e6-49b3-9ca1-f9fc55ce75cd', '3cbaf3e0-17bd-4ace-88f2-9e96ab86be22', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.356', '2026-03-30 15:43:52.719', 'Titular', 800, 'e0d2b39c-9da6-4244-87f0-8760f5f0a7ed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('520ae57f-6c33-4333-9b89-f4c028e7dd12', '8d54c425-5672-455b-8b6d-89294ec3347a', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.091', '2026-03-30 15:43:52.72', 'Auxiliar', 800, '9bf344bd-4f5e-4942-98f6-fdcedb708e9b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('44273073-04c6-446e-abd4-1e9f533b5817', 'f193734f-5f6e-44da-8add-e4d698e97c05', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.851', '2026-03-30 15:20:42.34', 'Auxiliar', 800, '586682cf-0101-4a93-981e-023ee635f759', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a0c68cb1-bb22-4785-addd-b2716c0d643d', 'a3439c66-fbcd-4105-b140-b1a7c89889c0', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.639', '2026-03-30 15:20:42.341', 'Titular', 800, '3a7a034b-2e5f-4bbb-bb9a-622068c39b3a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a6f86f01-35cf-4c65-8f22-cec4ba139da5', 'fdff2b4c-f843-42e2-a8da-5bc5caf05ea5', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.125', '2026-03-30 15:20:42.342', 'Titular', 800, '3a7a034b-2e5f-4bbb-bb9a-622068c39b3a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('bc259747-5a68-4796-b188-f39c8035a8f8', '49fbc622-b0b9-4bd5-88ad-32b07413e852', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.281', '2026-03-30 15:20:42.342', 'Asistente', 800, 'a25ec14b-07f0-4148-a5fd-b635fb6a1fd7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('202b8745-b70a-4b85-912f-76b1c0cefc85', '0e6a78df-d7ce-4109-8251-c9d5a8df2992', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.019', '2026-03-30 15:20:42.345', 'Titular', 800, 'a25ec14b-07f0-4148-a5fd-b635fb6a1fd7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('88a649ea-8b69-46e7-8025-c3498401f236', 'a4a05ca0-92ad-404c-8984-4fb4804f341e', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.295', '2026-03-30 15:20:42.346', 'Asociado', 800, 'f30aaf75-8325-481d-aa77-1844e1187cdb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('daedb309-970f-4e0c-970c-6fc2ae42c3cc', '38bfb836-b0dd-4d69-b4b6-544c3390f904', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.391', '2026-03-30 15:20:42.346', 'Asistente', 800, '725e9497-eaf1-477d-9641-ac40e76cc93e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('fae77c36-ae8a-49cc-b789-6f4e980532a9', 'cb5652cb-cd6a-4c2f-8d7e-4ce8b362ba18', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.435', '2026-03-30 15:20:42.347', 'Asociado', 800, '9d1206e8-e9bd-4070-bb8c-8e75db85128c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c42a6f1e-7285-48d2-83c3-368a29b99434', '4e9a5bd2-fc22-47ff-a699-1119e9b31107', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.466', '2026-03-30 15:20:42.348', 'Asistente', 800, '725e9497-eaf1-477d-9641-ac40e76cc93e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('387f8207-f8b5-4cf7-be84-0393287dc9f1', 'fc65d26e-549f-44e6-8173-68e6e51e8711', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.277', '2026-03-30 15:20:42.349', 'Titular', 800, '3a7a034b-2e5f-4bbb-bb9a-622068c39b3a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('fa143d12-d717-4766-ada0-fb2c59f861bf', '384961a1-7ce2-4e91-807c-7d1900c5d68f', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.474', '2026-03-30 15:20:42.351', 'Asistente', 800, 'dbc27ba9-9553-4220-a19b-22aa943ba56a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('bef7610a-b97f-4384-9624-48ddcf1b46ad', 'c028824a-b3ab-4d42-a47c-0684c14fd735', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.05', '2026-03-30 15:20:42.354', 'Titular', 800, '7c978b79-c027-4d67-ac08-83fba22cb77e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('69fd2bef-da83-4da6-b0d1-8b74ce23ec77', '26cdc7f9-0f92-4214-9327-ecdea53aeeac', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.801', '2026-03-30 15:20:42.356', 'Asistente', 800, 'f30aaf75-8325-481d-aa77-1844e1187cdb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('924e2a2a-df67-4268-b657-a04489f83b40', 'f22dbac3-6d8c-4ada-984f-b64771fb62e9', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.407', '2026-03-30 15:20:42.356', 'Asociado', 800, '3a7a034b-2e5f-4bbb-bb9a-622068c39b3a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e3e0d541-a324-45de-8a41-291deb5705f4', '9feb7085-604a-460c-a38a-082587ea0227', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.403', '2026-03-30 15:20:42.357', 'Asociado', 800, '2748f80e-909c-45a7-8ddb-dbf0ffab568d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('1b6a4979-fef6-472b-bf2f-0fc8c0b3f72c', '389e5a27-e424-42ec-bcb5-32031b38e2f8', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.382', '2026-03-30 15:20:42.359', 'Titular', 800, '523a9f93-f3f8-433e-9b85-af311e6cce4f', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e34496a3-8a99-4b4a-9c72-d0644c87a979', '6267ce7e-d484-456f-8c50-9c6b3f7945b6', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.23', '2026-03-30 15:20:42.359', 'Asistente', 800, 'aab8af69-4082-49ae-97f0-da112666ee1b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('7cb141f2-a5e8-4385-9ef7-b0a109149547', 'ea5559de-8808-4db1-9244-0b0d96c0712a', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.087', '2026-03-30 15:20:42.361', 'Titular', 800, 'a7a4f887-ed47-46a9-9df0-80667c5e8e53', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('ad0b3363-a158-4077-b723-cdbc9a13ff62', 'a8f17f38-4a06-456b-ba33-1d36a94645de', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.761', '2026-03-30 15:20:42.362', 'Asistente', 800, 'aab8af69-4082-49ae-97f0-da112666ee1b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('12b7f555-b31a-4df5-993d-42d18d29101e', '79f55dc2-371c-4c7f-8ee8-44808d45a378', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.792', '2026-03-30 15:20:42.363', 'Titular', 800, 'fc8e0ff2-8caa-402c-8d08-041590c0a9fa', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('2b8f54a6-2e2f-49f2-9929-fb922e8963a0', 'c686223b-74e5-4992-85e8-342c9d607ae2', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.44', '2026-03-30 15:20:42.365', 'Asociado', 800, '523a9f93-f3f8-433e-9b85-af311e6cce4f', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('16fde8ab-b42e-4542-b5c0-4ecbab581cd0', '38c5a6af-632f-455c-b6e7-1d53cf2aa485', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.198', '2026-03-30 15:20:42.367', 'Titular', 800, 'a7a4f887-ed47-46a9-9df0-80667c5e8e53', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('42580bc9-4934-4281-98d9-b6a57c736845', '6e8d0c57-9923-4dcf-966c-9d0fd806a6b4', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.071', '2026-03-30 15:20:42.368', 'Asociado', 800, 'c32a2c8d-2c41-4deb-b5f3-7c9e57c110fd', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0092e4f3-7d52-4c95-936f-4c9adf15aff0', '22c8ff96-4d5d-4f42-9b6a-00d441a49a47', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.475', '2026-03-30 15:20:42.37', 'Titular', 800, 'c32a2c8d-2c41-4deb-b5f3-7c9e57c110fd', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('5b04871a-42f2-49e1-85ac-10726109d7a5', '922df5f1-44df-4250-8ed2-9e9539a54c0a', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.549', '2026-03-30 15:43:52.721', 'Titular', 800, 'a698778d-4866-4d9a-b642-1d8d25f2d054', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c23fcc55-a0b0-4d83-9fd6-89de91244bf2', '5a1737ff-3478-40fd-90ec-4520de7a3e98', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.62', '2026-03-30 15:43:52.722', 'Auxiliar', 800, 'df051b54-68e7-4805-b597-5c5c1d598bfb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('f6cca61c-562d-48b5-b51d-a8262c5777f8', '8dbed962-e349-4ec5-9179-1363488e85bd', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.797', '2026-03-30 15:43:52.723', 'Asistente', 800, '2748f80e-909c-45a7-8ddb-dbf0ffab568d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('80d0c6e7-f6b0-42f1-8136-95c695e9666e', '55bb68f0-a34b-4f44-b821-1764959e08ac', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.847', '2026-03-30 15:43:52.725', 'Asistente', 800, 'cd19cf47-9c1f-496f-9c80-8150f19f503a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e7fce99f-2a96-4120-a352-d250cc056598', '21752518-1d2f-4506-b686-6ea9c46e8f0c', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.307', '2026-03-30 15:43:52.726', 'Titular', 800, 'ed5576cf-e569-4fef-b9f0-630ebb6b72a5', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('fd336c39-972b-4b83-9a12-564172b7c16e', 'fbe7bc22-f8d8-42cc-a27b-39e40b32a4aa', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.439', '2026-03-30 15:43:52.726', 'Asistente', 800, '707daa00-b40a-412b-8265-8ca7fb52860d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('64b0cedd-7fea-4550-a913-8dee80ec6dfe', '0ee7fedd-35fe-4352-b8a2-ea7a86315235', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.863', '2026-03-30 15:43:52.727', 'Asociado', 800, '7420f7de-4599-4e48-88d2-b220353a0b21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('dc2ac621-be96-4cfa-ac90-e184d5ad5f82', '218810fc-8a53-4d5d-82da-d4822f80c671', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.867', '2026-03-30 15:43:52.728', 'Titular', 800, '26f5b5f1-d5c6-410b-a345-8f9be7c4c02f', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('8a6be3d3-e6c8-4cf1-a744-e8da93737c46', 'a517d93e-a26a-4840-8678-dd1476cfb930', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.916', '2026-03-30 15:43:52.73', 'Auxiliar', 800, 'dd3e9555-cd24-497b-8b19-c9273ee599f3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e005b558-d003-46d1-aa7e-ff282c9168be', '4656dbcb-9715-4314-a813-567e2340715d', '593b49db-ba20-410d-8608-9b71af83d2b5', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.933', '2026-03-30 15:43:52.731', 'Asociado', 800, '81c10159-6df1-4f4d-9966-ea3ec5f2452b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c2821e78-033a-4a87-be7c-3092cf5b8457', '300e4bc3-abd1-4d57-b21f-efd09c3755e8', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.938', '2026-03-30 15:43:52.732', 'Asistente', 800, '31d616dc-78a3-41f3-85e6-e16ae1108f2e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('2d8ed023-f756-4fa9-86f6-a401d1f18c91', '34a17eeb-fd19-45b0-9765-ecebd3251fa2', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.945', '2026-03-30 15:43:52.732', 'Titular', 800, 'a4566a84-a808-4162-802d-ac4acb787775', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('52b82355-f5a6-4ea5-aa11-e3b8c838ea8e', '9ed8fcad-4531-4919-ab1b-e12f51cf3bb4', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.982', '2026-03-30 15:43:52.734', 'Titular', 800, '75bb2830-2570-42b4-aabe-99d5efa9add6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('954affab-27ef-4733-83af-c7e01160582f', 'e59fd812-aa69-405a-b010-07c23a90871c', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.004', '2026-03-30 15:43:52.735', 'Asociado', 800, '0df3d5e3-26e7-48bc-96a6-6ce4eb60ede3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('6948ffd8-9a48-4951-b60a-8a9b75c467ef', 'b4621252-3aa3-4bf9-b1ae-91d3cc3382d0', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.014', '2026-03-30 15:43:52.735', 'Titular', 800, '586682cf-0101-4a93-981e-023ee635f759', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('aebee0fa-b685-4063-8865-0e46cc002849', '4be90b8f-8758-4e9d-96cc-cbd4361848ba', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.04', '2026-03-30 15:43:52.736', 'Titular', 800, 'a6132073-1834-417e-8b83-a881ba6777ae', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a6ab6462-779f-468e-bb79-474176c4436e', 'ea82b18d-d043-48b2-b303-da376cc4b9c2', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.055', '2026-03-30 15:43:52.737', 'Asociado', 800, '722721a7-69e4-434e-8513-bce4dddeced6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('9bed5486-e0b8-4223-aa92-45b4b9cbad7e', 'c4d2e762-cea7-4a43-86ab-5cf957c49625', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.066', '2026-03-30 15:43:52.738', 'Asociado', 800, '216bdcfd-fc2b-4d82-92fc-9638012b708a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('5a64d67d-e368-4b74-b69e-8af4d293be81', '1afeb586-20db-41a5-b479-b6e6d790d13a', '4017ab74-7e31-494a-b7a2-4e77baf6fa73', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.258', '2026-03-30 15:43:52.739', 'Asociado', 800, '6e9d8132-84ec-4eaf-ab33-4d2cdbc367a8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('fe72cff8-2b30-4c7c-93e5-5d891a857484', '76e853c5-43c3-46e8-b6d5-fade54b86b4e', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.267', '2026-03-30 15:43:52.739', 'Asistente', 800, 'ce45cbf9-1a3c-462f-a0d3-f500a25cb77d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('33f883ab-0065-4ab2-a753-d3762efd9eab', '5ae49041-ab60-423f-bcdd-e3c92eaa7b74', '593b49db-ba20-410d-8608-9b71af83d2b5', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.273', '2026-03-30 15:43:52.74', 'Asistente', 800, '4da4b7f4-f1b9-436b-8c77-62694806bf6b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('1f503482-6908-4774-91a8-394accb847eb', 'd0485c84-090f-436d-a0e4-1f10a16c5982', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.29', '2026-03-30 15:43:52.741', 'Asociado', 800, '948990d9-2b26-4526-bd25-d9b56f07f735', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('2ad75020-4fd4-486d-9135-e433e1bd1929', 'c0e9b107-0d5d-40bd-bad6-f3f47af56ea3', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.311', '2026-03-30 15:43:52.742', 'Asociado', 800, '2254d76b-ba18-49e1-9d3e-dc577c5c0ce1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('38358c79-2506-47c3-92b2-47eef809fc7d', '0e75092b-11cb-4df9-9a4a-f6af01cdd9cb', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.327', '2026-03-30 15:43:52.743', 'Asociado', 800, '9d1206e8-e9bd-4070-bb8c-8e75db85128c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('534c519a-10cd-4612-bc83-7a44acf3d0d0', '11230545-aabc-4891-bb6d-22e60231d7b3', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.45', '2026-03-30 15:43:52.744', 'Asociado', 800, 'f45c0c42-7c7d-4174-a7f0-c38724346769', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('b74aba39-da91-4ee9-97cf-3e712fd96969', '4c707726-b263-4e6e-ac14-2ff1b149e8b3', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.517', '2026-03-30 15:43:52.745', 'Titular', 800, '49face67-a6f8-433d-8fe0-fb236c248c79', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a7832fb7-3363-4ce4-a55f-101d56d19f0c', '76c5ccc9-fcac-4e37-b48e-6adb17fda918', 'e634988f-413f-4668-95ff-4e79259440ca', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.523', '2026-03-30 15:43:52.746', 'Asociado', 800, '3ea4d9eb-8e07-4122-ba3f-a61210419378', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a6695a71-c359-459a-be9a-971bcf842019', '0050bccd-b22d-4efa-b4eb-e9e40aa04ebe', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'VISITANTE', 'TC', 'ACTIVO', '2026-03-27 11:44:40.533', '2026-03-30 15:43:52.747', 'Visitante', 800, '56c29a31-63e4-4465-85cd-ca08ce6a72ca', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('cd10e014-4bd7-4199-a528-d41eea7f07ca', '97aec771-7098-4c12-8c79-6d3ab676b410', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:40.559', '2026-03-30 15:43:52.747', 'Asociado', 800, 'dbc27ba9-9553-4220-a19b-22aa943ba56a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('3b673889-fe45-4072-b685-1f546fa2f6b5', '03dca840-af27-41ef-98bb-dc89aedccf48', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.584', '2026-03-30 15:43:52.749', 'Titular', 800, 'a0f9f404-08c6-4de7-bf94-b31bf7c47710', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('926d6508-82ca-4f82-afb9-12a5c108b4ef', '3b14bb7f-644f-4725-b99d-2fd40a198e81', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.59', '2026-03-30 15:43:52.75', 'Titular', 800, '52b290a2-609d-4cba-b7dc-4051ec705002', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e2785028-4f2f-4f31-9cfd-1d17ca71478b', 'ff417a4f-c491-4ded-95c0-1e7be0817e70', '704438d5-b8c8-425f-9325-f76adf80f00d', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.597', '2026-03-30 15:43:52.751', 'Titular', 800, 'facd4a76-4190-421e-befd-ba53e522011e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0f324273-c32f-40b1-bab3-a6be7843b6d9', 'ee098e6e-214b-401b-a44f-a96cb1f6b2ea', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.625', '2026-03-30 15:43:52.752', 'Asociado', 800, '60a6d13a-631a-40bc-9f34-b797540e9333', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('17241e98-c033-4973-a9d0-7be27a799c54', '58034ad5-118e-4627-9917-c0a6c1c917e4', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.654', '2026-03-30 15:43:52.753', 'Asistente', 800, 'ca4e4502-1a44-44c9-bd93-dfe0f3879abd', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('1a8ae36a-85c0-4451-8c72-4dfc02fa7321', 'ebeed9ed-ab12-4b3b-8dbf-5b7b020cdb31', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:40.689', '2026-03-30 15:43:52.754', 'Titular', 800, '43e1c0d6-7c00-4e11-9805-9dd30f536123', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e0674ce4-70a2-4227-93dd-61ba3d46fd87', 'feb6d44a-e850-43ee-bc63-6fab7f55fd50', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.697', '2026-03-30 15:43:52.755', 'Titular', 800, '47e63923-6a9d-475f-a7a1-8ded2fa5e1f7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('87d40f10-bc51-477a-a495-e84c734a79d6', '7e45426a-c9f0-4d23-90dc-5f7be88c4d63', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.731', '2026-03-30 15:43:52.756', 'Asociado', 800, '02f4b8da-a205-4f2c-a9df-a6b4e3dcecf7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('eb374d53-3c62-4c89-ac3b-5e18d1ebb274', 'b4236e08-5269-411d-bbd0-1bed6e843f62', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.756', '2026-03-30 15:43:52.759', 'Titular', 800, '30a496ca-d52c-4f3b-9413-7163c6328d8e', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('a4ad9b83-43df-4328-8be7-1719edaaf51c', '71a26227-5a6d-466c-967d-601b053a6647', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.772', '2026-03-30 15:43:52.76', 'Asociado', 800, '55e39221-1ac7-4dfd-bd79-9b4169e5a38c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('0a937a24-9478-489e-a1b1-3355ca2e66da', '81d8e029-08c2-4c4d-8122-614e9c08ced5', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.806', '2026-03-30 15:43:52.761', 'Titular', 800, '79ca2550-f2d1-43bb-bcf8-8605d0bde26a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('dfcf1c17-03d2-4e04-99b2-a729293b999d', '8e5defaa-87b4-448a-91a3-224f5ad232c1', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:40.815', '2026-03-30 15:43:52.762', 'Titular', 800, '38fe4a24-0642-4031-b6fc-d4ba056561c0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('65bcbead-838a-4868-9139-50ee5f261394', 'f20c1373-a4ad-4701-8897-f9bc1e5e746e', 'e634988f-413f-4668-95ff-4e79259440ca', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:40.821', '2026-03-30 15:43:52.763', 'Asistente', 800, 'c28b9712-6daa-4331-98f8-0553cda705e8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('147b43ad-241f-4d93-9a00-2e511ecc6a15', '23fe706c-d664-4af2-8931-69fa819d79b2', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.131', '2026-03-30 15:43:52.764', 'Auxiliar', 800, 'b509b61c-b1d9-44b1-b798-8ee7601a1708', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('8234c72d-2ead-492e-8726-96c0ff6f83de', '310ecef1-6912-436e-a284-fba41ffd5ed3', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.136', '2026-03-30 15:43:52.765', 'Asociado', 800, '89c0c197-2deb-4749-a089-3df23253424f', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('b9ccef7c-2b9c-4e78-b565-e2ad34cd1912', '896ba81d-fe8a-409c-b643-5821e3a8da91', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.175', '2026-03-30 15:43:52.765', 'Asociado', 800, '79ca2550-f2d1-43bb-bcf8-8605d0bde26a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('929de5c0-91e3-4ade-a2bc-21add45d0f0b', 'f1be1855-6b7f-458d-a1c6-75cb5eebc3e0', '4017ab74-7e31-494a-b7a2-4e77baf6fa73', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.189', '2026-03-30 15:43:52.766', 'Asistente', 800, '8e28d45b-0927-44ce-ae82-82b6955fde09', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('373e9d34-a813-474c-9fc7-34fec8298152', '96314219-521c-4526-b3e2-4156cecf1168', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.205', '2026-03-30 15:43:52.767', 'Asistente', 800, '17021ec4-c552-48f8-9523-3b42adf18400', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('f7176f8a-78d1-4814-a685-f0150ac2ba36', '5e66d8ae-9af2-4132-b7d2-84e44f08b1d1', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.221', '2026-03-30 15:43:52.768', 'Asociado', 800, '8af1d1cb-0ad2-41fc-8593-fb71786c9885', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('ede3852c-a7a0-45b8-9c80-f4bc7b4f4e14', 'a1ed71b3-f896-4600-93f3-8e030eb1cd02', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.226', '2026-03-30 15:43:52.769', 'Asistente', 800, 'dd3e9555-cd24-497b-8b19-c9273ee599f3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('450d0868-4807-4da8-bb5d-eceb01531016', '0345895a-6c9e-4e63-872d-d87e6b8f8b8e', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'ESPECIAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.252', '2026-03-30 15:43:52.769', 'Auxiliar', 800, '49face67-a6f8-433d-8fe0-fb236c248c79', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('7e006765-bd28-4d9c-a410-68a72b439dbc', '180a6109-a5f0-4746-89ed-a347931a9bf2', 'e634988f-413f-4668-95ff-4e79259440ca', 'ESPECIAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.265', '2026-03-30 15:43:52.77', 'Titular', 800, '722721a7-69e4-434e-8513-bce4dddeced6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('ea7edb3b-32ad-4c3b-8383-d69b8e315ec9', 'eb7ab2a3-9a14-4f9a-a21e-6c54ad441cba', 'e634988f-413f-4668-95ff-4e79259440ca', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.269', '2026-03-30 15:43:52.771', 'Titular', 800, '722721a7-69e4-434e-8513-bce4dddeced6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('d7f6badb-0ade-4f86-8cec-eda05fe1f7b9', 'c1314d2c-c2b0-4d48-998f-1ce68edcb763', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'PERIODO DE PRUEBA', 'TC', 'ACTIVO', '2026-03-27 11:44:41.298', '2026-03-30 15:43:52.772', 'Asistente', 800, 'b1c1cf98-b432-4d39-af9c-480b10584d72', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('562b8af6-4bf8-44fc-8542-4b140731d644', '9f00f67a-1d02-48ca-8957-e0cab6633213', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.331', '2026-03-30 15:43:52.773', 'Titular', 800, '2d9318ac-45cb-47ea-b4ed-ba3d42d65fa1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('28a03766-c40f-4bfb-90c3-fea4bffe6355', 'fd216357-0a06-4ddc-9e1d-19e3b5ea4f4e', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.348', '2026-03-30 15:43:52.773', 'Asociado', 800, 'a4566a84-a808-4162-802d-ac4acb787775', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('97bfecf7-1f26-48fd-baed-daeee8641b9d', 'ea0993eb-6c0a-432c-88ed-201095a0d0d1', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.408', '2026-03-30 15:43:52.774', 'Titular', 800, '3abd2416-031e-4d7a-99d6-cb94a90effac', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c5880a2e-d04e-42bc-88e0-1001b932289c', 'cfea5933-2291-4961-ab60-1dc11642f947', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.417', '2026-03-30 15:43:52.775', 'Asociado', 800, 'e7f4fb48-cd63-43bc-a1ce-b4bfafbbc380', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('e9155dd7-244c-402c-b581-6ed1b3f8d9f4', 'dfa311a8-a149-4c5b-99b3-ac55ec733bb2', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.47', '2026-03-30 15:43:52.776', 'Titular', 800, '11b7c350-c8d4-4fb2-80c4-480587676204', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('82a353c4-34ca-44e3-b413-7fad8c681abe', '7e9ea205-5d04-4afa-885d-d21384a73f70', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.482', '2026-03-30 15:43:52.776', 'Asociado', 800, 'ba9693b3-fc24-4008-8926-291962dc301c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('b648a217-6d4f-4bb7-a36f-0f3a656d7e70', 'c51c0c13-ee51-44b5-aaf8-101d91754a61', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'OCASIONAL', 'TC', 'ACTIVO', '2026-03-27 11:44:41.504', '2026-03-30 15:43:52.777', 'Titular', 800, '797857a1-a223-4786-a653-4717168ae3c4', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('6b2b44ce-a2c4-4d1a-8212-928e0cc595f4', '5c62edc9-900c-461c-81da-196052f34dce', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.526', '2026-03-30 15:43:52.778', 'Titular', 800, '56387180-e375-4512-ab40-6ce508e1b1d1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('41b1eff6-b613-4f52-aa8a-a8320d4825b9', 'efb35da5-863e-4187-9a8c-4ec1eac13d35', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CARRERA1', 'TC', 'ACTIVO', '2026-03-27 11:44:41.554', '2026-03-30 15:43:52.779', 'Asistente', 800, '7765fb0d-6ad5-46f3-b645-ca978dd1d172', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('c5460acf-836f-4bc3-919e-f66fb7935b77', '41319690-e5d8-4773-abe9-c9d14e5f7b7d', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.478', '2026-03-30 15:20:42.372', 'Asistente', 800, 'a4566a84-a808-4162-802d-ac4acb787775', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('94ac93fa-72f9-4eec-9446-944083654894', '9c1ce751-4a64-42a5-b716-337d0feec8d3', 'e634988f-413f-4668-95ff-4e79259440ca', 'CARRERA2', 'TC', 'ACTIVO', '2026-03-27 11:44:41.462', '2026-03-30 15:20:42.373', 'Asociado', 800, '4277c227-daaa-45ad-8a02-95e66b5faf6c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Docente" VALUES ('06478733-5c4e-48b2-b76f-5a163aec0999', 'f40bed8e-597b-4b66-9bd9-75a6123b80db', '89006b1d-d4df-4604-9afc-7b450d9e6ab4', 'CARRERA_003', 'Tiempo Completo', 'ACTIVO', '2026-03-31 18:19:06.602', '2026-04-16 12:43:58.4', NULL, 800, 'c8d9e0f1-a2b3-4c5d-6e7f-890123456789', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: Documento; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."Documento" VALUES ('6847644c-9a19-47cb-a5a4-5794f5bf541a', '89767cb5-402c-4c1f-a992-cf3991b86a3c', 'Captura de pantalla 2026-03-19 221607.png', 'http://localhost:5000/uploads/file-1774894165535-411594768.png', 'image/png', '2026-03-30 18:09:25.78', 'general', NULL, 'pendiente', 0, NULL, '2026-03-30 19:09:11.084', 1, NULL, NULL);
INSERT INTO academic_work_plan."Documento" VALUES ('aa58b3f4-0ffd-4310-af5a-74d3e4b7bf7c', '89767cb5-402c-4c1f-a992-cf3991b86a3c', '1. Aviso de convocatoria Concurso de Meritos.pdf', 'http://localhost:5000/uploads/file-1775308848440-202033663.pdf', 'application/pdf', '2026-04-04 13:20:48.459', 'general', NULL, 'archivado', 0, NULL, '2026-04-04 13:22:26.527', 1, NULL, NULL);


--
-- Data for Name: DocumentoVersion; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: HistorialEstadoPTA; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: PTAUserData; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."PTAUserData" VALUES ('d845331b-4c2c-4a5e-9eb1-90c8634a81d6', '52543b09-4b64-410f-9530-e2907b448080', '{}', '{}', '[]', '[]', '2026-04-16 18:00:35.21-05', '2026-04-16 18:00:35.21-05');
INSERT INTO academic_work_plan."PTAUserData" VALUES ('f191b3e5-147c-4558-96ab-82bc2b5841e6', '02446e79-3071-409c-b2bf-7f53e6403a7e', '{}', '{}', '[]', '[]', '2026-04-16 17:58:56.435-05', '2026-04-17 15:21:14.68-05');


--
-- Data for Name: Permiso; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."Permiso" VALUES ('2a8fd943-0099-4a25-beaf-4fd55b288e34', 'PORTAL', 'ACCEDER', 'Acceso básico al portal transaccional', '2026-03-27 12:01:01.847');
INSERT INTO academic_work_plan."Permiso" VALUES ('e5919279-56e0-4412-9eb5-1bf1d671c15e', 'CARPETA_DIGITAL', 'LEER', 'Ver documentos de carpeta digital', '2026-03-27 12:01:01.867');
INSERT INTO academic_work_plan."Permiso" VALUES ('3aca5fad-06d3-4476-832a-051213586dbc', 'CARPETA_DIGITAL', 'ACTUALIZAR', 'Subir documentos a carpeta digital', '2026-03-27 12:01:01.876');
INSERT INTO academic_work_plan."Permiso" VALUES ('697bea7b-7145-48f5-9222-3e3a5858a2b4', 'CERTIFICADOS', 'LEER', 'Consultar certificados laborales', '2026-03-27 12:01:01.882');
INSERT INTO academic_work_plan."Permiso" VALUES ('4195fc1c-91eb-41f3-8160-f17341c45ace', 'CERTIFICADOS', 'SOLICITAR', 'Solicitar nuevos certificados', '2026-03-27 12:01:01.888');
INSERT INTO academic_work_plan."Permiso" VALUES ('688ce085-0d27-45c3-bb9f-25361e4771f8', 'PTA', 'LEER', 'Ver sus planes de trabajo académico', '2026-03-27 12:01:01.896');
INSERT INTO academic_work_plan."Permiso" VALUES ('319dd249-7d8b-4073-ae38-cc6a546ea0a8', 'PTA', 'CREAR', 'Crear nuevos planes de trabajo (borradores)', '2026-03-27 12:01:01.903');
INSERT INTO academic_work_plan."Permiso" VALUES ('704c5904-43cc-4208-8751-81d81673922b', 'PTA', 'ACTUALIZAR', 'Editar sus planes de trabajo académico', '2026-03-27 12:01:01.91');
INSERT INTO academic_work_plan."Permiso" VALUES ('9513ad2c-98c8-4964-906f-1c2ae569e9ee', 'PTA', 'ENVIAR_CONCERTACION', 'Enviar PTA a concertación', '2026-03-27 12:01:01.914');
INSERT INTO academic_work_plan."Permiso" VALUES ('98de0085-1986-461f-99b0-945730d58922', 'estructura.view', 'ACCESS', 'Permiso', '2026-04-02 17:53:40.925');
INSERT INTO academic_work_plan."Permiso" VALUES ('0b488281-aed1-45bf-8730-b83e2b27bd34', 'estructura.edit', 'ACCESS', 'Permiso', '2026-04-02 17:53:40.933');
INSERT INTO academic_work_plan."Permiso" VALUES ('f4e299b9-bf96-4097-b57a-d3bf0ad09e28', 'estructura.admin', 'ACCESS', 'Permiso', '2026-04-02 17:53:40.937');
INSERT INTO academic_work_plan."Permiso" VALUES ('265db154-c33e-4382-ba44-9ecfa0b990c9', 'pta.backoffice.ver_gestion', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.808');
INSERT INTO academic_work_plan."Permiso" VALUES ('759c6a66-cee8-4b3f-8c7e-404a20dbd47a', 'pta.backoffice.ver_detalle', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.815');
INSERT INTO academic_work_plan."Permiso" VALUES ('49a814ce-a49c-488b-a4bf-4c8ca3c41077', 'pta.backoffice.crear', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.819');
INSERT INTO academic_work_plan."Permiso" VALUES ('4da791a7-2c96-4dd5-b93e-c8c99b9636bf', 'pta.backoffice.editar', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.821');
INSERT INTO academic_work_plan."Permiso" VALUES ('f5bbea5d-c009-4526-be03-b3069b4a8561', 'pta.backoffice.aprobar', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.824');
INSERT INTO academic_work_plan."Permiso" VALUES ('7b0fafb4-147e-4ca2-a368-de1f92d27d3a', 'pta.backoffice.aprobacion_masiva', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.828');
INSERT INTO academic_work_plan."Permiso" VALUES ('2c5b5d26-bcef-49d2-96f4-c25fda8432e3', 'pta.backoffice.rechazar', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.83');
INSERT INTO academic_work_plan."Permiso" VALUES ('8edb8217-4829-4fd1-88b0-817202c7ef83', 'pta.backoffice.arbitrar', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.833');
INSERT INTO academic_work_plan."Permiso" VALUES ('07ae65e6-c7e5-441c-9d2b-d347b54ba44d', 'pta.backoffice.concertar', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.836');
INSERT INTO academic_work_plan."Permiso" VALUES ('97cbf6b1-f5cf-4b63-8d81-eccd174e6638', 'pta.backoffice.firma_digital', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.838');
INSERT INTO academic_work_plan."Permiso" VALUES ('840a2a01-aa62-402f-b597-bd19a73fd7e1', 'pta.backoffice.enviar_propuesta', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.841');
INSERT INTO academic_work_plan."Permiso" VALUES ('c1873e1e-53f2-45ab-b01d-db75a40ee3b4', 'pta.backoffice.gestionar_estados', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.844');
INSERT INTO academic_work_plan."Permiso" VALUES ('470f6cbf-5b73-415f-a90c-8a5c8d1dfaa6', 'pta.backoffice.tablero_control', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.847');
INSERT INTO academic_work_plan."Permiso" VALUES ('1190b491-2411-4d35-a335-1180a547cd4b', 'pta.backoffice.dashboard_directivo', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.851');
INSERT INTO academic_work_plan."Permiso" VALUES ('801f9d5b-3014-4693-8ca6-b85a75b32c64', 'pta.backoffice.kanban', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.853');
INSERT INTO academic_work_plan."Permiso" VALUES ('63b383b6-b9a2-4d8b-a955-1c07358cb4ba', 'pta.backoffice.workflow', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.855');
INSERT INTO academic_work_plan."Permiso" VALUES ('4751dac4-6845-44c8-a40b-bf787a462007', 'pta.backoffice.gestion_territorial', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.857');
INSERT INTO academic_work_plan."Permiso" VALUES ('dd25a2b6-815c-4d7f-abaa-dcca32de30a8', 'pta.backoffice.mapa_territorial', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.86');
INSERT INTO academic_work_plan."Permiso" VALUES ('3c641115-ebc9-4327-8962-0836f342c76e', 'pta.backoffice.seguimiento', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.863');
INSERT INTO academic_work_plan."Permiso" VALUES ('127b4a2d-e9f8-43dd-9aa6-09c14ccd44b9', 'pta.backoffice.comparativo', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.865');
INSERT INTO academic_work_plan."Permiso" VALUES ('5b98a23c-a945-41c4-a5da-a2efb21e35bf', 'pta.backoffice.panel_sna', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.867');
INSERT INTO academic_work_plan."Permiso" VALUES ('e131f908-2012-44ff-aa57-c85836427e80', 'pta.backoffice.programacion', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.871');
INSERT INTO academic_work_plan."Permiso" VALUES ('6796b96c-7f35-4da7-9d34-989ec5dfaf8f', 'pta.backoffice.programacion_institucional', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.875');
INSERT INTO academic_work_plan."Permiso" VALUES ('bc0fde53-4039-496f-ba5d-4718293d9477', 'pta.backoffice.carga_masiva', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.878');
INSERT INTO academic_work_plan."Permiso" VALUES ('a928efa8-14d0-4c90-a037-787aa1cbf14e', 'pta.backoffice.simulador_carga', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.88');
INSERT INTO academic_work_plan."Permiso" VALUES ('6759726d-427b-4a65-a0a2-1c0b508c6b2e', 'pta.backoffice.asignador_automatico', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.884');
INSERT INTO academic_work_plan."Permiso" VALUES ('414f6f0c-71d7-4fd8-a98e-c07c08ae9e15', 'pta.backoffice.alertas', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.887');
INSERT INTO academic_work_plan."Permiso" VALUES ('6ec5da76-b5ce-43de-9799-c42c66ffab28', 'pta.backoffice.gestion_conflictos', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.889');
INSERT INTO academic_work_plan."Permiso" VALUES ('0de933ad-e561-4a1e-b891-ea4db97b392e', 'pta.backoffice.comite_evaluacion', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.892');
INSERT INTO academic_work_plan."Permiso" VALUES ('a36bd66a-4ad8-4e7b-befb-0b82ef225406', 'pta.backoffice.calendario', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.894');
INSERT INTO academic_work_plan."Permiso" VALUES ('ada3dee4-7986-48a6-8f3e-72893c588666', 'pta.backoffice.benchmarking', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.897');
INSERT INTO academic_work_plan."Permiso" VALUES ('8015c47b-8bdc-4d6b-be98-7ead3b85a9dd', 'pta.backoffice.indicadores', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.899');
INSERT INTO academic_work_plan."Permiso" VALUES ('830f3028-eac7-4d23-b1de-861f46dea5b7', 'pta.backoffice.metricas_sla', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.901');
INSERT INTO academic_work_plan."Permiso" VALUES ('20cc1863-4b80-41ce-b39a-60c77f33da52', 'pta.backoffice.verificacion_qr', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.902');
INSERT INTO academic_work_plan."Permiso" VALUES ('759a935f-3a99-4165-8b2e-ba93b7805435', 'pta.backoffice.test_e2e', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.906');
INSERT INTO academic_work_plan."Permiso" VALUES ('a056d432-0f39-4709-9fb3-1f5b43892d6e', 'pta.backoffice.sankey_transiciones', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.909');
INSERT INTO academic_work_plan."Permiso" VALUES ('1de46b49-7329-445e-9710-ffa80574545f', 'pta.backoffice.exportar', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.912');
INSERT INTO academic_work_plan."Permiso" VALUES ('4d304442-7478-488c-b5e5-9c0d810dbb1c', 'pta.backoffice.centro_reportes', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.915');
INSERT INTO academic_work_plan."Permiso" VALUES ('36dd5065-f9d1-4040-823a-f1b5b3e03c90', 'pta.backoffice.reporte_nacional', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.919');
INSERT INTO academic_work_plan."Permiso" VALUES ('5ab995bc-5648-488f-b541-a115c1a9f536', 'pta.backoffice.reporte_individual', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.921');
INSERT INTO academic_work_plan."Permiso" VALUES ('5f219166-07d0-43ef-852d-219073dc0304', 'pta.backoffice.reporte_seguimiento', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.924');
INSERT INTO academic_work_plan."Permiso" VALUES ('121bd36d-3e7a-4a7e-8be3-4ccc8de743d7', 'pta.backoffice.exportar_actas', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.926');
INSERT INTO academic_work_plan."Permiso" VALUES ('46e08c68-8a39-44b5-b2f3-02145655c766', 'pta.backoffice.generador_resoluciones', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.929');
INSERT INTO academic_work_plan."Permiso" VALUES ('a7ec6239-6de1-4893-87ca-a031cd675333', 'pta.backoffice.acta_concertacion', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.932');
INSERT INTO academic_work_plan."Permiso" VALUES ('ae68f6b5-13ce-4b36-ae70-694385a44229', 'pta.backoffice.certificado_firma', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.935');
INSERT INTO academic_work_plan."Permiso" VALUES ('362f55e0-91ac-4fb8-a031-79bea245bab8', 'pta.backoffice.editar_catalogo', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.938');
INSERT INTO academic_work_plan."Permiso" VALUES ('73510da8-7631-4c52-9dc2-2227e53e5794', 'pta.backoffice.catalogo_asignaturas', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.941');
INSERT INTO academic_work_plan."Permiso" VALUES ('584bdb35-0633-4059-a260-610f653698f7', 'pta.backoffice.validador_gth', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.944');
INSERT INTO academic_work_plan."Permiso" VALUES ('b1803084-0e92-4ac7-ac34-e936c792186e', 'pta.backoffice.auditoria', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.948');
INSERT INTO academic_work_plan."Permiso" VALUES ('e60dfc4b-ea43-4ca1-a511-fe63e2de9371', 'pta.backoffice.cronograma', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.951');
INSERT INTO academic_work_plan."Permiso" VALUES ('0a91717a-478f-4a49-8991-8a493388244a', 'pta.backoffice.notificaciones_config', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.954');
INSERT INTO academic_work_plan."Permiso" VALUES ('9224b3fa-2a2b-46a6-bfa0-bbcc536b6617', 'pta.backoffice.simulacion_rol', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.956');
INSERT INTO academic_work_plan."Permiso" VALUES ('a71a7818-c512-4af1-aae9-cb26293dbeaf', 'pta.backoffice.sync_config', 'ACCESS', 'Permiso', '2026-04-04 13:14:04.959');


--
-- Data for Name: Persona; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."Persona" VALUES ('7e4500a1-f831-4f36-b7d7-d8d4141ba917', '6d411d0f-74b9-4bc0-ae15-73c753cb0dcb', '1000473208', 'CC', '3006553938', NULL, '2026-03-27 13:26:28.388', '2026-03-27 13:26:28.388', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('d50d25db-7812-44f4-8902-2fc75c53d3b0', 'ffedf106-7837-457a-bfeb-3e3cf47328c2', '1000683946', 'CC', '30015912', NULL, '2026-03-27 13:26:28.398', '2026-03-27 13:26:28.398', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('713308d4-921b-4526-8ba0-276969120754', '0235be4e-9c05-4e55-8115-9bf06ed03afb', '100042499', 'CC', '3007446030', NULL, '2026-03-27 13:26:28.404', '2026-03-27 13:26:28.404', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('090cfac2-46f0-4d35-b86d-6b27c7e4aace', 'd3d84d3c-226a-47ea-8086-86636232c698', '1000651886', 'CC', '3008374815', NULL, '2026-03-27 13:26:28.412', '2026-03-27 13:26:28.412', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('187f32db-5cf6-4771-aa9e-4f8ccf17b8de', '6d2f4278-979b-4c66-a14f-fbdbb8f7f27f', '1000439236', 'CC', '3005286540', NULL, '2026-03-31 00:50:28.357', '2026-03-31 00:50:28.357', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f40bed8e-597b-4b66-9bd9-75a6123b80db', 'e53b58a0-df58-432a-af93-596ca9b19b0d', '80172927', 'CC', '3153800988', 'Sede Principal', '2026-03-31 18:19:06.59', '2026-04-01 02:44:30.308', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('e3a06490-0a57-42e2-968a-6e2fcb7046e0', '0f771888-1b65-40d5-b89f-bc7599a86361', '1000268752', 'CC', '3007810960', NULL, '2026-03-31 00:55:16.401', '2026-03-31 00:55:16.401', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('02446e79-3071-409c-b2bf-7f53e6403a7e', '809a97a1-95de-4065-97c4-63a4715861bb', '90000000', 'CC', '3005550000', NULL, '2026-03-31 19:29:39.424', '2026-03-31 19:29:39.424', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('0727262e-8435-4230-ad55-79539bf2b9cd', '5ec7977f-2b59-434f-95c6-580bd80a4a34', '90010001', 'CC', '3005550001', NULL, '2026-03-31 19:29:39.438', '2026-03-31 19:29:39.438', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('52543b09-4b64-410f-9530-e2907b448080', '027caebd-dadb-481b-98ac-cb2faa13177f', '90020002', 'CC', '3005550002', NULL, '2026-03-31 19:29:39.453', '2026-03-31 19:29:39.453', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a08f7596-d928-4746-a2b3-c2b0729a1cfc', '84a85d7b-b25f-4232-b8fa-3530b74adf77', '90030003', 'CC', '3005550003', NULL, '2026-03-31 19:29:39.462', '2026-03-31 19:29:39.462', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('1f62fd97-2d38-46f9-8069-70efc9cde5cc', '59d135fd-9648-48b3-b3e1-37b9d822efc3', '90040004', 'CC', '3005550004', NULL, '2026-03-31 19:29:39.47', '2026-03-31 19:29:39.47', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('d5ed4395-2c5e-42fb-93d8-ef6b7f42ac55', '200285aa-e22f-4a2b-a6ad-b875de4d7add', '90050005', 'CC', '3005550005', NULL, '2026-03-31 19:29:39.489', '2026-03-31 19:29:39.489', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('08f1f4fa-e68a-4fde-8282-63c733b8525c', 'ae56d58c-5077-4744-bc1e-7bd20ce4fbbf', '90060006', 'CC', '3005550006', NULL, '2026-03-31 19:29:39.497', '2026-03-31 19:29:39.497', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('36c81744-c8f8-4cc4-bbdb-ac39c90a27bf', 'af729b37-e704-444f-a6cf-a46e32d8b461', '1000864088', 'CC', '3002772947', NULL, '2026-03-31 00:59:26.297', '2026-03-31 00:59:26.297', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('89767cb5-402c-4c1f-a992-cf3991b86a3c', '4939e095-e40c-4dc8-8d13-3700e66bf857', '479678', 'CC', '6671750', 'Meta', '2026-03-27 11:44:40.244', '2026-03-27 11:44:40.244', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('1afeb586-20db-41a5-b479-b6e6d790d13a', '7cd89a78-09d9-4ba4-b91e-eddce7eea0b1', '19195704', 'CC', '3106791787 - 6723168', 'Sede Central', '2026-03-27 11:44:40.256', '2026-03-27 11:44:40.256', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('76e853c5-43c3-46e8-b6d5-fade54b86b4e', '24a58417-6a63-465d-add9-a1d5c5240a30', '91350046', 'CC', '3196889781', 'Sede Central', '2026-03-27 11:44:40.266', '2026-03-27 11:44:40.266', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('5ae49041-ab60-423f-bcdd-e3c92eaa7b74', '0fb161dc-861d-4bb2-8ce2-9c43173b963f', '11186033', 'CC', '3103708639', 'Sede Central', '2026-03-27 11:44:40.273', '2026-03-27 11:44:40.273', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('6c3fbc2e-a340-4c6c-8713-b2504a61724a', '700e56d6-b96c-4d52-a040-43cb85d3863a', '88034156', 'CC', '3102606394', 'Meta', '2026-03-27 11:44:40.28', '2026-03-27 11:44:40.28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('d0485c84-090f-436d-a0e4-1f10a16c5982', '697353bf-72ea-4a2a-a975-2b69443a288f', '37291100', 'CC', '3114473921', 'Sede Central', '2026-03-27 11:44:40.289', '2026-03-27 11:44:40.289', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a4a05ca0-92ad-404c-8984-4fb4804f341e', 'a9c1f219-99cf-4e9e-9b4e-d8ea08f5dc2b', '14224261', 'CC', '3166867322', 'Tolima', '2026-03-27 11:44:40.294', '2026-03-27 11:44:40.294', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('bb0fa654-b47e-4027-8d4a-702ea16f68e4', '2304e59d-b3fd-4260-8db3-751ea0ae53a6', '12630026', 'CC', '3002858574', 'Atlántico', '2026-03-27 11:44:40.299', '2026-03-27 11:44:40.299', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b5f76552-b139-498e-a7ab-15ccbd59d344', '3bf36118-d597-40d5-8aa0-fb06a256c3a5', '28556463', 'CC', '5015746', 'Nariño', '2026-03-27 11:44:40.305', '2026-03-27 11:44:40.305', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c0e9b107-0d5d-40bd-bad6-f3f47af56ea3', '7ad2fd15-f8c7-4190-bc13-739189f8c019', '41689873', 'CC', '3153645979', 'Sede Central', '2026-03-27 11:44:40.31', '2026-03-27 11:44:40.31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('2ae67770-3d2b-4c99-85d3-f89529815e81', 'e1f3408f-7254-492a-8f08-9338c25b1449', '1077862966', 'CC', '3142006576', 'Huila', '2026-03-27 11:44:40.316', '2026-03-27 11:44:40.316', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('d73e4f73-d548-4ccb-90a1-583f537d1f65', '264d09bb-d628-44e6-a24b-2b0d5188a9c6', '3228513', 'CC', '3002234735', 'Sede Central', '2026-03-27 11:44:40.321', '2026-03-27 11:44:40.321', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('0e75092b-11cb-4df9-9a4a-f6af01cdd9cb', '0cb75bb2-54ea-48a6-9a49-3697d046ff2e', '16710079', 'CC', '3165855332', 'Sede Central', '2026-03-27 11:44:40.326', '2026-03-27 11:44:40.326', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('5a1d387a-540e-4958-bbc0-40dc16a4dd2b', '2a6f4f4c-4442-49f3-9778-511891570680', '80830838', 'CC', '3203066989', 'Cundinamarca', '2026-03-27 11:44:40.332', '2026-03-27 11:44:40.332', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('1e819bcd-5ee1-4966-90a0-857d164e8d12', '3982515d-4e1f-436d-9c68-b237b3b4e205', '52423939', 'CC', '3125774913', 'Cundinamarca', '2026-03-27 11:44:40.338', '2026-03-27 11:44:40.338', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b2bb0151-b229-4eac-95a5-f7635ea9493d', 'def49971-2f2e-4a0a-ab63-cc551822249b', '8702503', 'CC', '3008764570', 'Huila', '2026-03-27 11:44:40.344', '2026-03-27 11:44:40.344', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('e1034723-ebb5-4c94-b1d0-b8ab3bb3d23e', '69977ddf-1156-4666-980b-42e1a8c464c9', '77021522', 'CC', '3017572429', 'Atlántico', '2026-03-27 11:44:40.349', '2026-03-27 11:44:40.349', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b937612f-1048-435c-b9d6-9243f6f640fd', '03353ae8-80e1-45e0-858d-f5b2b007aeb1', '7712669', 'CC', '3166965760', 'Caldas', '2026-03-27 11:44:40.356', '2026-03-27 11:44:40.356', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ad7d911a-648d-4a5a-9db2-e0089e67131b', 'a20d2fa9-d094-48ad-a2f5-a31cd42c6e07', '59831050', 'CC', '3147778171', 'Nariño', '2026-03-27 11:44:40.361', '2026-03-27 11:44:40.361', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('78e5d74d-cbf7-4e1d-b2f8-81577edbef90', 'bbe48038-a205-40b4-8d58-2d15050804ec', '70081594', 'CC', '3104485185', 'Antioquia', '2026-03-27 11:44:40.367', '2026-03-27 11:44:40.367', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('78acddad-d796-4ee6-bf61-12ea2f264efa', '54f05ee4-39c7-417c-bd14-ff2b6c884114', '71696186', 'CC', '604-6714142', 'Chocó', '2026-03-27 11:44:40.373', '2026-03-27 11:44:40.373', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('1ab69561-c144-41f6-8287-4cf20c57b153', '86a3f245-4090-4921-9b08-35b12489bd4a', '1063720504', 'CC', '4 7950528 - 3103572686', 'Bolívar', '2026-03-27 11:44:40.379', '2026-03-27 11:44:40.379', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('e530f9a8-3506-4666-bb97-3bd72740acb2', '62d8667e-3e27-45d2-aa8c-790e00e21a4d', '1075211206', 'CC', '3107885850', 'Huila', '2026-03-27 11:44:40.385', '2026-03-27 11:44:40.385', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('38bfb836-b0dd-4d69-b4b6-544c3390f904', 'e9967a69-b9c8-480c-9941-98f824d0e472', '93398738', 'CC', '3162429010', 'Tolima', '2026-03-27 11:44:40.39', '2026-03-27 11:44:40.39', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('590b300a-a584-4939-a78a-b8dc85a1e3cf', 'ced26d4c-f34b-4a72-99b4-fd8ef2439bf1', '79579074', 'CC', '3206199601', 'Bolívar', '2026-03-27 11:44:40.395', '2026-03-27 11:44:40.395', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('7850e4ad-e701-47c8-be57-2c974e40259d', '6fbf6c60-9506-45bd-b820-a967f3b36d83', '1061712832', 'CC', '3167376563', 'Cauca', '2026-03-27 11:44:40.4', '2026-03-27 11:44:40.4', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f22dbac3-6d8c-4ada-984f-b64771fb62e9', '2dda6299-b6f2-4ede-8b87-d497dc248ce0', '19386703', 'CC', '3158985945', 'Tolima', '2026-03-27 11:44:40.406', '2026-03-27 11:44:40.406', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('da2336f7-261e-48e7-9615-d79313e585dd', '4812a2ce-b8e6-476e-badc-2e95ccc26d4c', '18522517', 'CC', '6063309291 - 3166180380', 'Caldas', '2026-03-27 11:44:40.413', '2026-03-27 11:44:40.413', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('82f2e6a3-86dc-4276-9258-b9e64e774d9e', '15e2eadf-6a55-4885-9860-8e6e2e1ae6dd', '73578918', 'CC', '3205645795', 'Bolívar', '2026-03-27 11:44:40.418', '2026-03-27 11:44:40.418', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('026f1dea-a0e6-422f-be37-88cccb7d4084', '619c0c18-5554-453d-bb3c-3858eb601757', '1061748671', 'CC', '602-8342119', 'Cauca', '2026-03-27 11:44:40.423', '2026-03-27 11:44:40.423', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('64f2b1d1-7c44-4f01-bb51-c62fd244a134', '68880c27-960f-4ea5-b7a3-4b57d966c13b', '10276049', 'CC', '606-8886127', 'Caldas', '2026-03-27 11:44:40.429', '2026-03-27 11:44:40.429', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('cb5652cb-cd6a-4c2f-8d7e-4ce8b362ba18', '15f2918e-3840-4b8a-a9e4-1fb9a09cc349', '1110459627', 'CC', '3214052154', 'Tolima', '2026-03-27 11:44:40.435', '2026-03-27 11:44:40.435', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c686223b-74e5-4992-85e8-342c9d607ae2', 'd1d3101a-da8a-43f0-ba08-072f53646f77', '16754844', 'CC', '3154814995', 'Valle', '2026-03-27 11:44:40.439', '2026-03-27 11:44:40.439', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('d7b2a0d8-ff59-437a-9c06-c08e13a94e58', '6f7a87bb-34d4-4740-a1a6-1cf07c9eca28', '74182096', 'CC', '3142941253 - 3142941253', 'Cundinamarca', '2026-03-27 11:44:40.445', '2026-03-27 11:44:40.445', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('11230545-aabc-4891-bb6d-22e60231d7b3', '1578978b-ced0-4290-be5c-c1e56f015275', '19241494', 'CC', '3157975746', 'Sede Central', '2026-03-27 11:44:40.45', '2026-03-27 11:44:40.45', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('65064788-054e-4005-aa1c-52004dbde891', '78ee3ac9-e3db-4932-bfd1-625ca7e74a33', '30230914', 'CC', '', 'Caldas', '2026-03-27 11:44:40.454', '2026-03-27 11:44:40.454', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('40971ede-34e8-4aec-962d-095e458c14e3', '0d0aff4c-0ac7-4567-9c8b-e41b85425643', '9193635', 'CC', '3157340705', 'Bolívar', '2026-03-27 11:44:40.46', '2026-03-27 11:44:40.46', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('4e9a5bd2-fc22-47ff-a699-1119e9b31107', 'de664374-ab7f-4fef-a1fd-d2dfbf4b397f', '9397297', 'CC', '3176451671', 'Tolima', '2026-03-27 11:44:40.465', '2026-03-27 11:44:40.465', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a1205d98-9dd0-40da-bab0-2387787e5fab', '85251896-32e0-4229-bc69-c975e42b5bf4', '79838783', 'CC', '3115881350', 'Meta', '2026-03-27 11:44:40.47', '2026-03-27 11:44:40.47', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('22c8ff96-4d5d-4f42-9b6a-00d441a49a47', 'f618dacb-6f4e-4950-b221-80801c014f08', '10296336', 'CC', '3104567844', 'Valle', '2026-03-27 11:44:40.475', '2026-03-27 11:44:40.475', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('8eba3099-66f6-4f09-b839-f87947c7afb4', '70f40b66-e543-495a-89eb-7050d48ac127', '4615873', 'CC', '3223065118', 'Cauca', '2026-03-27 11:44:40.48', '2026-03-27 11:44:40.48', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('1bf011dc-1049-4177-8c84-31a4c7f2bc95', '3d0990dd-3679-4625-bef1-31c21c4987ff', '49729646', 'CC', '3017570141', 'Atlántico', '2026-03-27 11:44:40.487', '2026-03-27 11:44:40.487', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f6be6dae-834e-4ccd-9930-cc181c8df520', '3691ee52-7657-4e53-9745-2f500efa4f14', '30318787', 'CC', '3103758925', 'Caldas', '2026-03-27 11:44:40.492', '2026-03-27 11:44:40.492', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f99c5af4-14ad-4d0b-a01d-c76926c418b7', '18749f7c-c357-4cfe-8057-46f296a0974a', '23622695', 'CC', '3138329647', 'Meta', '2026-03-27 11:44:40.496', '2026-03-27 11:44:40.496', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('36e6be44-9086-45c6-8a8c-e9927c640e85', '5e759aa1-d742-42ef-9a6d-3f181a2245e9', '86075572', 'CC', '3106967477', 'Meta', '2026-03-27 11:44:40.5', '2026-03-27 11:44:40.5', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c0def6b8-ac1b-4a05-9c4b-bb516d50c5c3', '5990c94b-67b6-4d81-baaa-980d7aa9392a', '80779449', 'CC', '3112291203', 'Meta', '2026-03-27 11:44:40.506', '2026-03-27 11:44:40.506', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b37f8cdc-b3f2-45a6-9f98-d42c83960faf', '2e840f18-d534-4ae1-8fc1-de49072af8c9', '1085288611', 'CC', '', 'Nariño', '2026-03-27 11:44:40.511', '2026-03-27 11:44:40.511', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('4c707726-b263-4e6e-ac14-2ff1b149e8b3', 'f58ab47a-6234-43ea-927f-05746337d396', '1053772989', 'CC', '', 'Sede Central', '2026-03-27 11:44:40.516', '2026-03-27 11:44:40.516', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('76c5ccc9-fcac-4e37-b48e-6adb17fda918', 'ad03f36a-0694-433c-87d0-76a70133779e', '11447367', 'CC', '3197567257', 'Sede Central', '2026-03-27 11:44:40.522', '2026-03-27 11:44:40.522', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ff83e2f6-353e-488e-ae38-36c2ff8885f3', '39f67b82-7e52-462d-9f3b-70f33883f20f', '79706077', 'CC', '3125274514', 'Meta', '2026-03-27 11:44:40.527', '2026-03-27 11:44:40.527', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('0050bccd-b22d-4efa-b4eb-e9e40aa04ebe', 'e1f8cf29-dcf5-49e6-8d05-38a36ddf089d', '79041880', 'CC', '', 'Sede Central', '2026-03-27 11:44:40.533', '2026-03-27 11:44:40.533', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a52a3ba4-4813-40c5-9e58-4c61e4985e77', 'cd76076a-3b29-40d7-9a01-206f4e514568', '1023864005', 'CC', '3152487244', 'Antioquia', '2026-03-27 11:44:40.538', '2026-03-27 11:44:40.538', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('6ccf5c7a-9f77-49da-b073-2971f7f0287b', '30337b81-1b8b-448e-a2d1-762463230770', '11802595', 'CC', '3127258856', 'Chocó', '2026-03-27 11:44:40.543', '2026-03-27 11:44:40.543', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('922df5f1-44df-4250-8ed2-9e9539a54c0a', '3df0437e-daf4-4c44-9b85-5ff8c62b305a', '30338632', 'CC', '', 'Risaralda', '2026-03-27 11:44:40.548', '2026-03-27 11:44:40.548', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('7a7795d9-2878-4f6d-a08a-2e3ca9114b0e', 'df6e663a-b0d4-4340-a932-30c044f02fc7', '40386883', 'CC', '3005706536', 'Cundinamarca', '2026-03-27 11:44:40.553', '2026-03-27 11:44:40.553', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('97aec771-7098-4c12-8c79-6d3ab676b410', '2169218f-95c1-40e5-a02b-35350425ed2a', '76318005', 'CC', '', 'Sede Central', '2026-03-27 11:44:40.558', '2026-03-27 11:44:40.558', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b2bac93f-873c-4c8a-9a0e-2492e2f21bc8', 'f426ef90-b054-44cf-8eb0-a86b4293ae80', '7732011', 'CC', '3212248715', 'Huila', '2026-03-27 11:44:40.563', '2026-03-27 11:44:40.563', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('db0b3f7d-7f11-47b2-b3b4-d81057fc0f48', '68ce2ca7-08a7-4a74-89cf-eeab0a4d2d67', '1089458130', 'CC', '3013314271', 'Antioquia', '2026-03-27 11:44:40.567', '2026-03-27 11:44:40.567', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('2045b1cc-5059-406c-9e86-a511ba2746f4', 'bd18974a-f880-409a-9f43-c2e09b551dfd', '19486550', 'CC', '3108736889', 'Sede Central', '2026-03-27 11:44:40.572', '2026-03-27 11:44:40.572', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('497eecec-fa0e-4c14-824a-a272a430bbe4', '7fb62874-00ca-4625-82bc-eb19e7665081', '91068392', 'CC', '3153728092', 'Norte de Santander', '2026-03-27 11:44:40.578', '2026-03-27 11:44:40.578', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('03dca840-af27-41ef-98bb-dc89aedccf48', '0b3b49ff-a97f-4185-8ac2-5086d7c06220', '7220912', 'CC', '3003248408', 'Sede Central', '2026-03-27 11:44:40.583', '2026-03-27 11:44:40.583', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('3b14bb7f-644f-4725-b99d-2fd40a198e81', '564ffd85-0092-4db5-a49f-76f07aac12ba', '19301408', 'CC', '3138516475', 'Sede Central', '2026-03-27 11:44:40.589', '2026-03-27 11:44:40.589', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ff417a4f-c491-4ded-95c0-1e7be0817e70', 'bd81ba90-804a-471b-aec0-fbf3ce2a791b', '9773378', 'CC', '3155145124', 'Sede Central', '2026-03-27 11:44:40.596', '2026-03-27 11:44:40.596', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('4aaa3e85-e02a-4b11-81ce-74ea0cb532fb', '92be8ea8-9b50-4274-8125-380252234393', '98383203', 'CC', '3173776655', 'Nariño', '2026-03-27 11:44:40.604', '2026-03-27 11:44:40.604', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c86b5fcf-01c9-48cc-87ee-c2f5b298f338', '4a44ceca-1bc4-434f-8f45-8c8a37e505e2', '79964415', 'CC', '3134316969', 'Atlántico', '2026-03-27 11:44:40.609', '2026-03-27 11:44:40.609', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('04fd58c9-d750-4749-9f31-448b9ede6b06', 'd2e1d843-3791-47eb-a101-c24cd76ade84', '79488901', 'CC', '3174318658', 'Cundinamarca', '2026-03-27 11:44:40.614', '2026-03-27 11:44:40.614', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('5a1737ff-3478-40fd-90ec-4520de7a3e98', '93d023ac-bcb3-4808-a2b7-ce3e7a16ac24', '88211500', 'CC', '3159273960', 'Risaralda', '2026-03-27 11:44:40.619', '2026-03-27 11:44:40.619', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ee098e6e-214b-401b-a44f-a96cb1f6b2ea', '9288a6b3-f160-4297-b57e-0162c15fe7a6', '51569906', 'CC', '3143878120', 'Sede Central', '2026-03-27 11:44:40.624', '2026-03-27 11:44:40.624', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('beb4fbbe-d3e8-449e-b247-de22c5080629', '4a8058d9-30c6-4181-b5de-3cb3f0126d74', '87718683', 'CC', '3155619052', 'Nariño', '2026-03-27 11:44:40.629', '2026-03-27 11:44:40.629', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('43c32b53-560e-4699-8f4f-9522088ea756', '7c03c6f4-7d01-4ebc-be75-09bdaa1b0870', '63445154', 'CC', '3102104824', 'Norte de Santander', '2026-03-27 11:44:40.634', '2026-03-27 11:44:40.634', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a3439c66-fbcd-4105-b140-b1a7c89889c0', 'd4468e98-c7b3-4fdd-8104-3e69360e0475', '38254438', 'CC', '3177886681', 'Tolima', '2026-03-27 11:44:40.638', '2026-03-27 11:44:40.638', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('e58ef382-d828-4383-bb7f-1c1956f7a1b4', '53832af7-5a89-4014-a042-ce1b18ee16e0', '1061709480', 'CC', '3232910485', 'Cauca', '2026-03-27 11:44:40.643', '2026-03-27 11:44:40.643', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('928c733a-b636-472f-921a-698e01f4fd1c', '2503d6db-d45a-4dfa-bf30-6036c906b621', '1049628159', 'CC', '', 'Boyacá', '2026-03-27 11:44:40.648', '2026-03-27 11:44:40.648', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('58034ad5-118e-4627-9917-c0a6c1c917e4', 'f60d0be5-96b3-4282-92ab-4091c75a4bcb', '73087903', 'CC', '3108191671 - 3108165732 - 2821778', 'Sede Central', '2026-03-27 11:44:40.653', '2026-03-27 11:44:40.653', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('460f161c-6eab-4a58-8e07-41dc8c85e934', '35fc5e75-a59e-4594-b950-d091add0732e', '19327342', 'CC', '3133193777', 'Meta', '2026-03-27 11:44:40.658', '2026-03-27 11:44:40.658', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('292bd213-1359-40a3-960a-f825881fe551', 'a2c77f1c-23cc-4a2a-b90c-b4cc196c4963', '10089129', 'CC', '3116356609', 'Risaralda', '2026-03-27 11:44:40.663', '2026-03-27 11:44:40.663', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('9381e496-b4f0-4c22-84c6-d41e10b48d05', '7fffdfe1-3e1a-41c5-9793-5fe6595b1eca', '10566497', 'CC', '8335862', 'Cauca', '2026-03-27 11:44:40.668', '2026-03-27 11:44:40.668', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('135196aa-a596-4ce3-9459-2e09c66e551b', 'b3427551-1aa3-4aa8-86c2-b1081b37aae9', '79302631', 'CC', '', 'Sede Central', '2026-03-27 11:44:40.673', '2026-03-27 11:44:40.673', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c0fce145-7d7f-4f92-871d-f4336796d1a8', '4e7139ad-bf1c-40ca-91ed-16ab0027003d', '7722817', 'CC', '3202721587', 'Huila', '2026-03-27 11:44:40.679', '2026-03-27 11:44:40.679', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('7cde361c-93ae-4aa2-bfc1-8cf63a397a86', '1f1e5e9b-1112-40d9-bc82-5c37a0b78e3e', '12602296', 'CC', '', 'Atlántico', '2026-03-27 11:44:40.683', '2026-03-27 11:44:40.683', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ebeed9ed-ab12-4b3b-8dbf-5b7b020cdb31', '47df95ca-4100-4da8-b0d0-903d389a67ac', '79750179', 'CC', '3043434175', 'Sede Central', '2026-03-27 11:44:40.688', '2026-03-27 11:44:40.688', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('39aa5c10-e593-4432-9c82-ee14f02055bc', 'f9df7cee-b34a-4ec2-bd8b-885b24834877', '80219035', 'CC', '3016448557', 'Cauca', '2026-03-27 11:44:40.692', '2026-03-27 11:44:40.692', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('feb6d44a-e850-43ee-bc63-6fab7f55fd50', '72cec4de-e5ab-4eb6-ba43-58afc91f347d', '79205006', 'CC', '3133159014', 'Sede Central', '2026-03-27 11:44:40.697', '2026-03-27 11:44:40.697', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('80d8ac21-2ea5-47d0-842a-c39d2f7f7fde', '642862b1-0a24-4369-9368-d4bdb58e322c', '94375494', 'CC', '3137561923', 'Valle', '2026-03-27 11:44:40.702', '2026-03-27 11:44:40.702', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('9d99597b-aef5-4c66-927a-7e669c71d109', '42fcbae9-8680-44df-a311-227d501c5df4', '1077442112', 'CC', '3225840477', 'Antioquia', '2026-03-27 11:44:40.707', '2026-03-27 11:44:40.707', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('d7133bb9-cbc9-4353-b506-536092cd0181', '90d32d08-2f4a-4031-a2c6-2df1350be860', '40029903', 'CC', '3106288127', 'Boyacá', '2026-03-27 11:44:40.712', '2026-03-27 11:44:40.712', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ddd186df-bb69-4a89-ab53-908a02fcdea5', 'be277eed-1829-4683-a8a7-426029778b56', '79856565', 'CC', '3008322423', 'Cundinamarca', '2026-03-27 11:44:40.719', '2026-03-27 11:44:40.719', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a7f2e2e8-6201-4a3d-b1d5-465e1882aa78', '48d4acaf-4cb9-4818-a643-48428f17457d', '46382302', 'CC', '3112119992 - 7704442', 'Boyacá', '2026-03-27 11:44:40.725', '2026-03-27 11:44:40.725', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('7e45426a-c9f0-4d23-90dc-5f7be88c4d63', '939bee58-5eb9-4350-be65-205f2afc2ea5', '68297820', 'CC', '3102583746', 'Sede Central', '2026-03-27 11:44:40.73', '2026-03-27 11:44:40.73', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('63b112da-105f-4db9-9d4d-9da0813156f3', '25d85f9c-8b18-4339-ab22-a8e16f659fc8', '31873677', 'CC', '3204516192', 'Norte de Santander', '2026-03-27 11:44:40.735', '2026-03-27 11:44:40.735', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('2bc60755-5847-4d9e-83e5-a4074bc0d052', 'f87fea88-c2ba-498c-b6c2-9a8a114ff9f3', '71776491', 'CC', '5021010', 'Caldas', '2026-03-27 11:44:40.741', '2026-03-27 11:44:40.741', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('bffa578e-b295-4425-9d5a-e2ab7d37a4b0', 'd8f2a18c-7ad4-4c10-9342-d6ab92a93705', '1085247118', 'CC', '', 'Nariño', '2026-03-27 11:44:40.745', '2026-03-27 11:44:40.745', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('bf551e06-9f6f-45c9-aec4-c7615ad0b410', '5d6831ac-5837-4322-9020-7e6fb435c060', '98215205', 'CC', '3127442497', 'Nariño', '2026-03-27 11:44:40.75', '2026-03-27 11:44:40.75', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b4236e08-5269-411d-bbd0-1bed6e843f62', '479867eb-1430-490d-b78e-b4874b32df09', '79330878', 'CC', '3172670793', 'Sede Central', '2026-03-27 11:44:40.755', '2026-03-27 11:44:40.755', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a8f17f38-4a06-456b-ba33-1d36a94645de', '6ad22a77-8ff9-402e-bddf-09e9aa40df4f', '79669055', 'CC', '3122201323', 'Valle', '2026-03-27 11:44:40.761', '2026-03-27 11:44:40.761', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('72f89b73-9f95-4d56-b1b0-1c4aa3c9cce6', 'd0e2cc94-0c7f-4914-a061-ad68fcb0e781', '7226078', 'CC', '3118672914', 'Boyacá', '2026-03-27 11:44:40.766', '2026-03-27 11:44:40.766', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('71a26227-5a6d-466c-967d-601b053a6647', 'ce642f57-e36a-4d5d-997c-8a4b9f0bc2a5', '12190874', 'CC', '5726760', 'Sede Central', '2026-03-27 11:44:40.771', '2026-03-27 11:44:40.771', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('178cacd9-6074-414e-896e-440df254921d', '8d6d8380-b72d-4dcb-a6bd-b9cda9ff9426', '71799891', 'CC', '3016533049', 'Chocó', '2026-03-27 11:44:40.777', '2026-03-27 11:44:40.777', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('3ec1a2f9-99dc-4a31-bb02-dd447be15f24', '642c3b15-85fe-47d8-b7f9-d63e52468d22', '22435531', 'CC', '3867120', 'Atlántico', '2026-03-27 11:44:40.782', '2026-03-27 11:44:40.782', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('839e96d8-159d-43d6-ad8a-2cdc3a4bc9d9', 'c8b9bb4e-f08d-4322-9db8-eb1e3188d25d', '79964723', 'CC', '3112283125', 'Huila', '2026-03-27 11:44:40.786', '2026-03-27 11:44:40.786', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('79f55dc2-371c-4c7f-8ee8-44808d45a378', '7adfc256-5975-47dc-884f-a0d43532d016', '16625079', 'CC', '3155382735', 'Valle', '2026-03-27 11:44:40.791', '2026-03-27 11:44:40.791', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('8dbed962-e349-4ec5-9179-1363488e85bd', 'bc80bfc0-a6d4-45a1-8296-f2dce672d87a', '7305383', 'CC', '3112380686', 'Risaralda', '2026-03-27 11:44:40.796', '2026-03-27 11:44:40.796', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('26cdc7f9-0f92-4214-9327-ecdea53aeeac', '965a2949-0d36-49d1-b2be-f1d2a8aed9ce', '93397140', 'CC', '3183612227
3502449748', 'Tolima', '2026-03-27 11:44:40.8', '2026-03-27 11:44:40.8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('81d8e029-08c2-4c4d-8122-614e9c08ced5', 'a7f83e6e-8714-47b6-a14b-0ddcd20b29ff', '14256213', 'CC', '3175257125', 'Sede Central', '2026-03-27 11:44:40.805', '2026-03-27 11:44:40.805', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('af9a2ca8-5a48-478f-8abd-f17bed7a9b27', '01afe66c-0f76-468b-a18a-254509c485b5', '13834013', 'CC', '4059699/3377709', 'Sede Central', '2026-03-27 11:44:40.81', '2026-03-27 11:44:40.81', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('8e5defaa-87b4-448a-91a3-224f5ad232c1', '94c0ef9e-3b6c-4196-a2d0-e682b1a3acd2', '19104732', 'CC', '3002676823', 'Sede Central', '2026-03-27 11:44:40.815', '2026-03-27 11:44:40.815', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f20c1373-a4ad-4701-8897-f9bc1e5e746e', 'cc98f80d-cd90-42c7-a135-10965d826900', '19330343', 'CC', '3153348554', 'Sede Central', '2026-03-27 11:44:40.82', '2026-03-27 11:44:40.82', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('7e07d54a-b880-4a73-bd21-64d66035feb6', '35f3b575-b31d-4e0e-8cf7-d83328e44367', '1075214369', 'CC', '3203449271', 'Huila', '2026-03-27 11:44:40.825', '2026-03-27 11:44:40.825', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('7f2258ec-f62a-46e1-9f4d-05acf8c9a28d', '7942eb91-3c77-4f39-81d1-f1e9654a6ccd', '13886142', 'CC', '3005716681', 'Norte de Santander', '2026-03-27 11:44:40.83', '2026-03-27 11:44:40.83', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('61072a61-4501-4d21-9c21-0878928ea143', 'bd0adc81-9c0d-4dd2-afec-460deaaa77c1', '37898365', 'CC', '3103072593', 'Bolívar', '2026-03-27 11:44:40.835', '2026-03-27 11:44:40.835', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('75d0d8db-41ee-4ea9-97fd-8ffc54c0b02a', '3eb359d4-ee16-4f83-828e-ec597a4d0b51', '72158172', 'CC', '3014737387', 'Atlántico', '2026-03-27 11:44:40.841', '2026-03-27 11:44:40.841', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('55bb68f0-a34b-4f44-b821-1764959e08ac', '95b572ea-bd2c-4dd9-ab3f-1aef5ea1a42d', '79371959', 'CC', '3196431455', 'Risaralda', '2026-03-27 11:44:40.846', '2026-03-27 11:44:40.846', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f193734f-5f6e-44da-8add-e4d698e97c05', '5b52954a-09c0-426c-a913-5843c9de8256', '65630864', 'CC', '3123149131', 'Tolima', '2026-03-27 11:44:40.85', '2026-03-27 11:44:40.85', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('3813cc9c-c914-45a9-a336-9d3bcdc65595', '6d7cf66a-53bb-4ac4-b9b9-df53b53c7392', '52328009', 'CC', '3108547743', 'Boyacá', '2026-03-27 11:44:40.856', '2026-03-27 11:44:40.856', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('0ee7fedd-35fe-4352-b8a2-ea7a86315235', '7c31af1b-fcb2-444b-b1db-a7362c9064ec', '88241723', 'CC', '3102182665', 'Sede Central', '2026-03-27 11:44:40.862', '2026-03-27 11:44:40.862', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('218810fc-8a53-4d5d-82da-d4822f80c671', '8234aa34-a6bc-4cd8-bb97-69e0529020af', '19089076', 'CC', '3103416338', 'Sede Central', '2026-03-27 11:44:40.866', '2026-03-27 11:44:40.866', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('de21007b-7320-47bc-bfd3-97bd5fac82e1', '5a6d8798-fccc-425d-a0b8-797c7f0f5f19', '79875581', 'CC', '3187099760', 'Sede Central', '2026-03-27 11:44:40.871', '2026-03-27 11:44:40.871', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('e442c818-6abf-4a12-b36a-1c90618ad4b4', 'a325a2df-9f2a-4c73-9c4e-f80abfa26452', '79597535', 'CC', '3138048218 - 7140500', 'Sede Central', '2026-03-27 11:44:40.877', '2026-03-27 11:44:40.877', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('03bcc04c-7553-4ffb-87d6-e5da59ee4371', '96d7ada1-90d0-4c9c-a9bc-f23880d50088', '98195192', 'CC', '3146092068', 'Nariño', '2026-03-27 11:44:40.881', '2026-03-27 11:44:40.881', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('dda07397-3ec9-4f3c-b44f-51ba0eab860c', '122e2cc7-9778-4f58-a4b7-3fb3bb42d02b', '9865817', 'CC', '', 'Risaralda', '2026-03-27 11:44:40.887', '2026-03-27 11:44:40.887', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('08e39286-23b6-4312-aef7-d88647511e63', '12d8bc7a-5ab5-42f8-a47c-f0a530c43fbd', '98395604', 'CC', '3164840044', 'Nariño', '2026-03-27 11:44:40.894', '2026-03-27 11:44:40.894', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('951350f9-494d-4369-bcde-9d8db8c4b9e1', '110af442-5fd5-42a9-8c32-74eb21fe38f5', '11793482', 'CC', '3113405273', 'Chocó', '2026-03-27 11:44:40.9', '2026-03-27 11:44:40.9', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b5c540bb-9ec9-42a9-85cb-df15390debe7', 'ca20fe6a-e6c7-46e4-8747-6ca98d033faa', '1061691275', 'CC', '3122521099', 'Cauca', '2026-03-27 11:44:40.905', '2026-03-27 11:44:40.905', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('d5121a9d-ab44-4ab4-a78b-e3826690fabe', 'f27cadc7-4ddc-4747-b9aa-afac1bb7bd89', '8698150', 'CC', '3014588375', 'Atlántico', '2026-03-27 11:44:40.909', '2026-03-27 11:44:40.909', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a517d93e-a26a-4840-8678-dd1476cfb930', '12f76477-137b-44a7-a353-0e668009957c', '79892117', 'CC', '', 'Sede Central', '2026-03-27 11:44:40.915', '2026-03-27 11:44:40.915', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('4ac90b7a-a710-4b0e-80ca-dd9a6748829f', '794e71f6-bc82-4165-8b57-b34afa181aa6', '1143445332', 'CC', '', 'Huila', '2026-03-27 11:44:40.92', '2026-03-27 11:44:40.92', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('9f485e0a-b0ec-4d97-9969-e4c71c56c961', '1a024499-2555-4a25-ba01-13c8f4a5c89e', '1022940120', 'CC', '3114623474', 'Boyacá', '2026-03-27 11:44:40.925', '2026-03-27 11:44:40.925', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('4656dbcb-9715-4314-a813-567e2340715d', '520edf31-3a53-4f4e-bca4-e57cbc3af210', '13258907', 'CC', '3106073597', 'Sede Central', '2026-03-27 11:44:40.932', '2026-03-27 11:44:40.932', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('300e4bc3-abd1-4d57-b21f-efd09c3755e8', '8500e69b-e3ea-4a97-a42c-cc97a3fd0c9a', '79324341', 'CC', '3147293802 - 6017725448', 'Sede Central', '2026-03-27 11:44:40.938', '2026-03-27 11:44:40.938', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('34a17eeb-fd19-45b0-9765-ecebd3251fa2', '1fe0bea5-4f89-47c3-9f62-58f29f93666e', '19341050', 'CC', '3002168789 - 2214695', 'Sede Central', '2026-03-27 11:44:40.944', '2026-03-27 11:44:40.944', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ba34494b-5a68-41a4-a4b2-bd55b9d138df', '4351c418-6aaa-48cb-a055-20b5f49f3b57', '19769785', 'CC', '', 'Atlántico', '2026-03-27 11:44:40.949', '2026-03-27 11:44:40.949', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a02d1371-1d45-4c47-b4d1-b0ce6c13a444', '798fc8ab-af5c-4a32-9812-ce9211d85fbc', '13268293', 'CC', '3005622011', 'Sede Central', '2026-03-27 11:44:40.956', '2026-03-27 11:44:40.956', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('2f9b01ee-eaeb-4525-8f92-6f077ec10941', 'ad11652e-0dec-42b5-bc4d-50b72938fb66', '80030089', 'CC', '3102036877', 'Meta', '2026-03-27 11:44:40.963', '2026-03-27 11:44:40.963', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('db3ce1e4-df5c-4556-8867-1e0ab9d1c656', '73c4ec0f-1339-4174-85b6-8f32e7171c54', '10283577', 'CC', '606-8917831', 'Risaralda', '2026-03-27 11:44:40.969', '2026-03-27 11:44:40.969', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c44a6699-2911-45ac-8ebe-6503d04d68e7', '8d504780-7034-4b21-8826-c7a7acdcad1d', '17327246', 'CC', '3108623657', 'Meta', '2026-03-27 11:44:40.975', '2026-03-27 11:44:40.975', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('9ed8fcad-4531-4919-ab1b-e12f51cf3bb4', '8020cc22-9709-46b4-b3ce-5c0cf1e45fc5', '316647', 'CC', '3052984143', 'Sede Central', '2026-03-27 11:44:40.981', '2026-03-27 11:44:40.981', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('5c6f8191-2845-41c4-b5b3-2b55d3aa688f', '2fd80fa3-bcc9-4aa8-b4b9-011f601ef65d', '11385545', 'CC', '6018870626', 'Cundinamarca', '2026-03-27 11:44:40.988', '2026-03-27 11:44:40.988', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f85fb5e5-af38-40d6-ba37-29ba2124573c', '8f641b2f-d687-4ecf-8a1b-688dea70142f', '76317298', 'CC', '3146077694', 'Cauca', '2026-03-27 11:44:40.993', '2026-03-27 11:44:40.993', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('e097f9cb-5c70-47c7-8682-b4536b37ae93', '9bae06a0-1953-4e0a-af1b-1be20a6b43e2', '75092858', 'CC', '8700516 - 3117354726', 'Caldas', '2026-03-27 11:44:40.998', '2026-03-27 11:44:40.998', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('e59fd812-aa69-405a-b010-07c23a90871c', 'ee23a671-2d1f-483c-99b9-7d21907a5cde', '79906288', 'CC', '3017427156', 'Sede Central', '2026-03-27 11:44:41.003', '2026-03-27 11:44:41.003', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('3bddebb0-6355-472c-801e-4cc0df3bc577', '4a4118a3-ebff-4cd1-b9c5-8f01e54320a2', '72049822', 'CC', '3022945524 - 3022945524', 'Atlántico', '2026-03-27 11:44:41.008', '2026-03-27 11:44:41.008', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b4621252-3aa3-4bf9-b1ae-91d3cc3382d0', 'cf89873f-7660-451a-bca3-4472dabb8f8b', '88198032', 'CC', '3213509914', 'Sede Central', '2026-03-27 11:44:41.013', '2026-03-27 11:44:41.013', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('0e6a78df-d7ce-4109-8251-c9d5a8df2992', '8631bfdc-dcd5-48a4-a81b-8526ea8dad40', '93375013', 'CC', '3153527910', 'Tolima', '2026-03-27 11:44:41.018', '2026-03-27 11:44:41.018', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('289a296e-d6c7-4ecc-aa51-16f72a8d8f55', 'ca7491f2-020a-4a64-8251-83b13fe96ac3', '88154191', 'CC', '3123799593', 'Bolívar', '2026-03-27 11:44:41.023', '2026-03-27 11:44:41.023', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('6771bd28-df31-47a5-b291-069c99781d5c', 'f671ee07-52d9-40f0-89ec-bf02acfa3596', '9193183', 'CC', '6055723186 - 3183621248', 'Atlántico', '2026-03-27 11:44:41.029', '2026-03-27 11:44:41.029', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('177e1211-b74c-485d-a679-ea272966a2d8', '700af6dd-d322-48f7-95d1-16e801991117', '1026263695', 'CC', '3373701 - 3057065484', 'Antioquia', '2026-03-27 11:44:41.034', '2026-03-27 11:44:41.034', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('4be90b8f-8758-4e9d-96cc-cbd4361848ba', 'ba6dd614-90be-4d04-ba7d-1365257e71f1', '19219489', 'CC', '3108563858 - 4159837', 'Sede Central', '2026-03-27 11:44:41.039', '2026-03-27 11:44:41.039', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('84707cdd-96a6-4aa2-b168-3cb81e96b1a5', '4c15364c-297a-404a-9c4b-5286bb113b8e', '79945005', 'CC', '3227488093', 'Caldas', '2026-03-27 11:44:41.044', '2026-03-27 11:44:41.044', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c028824a-b3ab-4d42-a47c-0684c14fd735', '25e96179-3b21-495f-9cc2-4018332ffab6', '3152270', 'CC', '3183778990', 'Tolima', '2026-03-27 11:44:41.049', '2026-03-27 11:44:41.049', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ea82b18d-d043-48b2-b303-da376cc4b9c2', 'f641cbd2-61d3-4878-b53e-a3e87fcb068e', '79605682', 'CC', '3143510559', 'Sede Central', '2026-03-27 11:44:41.054', '2026-03-27 11:44:41.054', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('26b67704-8dcf-4e34-b2e7-95784a5a5589', '134807d7-12f8-4fb6-be83-5bdde72f3b1e', '12120326', 'CC', '3158205088', 'Huila', '2026-03-27 11:44:41.059', '2026-03-27 11:44:41.059', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c4d2e762-cea7-4a43-86ab-5cf957c49625', '3c28466d-e60d-4222-ad5f-ba371ea50a11', '1098609912', 'CC', '3118229064', 'Sede Central', '2026-03-27 11:44:41.065', '2026-03-27 11:44:41.065', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('6e8d0c57-9923-4dcf-966c-9d0fd806a6b4', 'd5af3eda-68a0-48fd-a65e-7bdc1bd36d39', '9312525', 'CC', '3154429818', 'Valle', '2026-03-27 11:44:41.071', '2026-03-27 11:44:41.071', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('53359cb7-b88d-4045-bd82-5fb17dd9ddb1', 'b9c1f001-1d7e-40f7-bb96-dbf47e34485d', '6774044', 'CC', '3102874577', 'Huila', '2026-03-27 11:44:41.076', '2026-03-27 11:44:41.076', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('915339bc-1e29-46f8-9f96-8de39e8b3b2e', '0188cdde-722c-4d4d-b490-7da2b134ca2f', '17349972', 'CC', '3202710153', 'Meta', '2026-03-27 11:44:41.081', '2026-03-27 11:44:41.081', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ea5559de-8808-4db1-9244-0b0d96c0712a', '6a38f0f7-5cc7-464f-a6d0-a289f47f0959', '16791253', 'CC', '', 'Valle', '2026-03-27 11:44:41.086', '2026-03-27 11:44:41.086', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('8d54c425-5672-455b-8b6d-89294ec3347a', '2ff5d566-ba29-411a-b0d7-5378630e5912', '10136330', 'CC', '3409420  PEREIRA ', 'Risaralda', '2026-03-27 11:44:41.091', '2026-03-27 11:44:41.091', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c55004f1-c07b-4da9-a388-0c85ce6b7119', 'a572cecd-ffc8-4d01-8a20-cd24fe0de50d', '8046106', 'CC', '3023209488', 'Antioquia', '2026-03-27 11:44:41.096', '2026-03-27 11:44:41.096', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('312969ed-25d4-42c4-a976-dc5003a5b48e', '4410c201-6ec6-4717-9c02-0efe84d0851c', '74085446', 'CC', '3008287876', 'Boyacá', '2026-03-27 11:44:41.102', '2026-03-27 11:44:41.102', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('283cf188-1d6c-4d1a-bcc4-bf71ac2553a3', '74331b1b-5a7f-4c71-a3e3-5526e892f2ea', '1075232907', 'CC', '', 'Huila', '2026-03-27 11:44:41.106', '2026-03-27 11:44:41.106', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('9a2c97e5-0590-441f-b983-2e07d5a070e8', '7e7167f0-2687-4cfa-bfcd-777a22f72f0a', '1057587472', 'CC', '3133369826', 'Boyacá', '2026-03-27 11:44:41.112', '2026-03-27 11:44:41.112', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('fe5a8a87-5ff5-430f-9649-7f61171a0464', '56b208c2-8bf2-40f7-8e43-eb409833e70c', '7179463', 'CC', '3114421730', 'Boyacá', '2026-03-27 11:44:41.116', '2026-03-27 11:44:41.116', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b89c58d1-f94c-4d9b-bea8-28c4deb282dd', 'fc36d9b8-c2fc-442e-8dcf-66ceedd59a84', '80422411', 'CC', '3005562737', 'Sede Central', '2026-03-27 11:44:41.12', '2026-03-27 11:44:41.12', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('fdff2b4c-f843-42e2-a8da-5bc5caf05ea5', '221727a4-3da2-4c32-8fa4-56954731c2e8', '93285031', 'CC', '3153605344', 'Tolima', '2026-03-27 11:44:41.125', '2026-03-27 11:44:41.125', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('23fe706c-d664-4af2-8931-69fa819d79b2', '829cbb78-d19f-4f0f-aebc-edcc51a39682', '17592981', 'CC', '3144046448', 'Sede Central', '2026-03-27 11:44:41.13', '2026-03-27 11:44:41.13', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('310ecef1-6912-436e-a284-fba41ffd5ed3', 'd7f3bc02-6999-4e35-bcf0-84004853c300', '52880332', 'CC', '3134168578', 'Sede Central', '2026-03-27 11:44:41.135', '2026-03-27 11:44:41.135', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('03929b5c-3d75-43a7-9c32-9ee0e52321b0', '4d941eea-122d-4e40-b705-68678c781fbd', '66986551', 'CC', '3164455715', 'Valle', '2026-03-27 11:44:41.139', '2026-03-27 11:44:41.139', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('00e4057f-39d7-4752-ac64-bef87f3b262f', 'b7e7ffb5-1c99-41f8-9b45-23e2f4d41fb4', '53045417', 'CC', '3134029232', 'Bolívar', '2026-03-27 11:44:41.143', '2026-03-27 11:44:41.143', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('2b619363-91c6-4469-9215-f20f7980fbe6', '4cfe90c3-4c60-4d47-9def-29b0a0dcd31f', '33377124', 'CC', '3153400566 - 6087402675', 'Boyacá', '2026-03-27 11:44:41.147', '2026-03-27 11:44:41.147', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('4c90f65a-3cbb-47d9-8cb6-d5c83be4b76e', 'b8e30621-2361-4ec4-bfea-7f9163c446cf', '79599981', 'CC', '3005533459', 'Cundinamarca', '2026-03-27 11:44:41.152', '2026-03-27 11:44:41.152', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('02772e69-2f8f-4bee-89b0-ed58c0c5f05c', 'da594af3-d86f-4500-ab6d-57c900dad99a', '1121883040', 'CC', '3115225102', 'Meta', '2026-03-27 11:44:41.157', '2026-03-27 11:44:41.157', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('58d24390-a1b5-4ede-8f23-f153b612a848', '668e2676-4563-4cee-9ac8-b736d707ce17', '7730723', 'CC', '6088741360', 'Huila', '2026-03-27 11:44:41.161', '2026-03-27 11:44:41.161', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('7be300ac-0532-468f-a31c-5f806d95c796', '73fde91b-c3f6-4fac-b94b-857b72434b62', '30357940', 'CC', '3147434610', 'Risaralda', '2026-03-27 11:44:41.165', '2026-03-27 11:44:41.165', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('2e862c2d-768a-4871-bc8f-7fdf232b8746', 'e043b713-f9f8-45ce-b1c1-9c6f2baa4789', '76295624', 'CC', 'Popayán Cauca 8333040 Ext. 110', 'Cauca', '2026-03-27 11:44:41.17', '2026-03-27 11:44:41.17', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('896ba81d-fe8a-409c-b643-5821e3a8da91', '3b3a02f8-67ad-41ad-a878-065d4a6ae762', '1023861638', 'CC', '3004607434', 'Sede Central', '2026-03-27 11:44:41.174', '2026-03-27 11:44:41.174', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b14e6c9b-66c7-4527-8a26-1e66e89d254f', '3217e256-c55b-42ee-b664-c73604e25235', '10232357', 'CC', '3155135988', 'Cundinamarca', '2026-03-27 11:44:41.179', '2026-03-27 11:44:41.179', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('8edbcb20-fb8a-4a6c-b947-717a6e28f837', 'd7b92c2e-1a27-4676-95fa-4aa9b72850c7', '75065064', 'CC', '3006113252', 'Caldas', '2026-03-27 11:44:41.184', '2026-03-27 11:44:41.184', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f1be1855-6b7f-458d-a1c6-75cb5eebc3e0', 'a3347397-7ee3-4a79-885f-9bdcac098e89', '19397995', 'CC', '3164662154', 'Sede Central', '2026-03-27 11:44:41.188', '2026-03-27 11:44:41.188', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('6b920c10-c017-4990-b9a3-96d5501b9614', '8dc43de1-5d44-4ab2-91a7-d1d8369f8b3f', '91228769', 'CC', '3108698087', 'Norte de Santander', '2026-03-27 11:44:41.193', '2026-03-27 11:44:41.193', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('38c5a6af-632f-455c-b6e7-1d53cf2aa485', '4fb59748-8d88-449a-b350-411ac60247e0', '7368608', 'CC', '3178439317', 'Valle', '2026-03-27 11:44:41.198', '2026-03-27 11:44:41.198', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('96314219-521c-4526-b3e2-4156cecf1168', '4fe67f09-76b4-4622-ae4b-016d783487d3', '13246085', 'CC', '3173796217', 'Sede Central', '2026-03-27 11:44:41.204', '2026-03-27 11:44:41.204', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('59530aef-45d1-45ef-acff-78c5ca36d5bd', '3e3445e6-024d-475b-a640-bc7b882a411d', '19472887', 'CC', '3166839303', 'Cundinamarca', '2026-03-27 11:44:41.21', '2026-03-27 11:44:41.21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('4533ad1a-c286-42c5-bcab-b1f5cd4c8199', 'e68f1bcc-0e20-4418-a67b-0670941a3605', '12126186', 'CC', '3138710054', 'Huila', '2026-03-27 11:44:41.215', '2026-03-27 11:44:41.215', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('5e66d8ae-9af2-4132-b7d2-84e44f08b1d1', '20f46d5b-affc-43f6-93db-cdae6c50c0c1', '79242932', 'CC', '3158786764 - 6898745', 'Sede Central', '2026-03-27 11:44:41.22', '2026-03-27 11:44:41.22', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a1ed71b3-f896-4600-93f3-8e030eb1cd02', '0652dfad-a3ce-4dfd-bb4f-993b5203c67f', '24623457', 'CC', '3102548810', 'Sede Central', '2026-03-27 11:44:41.225', '2026-03-27 11:44:41.225', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('6267ce7e-d484-456f-8c50-9c6b3f7945b6', '771c9889-899a-4642-9e14-44172fd60e89', '40008425', 'CC', '3004600217', 'Valle', '2026-03-27 11:44:41.23', '2026-03-27 11:44:41.23', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('28abf35b-5f00-4c10-9a3a-5b2a7bdea49f', '3357aead-5b8d-46bd-ad4c-a1946939102d', '52845106', 'CC', '3235793791', 'Antioquia', '2026-03-27 11:44:41.234', '2026-03-27 11:44:41.234', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('5d99dfed-325d-4c7f-8c7e-aeb92ef59823', '12d4d07b-8f4b-4831-a21b-45a8b35e7a37', '91177397', 'CC', '3133338044', 'Norte de Santander', '2026-03-27 11:44:41.239', '2026-03-27 11:44:41.239', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a4fa9eb3-08d1-45b0-b716-79bf8778bdb3', 'c5de86b2-5ba7-431c-8c8f-abb6de917627', '11793112', 'CC', '3128516730', 'Chocó', '2026-03-27 11:44:41.243', '2026-03-27 11:44:41.243', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('68b82d91-086d-45cb-83dc-ed4278d47aa5', '53268f4d-c452-4f3c-aef0-e49afae98ebc', '73103013', 'CC', '3014752233', 'Bolívar', '2026-03-27 11:44:41.247', '2026-03-27 11:44:41.247', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('0345895a-6c9e-4e63-872d-d87e6b8f8b8e', '0d044f42-1238-418b-8cf1-db959c49eec5', '79398773', 'CC', '3203184082', 'Sede Central', '2026-03-27 11:44:41.252', '2026-03-27 11:44:41.252', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('0a0dbe97-bcc6-4e95-bd8e-5799d765d7c1', 'a12f9eae-282a-4828-953b-81b224425a27', '45502716', 'CC', '3107213049', 'Bolívar', '2026-03-27 11:44:41.256', '2026-03-27 11:44:41.256', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('27dd223f-59d1-4423-a3de-17143b6bdda2', '0fd1fbe0-523d-4d4e-9e79-1a14bff1ba74', '52211659', 'CC', '3016443574', 'Atlántico', '2026-03-27 11:44:41.26', '2026-03-27 11:44:41.26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('180a6109-a5f0-4746-89ed-a347931a9bf2', '7b7b1725-14d1-4e2e-abe8-9b227e996b25', '41689316', 'CC', '3133014987', 'Sede Central', '2026-03-27 11:44:41.264', '2026-03-27 11:44:41.264', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('eb7ab2a3-9a14-4f9a-a21e-6c54ad441cba', '98e95cca-1d04-443b-9b3f-e56b49599abe', '1010179454', 'CC', '3172770274', 'Sede Central', '2026-03-27 11:44:41.269', '2026-03-27 11:44:41.269', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('27cf9e9f-d13c-4c87-b59a-bc8ff3be66cc', '2476b4b7-7bb2-4c1f-97cb-d276245ef44e', '52262920', 'CC', '3157972968', 'Huila', '2026-03-27 11:44:41.272', '2026-03-27 11:44:41.272', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('fc65d26e-549f-44e6-8173-68e6e51e8711', 'ee235e25-b79e-4892-ab65-4e896ee6be39', '38260151', 'CC', '3158489727', 'Tolima', '2026-03-27 11:44:41.276', '2026-03-27 11:44:41.276', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('49fbc622-b0b9-4bd5-88ad-32b07413e852', '524db7d3-ff80-4a65-b292-0674b1a5f5f9', '38249429', 'CC', '2647410-3157867254', 'Tolima', '2026-03-27 11:44:41.28', '2026-03-27 11:44:41.28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('fc4ff27d-22a4-412d-99d7-0e030f8b72a4', '7bd590b9-2dde-4e78-ab46-ad185a223a39', '25284513', 'CC', '3116449403', 'Cauca', '2026-03-27 11:44:41.284', '2026-03-27 11:44:41.284', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('6eae4cae-357c-4485-9e78-a07264727055', '3b928245-1484-484d-b6fb-3fb0c364a0bb', '37316122', 'CC', '3005777263', 'Norte de Santander', '2026-03-27 11:44:41.289', '2026-03-27 11:44:41.289', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('d00bf1ef-a28b-4753-9cab-0dfbe98ef56d', '6db6c8e4-fb9c-4779-8d8f-a5b5075a08d5', '16783250', 'CC', '', 'Atlántico', '2026-03-27 11:44:41.293', '2026-03-27 11:44:41.293', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c1314d2c-c2b0-4d48-998f-1ce68edcb763', 'a9483132-e406-496a-9f8c-821d81d1b07d', '85167270', 'CC', '', 'Sede Central', '2026-03-27 11:44:41.297', '2026-03-27 11:44:41.297', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('1915b28f-1921-44e2-ac2c-c9afaef9e702', 'bc49e6c6-ce96-4bb9-8526-55814887573d', '65745784', 'CC', '', 'Tolima', '2026-03-27 11:44:41.302', '2026-03-27 11:44:41.302', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('21752518-1d2f-4506-b686-6ea9c46e8f0c', '9c8ee192-97bd-40a4-a72f-e33ff250f9d8', '52083740', 'CC', '3203494006', 'Risaralda', '2026-03-27 11:44:41.307', '2026-03-27 11:44:41.307', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b1ac082e-806d-420e-b71b-aac40d6a4553', '92d809b8-819f-4909-83d6-4ff417e246f6', '32939973', 'CC', '3238470820', 'Bolívar', '2026-03-27 11:44:41.312', '2026-03-27 11:44:41.312', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('e20d04c8-c1c8-4058-9d0b-2a1dd91de5c8', '3a23577a-cb08-45c5-8846-df31452a98f9', '13536151', 'CC', '3172360969', 'Norte de Santander', '2026-03-27 11:44:41.317', '2026-03-27 11:44:41.317', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('362bfc91-b224-400f-9d57-d01de20fd7cb', 'b3934931-e20b-4403-9fb7-0e1b31d905df', '15372806', 'CC', '3008266929', 'Bolívar', '2026-03-27 11:44:41.321', '2026-03-27 11:44:41.321', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f9ac8aa1-a208-4fe3-a9fc-80eee917350f', '465f6a78-f9c3-4a2f-83b0-8b2c3eaa691e', '79360500', 'CC', '3172861709', 'Cundinamarca', '2026-03-27 11:44:41.326', '2026-03-27 11:44:41.326', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('9f00f67a-1d02-48ca-8957-e0cab6633213', '7decffd5-fa34-4656-92af-c7dfb167dfe1', '6280534', 'CC', '3005502152', 'Sede Central', '2026-03-27 11:44:41.33', '2026-03-27 11:44:41.33', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('dbe63a8f-3bec-4d49-b2f8-755f8daf91a2', 'a42a0a32-e7c1-4da7-acd4-d417aaed4bf4', '30736303', 'CC', '', 'Nariño', '2026-03-27 11:44:41.335', '2026-03-27 11:44:41.335', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('48009f5f-f147-4db6-ba9e-27b2ce152ece', 'a7c9fe2f-6611-4791-87f8-0891713b07be', '45506970', 'CC', '3143438582', 'Bolívar', '2026-03-27 11:44:41.339', '2026-03-27 11:44:41.339', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a6980a9c-afda-4cb1-a48a-3f4e444727bc', 'f5f32565-97a1-470e-a556-0cf7320c0c7c', '1102853186', 'CC', '3233621817', 'Atlántico', '2026-03-27 11:44:41.343', '2026-03-27 11:44:41.343', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('fd216357-0a06-4ddc-9e1d-19e3b5ea4f4e', '2c110578-f13a-4e68-9867-011f6a96f03d', '52337063', 'CC', '3108648846 - 4780627', 'Sede Central', '2026-03-27 11:44:41.347', '2026-03-27 11:44:41.347', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c3332cbd-2660-4e62-be77-90e7846cfb29', 'ebcffe83-44e5-405c-800e-b7ae02973a5c', '52717747', 'CC', '3014706865', 'Nariño', '2026-03-27 11:44:41.351', '2026-03-27 11:44:41.351', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('3cbaf3e0-17bd-4ace-88f2-9e96ab86be22', '2ec94bf1-edea-45c3-9ce0-a591623fab78', '51804365', 'CC', '3104384257', 'Risaralda', '2026-03-27 11:44:41.355', '2026-03-27 11:44:41.355', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('865d6329-42e3-461a-8d37-0dbaeba64d2c', '3e265cdc-78d7-4513-8439-8f768faabcdd', '7178602', 'CC', '3114424514', 'Boyacá', '2026-03-27 11:44:41.36', '2026-03-27 11:44:41.36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('e2c860fc-ae7f-449b-8f61-1a4fa89915c7', '2a4779ee-50a6-4606-901d-e36ffe5dabe7', '80271530', 'CC', '3204967570', 'Huila', '2026-03-27 11:44:41.364', '2026-03-27 11:44:41.364', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('39f2b349-59fe-413f-b312-9c6860b99a0f', '4b217f64-5835-4cf9-95b3-cbdf804b78d5', '87100191', 'CC', '3017833746', 'Nariño', '2026-03-27 11:44:41.367', '2026-03-27 11:44:41.367', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('6af91ece-e995-4879-aa27-3e17addc6184', '8b60a216-a308-4e8e-9918-e13608e5c4d9', '79122843', 'CC', '314 3327399', 'Cundinamarca', '2026-03-27 11:44:41.372', '2026-03-27 11:44:41.372', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('5892df9a-59e9-45fc-82ab-4d5c61b149b7', 'afd6ab3c-fa37-44ea-b975-dd2af6ed976d', '86044754', 'CC', '3112574480', 'Meta', '2026-03-27 11:44:41.377', '2026-03-27 11:44:41.377', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('389e5a27-e424-42ec-bcb5-32031b38e2f8', '1bc8d20c-47bf-4940-b1ee-15b1be41c954', '15030163', 'CC', '3145921291', 'Valle', '2026-03-27 11:44:41.381', '2026-03-27 11:44:41.381', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('82af1ea6-cb91-4295-b052-d35bf7dc0983', '289ab5e0-5679-437f-856b-929e142e812a', '14271071', 'CC', '3153201292', 'Tolima', '2026-03-27 11:44:41.386', '2026-03-27 11:44:41.386', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('cb75b7f9-87e9-4f4f-b2ad-89e6a8c99fb6', '52796294-d10c-4415-bfda-b27c8a89d0c0', '7226973', 'CC', '313 3701300', 'Boyacá', '2026-03-27 11:44:41.39', '2026-03-27 11:44:41.39', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('34a3d999-d91a-459c-87f6-fce06fd1e589', '2221842b-059f-475f-82e0-a15e6cbd6fb4', '4106512', 'CC', '3208409254', 'Cundinamarca', '2026-03-27 11:44:41.394', '2026-03-27 11:44:41.394', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ce6cbb1b-cd86-40db-b017-b22c84115def', 'a4db569e-c57a-49b9-85e8-4802b24761ab', '10292684', 'CC', '3152091387', 'Cauca', '2026-03-27 11:44:41.398', '2026-03-27 11:44:41.398', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('9feb7085-604a-460c-a38a-082587ea0227', '0f8d1baf-d579-4a64-aa8d-8501fd5e2a35', '14214454', 'CC', '3118042211', 'Tolima', '2026-03-27 11:44:41.402', '2026-03-27 11:44:41.402', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('ea0993eb-6c0a-432c-88ed-201095a0d0d1', 'e648356b-139c-4059-9324-387a07f9b6d2', '79259475', 'CC', '3183918243 - 6452018', 'Sede Central', '2026-03-27 11:44:41.407', '2026-03-27 11:44:41.407', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('e42f6ea0-95d8-4bb0-b343-db11d2baeefc', 'd23a21f9-126d-4e23-921d-2986ad0fa63f', '82389993', 'CC', '3212510802', 'Cundinamarca', '2026-03-27 11:44:41.411', '2026-03-27 11:44:41.411', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('cfea5933-2291-4961-ab60-1dc11642f947', 'fc4664b0-581b-4776-9f09-a7d2c044d020', '1026277351', 'CC', '3016825311', 'Sede Central', '2026-03-27 11:44:41.417', '2026-03-27 11:44:41.417', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f5b7479d-45cb-4cd2-937a-359ff3812b3a', 'cae6f865-4ded-4388-9db9-e327aca0a853', '19191503', 'CC', '3115526635', 'Cundinamarca', '2026-03-27 11:44:41.421', '2026-03-27 11:44:41.421', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('dab55c2e-517c-441e-a2a4-b6e8eac2a77c', '20ef6ff8-a5d9-4122-bca1-d7303f9af0c6', '92504501', 'CC', '3145629490', 'Bolívar', '2026-03-27 11:44:41.425', '2026-03-27 11:44:41.425', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('4cca1b00-c70d-40ba-866d-cc5b2df52a62', '5b146f09-674f-42d5-aad4-6dd593633fe8', '13009744', 'CC', '3113681395', 'Nariño', '2026-03-27 11:44:41.43', '2026-03-27 11:44:41.43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f1e69e3f-5c8d-4cd3-8b4c-f2f452f7b311', 'fb13d1f5-5398-4fea-b791-7a79d5f817b5', '1121825584', 'CC', '3138674198', 'Meta', '2026-03-27 11:44:41.434', '2026-03-27 11:44:41.434', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('fbe7bc22-f8d8-42cc-a27b-39e40b32a4aa', 'a9ee9262-ec50-4618-b447-53ec1cd27f4f', '10267732', 'CC', '', 'Risaralda', '2026-03-27 11:44:41.439', '2026-03-27 11:44:41.439', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('af4e2dc3-dc63-4207-baaf-cd627949a81e', '83dc95c8-9342-489b-bffa-efab3f6c341c', '98381113', 'CC', '3155370646', 'Nariño', '2026-03-27 11:44:41.444', '2026-03-27 11:44:41.444', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('eca6cfac-fc55-4acf-857a-6124aa3c8882', 'ef28fc92-68f6-43a8-8cf3-7aaec3219173', '13005558', 'CC', '3232857927', 'Nariño', '2026-03-27 11:44:41.448', '2026-03-27 11:44:41.448', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('6d3c8465-9a11-4ce3-8c66-c008673ac864', '113a8fb4-77ba-484f-a32f-3df4305ca08f', '12127386', 'CC', '3123773992', 'Huila', '2026-03-27 11:44:41.453', '2026-03-27 11:44:41.453', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('5cd8ae84-58ac-4eb7-92aa-8e5817663e15', '64b949f7-387a-4a49-9411-834575efc1cd', '10292766', 'CC', '3004677505', 'Cauca', '2026-03-27 11:44:41.457', '2026-03-27 11:44:41.457', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('9c1ce751-4a64-42a5-b716-337d0feec8d3', '6d57bc3a-ef31-4864-a6e6-d971ef3ff6ef', '42496905', 'CC', '3002298791', 'Atlántico', '2026-03-27 11:44:41.461', '2026-03-27 11:44:41.461', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('31b00b1a-13d1-48cd-8f4b-9cc925e772ca', '24970f27-530a-46ce-8d57-c3bb9b80b611', '10094605', 'CC', '3136490263', 'Risaralda', '2026-03-27 11:44:41.465', '2026-03-27 11:44:41.465', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('dfa311a8-a149-4c5b-99b3-ac55ec733bb2', '4bbe0277-a97f-4705-aedb-c954990e1a42', '52336004', 'CC', '3125664130', 'Sede Central', '2026-03-27 11:44:41.469', '2026-03-27 11:44:41.469', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('384961a1-7ce2-4e91-807c-7d1900c5d68f', '48ca7a58-1b27-4f35-a232-3943cd999a65', '79829053', 'CC', '3212037817', 'Tolima', '2026-03-27 11:44:41.473', '2026-03-27 11:44:41.473', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('41319690-e5d8-4773-abe9-c9d14e5f7b7d', 'f7ffe1ce-88b2-4fcb-b7b5-affd8bc6bf8b', '79905168', 'CC', '3053453401', 'Antioquia', '2026-03-27 11:44:41.477', '2026-03-27 11:44:41.477', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('7e9ea205-5d04-4afa-885d-d21384a73f70', 'f81ee9eb-3bf1-4439-926f-5be98fdd1d09', '1018446712', 'CC', '3192389951', 'Sede Central', '2026-03-27 11:44:41.481', '2026-03-27 11:44:41.481', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('cdacac1f-1f2b-4866-b9a7-324df5bbe389', '63e16e43-9f6b-44e3-aa58-fa51cc0d0b56', '33333865', 'CC', '', 'Atlántico', '2026-03-27 11:44:41.486', '2026-03-27 11:44:41.486', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c426fd74-4a4b-49da-b9d6-2dd318224cee', 'be2f9f82-018d-4e29-ab3c-4e7c172a9396', '75077672', 'CC', '8913328 - 3007777725', 'Caldas', '2026-03-27 11:44:41.49', '2026-03-27 11:44:41.49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('4ada26cb-c74b-40c6-8c8a-91a2b40af1fd', '9eb2628a-6b88-4924-a206-3d9d5c1c8eca', '19066675', 'CC', '3114162090', 'Atlántico', '2026-03-27 11:44:41.494', '2026-03-27 11:44:41.494', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('1e62791b-04eb-4d40-be3d-5dd0c7ec7aca', '9b69682c-9b74-434b-8747-6e3a3f86798c', '1094247389', 'CC', '3144340505', 'Meta', '2026-03-27 11:44:41.499', '2026-03-27 11:44:41.499', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c51c0c13-ee51-44b5-aaf8-101d91754a61', '9526d4c6-70df-4d28-be2a-d55d0159f4c2', '91216105', 'CC', '3102236564/3174283165', 'Sede Central', '2026-03-27 11:44:41.503', '2026-03-27 11:44:41.503', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('2169bdc2-2c0a-4e01-90b1-ed639bd2f55a', '2aa8fa3b-bb25-40fb-a2d0-7dcd31a86290', '34065777', 'CC', '3133904023', 'Risaralda', '2026-03-27 11:44:41.507', '2026-03-27 11:44:41.507', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('6d3b3113-820e-4016-8f79-47997fb22e07', '8be69db9-67b3-428d-b3ae-3f945bd44f2c', '1042434473', 'CC', '3122401953', 'Atlántico', '2026-03-27 11:44:41.512', '2026-03-27 11:44:41.512', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('5bd23955-4388-4f31-b47b-290cb6db320e', '195a776f-4014-44d7-ac1a-22b3b1a7ea96', '10306054', 'CC', '3216830197', 'Cauca', '2026-03-27 11:44:41.517', '2026-03-27 11:44:41.517', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('465b428a-91b6-4029-be6e-91af7cb3726e', '28a98646-8bef-45df-81e8-69de1300340b', '1143122185', 'CC', ' 6053971975 -3146536723', 'Atlántico', '2026-03-27 11:44:41.521', '2026-03-27 11:44:41.521', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('5c62edc9-900c-461c-81da-196052f34dce', '73342704-3157-4cbf-9523-7820f8cae956', '4080160', 'CC', '3102043227 - 6822525', 'Sede Central', '2026-03-27 11:44:41.525', '2026-03-27 11:44:41.525', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('eac56751-79b5-4d38-be9e-89a45920f73b', 'e24997e4-9cc9-484a-8a3f-338e8105d00b', '79388826', 'CC', '3002081090', 'Boyacá', '2026-03-27 11:44:41.529', '2026-03-27 11:44:41.529', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('cd68de03-d036-41b8-b351-21d23f3cbb71', 'aa4403d1-6da3-4dfa-a7d6-518c762ebd06', '80054833', 'CC', '', 'Chocó', '2026-03-27 11:44:41.533', '2026-03-27 11:44:41.533', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('2b68b6ac-a0f7-4188-9bbe-ed892fb62fa9', 'a76dc6c0-d390-4bab-b295-4791fd74d3c1', '17321741', 'CC', '3507948231 - 3192389773', 'Bolívar', '2026-03-27 11:44:41.537', '2026-03-27 11:44:41.537', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('b6d22915-b1d2-4363-9d8e-1588c9f98279', '670559d9-59f4-429e-930e-8f3b1ac5f196', '79627916', 'CC', '8721122', 'Huila', '2026-03-27 11:44:41.541', '2026-03-27 11:44:41.541', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('a7d2a7d0-a62b-45b2-a20a-767f32174b70', '4be5d3a6-e8e5-4b7d-8ebd-7e6696eb600f', '91473579', 'CC', '3045483403', 'Huila', '2026-03-27 11:44:41.545', '2026-03-27 11:44:41.545', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('f5a7c8b2-9990-491f-a7d2-42b0d2eceb83', '2452b74f-5bb0-40c2-ae69-7f345530e61a', '79137214', 'CC', '3007759778', 'Tolima', '2026-03-27 11:44:41.549', '2026-03-27 11:44:41.549', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('efb35da5-863e-4187-9a8c-4ec1eac13d35', 'c594a57d-18bf-45c5-a9d0-0d34177bef3a', '39750090', 'CC', '3006762233', 'Sede Central', '2026-03-27 11:44:41.553', '2026-03-27 11:44:41.553', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('bbcd1d01-9c0f-4159-8284-9f385061ac2b', 'f2312f82-8ca9-4c8c-aadf-ee9460e8504d', '77016614', 'CC', '3158938406', 'Atlántico', '2026-03-27 11:44:41.557', '2026-03-27 11:44:41.557', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO academic_work_plan."Persona" VALUES ('c9fba493-dd06-42b0-8047-db9cd1bf4a94', '41e4fd67-846b-4c09-bf7f-c264094e56f0', '1061725863', 'CC', '', 'Cauca', '2026-03-27 11:44:41.561', '2026-03-27 11:44:41.561', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: PersonaPrograma; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a90d6818-f1c3-4d48-a6b7-5964ff99c300', '7e4500a1-f831-4f36-b7d7-d8d4141ba917', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.899');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('87228e5d-d248-43c0-9d50-cdbf09562a36', '713308d4-921b-4526-8ba0-276969120754', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.906');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('007e7089-f2cb-4f25-a735-2723129f52ce', 'd50d25db-7812-44f4-8902-2fc75c53d3b0', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.909');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('25daa9a2-32c0-4423-9056-9294bb66edeb', '090cfac2-46f0-4d35-b86d-6b27c7e4aace', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.912');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('93c199ed-9990-41b8-8a6f-72eac37e708a', 'ba34494b-5a68-41a4-a4b2-bd55b9d138df', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.915');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('8d6dcc31-4225-42f2-97f7-3354e41b90a0', 'd5121a9d-ab44-4ab4-a78b-e3826690fabe', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.918');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c31f62fd-9d4e-4d9e-810c-c3af5a833e74', '3813cc9c-c914-45a9-a336-9d3bcdc65595', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.92');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('fadba71d-99a8-420b-b821-9044b104a348', '78e5d74d-cbf7-4e1d-b2f8-81577edbef90', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.922');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('8d15b93b-39ba-4630-b1b7-6eb7fbef47d8', '28abf35b-5f00-4c10-9a3a-5b2a7bdea49f', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.925');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('8ae6e782-cdf1-4ede-b7f5-a8a9d82dc0cd', '7cde361c-93ae-4aa2-bfc1-8cf63a397a86', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.927');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('415e861e-a369-47f8-b5f4-15675b7433f7', 'bbcd1d01-9c0f-4159-8284-9f385061ac2b', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.929');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('33b71eea-2fbc-4075-9689-f6e4beb3133d', 'b1ac082e-806d-420e-b71b-aac40d6a4553', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.932');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('13302515-2dd4-4310-b263-65065f26093f', '865d6329-42e3-461a-8d37-0dbaeba64d2c', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.935');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('56ec6b9f-71c7-4d2c-b291-76832704e32f', '928c733a-b636-472f-921a-698e01f4fd1c', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.936');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('742d43f9-ce65-420e-8e0a-970e12b16517', '5c6f8191-2845-41c4-b5b3-2b55d3aa688f', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.938');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('9285b54b-10ad-4bdb-9a6e-48c8b69b22b9', 'f9ac8aa1-a208-4fe3-a9fc-80eee917350f', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.939');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e9323783-dced-410b-ae7c-86ef72e94271', 'e42f6ea0-95d8-4bb0-b343-db11d2baeefc', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.941');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('3b0f7de2-7ff3-4ce2-aa07-fef02443c804', 'a7d2a7d0-a62b-45b2-a20a-767f32174b70', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.943');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('65a33f72-452c-4f2e-aceb-f3599ea29779', '6d3c8465-9a11-4ce3-8c66-c008673ac864', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.944');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a74d33f0-9379-4657-8386-8335c1cfc712', 'b6d22915-b1d2-4363-9d8e-1588c9f98279', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.946');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6a76c5cd-d81f-43de-81cb-ca7166e2a437', '2f9b01ee-eaeb-4525-8f92-6f077ec10941', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.948');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('044b6db5-a0cb-43bd-8ae6-415e9032999e', '89767cb5-402c-4c1f-a992-cf3991b86a3c', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.949');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d4e5b39a-5bd9-46cf-b16d-3a1c831cd7f9', 'f99c5af4-14ad-4d0b-a01d-c76926c418b7', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.951');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d8f0cd45-fd1e-42aa-a098-35f85a16e38a', 'dbe63a8f-3bec-4d49-b2f8-755f8daf91a2', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.952');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ffeff324-6279-40b0-b92f-6f444de6eb4a', 'bffa578e-b295-4425-9d5a-e2ab7d37a4b0', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.955');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d5fe061c-92b1-49c9-ad37-89665b7964a9', '6eae4cae-357c-4485-9e78-a07264727055', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.956');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('b0481087-afeb-4b86-860a-c49285d5e088', 'f5a7c8b2-9990-491f-a7d2-42b0d2eceb83', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.958');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('3386711c-f06c-4231-a91d-a5ece922a496', '1915b28f-1921-44e2-ac2c-c9afaef9e702', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.96');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('42f1066a-151a-4293-bd14-c947adf80f68', '82af1ea6-cb91-4295-b052-d35bf7dc0983', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.961');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('80591522-52de-4c4f-88e0-f4cfeacf6b81', '03929b5c-3d75-43a7-9c32-9ee0e52321b0', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.962');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ed2f5345-6708-4fc0-b50d-c903d5933a4c', 'db0b3f7d-7f11-47b2-b3b4-d81057fc0f48', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.964');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('0ad7332d-1f58-47cf-9c5a-6ebcff7503bd', '9d99597b-aef5-4c66-927a-7e669c71d109', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.965');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e09f8994-5bfc-4c60-bbbb-79edee796790', 'a52a3ba4-4813-40c5-9e58-4c61e4985e77', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.966');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6a18dae0-8279-425f-9a85-eeb55da37670', 'e1034723-ebb5-4c94-b1d0-b8ab3bb3d23e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.968');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('dadbdbfd-8229-4421-8fe9-2e1756c25104', 'd00bf1ef-a28b-4753-9cab-0dfbe98ef56d', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.969');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('1c82db0c-9ab2-4ad1-b420-b477c33d3496', '465b428a-91b6-4029-be6e-91af7cb3726e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.97');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('3cd347ec-e27c-4d47-9190-f1397e489b42', '27dd223f-59d1-4423-a3de-17143b6bdda2', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.972');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('9baf70c1-5c3a-4c45-8052-308d380b5868', 'cdacac1f-1f2b-4866-b9a7-324df5bbe389', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.974');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('2464d531-efeb-4c29-a904-5ee78a9b736f', '1bf011dc-1049-4177-8c84-31a4c7f2bc95', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.975');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('2f49de5d-2602-4cbf-bf4a-708100ef1b0d', 'bb0fa654-b47e-4027-8d4a-702ea16f68e4', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.976');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('028fed82-9fe8-4b44-b119-a4bc42b57731', 'c86b5fcf-01c9-48cc-87ee-c2f5b298f338', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.977');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('7dc25bd0-9995-4a24-bef4-b8ce44e72dd3', '3ec1a2f9-99dc-4a31-bb02-dd447be15f24', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.978');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ebbf5091-51ce-4d48-a011-3b04508c97cd', 'a6980a9c-afda-4cb1-a48a-3f4e444727bc', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.979');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5950f2da-b43b-4f78-9294-7fc949d4baaa', '4ada26cb-c74b-40c6-8c8a-91a2b40af1fd', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.981');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('be880ad9-d487-498e-b166-5a23d573d8a5', '6d3b3113-820e-4016-8f79-47997fb22e07', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.982');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('7d3eb43c-269b-4aaf-ae17-edb093f3e539', '48009f5f-f147-4db6-ba9e-27b2ce152ece', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.984');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('495f65e2-674e-4b9c-99e1-277d9a9bf317', '40971ede-34e8-4aec-962d-095e458c14e3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.985');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('7bd66e68-dc9a-44fd-b846-9a6f442ba337', '00e4057f-39d7-4752-ac64-bef87f3b262f', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.986');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('80928392-3b93-46c9-8035-f6238e02826a', '68b82d91-086d-45cb-83dc-ed4278d47aa5', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.987');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d7cadd3b-742f-4b5e-b69e-c0289a5a1507', '82f2e6a3-86dc-4276-9258-b9e64e774d9e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.989');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('76f781f3-4769-4552-8bab-b81c6b76c9eb', 'dab55c2e-517c-441e-a2a4-b6e8eac2a77c', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.99');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5ef08d03-5a43-4280-91d5-614620fc1123', '2b68b6ac-a0f7-4188-9bbe-ed892fb62fa9', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.991');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c130f9e9-f4a2-4f2c-8c55-f4807ab4b025', '1ab69561-c144-41f6-8287-4cf20c57b153', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.992');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('660c76c8-6588-4ddc-b0cb-be0f45e55580', '590b300a-a584-4939-a78a-b8dc85a1e3cf', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.994');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d544045f-43a0-44cc-8545-ccda66aad601', '0a0dbe97-bcc6-4e95-bd8e-5799d765d7c1', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.996');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ca53eb58-7487-48ab-8017-ce0b8410d145', '362bfc91-b224-400f-9d57-d01de20fd7cb', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.998');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('7b647505-7f0d-492f-b9fa-b11f58d2a759', 'cb75b7f9-87e9-4f4f-b2ad-89e6a8c99fb6', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:40.999');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6966a56a-5658-43f4-9442-5d4864d536ce', '9f485e0a-b0ec-4d97-9969-e4c71c56c961', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.001');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('252f3dc9-484f-49c9-9ba3-3d17bdef091b', 'd7133bb9-cbc9-4353-b506-536092cd0181', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.002');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('893b5059-a5d0-4a7e-9a66-4dab49f6a4ab', '2b619363-91c6-4469-9215-f20f7980fbe6', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.003');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('930a5667-d5af-403a-a23f-2e5d3e2e68d6', 'a7f2e2e8-6201-4a3d-b1d5-465e1882aa78', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.004');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('8f5b9b07-e403-41f1-ac32-99adf329a157', 'eac56751-79b5-4d38-be9e-89a45920f73b', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.006');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ab403be1-3500-4997-9768-fc8b7d132341', '177e1211-b74c-485d-a679-ea272966a2d8', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.008');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6108c7f7-d818-461b-90d8-d8eae25ae199', 'c55004f1-c07b-4da9-a388-0c85ce6b7119', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.01');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('2e235939-3b44-41e8-bd60-aa6118d6a0a3', '6771bd28-df31-47a5-b291-069c99781d5c', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.011');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('1990fee9-8c97-4b8e-a3fc-6c7ab327d343', '3bddebb0-6355-472c-801e-4cc0df3bc577', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.012');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('fd37065a-8102-4fd9-9a77-db8b49158530', '289a296e-d6c7-4ecc-aa51-16f72a8d8f55', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.013');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d67e2221-b525-4c4d-b23c-5f8a8dcb4b63', 'fe5a8a87-5ff5-430f-9649-7f61171a0464', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.016');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5fe3b186-a2af-4cb5-913b-90e80fdf8043', '312969ed-25d4-42c4-a976-dc5003a5b48e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.018');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5eda486f-042c-4e11-93df-c836d4e44a42', '9a2c97e5-0590-441f-b983-2e07d5a070e8', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.02');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('bc7ab8b3-0d3a-4feb-a314-07d02f761980', '72f89b73-9f95-4d56-b1b0-1c4aa3c9cce6', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.021');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('aec27262-0acd-4a71-a741-1bcdd3a23da6', '64f2b1d1-7c44-4f01-bb51-c62fd244a134', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.022');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('7334da35-01c9-481a-8fb9-3e201fc4954f', '84707cdd-96a6-4aa2-b168-3cb81e96b1a5', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.023');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('cb1809ab-0328-4acb-bb59-3266a781e2a8', 'b937612f-1048-435c-b9d6-9243f6f640fd', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.024');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('26c7ffa9-112e-4d69-9bba-79b3c7199885', '65064788-054e-4005-aa1c-52004dbde891', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.025');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('622a4a3b-f5c4-45b4-9d7b-90b73119fc86', '80d8ac21-2ea5-47d0-842a-c39d2f7f7fde', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.026');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5b7755db-bca6-47c0-a1a6-36a6d71482d7', 'db3ce1e4-df5c-4556-8867-1e0ab9d1c656', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.028');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('20dc99fd-2f14-4813-8631-42a012167e74', '2169bdc2-2c0a-4e01-90b1-ed639bd2f55a', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.029');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('3d1ceffc-a349-4e56-ace0-c122a61f5fc3', 'de21007b-7320-47bc-bfd3-97bd5fac82e1', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.03');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ef1b11d0-ff0f-451f-a172-6dbacc17e14a', 'e442c818-6abf-4a12-b36a-1c90618ad4b4', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.031');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d1470da5-47f5-4feb-bcfa-72fd39a70a30', 'a02d1371-1d45-4c47-b4d1-b0ce6c13a444', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.033');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('bd0f2086-5c6d-4d02-81b3-3482072eea49', 'b89c58d1-f94c-4d9b-bea8-28c4deb282dd', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.034');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('be5c2b4a-fe7e-46f2-b7a5-cd76c3ae7216', 'd73e4f73-d548-4ccb-90a1-583f537d1f65', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.035');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('af6b77bb-e519-462a-a52b-d1ca81ab0e9b', '2045b1cc-5059-406c-9e86-a511ba2746f4', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.036');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('b7080822-b586-4363-ad9c-0a419bfcea08', '135196aa-a596-4ce3-9459-2e09c66e551b', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.037');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('fcf7715d-0be1-4108-956d-9cb4841b27e8', 'af9a2ca8-5a48-478f-8abd-f17bed7a9b27', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.039');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c01d953c-6ab8-438c-995e-68da41e642ca', '2bc60755-5847-4d9e-83e5-a4074bc0d052', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.039');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6a73405c-e548-498a-b07f-2ac20e75cdea', 'f85fb5e5-af38-40d6-ba37-29ba2124573c', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.041');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a0c9204e-d1e8-4b99-b3a2-2cadc42eaa51', '75d0d8db-41ee-4ea9-97fd-8ffc54c0b02a', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.043');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5565e319-f319-45ec-b407-35933f650d98', '61072a61-4501-4d21-9c21-0878928ea143', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.044');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('3d9f4f04-ce39-44d6-ade4-c50fa8cc29bb', 'e097f9cb-5c70-47c7-8682-b4536b37ae93', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.046');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('7ccfcb5a-dd19-4f09-846c-070adf38c0d6', 'f6be6dae-834e-4ccd-9930-cc181c8df520', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.047');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('bd404dc3-2b2a-4668-bee8-618aeae5771e', '8edbcb20-fb8a-4a6c-b947-717a6e28f837', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.049');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c0acefea-accc-4d61-8646-93937c1f2480', 'c426fd74-4a4b-49da-b9d6-2dd318224cee', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.05');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d3ea80c0-9401-409f-afb4-4080cac42913', 'da2336f7-261e-48e7-9615-d79313e585dd', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.051');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6daf2d49-bbdd-43ba-a4e7-380db8ecb5a8', '9381e496-b4f0-4c22-84c6-d41e10b48d05', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.052');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('989fd315-e44e-4c19-8375-0ecd058a1b86', 'e58ef382-d828-4383-bb7f-1c1956f7a1b4', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.053');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ce8c7fa1-be9a-43ac-b52a-6ccd5fea5ca8', 'fc4ff27d-22a4-412d-99d7-0e030f8b72a4', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.054');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('39fa95d2-2442-42fb-bb32-c7af06044b36', 'ce6cbb1b-cd86-40db-b017-b22c84115def', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.055');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('dc01fde3-4ed7-4794-b0e8-60a8f0d02b18', '7850e4ad-e701-47c8-be57-2c974e40259d', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.056');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('765b7290-c5c8-48be-83d8-186aa59f7c98', '8eba3099-66f6-4f09-b839-f87947c7afb4', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.057');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('8c8f7206-6442-4fbb-a2a0-edbde9bfd04a', '39aa5c10-e593-4432-9c82-ee14f02055bc', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.058');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c9aac42e-b083-4739-9ff0-559ed2100ba5', '5cd8ae84-58ac-4eb7-92aa-8e5817663e15', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.059');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('b531f9c7-8064-4772-8527-9d030ca78e9d', 'c9fba493-dd06-42b0-8047-db9cd1bf4a94', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.06');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e7f3d8b9-3c65-4145-b646-ee3500b4fc47', 'b5c540bb-9ec9-42a9-85cb-df15390debe7', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.062');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('2dae8405-5b08-4f5d-85f6-862bce8788d4', '2e862c2d-768a-4871-bc8f-7fdf232b8746', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.063');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d1deb586-3dde-46c6-b9a5-5ad4ba0f8b34', '5bd23955-4388-4f31-b47b-290cb6db320e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.064');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('04593b6b-7cba-4ec8-8ef3-92a1a7510af1', '026f1dea-a0e6-422f-be37-88cccb7d4084', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.065');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6b6af7f8-5e4b-42f0-a28c-9713d7196038', '951350f9-494d-4369-bcde-9d8db8c4b9e1', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.067');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('cf502536-c5ed-4484-8032-847d10bb5528', 'cd68de03-d036-41b8-b351-21d23f3cbb71', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.068');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('925b47b0-de41-4255-b43e-7c7765fd698a', '78acddad-d796-4ee6-bf61-12ea2f264efa', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.069');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('37d31606-798e-4c72-afa7-d10b6f65928b', '6ccf5c7a-9f77-49da-b073-2971f7f0287b', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.07');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e28692ec-a564-4b88-9a45-122986deae0d', '178cacd9-6074-414e-896e-440df254921d', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.071');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('4e646cd7-e42e-4156-89e9-bf4a0a424961', 'a4fa9eb3-08d1-45b0-b716-79bf8778bdb3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.072');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('1c91509b-cfff-4226-a7ed-2887228ac0a2', '5a1d387a-540e-4958-bbc0-40dc16a4dd2b', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.073');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6ae0507c-6069-4403-8067-3aa3e5020a8b', 'f5b7479d-45cb-4cd2-937a-359ff3812b3a', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.074');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('504577f0-20eb-45b8-825d-96322d8fc6df', '04fd58c9-d750-4749-9f31-448b9ede6b06', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.075');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('f92e1c04-4912-4637-8614-10550661dfca', '4c90f65a-3cbb-47d9-8cb6-d5c83be4b76e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.076');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6764e758-eb17-44fd-b8e9-21e7642a3d1c', 'ddd186df-bb69-4a89-ab53-908a02fcdea5', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.077');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6750b606-885c-4478-9bf4-b36a64508b76', 'b14e6c9b-66c7-4527-8a26-1e66e89d254f', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.078');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('22d43a97-9b1c-441a-8053-f5cb3ebb0aa2', '7a7795d9-2878-4f6d-a08a-2e3ca9114b0e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.08');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('55cbe483-ca5d-40de-b2e5-ebfe22a69f85', '59530aef-45d1-45ef-acff-78c5ca36d5bd', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.081');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ff53ad20-28b1-4c24-ad2f-cfc44faa9481', '34a3d999-d91a-459c-87f6-fce06fd1e589', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.082');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c445c03b-6e6a-4336-90ba-2830e5ebf723', '6af91ece-e995-4879-aa27-3e17addc6184', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.083');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e7050424-e2f1-4391-abec-86f4b4a7f58f', 'd7b2a0d8-ff59-437a-9c06-c08e13a94e58', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.084');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e8676524-e895-433e-a8a2-3a6fc6be7231', '1e819bcd-5ee1-4966-90a0-857d164e8d12', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.085');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5940c05f-ec26-4b28-a414-8e87a0892f95', 'e530f9a8-3506-4666-bb97-3bd72740acb2', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.087');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('4f4b7149-de15-462c-be3b-72b358149c9b', 'b2bac93f-873c-4c8a-9a0e-2492e2f21bc8', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.088');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('26b384f9-d3b9-47df-bc34-dcce7909711a', '27cf9e9f-d13c-4c87-b59a-bc8ff3be66cc', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.089');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c59877b1-bec1-489a-ab0e-8393da274fac', '26b67704-8dcf-4e34-b2e7-95784a5a5589', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.09');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('624c785c-07fb-48c9-94ac-40baa52aed2b', '2ae67770-3d2b-4c99-85d3-f89529815e81', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.091');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('43ccf861-c06d-45f8-ab80-cbd9ee05ab36', 'b2bb0151-b229-4eac-95a5-f7635ea9493d', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.092');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('447755ab-0662-412c-9a89-9884fe15cbe0', 'c0fce145-7d7f-4f92-871d-f4336796d1a8', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.094');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('23ee1b45-06d9-4275-a13d-78e801991f65', '4533ad1a-c286-42c5-bcab-b1f5cd4c8199', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.095');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('949cc00d-96d0-4184-8feb-caff538bfa6b', 'e2c860fc-ae7f-449b-8f61-1a4fa89915c7', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.096');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('2c18556d-fa58-48cc-893b-744647ebb16e', '53359cb7-b88d-4045-bd82-5fb17dd9ddb1', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.097');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5ca78d10-c0b3-4da0-af0a-b31a6e0a975e', '283cf188-1d6c-4d1a-bcc4-bf71ac2553a3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.098');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('64d959d9-c7c9-480f-a5dc-67b6d4c2866a', '7e07d54a-b880-4a73-bd21-64d66035feb6', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.099');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('db2d7187-9371-45f1-9f38-63cae6657c59', '4ac90b7a-a710-4b0e-80ca-dd9a6748829f', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.1');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('535285ec-999c-4a06-b9ec-120c7eea5117', '839e96d8-159d-43d6-ad8a-2cdc3a4bc9d9', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.101');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6e953ee9-773d-43b0-9edf-a4d88860912e', '58d24390-a1b5-4ede-8f23-f153b612a848', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.102');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a81a4d1e-69ba-4643-9c8b-44a90dd227df', 'c44a6699-2911-45ac-8ebe-6503d04d68e7', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.103');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('43f2d5bc-e255-47b4-980d-c38aa60b31ae', 'a1205d98-9dd0-40da-bab0-2387787e5fab', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.104');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('13bcdef1-2fb5-4625-a3b9-58bf71773227', '36e6be44-9086-45c6-8a8c-e9927c640e85', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.105');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d17f9175-014e-41f9-baee-e6c205a24e38', '460f161c-6eab-4a58-8e07-41dc8c85e934', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.107');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c9e39002-a0f3-49ed-a4af-eb80fb56b4b6', 'f1e69e3f-5c8d-4cd3-8b4c-f2f452f7b311', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.108');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('febb93cd-f827-4cbe-8490-9eb4a847c673', '6c3fbc2e-a340-4c6c-8713-b2504a61724a', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.109');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('acdae1b4-7f55-4c82-b171-2c4b4c51cec0', 'ff83e2f6-353e-488e-ae38-36c2ff8885f3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.11');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c3922b60-64d3-4b83-8623-0d8a8d4b3fb5', '915339bc-1e29-46f8-9f96-8de39e8b3b2e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.111');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('8163952c-f356-435a-9946-2b717ad07360', 'c0def6b8-ac1b-4a05-9c4b-bb516d50c5c3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.112');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('41ed9a5d-d551-47d1-acb3-9f15bd5b0dad', '02772e69-2f8f-4bee-89b0-ed58c0c5f05c', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.113');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('251e77b0-dd66-4003-a5aa-12a9428bc47e', '5892df9a-59e9-45fc-82ab-4d5c61b149b7', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.114');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d453d91f-49c2-40cc-95fc-1edd505aea48', '1e62791b-04eb-4d40-be3d-5dd0c7ec7aca', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.115');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('3a2869d4-4d4f-42aa-9537-4d646ba80e77', '4aaa3e85-e02a-4b11-81ce-74ea0cb532fb', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.116');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6164ae15-972f-4af5-a459-206b45bcd91e', 'beb4fbbe-d3e8-449e-b247-de22c5080629', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.117');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('93ece2e9-56db-41e5-98ad-b3182044202c', 'bf551e06-9f6f-45c9-aec4-c7615ad0b410', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.118');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('fdc248fd-d566-4617-b4c9-5a888510fab5', 'c3332cbd-2660-4e62-be77-90e7846cfb29', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.12');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c778e7b3-dd49-44d7-a5fa-ea0d03e13993', '4cca1b00-c70d-40ba-866d-cc5b2df52a62', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.121');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6e91fc44-f6d5-4d56-8447-7b6a531a9fc2', 'b5f76552-b139-498e-a7ab-15ccbd59d344', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.122');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('9db48f29-4f24-49fe-9483-a20349b4621c', 'b37f8cdc-b3f2-45a6-9f98-d42c83960faf', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.123');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('650f6c6e-dee6-44f6-b9a9-1e84e85509ae', 'eca6cfac-fc55-4acf-857a-6124aa3c8882', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.124');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('0aa2e82e-8d87-438e-9e95-786c7d024875', '08e39286-23b6-4312-aef7-d88647511e63', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.125');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('f63046e0-85f0-4604-accc-7b467b42d7e3', '39f2b349-59fe-413f-b312-9c6860b99a0f', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.126');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('002969d8-7fdd-4296-ac32-0cf5d74366f6', 'af4e2dc3-dc63-4207-baaf-cd627949a81e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.127');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('b150d8d9-9369-4b9e-9878-aae2d18adba2', '03bcc04c-7553-4ffb-87d6-e5da59ee4371', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.128');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e6b8381e-106a-40cc-9766-5f4139df7243', 'ad7d911a-648d-4a5a-9db2-e0089e67131b', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.129');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5ced0050-494e-4bf4-95f8-6549b6d2f142', '43c32b53-560e-4699-8f4f-9522088ea756', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.13');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('8b8032cd-342c-4702-9b33-3997a561a3b3', '7f2258ec-f62a-46e1-9f4d-05acf8c9a28d', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.131');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('67622616-b6dd-46b3-ba7b-7bc555df4179', '497eecec-fa0e-4c14-824a-a272a430bbe4', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.132');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('f77559e2-889b-4672-b14a-fa5e5c99d4e2', '63b112da-105f-4db9-9d4d-9da0813156f3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.133');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a6b553f4-e12c-44b6-8279-8e26e7c4efd6', '6b920c10-c017-4990-b9a3-96d5501b9614', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.135');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('0ebdbed2-9f11-4ed5-a032-18b83c618996', '5d99dfed-325d-4c7f-8c7e-aeb92ef59823', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.136');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('71e7761e-e97a-4cb5-a0d8-dd86e780e246', 'e20d04c8-c1c8-4058-9d0b-2a1dd91de5c8', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.137');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('1bdf9280-8c64-4d0d-a76d-eb2129b3f194', '7be300ac-0532-468f-a31c-5f806d95c796', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.138');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6a16d0c1-ef1e-4e64-9f71-f472c75b14f3', '31b00b1a-13d1-48cd-8f4b-9cc925e772ca', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.139');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('251c9d5d-db49-4e7c-b6c8-d5bcf8ea90e1', 'dda07397-3ec9-4f3c-b44f-51ba0eab860c', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.14');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a005fd98-5234-420c-8b72-d9dcbe466276', '292bd213-1359-40a3-960a-f825881fe551', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.141');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('90b56b52-6178-4bb8-b865-0c27b300dd49', '3cbaf3e0-17bd-4ace-88f2-9e96ab86be22', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.142');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('cfa6a8ab-35d3-41db-b868-fb45ae8e2941', '8d54c425-5672-455b-8b6d-89294ec3347a', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.144');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e074e8a6-af59-4727-9e7e-88a3f060b9e8', 'f193734f-5f6e-44da-8add-e4d698e97c05', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.145');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('00fa4314-0669-47c1-9a2c-a005abd495ed', 'a3439c66-fbcd-4105-b140-b1a7c89889c0', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.146');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('7067ffa5-57dd-42cc-8970-b63975ed3ee8', 'fdff2b4c-f843-42e2-a8da-5bc5caf05ea5', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.147');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('11bcf222-4d2c-4007-b89b-637b0329bd1a', '49fbc622-b0b9-4bd5-88ad-32b07413e852', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.148');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('2249f23b-5197-4cfa-a4bb-1aafb210942c', '0e6a78df-d7ce-4109-8251-c9d5a8df2992', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.149');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('7ef4f472-d464-4005-aff5-4eeb88a05123', 'a4a05ca0-92ad-404c-8984-4fb4804f341e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.15');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('0c36a334-01f2-45cd-af53-fecf27d2db7e', '38bfb836-b0dd-4d69-b4b6-544c3390f904', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.151');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a0df35c2-96a6-4f75-8f77-f860a039bc52', 'cb5652cb-cd6a-4c2f-8d7e-4ce8b362ba18', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.152');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d1357b3a-25dd-4099-8b7f-05d40acf45df', '4e9a5bd2-fc22-47ff-a699-1119e9b31107', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.153');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a7c64392-e9b1-4805-abdf-e3af67d465e4', 'fc65d26e-549f-44e6-8173-68e6e51e8711', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.154');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('14b3a2b6-c758-4f0f-9a04-9032f8f3b7de', '384961a1-7ce2-4e91-807c-7d1900c5d68f', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.155');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('b2c4a01d-dc3f-4489-9d21-ec3b648c6dce', 'c028824a-b3ab-4d42-a47c-0684c14fd735', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.156');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('dbae6525-15e0-40f5-ad52-661584d61803', '26cdc7f9-0f92-4214-9327-ecdea53aeeac', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.158');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('bc9dc5fa-4442-45ce-9a6a-2761fd227006', 'f22dbac3-6d8c-4ada-984f-b64771fb62e9', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.159');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ea556a00-505e-443c-b280-4e87c2b3d7d4', '9feb7085-604a-460c-a38a-082587ea0227', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.16');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('563090cd-6906-4a8a-9b58-08f09f451303', '389e5a27-e424-42ec-bcb5-32031b38e2f8', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.161');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('8394ae22-6f1c-4aef-8ffb-798c5ac2ff53', '6267ce7e-d484-456f-8c50-9c6b3f7945b6', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.162');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('3bba6316-d923-42eb-906d-05957483db33', 'ea5559de-8808-4db1-9244-0b0d96c0712a', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.163');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('9b786221-16d8-48bd-99c5-15c5a0d48a7a', 'a8f17f38-4a06-456b-ba33-1d36a94645de', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.164');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('4c12b7af-bb65-4c43-a116-8ddac20b6c98', '79f55dc2-371c-4c7f-8ee8-44808d45a378', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.165');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('7d0b62d3-2e65-46d0-85ec-da2debd25f3a', 'c686223b-74e5-4992-85e8-342c9d607ae2', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.166');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a02e153d-346a-484c-b708-452f75dcd721', '38c5a6af-632f-455c-b6e7-1d53cf2aa485', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.167');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('42dbf270-44b0-422a-8127-6b06e3a00e62', '6e8d0c57-9923-4dcf-966c-9d0fd806a6b4', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.168');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('36f23e98-0213-473a-9d65-367c579c4015', '22c8ff96-4d5d-4f42-9b6a-00d441a49a47', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.169');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a82eff35-c017-4ea7-a5de-18dd7314ea7f', '922df5f1-44df-4250-8ed2-9e9539a54c0a', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.17');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('598b7afe-f9b6-4370-b812-c1324a15fa72', '5a1737ff-3478-40fd-90ec-4520de7a3e98', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.171');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('be600299-d099-41bb-b225-3d764a5c562f', '8dbed962-e349-4ec5-9179-1363488e85bd', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.172');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('9905d619-af84-428f-a5fb-316adc152dab', '55bb68f0-a34b-4f44-b821-1764959e08ac', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.173');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5bf1aca3-b470-4b34-b12c-561129f35c2f', '21752518-1d2f-4506-b686-6ea9c46e8f0c', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.174');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('69078cb2-a1a3-47ff-8113-8cbc4adc1189', 'fbe7bc22-f8d8-42cc-a27b-39e40b32a4aa', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.175');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('35ef21f7-bf7b-4c7a-9257-4d1a9d4d71ec', '0ee7fedd-35fe-4352-b8a2-ea7a86315235', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.176');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('f01bdcd8-fae9-427d-b69a-21439b987396', '218810fc-8a53-4d5d-82da-d4822f80c671', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.177');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('87e26c50-0541-48a6-98df-94a5c581f523', 'a517d93e-a26a-4840-8678-dd1476cfb930', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.177');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5cbc8906-3e2b-40b3-8c09-b0c11288ee9e', '4656dbcb-9715-4314-a813-567e2340715d', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.178');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('569afc1a-7642-499b-b2bc-99cd3056d1fb', '300e4bc3-abd1-4d57-b21f-efd09c3755e8', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.179');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('58c8a309-f76d-4895-ada5-184e32ce8a49', '34a17eeb-fd19-45b0-9765-ecebd3251fa2', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.181');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('414a0e2c-f9c7-40b7-8b23-2379644932da', '9ed8fcad-4531-4919-ab1b-e12f51cf3bb4', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.182');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('f55f2846-dcf3-423d-9eec-69e21e41b826', 'e59fd812-aa69-405a-b010-07c23a90871c', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.184');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('0ed34f2f-e272-4609-9ac5-9dcad494d209', 'b4621252-3aa3-4bf9-b1ae-91d3cc3382d0', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.185');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('88a815ad-2cc9-47ce-82cc-1d169dd6227e', '4be90b8f-8758-4e9d-96cc-cbd4361848ba', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.186');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('918ce8e8-e231-4c5e-a331-b18e91abf54c', 'ea82b18d-d043-48b2-b303-da376cc4b9c2', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.187');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('63d9e2df-6d94-4799-b285-61640051d0a7', 'c4d2e762-cea7-4a43-86ab-5cf957c49625', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.188');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('9ffd36e1-f3ee-4fd0-94b7-fb874beda097', '1afeb586-20db-41a5-b479-b6e6d790d13a', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.189');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ba758c34-31ea-4f5b-9c5d-203b805e88fd', '76e853c5-43c3-46e8-b6d5-fade54b86b4e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.19');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5518ebdf-0f11-4ca0-b7e5-26ec6367e0ce', '5ae49041-ab60-423f-bcdd-e3c92eaa7b74', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.191');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('9c34b3a3-ce3a-4b5a-bfac-65f51996e425', 'd0485c84-090f-436d-a0e4-1f10a16c5982', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.192');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('7949906d-1368-469d-941c-7ef9b50b499d', 'c0e9b107-0d5d-40bd-bad6-f3f47af56ea3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.193');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('27564d45-e610-4118-aa0f-9d92303b4830', '0e75092b-11cb-4df9-9a4a-f6af01cdd9cb', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.194');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('126fa2f5-3dd1-49cc-8e46-12074f3e50fd', '11230545-aabc-4891-bb6d-22e60231d7b3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.195');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e4c5fb57-5d43-4941-859a-664e1e2373b9', '4c707726-b263-4e6e-ac14-2ff1b149e8b3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.196');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('30e9f5f2-a4ab-4dd4-aed6-74084d632d37', '76c5ccc9-fcac-4e37-b48e-6adb17fda918', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.197');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('dd8fb399-9c83-439b-bb80-dad4c329d8d6', '0050bccd-b22d-4efa-b4eb-e9e40aa04ebe', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.199');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6cd2d253-edae-44f2-a181-ae851787b397', '97aec771-7098-4c12-8c79-6d3ab676b410', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.2');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('17dcede8-d1a9-4bfb-b83b-a416bd2d64b4', '03dca840-af27-41ef-98bb-dc89aedccf48', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.201');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('850a46e2-58f9-47fc-9f10-2cbf5dbb9e15', '3b14bb7f-644f-4725-b99d-2fd40a198e81', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.202');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a6198991-86b4-4c87-a625-025772ee7ab5', 'ff417a4f-c491-4ded-95c0-1e7be0817e70', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.203');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('485e9e03-50dc-4cc7-9f99-dea83c7b5b3c', 'ee098e6e-214b-401b-a44f-a96cb1f6b2ea', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.204');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a08505a9-325f-4545-b24f-71475c74a8db', '58034ad5-118e-4627-9917-c0a6c1c917e4', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.205');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('83a5f920-0bc4-4640-b2de-6fa549eca13e', 'ebeed9ed-ab12-4b3b-8dbf-5b7b020cdb31', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.206');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('0369db39-0d73-4631-8d10-185b0e7fefbb', 'feb6d44a-e850-43ee-bc63-6fab7f55fd50', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.207');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c5c71411-363c-453b-b112-f041b9767791', '7e45426a-c9f0-4d23-90dc-5f7be88c4d63', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.207');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('8c6343ad-0ce8-4780-9729-c6e5847f067c', 'b4236e08-5269-411d-bbd0-1bed6e843f62', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.208');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e564ee19-bfb2-4e0f-affd-2ae5eee3e65b', '71a26227-5a6d-466c-967d-601b053a6647', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.209');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('4b167237-8811-4024-a51b-eb6556372c2b', '81d8e029-08c2-4c4d-8122-614e9c08ced5', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.21');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('bde4c349-19be-4e7a-b8eb-c21c7a07006c', '8e5defaa-87b4-448a-91a3-224f5ad232c1', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.211');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('fd37f323-ae37-426d-856e-3edc44b0981a', 'f20c1373-a4ad-4701-8897-f9bc1e5e746e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.212');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('3527faca-ff9e-4331-bb05-c6626f98c5f2', '23fe706c-d664-4af2-8931-69fa819d79b2', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.213');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('af8193eb-e55f-45c2-95f8-439361afd762', '310ecef1-6912-436e-a284-fba41ffd5ed3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.214');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('bac8a8e6-ef83-4b84-b61b-af7819687cbb', '896ba81d-fe8a-409c-b643-5821e3a8da91', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.215');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('1906d751-c64e-4869-85d4-59c2751e46d9', 'f1be1855-6b7f-458d-a1c6-75cb5eebc3e0', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.216');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a785510a-0a29-4a38-97ef-8c91a63f400a', '96314219-521c-4526-b3e2-4156cecf1168', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.217');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e2d83269-6238-48c8-9851-a4777bc8f123', '5e66d8ae-9af2-4132-b7d2-84e44f08b1d1', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.218');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('a9b8d05f-e26c-46da-9b9d-375d603ca866', 'a1ed71b3-f896-4600-93f3-8e030eb1cd02', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.219');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('5d5d1687-41d3-4789-8947-5cf521e24093', '0345895a-6c9e-4e63-872d-d87e6b8f8b8e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.22');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('f5630ef3-9834-4396-8121-c78469e8735f', '180a6109-a5f0-4746-89ed-a347931a9bf2', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.22');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('0e6c46ac-d258-422b-9918-d95d4dfde566', 'eb7ab2a3-9a14-4f9a-a21e-6c54ad441cba', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.221');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('6a703ac9-708e-4ad3-b68a-27bc5c637c97', 'c1314d2c-c2b0-4d48-998f-1ce68edcb763', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.222');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('bbe72ed4-c54d-43cc-ae98-b2a5e24434f0', '9f00f67a-1d02-48ca-8957-e0cab6633213', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.224');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('c3ba5651-86ce-4ff4-986a-0f166114862e', 'fd216357-0a06-4ddc-9e1d-19e3b5ea4f4e', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.225');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('89117379-5b88-496a-a8f4-6b5c64b77242', 'ea0993eb-6c0a-432c-88ed-201095a0d0d1', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.226');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e9a9a418-3327-41eb-a4c6-cd366c240e62', 'cfea5933-2291-4961-ab60-1dc11642f947', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.227');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('e800d358-b4d3-4ef2-8464-1b4ea4e00ae4', 'dfa311a8-a149-4c5b-99b3-ac55ec733bb2', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.228');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('79188085-10c5-48fe-a659-19a5209e3cdf', '7e9ea205-5d04-4afa-885d-d21384a73f70', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.229');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d1332ad6-9b95-46c9-bf67-d6511a80c4f4', 'c51c0c13-ee51-44b5-aaf8-101d91754a61', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.23');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('ee1bb55f-3859-40f6-840c-8a6959c27121', '5c62edc9-900c-461c-81da-196052f34dce', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.231');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('d8ad5596-4faa-4a03-b6e7-3248683dc54d', 'efb35da5-863e-4187-9a8c-4ec1eac13d35', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.232');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('b106c525-2de1-44ab-b7bc-853e34e77df5', '41319690-e5d8-4773-abe9-c9d14e5f7b7d', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.233');
INSERT INTO academic_work_plan."PersonaPrograma" VALUES ('3a2ebd62-6866-49b8-b241-3ea477ccf8a4', '9c1ce751-4a64-42a5-b716-337d0feec8d3', 'APT-02', 'Docente', NULL, 'Activo', '2026-03-30 22:24:41.235');


--
-- Data for Name: PlanTrabajoAcademico; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Programa; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."Programa" VALUES ('AP-01', 'Administración Pública', NULL, '2026-03-26 19:07:09.166', '2026-03-26 19:07:09.166', 'ACTIVO', 'PREGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('APT-02', 'Administración Pública Territorial', NULL, '2026-03-26 19:07:09.17', '2026-03-26 19:07:09.17', 'ACTIVO', 'PREGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('AP_Diurno', 'AP Diurno', NULL, '2026-03-27 21:06:16.408', '2026-04-02 11:55:24.946', 'ACTIVO', 'PREGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('AP_Nocturno', 'AP Nocturno', NULL, '2026-03-27 21:06:16.469', '2026-04-02 11:55:25.083', 'ACTIVO', 'PREGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('APT', 'APT', NULL, '2026-03-27 21:06:16.492', '2026-04-02 11:55:25.165', 'ACTIVO', 'PREGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('Alta_Dirección_Del_Estado_ESP', 'Alta Dirección Del Estado ESP', NULL, '2026-03-27 21:06:16.514', '2026-04-02 11:55:25.23', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('Derechos_Humanos_ESP', 'Derechos Humanos ESP', NULL, '2026-03-27 21:06:16.522', '2026-04-02 11:55:25.238', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('Finanzas_Públicas_ESP', 'Finanzas Públicas ESP', NULL, '2026-03-27 21:06:16.528', '2026-04-02 11:55:25.252', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('GEPUR_ESP', 'GEPUR ESP', NULL, '2026-03-27 21:06:16.533', '2026-04-02 11:55:25.266', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('Gerencia_Social_ESP', 'Gerencia Social ESP', NULL, '2026-03-27 21:06:16.537', '2026-04-02 11:55:25.274', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('Gestión_Pública_ESP', 'Gestión Pública ESP', NULL, '2026-03-27 21:06:16.542', '2026-04-02 11:55:25.29', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('Proyectos_de_Desarrollo_ESP', 'Proyectos de Desarrollo ESP', NULL, '2026-03-27 21:06:16.548', '2026-04-02 11:55:25.309', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('Maestria_DDHH_y_Posconflicto', 'Maestria DDHH y Posconflicto', NULL, '2026-03-27 21:06:16.553', '2026-04-02 11:55:25.323', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('Maestria_AdministraciónPública_DISTANCIA', 'Maestria AdministraciónPública DISTANCIA', NULL, '2026-03-27 21:06:16.559', '2026-04-02 11:55:25.352', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('Maestria_AdministraciónPública_PRESENCIAL', 'Maestria AdministraciónPública PRESENCIAL', NULL, '2026-03-27 21:06:16.567', '2026-04-02 11:55:25.367', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');
INSERT INTO academic_work_plan."Programa" VALUES ('Economía_Pública', 'Economía Pública', NULL, '2026-03-27 21:06:16.574', '2026-04-02 11:55:25.388', 'ACTIVO', 'POSGRADO', 'Facultad de Pregrado');


--
-- Data for Name: PtaEvidencia; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Rol; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."Rol" VALUES ('951af3d3-7ecb-4566-8efa-5bab598eb7bc', 'Gestor de Personas', 'Administración de usuarios y roles.', true, 'ACTIVO', '2026-03-26 19:07:09.066', '2026-03-26 19:07:09.066');
INSERT INTO academic_work_plan."Rol" VALUES ('91775891-fdb3-40b0-86d3-07fae783d248', 'Director Académico', 'Aprueba PTAs y revisa reportes.', true, 'ACTIVO', '2026-03-26 19:07:09.071', '2026-03-26 19:07:09.071');
INSERT INTO academic_work_plan."Rol" VALUES ('7f24c657-07bf-47f7-b675-95fb9153c048', 'Docente', 'Crea y envía su PTA para concertación.', true, 'ACTIVO', '2026-03-26 19:07:09.074', '2026-03-26 19:07:09.074');
INSERT INTO academic_work_plan."Rol" VALUES ('e7cdec1f-8674-45ac-a52a-c37a2505c1b2', 'Personal Administrativo', 'Acceso exclusivo al módulo de Carpeta Digital y Certificados Laborales.', true, 'ACTIVO', '2026-03-31 00:59:26.244', '2026-03-31 00:59:26.244');
INSERT INTO academic_work_plan."Rol" VALUES ('de78dbbc-4e3d-451f-9143-b8e788574322', 'Admin Registro Académico', 'Acceso exclusivo y total al módulo de Registro Académico.', true, 'ACTIVO', '2026-03-31 00:49:45.726', '2026-03-31 01:32:51.025');
INSERT INTO academic_work_plan."Rol" VALUES ('6e1db221-1c82-43c8-968e-ab6948e1eec4', 'Admin Certificados Laborales', 'Acceso exclusivo al módulo de Certificados Laborales y Dashboard de métricas.', true, 'ACTIVO', '2026-03-31 00:55:16.336', '2026-03-31 01:33:13.698');
INSERT INTO academic_work_plan."Rol" VALUES ('5ccb09dd-52a0-41b5-874c-2235ff67d1ac', 'Decanatura', 'Rol para Decano Facultad', true, 'ACTIVO', '2026-03-31 19:29:39.39', '2026-03-31 19:29:39.39');
INSERT INTO academic_work_plan."Rol" VALUES ('4d76a38f-5ae2-4550-bfb1-e49cce6774a6', 'Jefatura de Zona', 'Rol para Jefatura de Zona Antioquia', true, 'ACTIVO', '2026-03-31 19:29:39.392', '2026-03-31 19:29:39.392');
INSERT INTO academic_work_plan."Rol" VALUES ('4b3e403e-e0a4-4f0a-9fc9-b7fbd1820c6a', 'Administrador del Sistema', 'Acceso total a todos los módulos..', true, 'ACTIVO', '2026-03-26 19:07:09.019', '2026-03-31 22:30:32.596');
INSERT INTO academic_work_plan."Rol" VALUES ('86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'Gestión Profesoral', 'Rol para Admin Gestion Profesoral', true, 'ACTIVO', '2026-03-31 19:29:39.381', '2026-04-04 13:15:46.798');


--
-- Data for Name: RolPermiso; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."RolPermiso" VALUES ('8b3de273-fdeb-4fc4-897a-73b9fcc5aff4', '7f24c657-07bf-47f7-b675-95fb9153c048', '2a8fd943-0099-4a25-beaf-4fd55b288e34', '2026-03-27 12:01:01.86');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('7775fa26-f97c-417e-86fc-e296da060b8a', '7f24c657-07bf-47f7-b675-95fb9153c048', 'e5919279-56e0-4412-9eb5-1bf1d671c15e', '2026-03-27 12:01:01.871');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('ebdd940c-4f3d-4def-ae6a-9d6bc9e1e8cb', '7f24c657-07bf-47f7-b675-95fb9153c048', '3aca5fad-06d3-4476-832a-051213586dbc', '2026-03-27 12:01:01.879');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('e9fdfdc6-b079-4abb-96d9-c8e7b50c463f', '7f24c657-07bf-47f7-b675-95fb9153c048', '697bea7b-7145-48f5-9222-3e3a5858a2b4', '2026-03-27 12:01:01.885');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('de8f068a-d030-45a3-b4cf-bd3d61c721b7', '7f24c657-07bf-47f7-b675-95fb9153c048', '4195fc1c-91eb-41f3-8160-f17341c45ace', '2026-03-27 12:01:01.892');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('98c1c636-e26c-4433-8d2c-8f393674ad6b', '7f24c657-07bf-47f7-b675-95fb9153c048', '688ce085-0d27-45c3-bb9f-25361e4771f8', '2026-03-27 12:01:01.899');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('2b97a99c-654f-49b9-8e3e-d124df6e0f1c', '7f24c657-07bf-47f7-b675-95fb9153c048', '319dd249-7d8b-4073-ae38-cc6a546ea0a8', '2026-03-27 12:01:01.907');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('d545cd79-e944-4611-b5a1-99c5b9df3cda', '7f24c657-07bf-47f7-b675-95fb9153c048', '704c5904-43cc-4208-8751-81d81673922b', '2026-03-27 12:01:01.912');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('51f8ed71-1b53-458a-90d8-ae674bcb1c54', '7f24c657-07bf-47f7-b675-95fb9153c048', '9513ad2c-98c8-4964-906f-1c2ae569e9ee', '2026-03-27 12:01:01.916');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('b8799953-3378-4ddf-8512-2b21ddcb5c44', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '265db154-c33e-4382-ba44-9ecfa0b990c9', '2026-04-04 13:14:04.811');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('4acb4355-5385-4556-acd2-69d7d0845580', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '759c6a66-cee8-4b3f-8c7e-404a20dbd47a', '2026-04-04 13:14:04.817');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('1aa541ae-69a2-4ffc-8b22-f88a55147f1d', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '49a814ce-a49c-488b-a4bf-4c8ca3c41077', '2026-04-04 13:14:04.82');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('a84d7921-0777-46e7-8974-0f60622cd640', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '4da791a7-2c96-4dd5-b93e-c8c99b9636bf', '2026-04-04 13:14:04.823');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('d9f52a9c-31dc-4339-ae4f-a42f5c509b91', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'f5bbea5d-c009-4526-be03-b3069b4a8561', '2026-04-04 13:14:04.826');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('be8d2e20-d9cd-4f71-8bb8-120f10f38bcf', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '7b0fafb4-147e-4ca2-a368-de1f92d27d3a', '2026-04-04 13:14:04.829');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('deb56557-b725-4512-9d06-cf1102ff4fee', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '2c5b5d26-bcef-49d2-96f4-c25fda8432e3', '2026-04-04 13:14:04.831');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('3a6b836a-ed23-4fa9-88c9-2bb6215deea3', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '8edb8217-4829-4fd1-88b0-817202c7ef83', '2026-04-04 13:14:04.835');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('ac7debf5-7300-4fc4-b1f6-2b231c74c671', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '07ae65e6-c7e5-441c-9d2b-d347b54ba44d', '2026-04-04 13:14:04.837');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('a6fc74e9-562f-4841-b856-017607b4ca52', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '97cbf6b1-f5cf-4b63-8d81-eccd174e6638', '2026-04-04 13:14:04.839');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('3c08f326-a42b-46bc-bac2-b804352c48c2', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '840a2a01-aa62-402f-b597-bd19a73fd7e1', '2026-04-04 13:14:04.843');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('70fe57e5-48ed-4a48-afc6-686ed02804e1', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'c1873e1e-53f2-45ab-b01d-db75a40ee3b4', '2026-04-04 13:14:04.845');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('a846716c-2a65-4045-a3bd-426fe3638769', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '470f6cbf-5b73-415f-a90c-8a5c8d1dfaa6', '2026-04-04 13:14:04.85');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('5f68b74c-de01-4048-8436-d33d42347970', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '1190b491-2411-4d35-a335-1180a547cd4b', '2026-04-04 13:14:04.852');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('ba28b3f2-387b-4dd6-847a-52b0cf87e95a', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '801f9d5b-3014-4693-8ca6-b85a75b32c64', '2026-04-04 13:14:04.854');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('4f36cc06-9265-49c9-a0c4-40eccedb19b2', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '63b383b6-b9a2-4d8b-a955-1c07358cb4ba', '2026-04-04 13:14:04.856');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('2ed04bcf-0741-49e5-a59c-906c6753e692', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '4751dac4-6845-44c8-a40b-bf787a462007', '2026-04-04 13:14:04.858');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('a6c3064a-ab36-4742-b581-13fcf5c13134', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'dd25a2b6-815c-4d7f-abaa-dcca32de30a8', '2026-04-04 13:14:04.861');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('c5bc61fd-3213-4642-b6ce-5a13a4af0591', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '3c641115-ebc9-4327-8962-0836f342c76e', '2026-04-04 13:14:04.864');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('9a45e6ba-5835-48c1-bdd6-e90196f89dec', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '127b4a2d-e9f8-43dd-9aa6-09c14ccd44b9', '2026-04-04 13:14:04.866');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('6c715b1b-2510-4e1b-ba4b-4ff2e78b3931', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '5b98a23c-a945-41c4-a5da-a2efb21e35bf', '2026-04-04 13:14:04.869');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('9a4e1406-895d-44df-9e4f-481e89c83671', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'e131f908-2012-44ff-aa57-c85836427e80', '2026-04-04 13:14:04.873');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('b26e0bce-2e5c-4b1a-9195-4fa2f2bfb18b', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '6796b96c-7f35-4da7-9d34-989ec5dfaf8f', '2026-04-04 13:14:04.876');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('f12e7b96-6052-4219-aaa6-310633ab072d', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'bc0fde53-4039-496f-ba5d-4718293d9477', '2026-04-04 13:14:04.878');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('bd76eb81-aa80-4b35-9901-27fc11458272', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'a928efa8-14d0-4c90-a037-787aa1cbf14e', '2026-04-04 13:14:04.881');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('67acc3f1-1045-4828-af8e-324e5d747e23', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '6759726d-427b-4a65-a0a2-1c0b508c6b2e', '2026-04-04 13:14:04.886');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('9dca81b9-a0d7-49de-820c-7f7bf2940893', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '414f6f0c-71d7-4fd8-a98e-c07c08ae9e15', '2026-04-04 13:14:04.888');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('07ee35bc-b0c3-402a-abf6-73579903d98f', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '6ec5da76-b5ce-43de-9799-c42c66ffab28', '2026-04-04 13:14:04.89');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('15905cae-1c2f-4b5e-b7fb-c10cd981cadd', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '0de933ad-e561-4a1e-b891-ea4db97b392e', '2026-04-04 13:14:04.892');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('8a4e3814-285c-47c1-a4f0-c12c33b57df4', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'a36bd66a-4ad8-4e7b-befb-0b82ef225406', '2026-04-04 13:14:04.894');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('051f6ca0-5440-43c0-a27e-33f2482f59b7', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'ada3dee4-7986-48a6-8f3e-72893c588666', '2026-04-04 13:14:04.897');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('6a8a9f7a-00d2-40ce-bc82-33ce6bbf95a2', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '8015c47b-8bdc-4d6b-be98-7ead3b85a9dd', '2026-04-04 13:14:04.9');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('954acf97-afeb-4276-ac49-385bbbb58912', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '830f3028-eac7-4d23-b1de-861f46dea5b7', '2026-04-04 13:14:04.901');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('f6f73999-6f8c-4405-b2ce-f3d7ebb57f48', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '20cc1863-4b80-41ce-b39a-60c77f33da52', '2026-04-04 13:14:04.904');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('0bec1523-fe68-43d7-8da3-46c51cb6a577', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '759a935f-3a99-4165-8b2e-ba93b7805435', '2026-04-04 13:14:04.907');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('23d26cd4-a7ad-4730-ad5b-512c7da10f54', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'a056d432-0f39-4709-9fb3-1f5b43892d6e', '2026-04-04 13:14:04.91');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('c011e193-c750-46a2-93cb-b3664076a7de', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '1de46b49-7329-445e-9710-ffa80574545f', '2026-04-04 13:14:04.913');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('3c5c359c-0efd-4342-ae57-518509fb5af7', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '4d304442-7478-488c-b5e5-9c0d810dbb1c', '2026-04-04 13:14:04.915');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('57b7fce9-da21-4d69-80d3-0a62cc37da60', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '36dd5065-f9d1-4040-823a-f1b5b3e03c90', '2026-04-04 13:14:04.92');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('5ec3ff79-a578-4ac9-b015-f63010b60248', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '5ab995bc-5648-488f-b541-a115c1a9f536', '2026-04-04 13:14:04.923');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('d8a2015d-7fd3-4e15-97ba-895856110122', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '5f219166-07d0-43ef-852d-219073dc0304', '2026-04-04 13:14:04.925');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('7cffdb45-7cbc-4603-a326-6bfe6f5f946f', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '121bd36d-3e7a-4a7e-8be3-4ccc8de743d7', '2026-04-04 13:14:04.927');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('92f2fd5f-dbf3-4ae5-a7a2-c22330f05325', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '46e08c68-8a39-44b5-b2f3-02145655c766', '2026-04-04 13:14:04.93');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('e96757ea-70f2-48f7-825c-fd0ef23a1e08', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'a7ec6239-6de1-4893-87ca-a031cd675333', '2026-04-04 13:14:04.933');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('6a93f269-3b55-4c26-a688-89b06ea42bae', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'ae68f6b5-13ce-4b36-ae70-694385a44229', '2026-04-04 13:14:04.936');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('b6d48f45-6748-4dad-a215-58249433eaf8', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '362f55e0-91ac-4fb8-a031-79bea245bab8', '2026-04-04 13:14:04.939');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('7dafec1c-1e53-465c-828e-9e37985f6945', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '73510da8-7631-4c52-9dc2-2227e53e5794', '2026-04-04 13:14:04.942');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('3fc243b6-b9f8-417c-abd7-4acb8cfb5e34', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '584bdb35-0633-4059-a260-610f653698f7', '2026-04-04 13:14:04.946');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('802fd3ed-bc05-43fe-af6a-55b0ff75a29a', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'b1803084-0e92-4ac7-ac34-e936c792186e', '2026-04-04 13:14:04.949');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('2f234bf2-12f5-40b5-ad11-1b841c175d38', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'e60dfc4b-ea43-4ca1-a511-fe63e2de9371', '2026-04-04 13:14:04.952');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('48253a27-25ee-46f1-82ef-9ca14832e2ba', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '0a91717a-478f-4a49-8991-8a493388244a', '2026-04-04 13:14:04.954');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('4da31479-f454-4ef9-b9eb-376ff3d3b107', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '9224b3fa-2a2b-46a6-bfa0-bbcc536b6617', '2026-04-04 13:14:04.957');
INSERT INTO academic_work_plan."RolPermiso" VALUES ('66b097f8-e270-4bed-818e-62d66f9eea9f', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', 'a71a7818-c512-4af1-aae9-cb26293dbeaf', '2026-04-04 13:14:04.96');


--
-- Data for Name: Sede; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."Sede" VALUES ('dd8d3b98-b754-4e91-8efd-2fb92bf550e3', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Andes', 'Andes', '2026-03-27 21:55:23.892', '2026-03-27 21:55:23.892', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('5b050f2d-9fb6-4390-9438-6559867ccb67', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Apartadó', 'Apartadó', '2026-03-27 21:55:23.895', '2026-03-27 21:55:23.895', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('baf522ea-12f7-4886-8e43-b5af7d7dd4e0', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Arboletes', 'Arboletes', '2026-03-27 21:55:23.896', '2026-03-27 21:55:23.896', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('6bf8f714-d066-4e4c-90d1-462b43dccf61', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP El_Carmen_de_Viboral', 'El_Carmen_de_Viboral', '2026-03-27 21:55:23.897', '2026-03-27 21:55:23.897', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('4a1af076-76b7-48ca-a214-14f1efa660cb', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Chigorodó', 'Chigorodó', '2026-03-27 21:55:23.899', '2026-03-27 21:55:23.899', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e656477c-1a2d-4eb9-887d-884ebf54ddf4', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Ciudad_Bolívar', 'Ciudad_Bolívar', '2026-03-27 21:55:23.9', '2026-03-27 21:55:23.9', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('dcbaf338-660e-45ac-8360-7aa1831e064b', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Dabeiba', 'Dabeiba', '2026-03-27 21:55:23.901', '2026-03-27 21:55:23.901', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b67c5ce0-c8b9-4040-a007-b8c03bce55c1', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Ebéjico', 'Ebéjico', '2026-03-27 21:55:23.903', '2026-03-27 21:55:23.903', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b14c7a91-ed36-42de-8ae1-2ff591ddc1cc', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Giraldo', 'Giraldo', '2026-03-27 21:55:23.904', '2026-03-27 21:55:23.904', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('82925613-bc9c-444a-bbb5-d525689e6ba0', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Ituango', 'Ituango', '2026-03-27 21:55:23.905', '2026-03-27 21:55:23.905', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('baa4552c-920e-4f36-9533-134c709169d0', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Jardín', 'Jardín', '2026-03-27 21:55:23.906', '2026-03-27 21:55:23.906', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('d7d2c1dd-5d3c-453b-8ffc-5308bd841bf2', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Jerico', 'Jerico', '2026-03-27 21:55:23.907', '2026-03-27 21:55:23.907', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('54005658-0288-4ea9-9c9e-b8153de12d25', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP La_Pintada', 'La_Pintada', '2026-03-27 21:55:23.907', '2026-03-27 21:55:23.907', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('9228406d-ce4d-4b2a-be4c-82b6e12e9e08', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Medellín', 'Medellín', '2026-03-27 21:55:23.908', '2026-03-27 21:55:23.908', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('46e1d42e-c8ca-4aec-8d6d-57cbce4007f3', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Mutatá', 'Mutatá', '2026-03-27 21:55:23.909', '2026-03-27 21:55:23.909', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('cd19cf47-9c1f-496f-9c80-8150f19f503a', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Necoclí', 'Necoclí', '2026-03-27 21:55:23.91', '2026-03-27 21:55:23.91', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('59b5b5fc-ae98-40ac-86c9-a0281274264d', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Puerto_Berrío', 'Puerto_Berrío', '2026-03-27 21:55:23.911', '2026-03-27 21:55:23.911', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('3513ba2f-cb8d-46ad-97a5-40c32785074e', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Sabanalarga', 'Sabanalarga', '2026-03-27 21:55:23.911', '2026-03-27 21:55:23.911', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ac1a67b5-8522-4cf5-be31-877cb93cc689', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP San_Carlos', 'San_Carlos', '2026-03-27 21:55:23.912', '2026-03-27 21:55:23.912', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('9b81bfad-cd01-44d8-952c-ae9dd600ff68', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP San_Jerónimo', 'San_Jerónimo', '2026-03-27 21:55:23.913', '2026-03-27 21:55:23.913', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('47e63923-6a9d-475f-a7a1-8ded2fa5e1f7', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP San_Pedro_de_Urabá', 'San_Pedro_de_Urabá', '2026-03-27 21:55:23.914', '2026-03-27 21:55:23.914', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a47f45d3-9357-401d-8a35-be30016ff709', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Santafe_De_Antioquia', 'Santafe_De_Antioquia', '2026-03-27 21:55:23.915', '2026-03-27 21:55:23.915', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a4566a84-a808-4162-802d-ac4acb787775', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Sonsón', 'Sonsón', '2026-03-27 21:55:23.917', '2026-03-27 21:55:23.917', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('22d9709e-7fdb-4cee-bf13-c1dd5969ba63', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Titiribí', 'Titiribí', '2026-03-27 21:55:23.918', '2026-03-27 21:55:23.918', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0a51ea86-c7a2-4a73-817e-eebe4cfc19e8', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Turbo', 'Turbo', '2026-03-27 21:55:23.918', '2026-03-27 21:55:23.918', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('3a400614-777e-4fd7-b049-67f0debaf3c2', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Vegachí', 'Vegachí', '2026-03-27 21:55:23.919', '2026-03-27 21:55:23.919', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('16b8efda-d2df-412d-85bc-1fb295bca883', 'f1fcd15e-adf7-4069-be40-2dc069823265', 'CETAP Yarumal', 'Yarumal', '2026-03-27 21:55:23.92', '2026-03-27 21:55:23.92', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('722721a7-69e4-434e-8513-bce4dddeced6', 'e634988f-413f-4668-95ff-4e79259440ca', 'CETAP Barranquilla', 'Barranquilla', '2026-03-27 21:55:23.922', '2026-03-27 21:55:23.922', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('89c0c197-2deb-4749-a089-3df23253424f', 'e634988f-413f-4668-95ff-4e79259440ca', 'CETAP Bosconia', 'Bosconia', '2026-03-27 21:55:23.923', '2026-03-27 21:55:23.923', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('4277c227-daaa-45ad-8a02-95e66b5faf6c', 'e634988f-413f-4668-95ff-4e79259440ca', 'CETAP La_Jagua_de_Ibirico_', 'La_Jagua_de_Ibirico_', '2026-03-27 21:55:23.925', '2026-03-27 21:55:23.925', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('3ea4d9eb-8e07-4122-ba3f-a61210419378', 'e634988f-413f-4668-95ff-4e79259440ca', 'CETAP Malambo', 'Malambo', '2026-03-27 21:55:23.925', '2026-03-27 21:55:23.925', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0b9cbde1-653e-48a6-8049-6f6a3861e567', 'e634988f-413f-4668-95ff-4e79259440ca', 'CETAP Santa_Marta', 'Santa_Marta', '2026-03-27 21:55:23.926', '2026-03-27 21:55:23.926', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('c28b9712-6daa-4331-98f8-0553cda705e8', 'e634988f-413f-4668-95ff-4e79259440ca', 'CETAP Suan_de_la_Trinidad', 'Suan_de_la_Trinidad', '2026-03-27 21:55:23.926', '2026-03-27 21:55:23.926', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('bd4e3084-f6ee-4232-987e-6f5db12b57eb', 'e634988f-413f-4668-95ff-4e79259440ca', 'CETAP Uribia', 'Uribia', '2026-03-27 21:55:23.927', '2026-03-27 21:55:23.927', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('9d94a940-3446-4b6d-9440-5f1ce86b6d06', 'e634988f-413f-4668-95ff-4e79259440ca', 'CETAP Valledupar', 'Valledupar', '2026-03-27 21:55:23.928', '2026-03-27 21:55:23.928', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f2ec4269-0b53-4002-b8e0-5f5babb23606', 'e634988f-413f-4668-95ff-4e79259440ca', 'CETAP Villanueva', 'Villanueva', '2026-03-27 21:55:23.928', '2026-03-27 21:55:23.928', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ee412135-2136-456f-a65c-a9a3a4dd10cb', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP Cartagena', 'Cartagena', '2026-03-27 21:55:23.932', '2026-03-27 21:55:23.932', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ce45cbf9-1a3c-462f-a0d3-f500a25cb77d', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP Corozal', 'Corozal', '2026-03-27 21:55:23.933', '2026-03-27 21:55:23.933', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f5b9ca00-bd87-4fb4-886c-bef1c3784688', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP La_Unión_Sucre', 'La_Unión_Sucre', '2026-03-27 21:55:23.934', '2026-03-27 21:55:23.934', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('d69391ea-b896-473e-ac6b-e151de720dff', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP Lorica', 'Lorica', '2026-03-27 21:55:23.935', '2026-03-27 21:55:23.935', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('75bb2830-2570-42b4-aabe-99d5efa9add6', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP Magangué', 'Magangué', '2026-03-27 21:55:23.935', '2026-03-27 21:55:23.935', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('52f39ef9-a166-432c-ad52-9e681b63578b', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP Majagual', 'Majagual', '2026-03-27 21:55:23.936', '2026-03-27 21:55:23.936', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('3abd2416-031e-4d7a-99d6-cb94a90effac', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP Mompós', 'Mompós', '2026-03-27 21:55:23.937', '2026-03-27 21:55:23.937', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('5d9ed3c7-af74-4094-900e-8d05472f0411', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP Montería', 'Montería', '2026-03-27 21:55:23.937', '2026-03-27 21:55:23.937', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('56ba3c70-288e-4a8e-8d45-2411b4794df8', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP San_Andrés', 'San_Andrés', '2026-03-27 21:55:23.938', '2026-03-27 21:55:23.938', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2ca706f5-e6e9-490e-98f9-8e8f5704defe', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP San_Andres_de_Sotavento_Resguardo_Indigena_', 'San_Andres_de_Sotavento_Resguardo_Indigena_', '2026-03-27 21:55:23.939', '2026-03-27 21:55:23.939', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('53a9d9f4-d02a-4fcb-a497-9a9dc77ff5d2', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP San_Antero', 'San_Antero', '2026-03-27 21:55:23.939', '2026-03-27 21:55:23.939', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('311abda2-f9c5-49f8-8e5e-93a5b229689e', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP Sincelejo', 'Sincelejo', '2026-03-27 21:55:23.94', '2026-03-27 21:55:23.94', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('31d616dc-78a3-41f3-85e6-e16ae1108f2e', '347ec5fb-30ab-4481-a340-f0351875b5ad', 'CETAP Tierralta', 'Tierralta', '2026-03-27 21:55:23.941', '2026-03-27 21:55:23.941', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('1d9c7bd1-1b60-498f-8f8a-6ba9ddc003c5', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CETAP Chiquinquirá', 'Chiquinquirá', '2026-03-27 21:55:23.943', '2026-03-27 21:55:23.943', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('49face67-a6f8-433d-8fe0-fb236c248c79', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CETAP Garagoa', 'Garagoa', '2026-03-27 21:55:23.944', '2026-03-27 21:55:23.944', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('c58e6bb2-b661-4053-a6e6-a56e50cf1f8f', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CETAP Miraflores', 'Miraflores', '2026-03-27 21:55:23.945', '2026-03-27 21:55:23.945', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('11b7c350-c8d4-4fb2-80c4-480587676204', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CETAP Moniquirá', 'Moniquirá', '2026-03-27 21:55:23.945', '2026-03-27 21:55:23.945', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2254d76b-ba18-49e1-9d3e-dc577c5c0ce1', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CETAP Monterrey', 'Monterrey', '2026-03-27 21:55:23.946', '2026-03-27 21:55:23.946', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('28256c62-0ca7-4eb5-9a92-4fd1e7963c7e', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CETAP Otanche', 'Otanche', '2026-03-27 21:55:23.946', '2026-03-27 21:55:23.946', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a6132073-1834-417e-8b83-a881ba6777ae', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CETAP Soatá', 'Soatá', '2026-03-27 21:55:23.947', '2026-03-27 21:55:23.947', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('38fe4a24-0642-4031-b6fc-d4ba056561c0', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CETAP Sogamoso', 'Sogamoso', '2026-03-27 21:55:23.948', '2026-03-27 21:55:23.948', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('928db4a5-bff2-48e4-ac69-a406e018db26', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CETAP Tunja', 'Tunja', '2026-03-27 21:55:23.948', '2026-03-27 21:55:23.948', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e3823869-8b86-47ba-a691-157424beb61a', 'c5d09ae6-1829-4754-9313-8565fa12cc59', 'CETAP Yopal', 'Yopal', '2026-03-27 21:55:23.949', '2026-03-27 21:55:23.949', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('1aebcf7c-3c2a-4980-b0b9-15ee2e6ed0f0', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CETAP Anserma', 'Anserma', '2026-03-27 21:55:23.951', '2026-03-27 21:55:23.951', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('81c10159-6df1-4f4d-9966-ea3ec5f2452b', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CETAP Belalcazar', 'Belalcazar', '2026-03-27 21:55:23.951', '2026-03-27 21:55:23.951', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ca917969-bcc8-4139-ab42-9ab064ed8df1', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CETAP La_Dorada', 'La_Dorada', '2026-03-27 21:55:23.952', '2026-03-27 21:55:23.952', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('bb9ad041-d585-4adf-a8cd-3d8811301ac3', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CETAP Manizales', 'Manizales', '2026-03-27 21:55:23.953', '2026-03-27 21:55:23.953', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0df3d5e3-26e7-48bc-96a6-6ce4eb60ede3', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CETAP Manzanares', 'Manzanares', '2026-03-27 21:55:23.954', '2026-03-27 21:55:23.954', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('fdc74219-7514-4704-9900-47780166531a', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CETAP Riosucio_C', 'Riosucio_C', '2026-03-27 21:55:23.954', '2026-03-27 21:55:23.954', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('4da4b7f4-f1b9-436b-8c77-62694806bf6b', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CETAP Salamina', 'Salamina', '2026-03-27 21:55:23.955', '2026-03-27 21:55:23.955', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2bf9f6d2-77b7-460e-9982-fce6e9cc4426', '593b49db-ba20-410d-8608-9b71af83d2b5', 'CETAP Supia', 'Supia', '2026-03-27 21:55:23.956', '2026-03-27 21:55:23.956', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a3f998d2-911c-437b-b165-c8c0f4cf5b9c', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CETAP Bordo', 'Bordo', '2026-03-27 21:55:23.958', '2026-03-27 21:55:23.958', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('30a496ca-d52c-4f3b-9413-7163c6328d8e', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CETAP Caldono', 'Caldono', '2026-03-27 21:55:23.959', '2026-03-27 21:55:23.959', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a588fa28-6e7f-48d5-a06d-403979886f73', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CETAP Miranda', 'Miranda', '2026-03-27 21:55:23.959', '2026-03-27 21:55:23.959', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('1ed3e17f-0933-4d36-80c3-69aa0bc28944', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CETAP Popayan', 'Popayan', '2026-03-27 21:55:23.96', '2026-03-27 21:55:23.96', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('6d62c9ab-9eb1-4f86-ac9e-13b94785ac62', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CETAP Rosas', 'Rosas', '2026-03-27 21:55:23.961', '2026-03-27 21:55:23.961', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ed65ebf6-d47d-4b69-930d-25de9c2bdcf2', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CETAP Santander_De_Quilichao', 'Santander_De_Quilichao', '2026-03-27 21:55:23.962', '2026-03-27 21:55:23.962', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('66142c05-971a-4cfd-9fc7-7464b90c3b54', 'a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'CETAP SilviaGuambia', 'SilviaGuambia', '2026-03-27 21:55:23.963', '2026-03-27 21:55:23.963', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('60a6d13a-631a-40bc-9f34-b797540e9333', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Agua_de_Dios', 'Agua_de_Dios', '2026-03-27 21:55:23.964', '2026-03-27 21:55:23.964', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('56c29a31-63e4-4465-85cd-ca08ce6a72ca', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Chía', 'Chía', '2026-03-27 21:55:23.965', '2026-03-27 21:55:23.965', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f30233d2-e169-4bae-a7f4-0da75ddd6cbf', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Chipaque', 'Chipaque', '2026-03-27 21:55:23.966', '2026-03-27 21:55:23.966', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('55e39221-1ac7-4dfd-bd79-9b4169e5a38c', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Facatativá', 'Facatativá', '2026-03-27 21:55:23.966', '2026-03-27 21:55:23.966', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('8af1d1cb-0ad2-41fc-8593-fb71786c9885', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Funza', 'Funza', '2026-03-27 21:55:23.967', '2026-03-27 21:55:23.967', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('7d93e9a4-10e1-4c18-abe8-26fb34a2d034', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Fusagasugá', 'Fusagasugá', '2026-03-27 21:55:23.967', '2026-03-27 21:55:23.967', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('948990d9-2b26-4526-bd25-d9b56f07f735', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Gachetá', 'Gachetá', '2026-03-27 21:55:23.968', '2026-03-27 21:55:23.968', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ca4e4502-1a44-44c9-bd93-dfe0f3879abd', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Girardot', 'Girardot', '2026-03-27 21:55:23.969', '2026-03-27 21:55:23.969', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('750695b5-533f-43aa-a051-7144f360030d', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Guachetá', 'Guachetá', '2026-03-27 21:55:23.969', '2026-03-27 21:55:23.969', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('77853960-10ec-4710-92eb-0638a86ed062', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Guaduas', 'Guaduas', '2026-03-27 21:55:23.97', '2026-03-27 21:55:23.97', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0e01121a-934a-4db5-b3fe-787ba1f9dbf1', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Madrid', 'Madrid', '2026-03-27 21:55:23.971', '2026-03-27 21:55:23.971', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e23d6530-f4cc-4c86-9d39-8b5fe992e267', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Pacho', 'Pacho', '2026-03-27 21:55:23.972', '2026-03-27 21:55:23.972', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a698778d-4866-4d9a-b642-1d8d25f2d054', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Puerto_Salgar', 'Puerto_Salgar', '2026-03-27 21:55:23.972', '2026-03-27 21:55:23.972', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('81c77cdc-f96a-451b-a569-5a6dc9a1c87a', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Ricaurte', 'Ricaurte', '2026-03-27 21:55:23.973', '2026-03-27 21:55:23.973', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f45c0c42-7c7d-4174-a7f0-c38724346769', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP San_Juan_De_Rioseco', 'San_Juan_De_Rioseco', '2026-03-27 21:55:23.974', '2026-03-27 21:55:23.974', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('26f5b5f1-d5c6-410b-a345-8f9be7c4c02f', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Soacha', 'Soacha', '2026-03-27 21:55:23.974', '2026-03-27 21:55:23.974', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('8c3cc35b-5f4d-4147-a332-a9a5e3bec3ff', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Tena', 'Tena', '2026-03-27 21:55:23.975', '2026-03-27 21:55:23.975', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e2b904a0-e232-4179-8fdd-86fbd0ae6de8', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Villeta', 'Villeta', '2026-03-27 21:55:23.976', '2026-03-27 21:55:23.976', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ab77f311-f41a-42d2-9949-fa3de1f81746', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Zipaquirá', 'Zipaquirá', '2026-03-27 21:55:23.976', '2026-03-27 21:55:23.976', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e7f4fb48-cd63-43bc-a1ce-b4bfafbbc380', 'a465f2d1-428c-473a-934a-12aef33a3d1e', 'CETAP Tibiritá', 'Tibiritá', '2026-03-27 21:55:23.977', '2026-03-27 21:55:23.977', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b2b1ecfa-aeba-47bd-b343-a3113d46724a', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Acevedo', 'Acevedo', '2026-03-27 21:55:23.979', '2026-03-27 21:55:23.979', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('43b774e5-c5f5-46c6-9823-1412ddb470f3', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Algeciras', 'Algeciras', '2026-03-27 21:55:23.98', '2026-03-27 21:55:23.98', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('9b3e40cb-e832-4b50-9ddb-69153db02bc7', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Belén_de_Los_Andaquíes', 'Belén_de_Los_Andaquíes', '2026-03-27 21:55:23.98', '2026-03-27 21:55:23.98', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('7e847bb7-8b01-49fa-8a67-6973e78e29cd', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Florencia', 'Florencia', '2026-03-27 21:55:23.981', '2026-03-27 21:55:23.981', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('fc6ed291-913a-4973-a03d-fbf80730e263', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Garzón', 'Garzón', '2026-03-27 21:55:23.981', '2026-03-27 21:55:23.981', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f1c6b6b7-4123-4bbe-bdf5-2ce589daa978', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Isnos', 'Isnos', '2026-03-27 21:55:23.982', '2026-03-27 21:55:23.982', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('4614e5de-bff1-40bc-a500-3b90ca44c1c9', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP La_montañita', 'La_montañita', '2026-03-27 21:55:23.983', '2026-03-27 21:55:23.983', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a63b4fce-1efc-4237-99fd-6433aa39ec1e', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP La_Plata', 'La_Plata', '2026-03-27 21:55:23.983', '2026-03-27 21:55:23.983', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('fceeebd7-aac8-456b-b530-0fd8832c2e64', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Mocoa', 'Mocoa', '2026-03-27 21:55:23.984', '2026-03-27 21:55:23.984', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('bd745ff3-1e70-4d0f-8d8c-417673d91d63', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Neiva', 'Neiva', '2026-03-27 21:55:23.985', '2026-03-27 21:55:23.985', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('fb8c5bce-4452-49d0-ab9d-a9cfe60947b1', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Orito', 'Orito', '2026-03-27 21:55:23.985', '2026-03-27 21:55:23.985', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ca7ab33a-85f8-483a-8a60-0d4ab6ab241c', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP El_Paujíl', 'El_Paujíl', '2026-03-27 21:55:23.986', '2026-03-27 21:55:23.986', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('106deb76-6b5d-4a98-b47c-6d7455eae8e1', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Pitalito', 'Pitalito', '2026-03-27 21:55:23.987', '2026-03-27 21:55:23.987', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('797857a1-a223-4786-a653-4717168ae3c4', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Puerto_Asís', 'Puerto_Asís', '2026-03-27 21:55:23.988', '2026-03-27 21:55:23.988', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b9da1596-90cc-43f8-8a3f-2c5c20ad2092', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Resguardo_Indígena_Nasa_Paez_', 'Resguardo_Indígena_Nasa_Paez_', '2026-03-27 21:55:23.988', '2026-03-27 21:55:23.988', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('23fa827a-13b0-4abe-8a8f-64df8bcc8dcc', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP San_Agustín', 'San_Agustín', '2026-03-27 21:55:23.989', '2026-03-27 21:55:23.989', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a49789ae-0a36-4c9d-bf99-bd3ef2a8ca0c', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP San_Vicente_del_Caguán', 'San_Vicente_del_Caguán', '2026-03-27 21:55:23.99', '2026-03-27 21:55:23.99', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('df051b54-68e7-4805-b597-5c5c1d598bfb', 'd4570ed8-585b-4b35-a81d-ac832bb3a509', 'CETAP Valparaíso', 'Valparaíso', '2026-03-27 21:55:23.99', '2026-03-27 21:55:23.99', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('56387180-e375-4512-ab40-6ce508e1b1d1', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Acacías', 'Acacías', '2026-03-27 21:55:23.992', '2026-03-27 21:55:23.992', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('949e0e98-7027-407c-b279-f82e0b7d8f3f', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Barranca_de_Upía', 'Barranca_de_Upía', '2026-03-27 21:55:23.993', '2026-03-27 21:55:23.993', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('c5b4a4d5-ea8e-4388-a030-d3f405154fe3', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Cumaral', 'Cumaral', '2026-03-27 21:55:23.993', '2026-03-27 21:55:23.993', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('d1fe830a-f29b-47bc-9df9-feaefc6624c8', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Cumaribo', 'Cumaribo', '2026-03-27 21:55:23.994', '2026-03-27 21:55:23.994', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('7765fb0d-6ad5-46f3-b645-ca978dd1d172', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Fuente_de_Oro', 'Fuente_de_Oro', '2026-03-27 21:55:23.994', '2026-03-27 21:55:23.994', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('37e7960e-82a5-441a-bb4f-958ee9b45e28', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP La_Macarena', 'La_Macarena', '2026-03-27 21:55:23.995', '2026-03-27 21:55:23.995', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('97a3aedb-4a3e-4258-a1f4-66b3d6c9fb1f', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP La_Uribe', 'La_Uribe', '2026-03-27 21:55:23.995', '2026-03-27 21:55:23.995', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('46841c00-2a4d-4aa9-8b0d-ed7ff8e0c183', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Leticia', 'Leticia', '2026-03-27 21:55:23.996', '2026-03-27 21:55:23.996', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('8cd22d66-98ea-4186-890d-98da09e7fb17', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Mesetas', 'Mesetas', '2026-03-27 21:55:23.996', '2026-03-27 21:55:23.996', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f1a5f4bb-e7b0-4ccd-b369-03e4f4472dc3', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Mitú', 'Mitú', '2026-03-27 21:55:23.997', '2026-03-27 21:55:23.997', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('5d6977df-5ab2-4adf-9067-22e2312dca4f', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP La_Primavera', 'La_Primavera', '2026-03-27 21:55:23.999', '2026-03-27 21:55:23.999', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('412f4f7b-b043-4d81-a64e-0b974fb4a04b', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Puerto_Carreño', 'Puerto_Carreño', '2026-03-27 21:55:24', '2026-03-27 21:55:24', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0b1ce3ff-50b3-488a-a971-bd46a848f780', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Puerto_Concordia', 'Puerto_Concordia', '2026-03-27 21:55:24', '2026-03-27 21:55:24', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('fc915d9d-65dc-4fa0-94e5-f753475b2eb1', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Puerto_Gaitán', 'Puerto_Gaitán', '2026-03-27 21:55:24.001', '2026-03-27 21:55:24.001', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('9d1ac8d4-e3a4-4ea8-acca-e69f0f271ef1', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Puerto_Lleras', 'Puerto_Lleras', '2026-03-27 21:55:24.002', '2026-03-27 21:55:24.002', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('02f4b8da-a205-4f2c-a9df-a6b4e3dcecf7', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Puerto_López', 'Puerto_López', '2026-03-27 21:55:24.002', '2026-03-27 21:55:24.002', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b43fb663-1699-4613-86d7-3251a7414a47', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Puerto_Rico', 'Puerto_Rico', '2026-03-27 21:55:24.003', '2026-03-27 21:55:24.003', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ccdb8775-67d2-4ab9-bee5-015479d47b6a', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP San_José_del_Guaviare', 'San_José_del_Guaviare', '2026-03-27 21:55:24.004', '2026-03-27 21:55:24.004', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('901237c1-ff01-4335-a67b-d8333d7d20cc', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP San_Martín', 'San_Martín', '2026-03-27 21:55:24.004', '2026-03-27 21:55:24.004', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e0d2b39c-9da6-4244-87f0-8760f5f0a7ed', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Santa_Rosalía', 'Santa_Rosalía', '2026-03-27 21:55:24.005', '2026-03-27 21:55:24.005', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e81fedd2-5e04-4a36-a3d7-241469e4d6b2', '4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'CETAP Villavicencio', 'Villavicencio', '2026-03-27 21:55:24.006', '2026-03-27 21:55:24.006', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('8863b1e4-118b-439c-b4aa-a79b7607f1f2', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Barbacoas', 'Barbacoas', '2026-03-27 21:55:24.008', '2026-03-27 21:55:24.008', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('9bce65b7-c4c0-48c3-9330-d09fae21a97a', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Chachagui', 'Chachagui', '2026-03-27 21:55:24.009', '2026-03-27 21:55:24.009', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('92ae66f2-da6f-4783-ae04-ea06ce59bf46', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Cumbal', 'Cumbal', '2026-03-27 21:55:24.009', '2026-03-27 21:55:24.009', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a53fffd8-2fe5-4abe-bccf-64696816f57b', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP El_peñol', 'El_peñol', '2026-03-27 21:55:24.01', '2026-03-27 21:55:24.01', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0eca8dbb-ded0-47ab-8d68-d128bce25fde', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Funes', 'Funes', '2026-03-27 21:55:24.011', '2026-03-27 21:55:24.011', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a6e941a0-c7c4-4507-a785-6c262ac5e53d', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Gualmatan', 'Gualmatan', '2026-03-27 21:55:24.011', '2026-03-27 21:55:24.011', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b49b631c-c895-4385-9422-c1d9249b0428', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Imués', 'Imués', '2026-03-27 21:55:24.012', '2026-03-27 21:55:24.012', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ab2207d0-37ba-46ab-ad07-d92f1df598f5', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Ipiales', 'Ipiales', '2026-03-27 21:55:24.013', '2026-03-27 21:55:24.013', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('facd4a76-4190-421e-befd-ba53e522011e', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP La_Unión_Nariño', 'La_Unión_Nariño', '2026-03-27 21:55:24.013', '2026-03-27 21:55:24.013', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('5220afbf-a02c-4b8c-bba4-630c126237e9', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Linares', 'Linares', '2026-03-27 21:55:24.014', '2026-03-27 21:55:24.014', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('22b3d543-dc6c-4033-a5f9-35c79c5a726d', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Ospina', 'Ospina', '2026-03-27 21:55:24.014', '2026-03-27 21:55:24.014', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('d4a8c927-b43a-4cab-9c26-8287f3ceadff', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Pasto', 'Pasto', '2026-03-27 21:55:24.015', '2026-03-27 21:55:24.015', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a41eff88-3c9e-4aa3-ba41-21709a98ae93', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Policarpa', 'Policarpa', '2026-03-27 21:55:24.016', '2026-03-27 21:55:24.016', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b68c97d2-0fbe-4fd3-aed7-99302a7e75d7', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP puerres', 'puerres', '2026-03-27 21:55:24.016', '2026-03-27 21:55:24.016', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('497cf0e2-f5fb-4ce3-8b4f-95d8759f747b', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Ricaurte_N', 'Ricaurte_N', '2026-03-27 21:55:24.017', '2026-03-27 21:55:24.017', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a5ab3c0a-8dd6-4513-8007-150eedae4b9b', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Samaniego', 'Samaniego', '2026-03-27 21:55:24.018', '2026-03-27 21:55:24.018', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a0f9f404-08c6-4de7-bf94-b31bf7c47710', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP San_Jose_De_Alban', 'San_Jose_De_Alban', '2026-03-27 21:55:24.019', '2026-03-27 21:55:24.019', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0f9e3234-2f20-486c-9226-2289d0d2b4c5', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP San_Lorenzo_Nariño', 'San_Lorenzo_Nariño', '2026-03-27 21:55:24.019', '2026-03-27 21:55:24.019', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('7a3ef9f1-4ac9-40ab-bb6b-0c211a2dc947', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP San_Pablo', 'San_Pablo', '2026-03-27 21:55:24.02', '2026-03-27 21:55:24.02', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('faaa2d37-5c25-46fa-86da-303b4ef596b1', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Sandoná', 'Sandoná', '2026-03-27 21:55:24.021', '2026-03-27 21:55:24.021', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('4cf7def3-0996-487a-a4c5-86a3e6e11a14', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Santacruz_Guachavez', 'Santacruz_Guachavez', '2026-03-27 21:55:24.021', '2026-03-27 21:55:24.021', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('dc7a9684-358f-4dce-ae7e-34c88604070e', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP Sibundoy', 'Sibundoy', '2026-03-27 21:55:24.022', '2026-03-27 21:55:24.022', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('79795303-d637-4d78-a6c6-514833af324b', '704438d5-b8c8-425f-9325-f76adf80f00d', 'CETAP San_Andrés_de_Tumaco', 'San_Andrés_de_Tumaco', '2026-03-27 21:55:24.022', '2026-03-27 21:55:24.022', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('10054d71-c90d-4b61-acfa-73a27947465d', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Ábrego', 'Ábrego', '2026-03-27 21:55:24.024', '2026-03-27 21:55:24.024', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f2abe169-c0be-41db-a69a-4bc26111217e', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Arauca', 'Arauca', '2026-03-27 21:55:24.025', '2026-03-27 21:55:24.025', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('366e772b-87c2-416a-b450-c1530fc16bba', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Arauquita', 'Arauquita', '2026-03-27 21:55:24.025', '2026-03-27 21:55:24.025', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('5a7abd0c-d4b2-4c50-9a0a-ffc326622896', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Arboledas', 'Arboledas', '2026-03-27 21:55:24.026', '2026-03-27 21:55:24.026', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('20f6a645-7d18-4bf9-999f-3486f122741a', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Chinácota', 'Chinácota', '2026-03-27 21:55:24.027', '2026-03-27 21:55:24.027', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2d9318ac-45cb-47ea-b4ed-ba3d42d65fa1', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Convención', 'Convención', '2026-03-27 21:55:24.027', '2026-03-27 21:55:24.027', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('592c88fb-9cbe-45f1-a2e9-65dc1f40c122', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Cravo_Norte', 'Cravo_Norte', '2026-03-27 21:55:24.028', '2026-03-27 21:55:24.028', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('65a19bd1-b810-43d0-a94c-545863385f33', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Cúcuta', 'Cúcuta', '2026-03-27 21:55:24.028', '2026-03-27 21:55:24.028', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('6402640a-8a0b-4085-b627-0d71e7c14e5f', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Fortul', 'Fortul', '2026-03-27 21:55:24.029', '2026-03-27 21:55:24.029', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('707daa00-b40a-412b-8265-8ca7fb52860d', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Ocaña', 'Ocaña', '2026-03-27 21:55:24.029', '2026-03-27 21:55:24.029', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e65763c8-6a7a-4909-85fb-bf400c9a1f02', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Puerto_Rondón', 'Puerto_Rondón', '2026-03-27 21:55:24.03', '2026-03-27 21:55:24.03', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b1c1cf98-b432-4d39-af9c-480b10584d72', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Salazar', 'Salazar', '2026-03-27 21:55:24.03', '2026-03-27 21:55:24.03', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('d717283e-5d6a-4e0c-96ea-e3f7278eca3e', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Saravena', 'Saravena', '2026-03-27 21:55:24.031', '2026-03-27 21:55:24.031', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ac8c68ce-d616-4e1e-8025-9901976e189d', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Sardinata', 'Sardinata', '2026-03-27 21:55:24.032', '2026-03-27 21:55:24.032', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2e2aa2eb-4da7-49ca-bd29-8304733915a8', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Tame', 'Tame', '2026-03-27 21:55:24.032', '2026-03-27 21:55:24.032', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ba9693b3-fc24-4008-8926-291962dc301c', 'f308d00f-749c-483b-b75f-30dd661c6e05', 'CETAP Tibú', 'Tibú', '2026-03-27 21:55:24.033', '2026-03-27 21:55:24.033', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('52b290a2-609d-4cba-b7dc-4051ec705002', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'CETAP Armenia', 'Armenia', '2026-03-27 21:55:24.036', '2026-03-27 21:55:24.036', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('5f186585-da23-4144-b7d0-b036fc0b4a31', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'CETAP Belén_de_Umbría', 'Belén_de_Umbría', '2026-03-27 21:55:24.037', '2026-03-27 21:55:24.037', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a179d81d-994f-47d5-8fe5-d13894a9604e', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'CETAP Dosquebradas', 'Dosquebradas', '2026-03-27 21:55:24.037', '2026-03-27 21:55:24.037', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f02ebece-c68a-4b38-87ec-3011559a50e7', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'CETAP Filandia', 'Filandia', '2026-03-27 21:55:24.038', '2026-03-27 21:55:24.038', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('cfe51485-e01a-4000-8d1e-9a6aab2e5845', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'CETAP Génova', 'Génova', '2026-03-27 21:55:24.038', '2026-03-27 21:55:24.038', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('dd3e9555-cd24-497b-8b19-c9273ee599f3', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'CETAP Marsella', 'Marsella', '2026-03-27 21:55:24.039', '2026-03-27 21:55:24.039', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b509b61c-b1d9-44b1-b798-8ee7601a1708', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'CETAP Pereira', 'Pereira', '2026-03-27 21:55:24.039', '2026-03-27 21:55:24.039', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('17021ec4-c552-48f8-9523-3b42adf18400', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'CETAP Pueblo_Rico', 'Pueblo_Rico', '2026-03-27 21:55:24.04', '2026-03-27 21:55:24.04', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('79ca2550-f2d1-43bb-bcf8-8605d0bde26a', 'b16cf933-91a4-4be5-9a35-4d6b6013099f', 'CETAP Quinchía', 'Quinchía', '2026-03-27 21:55:24.04', '2026-03-27 21:55:24.04', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('aeb16204-1667-4396-a1e8-a9eebba368bc', '4017ab74-7e31-494a-b7a2-4e77baf6fa73', 'CETAP Barrancabermeja', 'Barrancabermeja', '2026-03-27 21:55:24.042', '2026-03-27 21:55:24.042', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0de76540-1ba8-42ad-8ab7-34ca00219792', '4017ab74-7e31-494a-b7a2-4e77baf6fa73', 'CETAP Bucaramanga', 'Bucaramanga', '2026-03-27 21:55:24.043', '2026-03-27 21:55:24.043', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a58f371a-3d17-4f16-9a4d-059be0b806f1', '4017ab74-7e31-494a-b7a2-4e77baf6fa73', 'CETAP Málaga', 'Málaga', '2026-03-27 21:55:24.043', '2026-03-27 21:55:24.043', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('443dd675-3edb-442e-a15e-7a19cfdbcb67', '4017ab74-7e31-494a-b7a2-4e77baf6fa73', 'CETAP Oiba', 'Oiba', '2026-03-27 21:55:24.044', '2026-03-27 21:55:24.044', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('8e28d45b-0927-44ce-ae82-82b6955fde09', '4017ab74-7e31-494a-b7a2-4e77baf6fa73', 'CETAP San_Gil', 'San_Gil', '2026-03-27 21:55:24.044', '2026-03-27 21:55:24.044', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('6e9d8132-84ec-4eaf-ab33-4d2cdbc367a8', '4017ab74-7e31-494a-b7a2-4e77baf6fa73', 'CETAP Santa_Rosa_Del_Sur', 'Santa_Rosa_Del_Sur', '2026-03-27 21:55:24.045', '2026-03-27 21:55:24.045', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('7c978b79-c027-4d67-ac08-83fba22cb77e', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CETAP Chaparral', 'Chaparral', '2026-03-27 21:55:24.047', '2026-03-27 21:55:24.047', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('dbc27ba9-9553-4220-a19b-22aa943ba56a', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CETAP Flandes', 'Flandes', '2026-03-27 21:55:24.048', '2026-03-27 21:55:24.048', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('725e9497-eaf1-477d-9641-ac40e76cc93e', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CETAP Fresno', 'Fresno', '2026-03-27 21:55:24.049', '2026-03-27 21:55:24.049', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('586682cf-0101-4a93-981e-023ee635f759', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CETAP Ibagué', 'Ibagué', '2026-03-27 21:55:24.049', '2026-03-27 21:55:24.049', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f30aaf75-8325-481d-aa77-1844e1187cdb', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CETAP Líbano', 'Líbano', '2026-03-27 21:55:24.05', '2026-03-27 21:55:24.05', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a25ec14b-07f0-4148-a5fd-b635fb6a1fd7', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CETAP Mariquita', 'Mariquita', '2026-03-27 21:55:24.051', '2026-03-27 21:55:24.051', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('9d1206e8-e9bd-4070-bb8c-8e75db85128c', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CETAP Melgar', 'Melgar', '2026-03-27 21:55:24.052', '2026-03-27 21:55:24.052', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('710f4550-47d3-42f3-81a2-2d36ca714836', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CETAP Planadas', 'Planadas', '2026-03-27 21:55:24.052', '2026-03-27 21:55:24.052', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('3a7a034b-2e5f-4bbb-bb9a-622068c39b3a', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CETAP Purificación', 'Purificación', '2026-03-27 21:55:24.053', '2026-03-27 21:55:24.053', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2748f80e-909c-45a7-8ddb-dbf0ffab568d', 'e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'CETAP Valle_de_San_Juan', 'Valle_de_San_Juan', '2026-03-27 21:55:24.054', '2026-03-27 21:55:24.054', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a7a4f887-ed47-46a9-9df0-80667c5e8e53', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CETAP Buenaventura', 'Buenaventura', '2026-03-27 21:55:24.056', '2026-03-27 21:55:24.056', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('7420f7de-4599-4e48-88d2-b220353a0b21', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CETAP Buga', 'Buga', '2026-03-27 21:55:24.057', '2026-03-27 21:55:24.057', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('c32a2c8d-2c41-4deb-b5f3-7c9e57c110fd', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CETAP Cali', 'Cali', '2026-03-27 21:55:24.057', '2026-03-27 21:55:24.057', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e63ac106-3b14-4a80-bd90-c31d31b0b132', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CETAP Cartago', 'Cartago', '2026-03-27 21:55:24.058', '2026-03-27 21:55:24.058', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('aab8af69-4082-49ae-97f0-da112666ee1b', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CETAP Florida', 'Florida', '2026-03-27 21:55:24.059', '2026-03-27 21:55:24.059', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0d6ccb73-d29c-495f-b844-fd81e64c57a2', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CETAP Pradera', 'Pradera', '2026-03-27 21:55:24.059', '2026-03-27 21:55:24.059', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('fc8e0ff2-8caa-402c-8d08-041590c0a9fa', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CETAP Sevilla', 'Sevilla', '2026-03-27 21:55:24.06', '2026-03-27 21:55:24.06', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('523a9f93-f3f8-433e-9b85-af311e6cce4f', '56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'CETAP Tuluá', 'Tuluá', '2026-03-27 21:55:24.06', '2026-03-27 21:55:24.06', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('153272b2-e968-49b9-90a4-0bed50d0ca5a', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Acandi', 'Acandi', '2026-03-27 21:55:24.062', '2026-03-27 21:55:24.062', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('43e1c0d6-7c00-4e11-9805-9dd30f536123', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Istmina', 'Istmina', '2026-03-27 21:55:24.063', '2026-03-27 21:55:24.063', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('caa284b6-b895-400a-9969-5127a53d6dc8', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Quibdo', 'Quibdo', '2026-03-27 21:55:24.063', '2026-03-27 21:55:24.063', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('216bdcfd-fc2b-4d82-92fc-9638012b708a', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Riosucio', 'Riosucio', '2026-03-27 21:55:24.064', '2026-03-27 21:55:24.064', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0d613eef-307b-477b-9d5a-c8e196731f2e', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Unguia', 'Unguia', '2026-03-27 21:55:24.064', '2026-03-27 21:55:24.064', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('30204286-2afb-4b59-b35a-66bd3caa7dd9', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Amagá', 'Amagá', '2026-03-27 21:55:24.065', '2026-03-27 21:55:24.065', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2fe1b331-197c-421b-b35e-7604bb73b262', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Caicedo', 'Caicedo', '2026-03-27 21:55:24.066', '2026-03-27 21:55:24.066', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e2e50f7c-cfbd-42cf-9450-3ba53c61ea95', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Caucasia', 'Caucasia', '2026-03-27 21:55:24.066', '2026-03-27 21:55:24.066', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('da019b96-1508-4945-b093-5c7bdf703cd0', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP El_Santuario', 'El_Santuario', '2026-03-27 21:55:24.067', '2026-03-27 21:55:24.067', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('87ce2569-70c6-4519-8d5d-f7ee32e324e3', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Fredonia', 'Fredonia', '2026-03-27 21:55:24.068', '2026-03-27 21:55:24.068', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('1542b4f7-2a9d-41cd-851b-3b66b43aaa50', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Valdivia', 'Valdivia', '2026-03-27 21:55:24.068', '2026-03-27 21:55:24.068', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ed5576cf-e569-4fef-b9f0-630ebb6b72a5', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Canalete', 'Canalete', '2026-03-27 21:55:24.069', '2026-03-27 21:55:24.069', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('7fc04c1f-53ee-4209-b27a-60fd5256d82b', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Los_Córdobas', 'Los_Córdobas', '2026-03-27 21:55:24.069', '2026-03-27 21:55:24.069', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f1ccc55f-e122-4e93-822c-b188e1771b00', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Montelíbano', 'Montelíbano', '2026-03-27 21:55:24.07', '2026-03-27 21:55:24.07', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f2755518-bf5d-4748-b118-f98a513bcdd6', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Providencia', 'Providencia', '2026-03-27 21:55:24.071', '2026-03-27 21:55:24.071', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a7928de9-983e-4523-b437-2137b346ab72', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP San_Luis_de_Sincé', 'San_Luis_de_Sincé', '2026-03-27 21:55:24.071', '2026-03-27 21:55:24.071', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2d6498c6-55a0-47fc-9401-3a2d6ddf14b5', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Duitama', 'Duitama', '2026-03-27 21:55:24.072', '2026-03-27 21:55:24.072', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('620254ef-1f63-478f-ab90-1bc8397ca746', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Guateque', 'Guateque', '2026-03-27 21:55:24.073', '2026-03-27 21:55:24.073', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0aefffc6-a9c8-46eb-b96b-308c016cee22', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Paz_de_Ariporo', 'Paz_de_Ariporo', '2026-03-27 21:55:24.074', '2026-03-27 21:55:24.074', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('cebb25f9-2748-4eb1-b100-7a23c413062d', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Puerto_Boyacá', 'Puerto_Boyacá', '2026-03-27 21:55:24.075', '2026-03-27 21:55:24.075', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f63038e9-34a3-4bb4-ae6b-78ddb9c02223', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Aguadas', 'Aguadas', '2026-03-27 21:55:24.076', '2026-03-27 21:55:24.076', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2b9d3ded-e7ec-43a0-9a12-e1cebd84d8cd', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Belalcázar', 'Belalcázar', '2026-03-27 21:55:24.076', '2026-03-27 21:55:24.076', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('c8209c57-ba9e-4b02-ab88-ce8bce7cd8b8', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Chinchiná', 'Chinchiná', '2026-03-27 21:55:24.077', '2026-03-27 21:55:24.077', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f26171da-e310-4d85-8302-ff37e2ec4e18', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Filadelfia', 'Filadelfia', '2026-03-27 21:55:24.078', '2026-03-27 21:55:24.078', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('cb63ec09-0801-4fa1-af75-974983d24a96', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Marmato', 'Marmato', '2026-03-27 21:55:24.079', '2026-03-27 21:55:24.079', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('73519943-b1a5-4645-8df7-80d2cadc5a0a', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Neira', 'Neira', '2026-03-27 21:55:24.079', '2026-03-27 21:55:24.079', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('8e5832d7-e7d6-4e9c-8a21-8133f120534b', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Supía', 'Supía', '2026-03-27 21:55:24.08', '2026-03-27 21:55:24.08', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('016d4575-0661-438e-ab8d-22f4e9494a3b', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Viterbo', 'Viterbo', '2026-03-27 21:55:24.08', '2026-03-27 21:55:24.08', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('06a1b6f6-e86b-4113-a155-b07bb9a014d9', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Patía', 'Patía', '2026-03-27 21:55:24.081', '2026-03-27 21:55:24.081', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('248fff51-1005-4e6b-bef8-2fffa7eaefa7', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Cáqueza', 'Cáqueza', '2026-03-27 21:55:24.081', '2026-03-27 21:55:24.081', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('ab36a093-66ae-4c17-bf98-7377b38f7392', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Cota', 'Cota', '2026-03-27 21:55:24.082', '2026-03-27 21:55:24.082', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('c007bb82-2817-4225-9e1b-58bfe0902d98', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP El_Colegio', 'El_Colegio', '2026-03-27 21:55:24.083', '2026-03-27 21:55:24.083', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('37ace1d3-595c-4e10-8570-1e77a410044a', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Gachalá', 'Gachalá', '2026-03-27 21:55:24.083', '2026-03-27 21:55:24.083', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('027d51a1-ec9b-4dda-9d26-bb69c28723e0', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP La_Mesa', 'La_Mesa', '2026-03-27 21:55:24.084', '2026-03-27 21:55:24.084', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('817df36e-5031-4f6a-925b-c0cdb5770b2a', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Mosquera', 'Mosquera', '2026-03-27 21:55:24.084', '2026-03-27 21:55:24.084', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f6d65ee4-a2ca-4f35-bbc1-b6c445c9df45', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Tocancipá', 'Tocancipá', '2026-03-27 21:55:24.085', '2026-03-27 21:55:24.085', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('0b2a49f5-5149-49af-b7be-0f7b75dd5d97', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Cartagena_del_Chairá', 'Cartagena_del_Chairá', '2026-03-27 21:55:24.086', '2026-03-27 21:55:24.086', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('1b2f92b1-3072-4db6-83b5-4cc47ee6e36f', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Solano', 'Solano', '2026-03-27 21:55:24.086', '2026-03-27 21:55:24.086', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2a6d3f7b-8681-4e49-b48c-c4785964a986', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Páez', 'Páez', '2026-03-27 21:55:24.087', '2026-03-27 21:55:24.087', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('10c3120a-f5e9-4620-8d2c-6ab052930901', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Colombia_Huila', 'Colombia_Huila', '2026-03-27 21:55:24.087', '2026-03-27 21:55:24.087', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('9bf344bd-4f5e-4942-98f6-fdcedb708e9b', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Santa_María', 'Santa_María', '2026-03-27 21:55:24.088', '2026-03-27 21:55:24.088', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('c54e60cc-0ce1-48aa-9adf-a870f214fb53', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Suaza', 'Suaza', '2026-03-27 21:55:24.088', '2026-03-27 21:55:24.088', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b5c8683f-afe4-402a-a84b-8d2fe1017001', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Puerto_Leguízamo', 'Puerto_Leguízamo', '2026-03-27 21:55:24.089', '2026-03-27 21:55:24.089', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a591648e-588b-4437-9f58-d298decb2007', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Cabuyaro', 'Cabuyaro', '2026-03-27 21:55:24.089', '2026-03-27 21:55:24.089', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('6bf54ca2-da6a-4446-bccf-722670a3f3a3', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP El_Castillo', 'El_Castillo', '2026-03-27 21:55:24.09', '2026-03-27 21:55:24.09', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('e2d190e5-7772-4e16-941d-39e21ab25437', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Granada', 'Granada', '2026-03-27 21:55:24.091', '2026-03-27 21:55:24.091', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('25ed9ef2-e3cc-4f4b-bb83-8a0e29dcc3f4', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Inírida', 'Inírida', '2026-03-27 21:55:24.091', '2026-03-27 21:55:24.091', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('93709e7f-e7ae-43e8-b276-6f78c599cd68', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Lejanías', 'Lejanías', '2026-03-27 21:55:24.092', '2026-03-27 21:55:24.092', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('4224587e-0a4c-4532-adc5-7f1b62c8e5b9', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Puerto_Nariño', 'Puerto_Nariño', '2026-03-27 21:55:24.093', '2026-03-27 21:55:24.093', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('8d509715-b87d-46b4-b1b3-66f0f1550aa4', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Albán', 'Albán', '2026-03-27 21:55:24.093', '2026-03-27 21:55:24.093', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('aaa0eef2-c6a5-4f9f-8e26-e3d59e523475', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Buesaco', 'Buesaco', '2026-03-27 21:55:24.094', '2026-03-27 21:55:24.094', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('fa08346e-8878-40fd-a9f3-ff500ef29356', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Chachagüí', 'Chachagüí', '2026-03-27 21:55:24.094', '2026-03-27 21:55:24.094', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('07b76083-3ff7-468a-9b5d-88924ac93569', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Consacá', 'Consacá', '2026-03-27 21:55:24.095', '2026-03-27 21:55:24.095', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('9f6d9ee1-bd8f-4c0f-a999-0cee0f0557f7', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP El_Tablón_de_Gómez', 'El_Tablón_de_Gómez', '2026-03-27 21:55:24.096', '2026-03-27 21:55:24.096', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('874887fe-f9d5-41a5-9e99-0691aeac2fbe', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP El_Tambo', 'El_Tambo', '2026-03-27 21:55:24.097', '2026-03-27 21:55:24.097', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('5a604935-d1d6-4604-b009-a7325e63e8fb', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Guaitarilla', 'Guaitarilla', '2026-03-27 21:55:24.097', '2026-03-27 21:55:24.097', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('eb8149fe-cfb8-4fea-a467-7024845eea61', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Gualmatán', 'Gualmatán', '2026-03-27 21:55:24.098', '2026-03-27 21:55:24.098', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('d9e61568-8153-4def-9f3a-d6280df7fcbe', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Túquerres', 'Túquerres', '2026-03-27 21:55:24.099', '2026-03-27 21:55:24.099', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('9e6ae738-5670-4566-b120-d4026c0d31b6', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Yacuanquer', 'Yacuanquer', '2026-03-27 21:55:24.099', '2026-03-27 21:55:24.099', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('13c32390-f82d-4227-9826-68a1699055a6', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP El_Tarra', 'El_Tarra', '2026-03-27 21:55:24.1', '2026-03-27 21:55:24.1', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('070b999b-b42b-4f01-8beb-b396ae591037', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Gramalote', 'Gramalote', '2026-03-27 21:55:24.101', '2026-03-27 21:55:24.101', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('aedfd51f-4014-4763-b517-1e1d2f8e5f86', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Hacarí', 'Hacarí', '2026-03-27 21:55:24.102', '2026-03-27 21:55:24.102', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('97294947-0e2b-432c-9913-f86f12e07c62', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Pamplona', 'Pamplona', '2026-03-27 21:55:24.103', '2026-03-27 21:55:24.103', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('b4570ea5-caa3-4bdb-a6af-2c8e2d41c157', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Ragonvalia', 'Ragonvalia', '2026-03-27 21:55:24.104', '2026-03-27 21:55:24.104', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('1eb68bdd-4de3-4156-88ab-5a12a7d3de03', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Circasia', 'Circasia', '2026-03-27 21:55:24.104', '2026-03-27 21:55:24.104', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('daa86233-b3cb-4272-8392-b84b6e1f698b', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Santa_Rosa_de_Cabal', 'Santa_Rosa_de_Cabal', '2026-03-27 21:55:24.105', '2026-03-27 21:55:24.105', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('2209c1ea-9c64-47ee-9088-9664f0c300ed', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Cimitarra', 'Cimitarra', '2026-03-27 21:55:24.106', '2026-03-27 21:55:24.106', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('73d5ce4a-6c8a-4ef7-bfe0-dad239ae827a', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Puente_Nacional', 'Puente_Nacional', '2026-03-27 21:55:24.106', '2026-03-27 21:55:24.106', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('f75697f5-a769-4fe5-8112-0bb3fbd4e4b1', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Ataco', 'Ataco', '2026-03-27 21:55:24.107', '2026-03-27 21:55:24.107', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('71a05f12-5cbe-4629-9caa-f9315be82cef', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Coyaima', 'Coyaima', '2026-03-27 21:55:24.108', '2026-03-27 21:55:24.108', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a05372df-d862-4de9-809f-d23c6785b1d5', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Espinal', 'Espinal', '2026-03-27 21:55:24.109', '2026-03-27 21:55:24.109', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('188b4c2d-3ac8-4bb7-b37e-ba4271bcc7bb', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Natagaima', 'Natagaima', '2026-03-27 21:55:24.109', '2026-03-27 21:55:24.109', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('63c74d97-b26f-4c51-951a-de4f801631fa', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP Guadalajara_de_Buga', 'Guadalajara_de_Buga', '2026-03-27 21:55:24.11', '2026-03-27 21:55:24.11', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('a3d51d34-0dfc-44b0-9d26-ea7a0f5f5d26', '2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'CETAP La_Unión_Valle', 'La_Unión_Valle', '2026-03-27 21:55:24.11', '2026-03-27 21:55:24.11', NULL);
INSERT INTO academic_work_plan."Sede" VALUES ('c8d9e0f1-a2b3-4c5d-6e7f-890123456789', '89006b1d-d4df-4604-9afc-7b450d9e6ab4', 'Sede Principal Bogotá', 'Bogotá D.C.', '2026-04-16 12:43:58.4', '2026-04-16 12:43:58.4', NULL);


--
-- Data for Name: SistemaAlerta; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."SistemaAlerta" VALUES ('0c173af1-c1ef-4a2a-a108-4d3da438cb36', 'FALTA_REVISOR_PTA', 'ALTA', 'El PTA de un docente fue enviado, pero no existen evaluadores (Jefatura de Zona) asignados a Bogotá para recibirlo.', '7ea69057-444c-4e3a-a759-b678770afc5a', 'Bogotá', false, '2026-04-16 21:03:11.694-05', '2026-04-16 21:03:11.694-05');


--
-- Data for Name: SolicitudPTA; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Territorial; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."Territorial" VALUES ('f1fcd15e-adf7-4069-be40-2dc069823265', 'Antioquia', 'ANT39', '2026-03-26 19:49:43.135', '2026-03-26 19:49:43.135');
INSERT INTO academic_work_plan."Territorial" VALUES ('e634988f-413f-4668-95ff-4e79259440ca', 'Atlántico', 'ATL8', '2026-03-26 19:49:43.142', '2026-03-26 19:49:43.142');
INSERT INTO academic_work_plan."Territorial" VALUES ('347ec5fb-30ab-4481-a340-f0351875b5ad', 'Bolívar', 'BOL49', '2026-03-26 19:49:43.145', '2026-03-26 19:49:43.145');
INSERT INTO academic_work_plan."Territorial" VALUES ('c5d09ae6-1829-4754-9313-8565fa12cc59', 'Boyacá', 'BOY37', '2026-03-26 19:49:43.149', '2026-03-26 19:49:43.149');
INSERT INTO academic_work_plan."Territorial" VALUES ('593b49db-ba20-410d-8608-9b71af83d2b5', 'Caldas', 'CAL6', '2026-03-26 19:49:43.151', '2026-03-26 19:49:43.151');
INSERT INTO academic_work_plan."Territorial" VALUES ('a0c9722f-e5cf-4e7b-879c-0a31b80b148c', 'Cauca', 'CAU71', '2026-03-26 19:49:43.155', '2026-03-26 19:49:43.155');
INSERT INTO academic_work_plan."Territorial" VALUES ('c783ab18-1bb9-460d-adf2-65e1bf04ffbf', 'Chocó', 'CHO27', '2026-03-26 19:49:43.157', '2026-03-26 19:49:43.157');
INSERT INTO academic_work_plan."Territorial" VALUES ('a465f2d1-428c-473a-934a-12aef33a3d1e', 'Cundinamarca', 'CUN83', '2026-03-26 19:49:43.16', '2026-03-26 19:49:43.16');
INSERT INTO academic_work_plan."Territorial" VALUES ('d4570ed8-585b-4b35-a81d-ac832bb3a509', 'Huila', 'HUI27', '2026-03-26 19:49:43.162', '2026-03-26 19:49:43.162');
INSERT INTO academic_work_plan."Territorial" VALUES ('4fd15522-0bb6-4201-a0be-56b3f2005d5f', 'Meta', 'MET67', '2026-03-26 19:49:43.165', '2026-03-26 19:49:43.165');
INSERT INTO academic_work_plan."Territorial" VALUES ('704438d5-b8c8-425f-9325-f76adf80f00d', 'Nariño', 'NAR2', '2026-03-26 19:49:43.166', '2026-03-26 19:49:43.166');
INSERT INTO academic_work_plan."Territorial" VALUES ('f308d00f-749c-483b-b75f-30dd661c6e05', 'Norte de Santander', 'NOR32', '2026-03-26 19:49:43.169', '2026-03-26 19:49:43.169');
INSERT INTO academic_work_plan."Territorial" VALUES ('f114fead-7205-4395-8a7c-4ae8dc3b8e75', 'Risaralda', 'RIS42', '2026-03-26 19:49:43.171', '2026-03-26 19:49:43.171');
INSERT INTO academic_work_plan."Territorial" VALUES ('4017ab74-7e31-494a-b7a2-4e77baf6fa73', 'Santander', 'SAN60', '2026-03-26 19:49:43.174', '2026-03-26 19:49:43.174');
INSERT INTO academic_work_plan."Territorial" VALUES ('e1d65b0a-dc23-47ee-be1e-fbf99787562f', 'Tolima', 'TOL20', '2026-03-26 19:49:43.176', '2026-03-26 19:49:43.176');
INSERT INTO academic_work_plan."Territorial" VALUES ('56b5732a-2dfe-4aa3-bd8a-8f151b839f62', 'Valle', 'VAL18', '2026-03-26 19:49:43.179', '2026-03-26 19:49:43.179');
INSERT INTO academic_work_plan."Territorial" VALUES ('324f6a0b-c8ea-4bb6-9ac2-c6226182c763', 'Sede Central', 'SED67', '2026-03-26 19:49:43.182', '2026-03-26 19:49:43.182');
INSERT INTO academic_work_plan."Territorial" VALUES ('89006b1d-d4df-4604-9afc-7b450d9e6ab4', 'Bogotá', 'BOG', '2026-03-26 21:34:16.292', '2026-03-26 21:34:16.292');
INSERT INTO academic_work_plan."Territorial" VALUES ('a8efc316-bf6f-42ba-a247-39097d81d781', 'Valle del Cauca', 'VAL', '2026-03-26 21:34:16.306', '2026-03-26 21:34:16.306');
INSERT INTO academic_work_plan."Territorial" VALUES ('b16cf933-91a4-4be5-9a35-4d6b6013099f', 'Quindío - Risaralda', NULL, '2026-03-27 21:55:24.034', '2026-03-27 21:55:24.034');
INSERT INTO academic_work_plan."Territorial" VALUES ('2ba5b471-a849-4ea3-8d6f-ffd1a8b41cf4', 'Nodos Agregados', NULL, '2026-03-27 21:55:24.061', '2026-03-27 21:55:24.061');


--
-- Data for Name: Usuario; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."Usuario" VALUES ('6d411d0f-74b9-4bc0-ae15-73c753cb0dcb', 'docente1@esap.edu.co', '$2b$10$OGefFWFJI5wHEc4MHRkVx.4SS6DHdsLQpEltWSxKRKe3VF04VmAk.', 'Carlos Arturo Martínez', true, '2026-03-27 13:26:28.381', '2026-03-27 13:26:28.381');
INSERT INTO academic_work_plan."Usuario" VALUES ('ffedf106-7837-457a-bfeb-3e3cf47328c2', 'docente2@esap.edu.co', '$2b$10$OGefFWFJI5wHEc4MHRkVx.4SS6DHdsLQpEltWSxKRKe3VF04VmAk.', 'María Fernanda López', true, '2026-03-27 13:26:28.394', '2026-03-27 13:26:28.394');
INSERT INTO academic_work_plan."Usuario" VALUES ('0235be4e-9c05-4e55-8115-9bf06ed03afb', 'docente3@esap.edu.co', '$2b$10$OGefFWFJI5wHEc4MHRkVx.4SS6DHdsLQpEltWSxKRKe3VF04VmAk.', 'Jorge Eliecer Gaitán', true, '2026-03-27 13:26:28.401', '2026-03-27 13:26:28.401');
INSERT INTO academic_work_plan."Usuario" VALUES ('d3d84d3c-226a-47ea-8086-86636232c698', 'docente4@esap.edu.co', '$2b$10$OGefFWFJI5wHEc4MHRkVx.4SS6DHdsLQpEltWSxKRKe3VF04VmAk.', 'Diana Marcela Ruiz', true, '2026-03-27 13:26:28.407', '2026-03-27 13:26:28.407');
INSERT INTO academic_work_plan."Usuario" VALUES ('6d2f4278-979b-4c66-a14f-fbdbb8f7f27f', 'registro@esap.edu.co', '$2b$10$mVh0DfF6eBWckuLxiV4HTuUUv/gUmCs78K28VAYUTTjBEFkEePq9a', 'Admin Registro Académico', true, '2026-03-31 00:49:45.774', '2026-03-31 00:50:28.342');
INSERT INTO academic_work_plan."Usuario" VALUES ('e53b58a0-df58-432a-af93-596ca9b19b0d', 'docente@esap.edu.co', '$2b$10$e4iStvJjJdFI8X33dKwTieV2e4b2vCpgrlSWNUNVKi6EQu39XKjxG', 'Hernan Buitrago', true, '2026-03-31 18:19:06.566', '2026-03-31 20:32:38.402');
INSERT INTO academic_work_plan."Usuario" VALUES ('0f771888-1b65-40d5-b89f-bc7599a86361', 'certificados@esap.edu.co', '$2b$10$zhCJgqwsF7U9u4ehoJ2yHOgsm.3kUd5H6LQuANAeAsKc878bljj5m', 'Admin Certificados', true, '2026-03-31 00:55:16.386', '2026-03-31 00:55:16.386');
INSERT INTO academic_work_plan."Usuario" VALUES ('5ec7977f-2b59-434f-95c6-580bd80a4a34', 'funcionario@esap.edu.co', '$2b$10$e4iStvJjJdFI8X33dKwTieV2e4b2vCpgrlSWNUNVKi6EQu39XKjxG', 'Funcionario Administrativo', true, '2026-03-31 19:29:39.432', '2026-03-31 19:29:39.432');
INSERT INTO academic_work_plan."Usuario" VALUES ('027caebd-dadb-481b-98ac-cb2faa13177f', 'gestion.profesoral@esap.edu.co', '$2b$10$e4iStvJjJdFI8X33dKwTieV2e4b2vCpgrlSWNUNVKi6EQu39XKjxG', 'Admin Gestion Profesoral', true, '2026-03-31 19:29:39.443', '2026-03-31 19:29:39.443');
INSERT INTO academic_work_plan."Usuario" VALUES ('84a85d7b-b25f-4232-b8fa-3530b74adf77', 'director.academico@esap.edu.co', '$2b$10$e4iStvJjJdFI8X33dKwTieV2e4b2vCpgrlSWNUNVKi6EQu39XKjxG', 'Director Academico Nacional', true, '2026-03-31 19:29:39.457', '2026-03-31 19:29:39.457');
INSERT INTO academic_work_plan."Usuario" VALUES ('59d135fd-9648-48b3-b3e1-37b9d822efc3', 'decanatura@esap.edu.co', '$2b$10$e4iStvJjJdFI8X33dKwTieV2e4b2vCpgrlSWNUNVKi6EQu39XKjxG', 'Decano Facultad', true, '2026-03-31 19:29:39.465', '2026-03-31 19:29:39.465');
INSERT INTO academic_work_plan."Usuario" VALUES ('200285aa-e22f-4a2b-a6ad-b875de4d7add', 'jefatura.antioquia@esap.edu.co', '$2b$10$e4iStvJjJdFI8X33dKwTieV2e4b2vCpgrlSWNUNVKi6EQu39XKjxG', 'Jefatura de Zona Antioquia', true, '2026-03-31 19:29:39.481', '2026-03-31 19:29:39.481');
INSERT INTO academic_work_plan."Usuario" VALUES ('ae56d58c-5077-4744-bc1e-7bd20ce4fbbf', 'jefatura.valle@esap.edu.co', '$2b$10$e4iStvJjJdFI8X33dKwTieV2e4b2vCpgrlSWNUNVKi6EQu39XKjxG', 'Jefatura de Zona Valle', true, '2026-03-31 19:29:39.494', '2026-03-31 19:29:39.494');
INSERT INTO academic_work_plan."Usuario" VALUES ('af729b37-e704-444f-a6cf-a46e32d8b461', 'administrativo@esap.edu.co', '$2b$10$8SZktFpXi9gs9yuFaGIYTOR9JnQBCt1Mp.Vf1KqMEM.C0wrtm2RCy', 'Juan Perez Administrativo', true, '2026-03-31 00:59:26.286', '2026-03-31 00:59:26.286');
INSERT INTO academic_work_plan."Usuario" VALUES ('809a97a1-95de-4065-97c4-63a4715861bb', 'superuser@esap.edu.co', '$2b$10$e4iStvJjJdFI8X33dKwTieV2e4b2vCpgrlSWNUNVKi6EQu39XKjxG', 'Super Usuario ESAP', true, '2026-03-25 20:00:25.341', '2026-03-31 19:29:39.414');
INSERT INTO academic_work_plan."Usuario" VALUES ('4939e095-e40c-4dc8-8d13-3700e66bf857', 'abelabel@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ABEL ANTONIO ABELLA BELTRAN', true, '2026-03-27 11:44:40.233', '2026-03-27 11:44:40.233');
INSERT INTO academic_work_plan."Usuario" VALUES ('7cd89a78-09d9-4ba4-b91e-eddce7eea0b1', 'albegira@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ALBERTO GIRALDO SAAVEDRA', true, '2026-03-27 11:44:40.253', '2026-03-27 11:44:40.253');
INSERT INTO academic_work_plan."Usuario" VALUES ('24a58417-6a63-465d-add9-a1d5c5240a30', 'alexander.arciniegas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ALEXANDER ARCINIEGAS CARREÑO', true, '2026-03-27 11:44:40.263', '2026-03-27 11:44:40.263');
INSERT INTO academic_work_plan."Usuario" VALUES ('0fb161dc-861d-4bb2-8ce2-9c43173b963f', 'alexander.cotte@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ALEXANDER COTTE POVEDA', true, '2026-03-27 11:44:40.271', '2026-03-27 11:44:40.271');
INSERT INTO academic_work_plan."Usuario" VALUES ('700e56d6-b96c-4d52-a040-43cb85d3863a', 'alexander.parada@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ALEXANDER PARADA VALENCIA', true, '2026-03-27 11:44:40.278', '2026-03-27 11:44:40.278');
INSERT INTO academic_work_plan."Usuario" VALUES ('697353bf-72ea-4a2a-a975-2b69443a288f', 'alix.hurtado@esap.edu.co;alixhurt@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ALIX ZULAY HURTADO SOTO', true, '2026-03-27 11:44:40.287', '2026-03-27 11:44:40.287');
INSERT INTO academic_work_plan."Usuario" VALUES ('a9c1f219-99cf-4e9e-9b4e-d8ea08f5dc2b', 'alvaro.cruzv@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ALVARO CRUZ VARON', true, '2026-03-27 11:44:40.292', '2026-03-27 11:44:40.292');
INSERT INTO academic_work_plan."Usuario" VALUES ('2304e59d-b3fd-4260-8db3-751ea0ae53a6', 'alvaro.mercado@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ALVARO LUIS MERCADO SUAREZ', true, '2026-03-27 11:44:40.298', '2026-03-27 11:44:40.298');
INSERT INTO academic_work_plan."Usuario" VALUES ('3bf36118-d597-40d5-8aa0-fb06a256c3a5', 'anycabrera88@gmail.com', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ANA ESTELA CABRERA PUCHANA', true, '2026-03-27 11:44:40.303', '2026-03-27 11:44:40.303');
INSERT INTO academic_work_plan."Usuario" VALUES ('7ad2fd15-f8c7-4190-bc13-739189f8c019', 'ana.torres@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ANA MARIA TORRES HERNANDEZ', true, '2026-03-27 11:44:40.308', '2026-03-27 11:44:40.308');
INSERT INTO academic_work_plan."Usuario" VALUES ('e1f3408f-7254-492a-8f08-9338c25b1449', 'andrea.bonelo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ANDREA MARCELA BONELO CHAVARRO', true, '2026-03-27 11:44:40.314', '2026-03-27 11:44:40.314');
INSERT INTO academic_work_plan."Usuario" VALUES ('264d09bb-d628-44e6-a24b-2b0d5188a9c6', 'andres.dezubiria@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ANDRES DE ZUBIRIA SAMPER', true, '2026-03-27 11:44:40.319', '2026-03-27 11:44:40.319');
INSERT INTO academic_work_plan."Usuario" VALUES ('0cb75bb2-54ea-48a6-9a49-3697d046ff2e', 'andres.gomezr@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ANDRES GOMEZ ROLDAN', true, '2026-03-27 11:44:40.324', '2026-03-27 11:44:40.324');
INSERT INTO academic_work_plan."Usuario" VALUES ('2a6f4f4c-4442-49f3-9778-511891570680', 'andres.guzman@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ANDRES MAURICIO GUZMAN RINCON', true, '2026-03-27 11:44:40.33', '2026-03-27 11:44:40.33');
INSERT INTO academic_work_plan."Usuario" VALUES ('3982515d-4e1f-436d-9c68-b237b3b4e205', 'angelicaf.bernal@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ANGELICA FABIOLA BERNAL OLARTE', true, '2026-03-27 11:44:40.336', '2026-03-27 11:44:40.336');
INSERT INTO academic_work_plan."Usuario" VALUES ('def49971-2f2e-4a0a-ab63-cc551822249b', 'anibal.mendoza@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ANIBAL MENDOZA DAZA', true, '2026-03-27 11:44:40.342', '2026-03-27 11:44:40.342');
INSERT INTO academic_work_plan."Usuario" VALUES ('69977ddf-1156-4666-980b-42e1a8c464c9', 'antonio.pedroza@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ANTONIO YESID PEDROZA ESTRADA', true, '2026-03-27 11:44:40.348', '2026-03-27 11:44:40.348');
INSERT INTO academic_work_plan."Usuario" VALUES ('03353ae8-80e1-45e0-858d-f5b2b007aeb1', 'aristides.pena@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ARISTIDES PEÑA ZUÑIGA', true, '2026-03-27 11:44:40.354', '2026-03-27 11:44:40.354');
INSERT INTO academic_work_plan."Usuario" VALUES ('a20d2fa9-d094-48ad-a2f5-a31cd42c6e07', 'beatriz.rengifo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'BEATRIZ ANDREA RENGIFO RENGIFO', true, '2026-03-27 11:44:40.359', '2026-03-27 11:44:40.359');
INSERT INTO academic_work_plan."Usuario" VALUES ('bbe48038-a205-40b4-8d58-2d15050804ec', 'beltranrestrepo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'BELTRAN DE JESUS RESTREPO ARREDONDO', true, '2026-03-27 11:44:40.365', '2026-03-27 11:44:40.365');
INSERT INTO academic_work_plan."Usuario" VALUES ('54f05ee4-39c7-417c-bd14-ff2b6c884114', 'biafara.ledezma@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'BIAFARA DE JESUS LEDEZMA GARCIA', true, '2026-03-27 11:44:40.372', '2026-03-27 11:44:40.372');
INSERT INTO academic_work_plan."Usuario" VALUES ('86a3f245-4090-4921-9b08-35b12489bd4a', 'blas.melendez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'BLAS MELENDEZ CARABALLO', true, '2026-03-27 11:44:40.377', '2026-03-27 11:44:40.377');
INSERT INTO academic_work_plan."Usuario" VALUES ('62d8667e-3e27-45d2-aa8c-790e00e21a4d', 'breicast@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'BREIDY FERNANDO CASTRO CAMPOS', true, '2026-03-27 11:44:40.383', '2026-03-27 11:44:40.383');
INSERT INTO academic_work_plan."Usuario" VALUES ('e9967a69-b9c8-480c-9941-98f824d0e472', 'camilo.clavijo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CAMILO CLAVIJO GARCIA', true, '2026-03-27 11:44:40.388', '2026-03-27 11:44:40.388');
INSERT INTO academic_work_plan."Usuario" VALUES ('ced26d4c-f34b-4a72-99b4-fd8ef2439bf1', 'camilo.uribe@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CAMILO JOSE URIBE OTERO', true, '2026-03-27 11:44:40.393', '2026-03-27 11:44:40.393');
INSERT INTO academic_work_plan."Usuario" VALUES ('6fbf6c60-9506-45bd-b820-a967f3b36d83', 'carlos.gsalazar@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CARLOS ALBERTO GUTIERREZ SALAZAR', true, '2026-03-27 11:44:40.398', '2026-03-27 11:44:40.398');
INSERT INTO academic_work_plan."Usuario" VALUES ('2dda6299-b6f2-4ede-8b87-d497dc248ce0', 'cpardo1129@hotmail.com', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CARLOS ALFONSO PARDO TORRES', true, '2026-03-27 11:44:40.404', '2026-03-27 11:44:40.404');
INSERT INTO academic_work_plan."Usuario" VALUES ('4812a2ce-b8e6-476e-badc-2e95ccc26d4c', 'carlos.barco@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CARLOS ANDRES BARCO ROJAS', true, '2026-03-27 11:44:40.411', '2026-03-27 11:44:40.411');
INSERT INTO academic_work_plan."Usuario" VALUES ('15e2eadf-6a55-4885-9860-8e6e2e1ae6dd', 'carlos.brochet@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CARLOS ANDRES BROCHET BAYONA', true, '2026-03-27 11:44:40.416', '2026-03-27 11:44:40.416');
INSERT INTO academic_work_plan."Usuario" VALUES ('619c0c18-5554-453d-bb3c-3858eb601757', 'carlos.leiton@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CARLOS ANDRES LEITON PIAMBA', true, '2026-03-27 11:44:40.422', '2026-03-27 11:44:40.422');
INSERT INTO academic_work_plan."Usuario" VALUES ('68880c27-960f-4ea5-b7a3-4b57d966c13b', 'carlos.glopez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CARLOS EDUARDO GARCIA LOPEZ ', true, '2026-03-27 11:44:40.427', '2026-03-27 11:44:40.427');
INSERT INTO academic_work_plan."Usuario" VALUES ('15f2918e-3840-4b8a-a9e4-1fb9a09cc349', 'carlosf.forero@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CARLOS FERNEY FORERO HERNANDEZ', true, '2026-03-27 11:44:40.433', '2026-03-27 11:44:40.433');
INSERT INTO academic_work_plan."Usuario" VALUES ('d1d3101a-da8a-43f0-ba08-072f53646f77', 'carlosh.fajardo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CARLOS HERNAN FAJARDO TORO', true, '2026-03-27 11:44:40.438', '2026-03-27 11:44:40.438');
INSERT INTO academic_work_plan."Usuario" VALUES ('6f7a87bb-34d4-4740-a1a6-1cf07c9eca28', 'carlos.rojas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CARLOS MAURICIO ROJAS GUEZGUAN', true, '2026-03-27 11:44:40.443', '2026-03-27 11:44:40.443');
INSERT INTO academic_work_plan."Usuario" VALUES ('1578978b-ced0-4290-be5c-c1e56f015275', 'carlmore@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CARLOS MORENO OSPINA', true, '2026-03-27 11:44:40.448', '2026-03-27 11:44:40.448');
INSERT INTO academic_work_plan."Usuario" VALUES ('78ee3ac9-e3db-4932-bfd1-625ca7e74a33', 'carolina.garcia@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CAROLINA GARCIA SANCHEZ', true, '2026-03-27 11:44:40.453', '2026-03-27 11:44:40.453');
INSERT INTO academic_work_plan."Usuario" VALUES ('0d0aff4c-0ac7-4567-9c8b-e41b85425643', 'cayetano.jimenez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CAYETANO JIMENEZ MUNIVE', true, '2026-03-27 11:44:40.458', '2026-03-27 11:44:40.458');
INSERT INTO academic_work_plan."Usuario" VALUES ('de664374-ab7f-4fef-a1fd-d2dfbf4b397f', 'cesar.ramirez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CESAR ALEJANDRO RAMIREZ CHAPARRO', true, '2026-03-27 11:44:40.463', '2026-03-27 11:44:40.463');
INSERT INTO academic_work_plan."Usuario" VALUES ('85251896-32e0-4229-bc69-c975e42b5bf4', 'cesar.vanegas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CESAR ARTURO VANEGAS RODRIGUEZ', true, '2026-03-27 11:44:40.468', '2026-03-27 11:44:40.468');
INSERT INTO academic_work_plan."Usuario" VALUES ('f618dacb-6f4e-4950-b221-80801c014f08', 'christian.narvaez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CHRISTIAN ALEXANDER NARVAEZ ALVAREZ', true, '2026-03-27 11:44:40.473', '2026-03-27 11:44:40.473');
INSERT INTO academic_work_plan."Usuario" VALUES ('70f40b66-e543-495a-89eb-7050d48ac127', 'christian.ortega@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CHRISTIAN FELIPE ORTEGA GOMEZ', true, '2026-03-27 11:44:40.479', '2026-03-27 11:44:40.479');
INSERT INTO academic_work_plan."Usuario" VALUES ('3d0990dd-3679-4625-bef1-31c21c4987ff', 'clara.collazos@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CLARA INES COLLAZOS MARTINEZ', true, '2026-03-27 11:44:40.485', '2026-03-27 11:44:40.485');
INSERT INTO academic_work_plan."Usuario" VALUES ('3691ee52-7657-4e53-9745-2f500efa4f14', 'claudia.jurado@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CLAUDIA JURADO ALVARAN', true, '2026-03-27 11:44:40.49', '2026-03-27 11:44:40.49');
INSERT INTO academic_work_plan."Usuario" VALUES ('18749f7c-c357-4cfe-8057-46f296a0974a', 'claudias.rodriguez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'CLAUDIA SOFIA RODRIGUEZ BERNAL', true, '2026-03-27 11:44:40.495', '2026-03-27 11:44:40.495');
INSERT INTO academic_work_plan."Usuario" VALUES ('5e759aa1-d742-42ef-9a6d-3f181a2245e9', 'dagoberto.torres@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DAGOBERTO TORRES FLOREZ', true, '2026-03-27 11:44:40.499', '2026-03-27 11:44:40.499');
INSERT INTO academic_work_plan."Usuario" VALUES ('5990c94b-67b6-4d81-baaa-980d7aa9392a', 'daniel.unigarro@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DANIEL ESTEBAN UNIGARRO CAGUASANGO', true, '2026-03-27 11:44:40.504', '2026-03-27 11:44:40.504');
INSERT INTO academic_work_plan."Usuario" VALUES ('2e840f18-d534-4ae1-8fc1-de49072af8c9', 'danielo.munoz@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DANIEL OSWALDO MUÑOZ CASTRO', true, '2026-03-27 11:44:40.509', '2026-03-27 11:44:40.509');
INSERT INTO academic_work_plan."Usuario" VALUES ('f58ab47a-6234-43ea-927f-05746337d396', 'daniela.mejian@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DANIELA MEJÍA NARANJO', true, '2026-03-27 11:44:40.514', '2026-03-27 11:44:40.514');
INSERT INTO academic_work_plan."Usuario" VALUES ('ad03f36a-0694-433c-87d0-76a70133779e', 'davidj.molina@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DAVID JULIAN MOLINA BELTRAN', true, '2026-03-27 11:44:40.521', '2026-03-27 11:44:40.521');
INSERT INTO academic_work_plan."Usuario" VALUES ('39f67b82-7e52-462d-9f3b-70f33883f20f', 'david.quitian@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DAVID LEONARDO QUITIAN ROLDAN', true, '2026-03-27 11:44:40.526', '2026-03-27 11:44:40.526');
INSERT INTO academic_work_plan."Usuario" VALUES ('e1f8cf29-dcf5-49e6-8d05-38a36ddf089d', 'deam.lermen@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DEAN LERMEN GONZALEZ', true, '2026-03-27 11:44:40.53', '2026-03-27 11:44:40.53');
INSERT INTO academic_work_plan."Usuario" VALUES ('cd76076a-3b29-40d7-9a01-206f4e514568', 'delio.balcazar@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DELIO ALEXANDER BALCAZAR CAMACHO', true, '2026-03-27 11:44:40.536', '2026-03-27 11:44:40.536');
INSERT INTO academic_work_plan."Usuario" VALUES ('30337b81-1b8b-448e-a2d1-762463230770', 'dhorton.pino@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DHORTON PINO SERNA', true, '2026-03-27 11:44:40.542', '2026-03-27 11:44:40.542');
INSERT INTO academic_work_plan."Usuario" VALUES ('3df0437e-daf4-4c44-9b85-5ff8c62b305a', 'diana.rico@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DIANA CAROLINA RICO REVELO', true, '2026-03-27 11:44:40.547', '2026-03-27 11:44:40.547');
INSERT INTO academic_work_plan."Usuario" VALUES ('df6e663a-b0d4-4340-a932-30c044f02fc7', 'dianvrodr@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DIANA VICTORIA RODRIGUEZ VEGA', true, '2026-03-27 11:44:40.551', '2026-03-27 11:44:40.551');
INSERT INTO academic_work_plan."Usuario" VALUES ('2169218f-95c1-40e5-a02b-35350425ed2a', 'diego.guevara@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DIEGO ANDRES GUEVARA FLETCHER', true, '2026-03-27 11:44:40.557', '2026-03-27 11:44:40.557');
INSERT INTO academic_work_plan."Usuario" VALUES ('f426ef90-b054-44cf-8eb0-a86b4293ae80', 'diego.aldana@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DIEGO ARMANDO ALDANA SANCHEZ', true, '2026-03-27 11:44:40.561', '2026-03-27 11:44:40.561');
INSERT INTO academic_work_plan."Usuario" VALUES ('68ce2ca7-08a7-4a74-89cf-eeab0a4d2d67', 'diego.jurado@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'DIEGO ARMANDO JURADO ZAMBRANO', true, '2026-03-27 11:44:40.566', '2026-03-27 11:44:40.566');
INSERT INTO academic_work_plan."Usuario" VALUES ('bd18974a-f880-409a-9f43-c2e09b551dfd', 'alberto.pena@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'EDGAR ALBERTO PEÑA ESPINOSA', true, '2026-03-27 11:44:40.571', '2026-03-27 11:44:40.571');
INSERT INTO academic_work_plan."Usuario" VALUES ('7fb62874-00ca-4625-82bc-eb19e7665081', 'edgar.guerrero@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'EDGAR EDUARDO GUERRERO RODRIGUEZ', true, '2026-03-27 11:44:40.576', '2026-03-27 11:44:40.576');
INSERT INTO academic_work_plan."Usuario" VALUES ('0b3b49ff-a97f-4185-8ac2-5086d7c06220', 'edgamart@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'EDGAR ENRIQUE MARTINEZ CARDENAS', true, '2026-03-27 11:44:40.581', '2026-03-27 11:44:40.581');
INSERT INTO academic_work_plan."Usuario" VALUES ('564ffd85-0092-4db5-a49f-76f07aac12ba', 'edgar.rodriguez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'EDGAR RODRIGUEZ DIAZ', true, '2026-03-27 11:44:40.586', '2026-03-27 11:44:40.586');
INSERT INTO academic_work_plan."Usuario" VALUES ('bd81ba90-804a-471b-aec0-fbf3ce2a791b', 'eduardo.botero@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'EDUARDO ANDRES BOTERO CEDEÑO', true, '2026-03-27 11:44:40.595', '2026-03-27 11:44:40.595');
INSERT INTO academic_work_plan."Usuario" VALUES ('92be8ea8-9b50-4274-8125-380252234393', 'eduardo.delgado@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'EDUARDO YOVANY DELGADO MENESES', true, '2026-03-27 11:44:40.603', '2026-03-27 11:44:40.603');
INSERT INTO academic_work_plan."Usuario" VALUES ('4a44ceca-1bc4-434f-8f45-8c8a37e505e2', 'edwin.tapia@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'EDWIN MANUEL TAPIA GONGORA', true, '2026-03-27 11:44:40.607', '2026-03-27 11:44:40.607');
INSERT INTO academic_work_plan."Usuario" VALUES ('d2e1d843-3791-47eb-a101-c24cd76ade84', 'edwin.murilloa@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'EDWIN MURILLO AMARIS', true, '2026-03-27 11:44:40.612', '2026-03-27 11:44:40.612');
INSERT INTO academic_work_plan."Usuario" VALUES ('93d023ac-bcb3-4808-a2b7-ce3e7a16ac24', 'eimer.barajas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'EIMER ALEXIS BARAJAS ROMAN', true, '2026-03-27 11:44:40.618', '2026-03-27 11:44:40.618');
INSERT INTO academic_work_plan."Usuario" VALUES ('9288a6b3-f160-4297-b57e-0162c15fe7a6', 'elsybarr@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ELSY LUZ BARRERA', true, '2026-03-27 11:44:40.623', '2026-03-27 11:44:40.623');
INSERT INTO academic_work_plan."Usuario" VALUES ('4a8058d9-30c6-4181-b5de-3cb3f0126d74', 'erlinto.velasco@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ERLINTO VELASCO ARTEAGA', true, '2026-03-27 11:44:40.627', '2026-03-27 11:44:40.627');
INSERT INTO academic_work_plan."Usuario" VALUES ('7c03c6f4-7d01-4ebc-be75-09bdaa1b0870', 'esthparr@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ESTHER PARRA RAMIREZ', true, '2026-03-27 11:44:40.632', '2026-03-27 11:44:40.632');
INSERT INTO academic_work_plan."Usuario" VALUES ('d4468e98-c7b3-4fdd-8104-3e69360e0475', 'eunice.ramirez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'EUNICE RAMIREZ VARON', true, '2026-03-27 11:44:40.637', '2026-03-27 11:44:40.637');
INSERT INTO academic_work_plan."Usuario" VALUES ('53832af7-5a89-4014-a042-ce1b18ee16e0', 'fabian.salazar@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'FABIAN ENRIQUE SALAZAR VILLANO', true, '2026-03-27 11:44:40.641', '2026-03-27 11:44:40.641');
INSERT INTO academic_work_plan."Usuario" VALUES ('2503d6db-d45a-4dfa-bf30-6036c906b621', 'fabian.romero@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'FABIAN LEONARDO ROMERO BOLIVAR', true, '2026-03-27 11:44:40.646', '2026-03-27 11:44:40.646');
INSERT INTO academic_work_plan."Usuario" VALUES ('f60d0be5-96b3-4282-92ab-4091c75a4bcb', 'fernan.fortich@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'FERNAN FORTICH PACHECO', true, '2026-03-27 11:44:40.651', '2026-03-27 11:44:40.651');
INSERT INTO academic_work_plan."Usuario" VALUES ('35fc5e75-a59e-4594-b950-d091add0732e', 'fabautista@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'FRANCISCO ALBERTO BAUTISTA', true, '2026-03-27 11:44:40.656', '2026-03-27 11:44:40.656');
INSERT INTO academic_work_plan."Usuario" VALUES ('a2c77f1c-23cc-4a2a-b90c-b4cc196c4963', 'francisco.mejia@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'FRANCISCO EDUARDO MEJIA LEMA', true, '2026-03-27 11:44:40.661', '2026-03-27 11:44:40.661');
INSERT INTO academic_work_plan."Usuario" VALUES ('7fffdfe1-3e1a-41c5-9793-5fe6595b1eca', 'franciscoj.vargas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'FRANSISCO JAVIER VARGAS CRUZ', true, '2026-03-27 11:44:40.666', '2026-03-27 11:44:40.666');
INSERT INTO academic_work_plan."Usuario" VALUES ('b3427551-1aa3-4aa8-86c2-b1081b37aae9', 'fredy.cante@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'FREDY EDUARDO CANTE MALDONADO', true, '2026-03-27 11:44:40.671', '2026-03-27 11:44:40.671');
INSERT INTO academic_work_plan."Usuario" VALUES ('4e7139ad-bf1c-40ca-91ed-16ab0027003d', 'fredy.andrade@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'FREDY WILLIAM ANDRADE PEREZ', true, '2026-03-27 11:44:40.676', '2026-03-27 11:44:40.676');
INSERT INTO academic_work_plan."Usuario" VALUES ('1f1e5e9b-1112-40d9-bc82-5c37a0b78e3e', 'fredys.padilla@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'FREDYS PADILLA GONZALEZ', true, '2026-03-27 11:44:40.682', '2026-03-27 11:44:40.682');
INSERT INTO academic_work_plan."Usuario" VALUES ('47df95ca-4100-4da8-b0d0-903d389a67ac', 'gabriel.villalobos@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GABRIEL VILLALOBOS CAMARGO', true, '2026-03-27 11:44:40.687', '2026-03-27 11:44:40.687');
INSERT INTO academic_work_plan."Usuario" VALUES ('f9df7cee-b34a-4ec2-bd8b-885b24834877', 'german.molina@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GERMAN ANDRES MOLINA GARRIDO', true, '2026-03-27 11:44:40.691', '2026-03-27 11:44:40.691');
INSERT INTO academic_work_plan."Usuario" VALUES ('72cec4de-e5ab-4eb6-ba43-58afc91f347d', 'german.carvajal@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GERMAN CARVAJAL AHUMADA', true, '2026-03-27 11:44:40.695', '2026-03-27 11:44:40.695');
INSERT INTO academic_work_plan."Usuario" VALUES ('642862b1-0a24-4369-9368-d4bdb58e322c', 'german.marin@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GERMAN MARIN ZAFRA', true, '2026-03-27 11:44:40.701', '2026-03-27 11:44:40.701');
INSERT INTO academic_work_plan."Usuario" VALUES ('42fcbae9-8680-44df-a311-227d501c5df4', 'geydi.demarchi@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GEYDI DAHIANA DEMARCHI SANCHEZ', true, '2026-03-27 11:44:40.705', '2026-03-27 11:44:40.705');
INSERT INTO academic_work_plan."Usuario" VALUES ('90d32d08-2f4a-4031-a2c6-2df1350be860', 'gilma.vanegas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GILMA SOCORRO VANEGAS ROMERO', true, '2026-03-27 11:44:40.71', '2026-03-27 11:44:40.71');
INSERT INTO academic_work_plan."Usuario" VALUES ('be277eed-1829-4683-a8a7-426029778b56', 'giovanni.castro@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GIOVANNI MAURICIO CASTRO LEGUIZAMON ', true, '2026-03-27 11:44:40.717', '2026-03-27 11:44:40.717');
INSERT INTO academic_work_plan."Usuario" VALUES ('48d4acaf-4cb9-4818-a643-48428f17457d', 'gladys.torres@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GLADYS ANDREA TORRES ESTEPA', true, '2026-03-27 11:44:40.723', '2026-03-27 11:44:40.723');
INSERT INTO academic_work_plan."Usuario" VALUES ('939bee58-5eb9-4350-be65-205f2afc2ea5', 'glynisl.panesso@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GLYNIS LUCIA PANESSO CHAVERRA', true, '2026-03-27 11:44:40.729', '2026-03-27 11:44:40.729');
INSERT INTO academic_work_plan."Usuario" VALUES ('25d85f9c-8b18-4339-ab22-a8e16f659fc8', 'graciliana.moreno@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GRACILIANA MORENO ECHAVARRIA', true, '2026-03-27 11:44:40.734', '2026-03-27 11:44:40.734');
INSERT INTO academic_work_plan."Usuario" VALUES ('f87fea88-c2ba-498c-b6c2-9a8a114ff9f3', 'gustavo.munoz@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'GUSTAVO ADOLFO MUÑOZ GAVIRIA', true, '2026-03-27 11:44:40.739', '2026-03-27 11:44:40.739');
INSERT INTO academic_work_plan."Usuario" VALUES ('d8f2a18c-7ad4-4c10-9342-d6ab92a93705', 'hamilton.ruiz@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'HAMILTON MAURICIO RUIZ', true, '2026-03-27 11:44:40.743', '2026-03-27 11:44:40.743');
INSERT INTO academic_work_plan."Usuario" VALUES ('5d6831ac-5837-4322-9020-7e6fb435c060', 'harvey.criollo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'HARVEY OLIVER CRIOLLO MANCHABAJOY', true, '2026-03-27 11:44:40.749', '2026-03-27 11:44:40.749');
INSERT INTO academic_work_plan."Usuario" VALUES ('479867eb-1430-490d-b78e-b4874b32df09', 'hectpinz@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'HECTOR ELIAS PINZON TORRES', true, '2026-03-27 11:44:40.753', '2026-03-27 11:44:40.753');
INSERT INTO academic_work_plan."Usuario" VALUES ('6ad22a77-8ff9-402e-bddf-09e9aa40df4f', 'helver.cadavid@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'HELVER JAVIER CADAVID RAMIREZ', true, '2026-03-27 11:44:40.759', '2026-03-27 11:44:40.759');
INSERT INTO academic_work_plan."Usuario" VALUES ('d0e2cc94-0c7f-4914-a061-ad68fcb0e781', 'henrye.gonzalez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'HENRY ERNESTO GONZALEZ BECERRA', true, '2026-03-27 11:44:40.764', '2026-03-27 11:44:40.764');
INSERT INTO academic_work_plan."Usuario" VALUES ('ce642f57-e36a-4d5d-997c-8a4b9f0bc2a5', 'hernando.perdomog@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'HERNANDO PERDOMO GOMEZ', true, '2026-03-27 11:44:40.77', '2026-03-27 11:44:40.77');
INSERT INTO academic_work_plan."Usuario" VALUES ('8d6d8380-b72d-4dcb-a6bd-b9cda9ff9426', 'herwin.cardona@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'HERWIN EDUARDO CARDONA QUITIAN', true, '2026-03-27 11:44:40.775', '2026-03-27 11:44:40.775');
INSERT INTO academic_work_plan."Usuario" VALUES ('642c3b15-85fe-47d8-b7f9-d63e52468d22', 'hortensia.perez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'HORTENSIA DEL SOCORRO PEREZ VARGAS', true, '2026-03-27 11:44:40.78', '2026-03-27 11:44:40.78');
INSERT INTO academic_work_plan."Usuario" VALUES ('c8b9bb4e-f08d-4322-9db8-eb1e3188d25d', 'hugo.ortiz@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'HUGO DANIEL ORTIZ VANEGAS', true, '2026-03-27 11:44:40.785', '2026-03-27 11:44:40.785');
INSERT INTO academic_work_plan."Usuario" VALUES ('7adfc256-5975-47dc-884f-a0d43532d016', 'ildebrando.arevalo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ILDEBRANDO AREVALO OSORIO', true, '2026-03-27 11:44:40.79', '2026-03-27 11:44:40.79');
INSERT INTO academic_work_plan."Usuario" VALUES ('bc80bfc0-a6d4-45a1-8296-f2dce672d87a', 'jacipine@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JACINTO PINEDA JIMENEZ', true, '2026-03-27 11:44:40.794', '2026-03-27 11:44:40.794');
INSERT INTO academic_work_plan."Usuario" VALUES ('965a2949-0d36-49d1-b2be-f1d2a8aed9ce', 'jaider.acosta@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JAIDER FREDERICH ACOSTA GUZMAN', true, '2026-03-27 11:44:40.799', '2026-03-27 11:44:40.799');
INSERT INTO academic_work_plan."Usuario" VALUES ('a7f83e6e-8714-47b6-a14b-0ddcd20b29ff', 'jaimgome@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JAIME ALBERTO GOMEZ WALTEROS', true, '2026-03-27 11:44:40.804', '2026-03-27 11:44:40.804');
INSERT INTO academic_work_plan."Usuario" VALUES ('01afe66c-0f76-468b-a18a-254509c485b5', 'jaimmore@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JAIME MORENO QUIJANO', true, '2026-03-27 11:44:40.808', '2026-03-27 11:44:40.808');
INSERT INTO academic_work_plan."Usuario" VALUES ('94c0ef9e-3b6c-4196-a2d0-e682b1a3acd2', 'jairdiaz@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JAIRO ALBERTO DIAZ PINZON', true, '2026-03-27 11:44:40.813', '2026-03-27 11:44:40.813');
INSERT INTO academic_work_plan."Usuario" VALUES ('cc98f80d-cd90-42c7-a135-10965d826900', 'jairo.rincon@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JAIRO ELIAS RINCON PACHON', true, '2026-03-27 11:44:40.819', '2026-03-27 11:44:40.819');
INSERT INTO academic_work_plan."Usuario" VALUES ('35f3b575-b31d-4e0e-8cf7-d83328e44367', 'jairo.munoz@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JAIRO HUMBERTO MUÑOZ CABRERA', true, '2026-03-27 11:44:40.823', '2026-03-27 11:44:40.823');
INSERT INTO academic_work_plan."Usuario" VALUES ('7942eb91-3c77-4f39-81d1-f1e9654a6ccd', 'jairo.vargas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JAIRO VARGAS LEON', true, '2026-03-27 11:44:40.828', '2026-03-27 11:44:40.828');
INSERT INTO academic_work_plan."Usuario" VALUES ('bd0adc81-9c0d-4dd2-afec-460deaaa77c1', 'jakeline.vargas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JAKELINE VARGAS PARRA', true, '2026-03-27 11:44:40.834', '2026-03-27 11:44:40.834');
INSERT INTO academic_work_plan."Usuario" VALUES ('3eb359d4-ee16-4f83-828e-ec597a4d0b51', 'javier.delahoz@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JAVIER ENRIQUE DE LA HOZ MERCADO', true, '2026-03-27 11:44:40.839', '2026-03-27 11:44:40.839');
INSERT INTO academic_work_plan."Usuario" VALUES ('95b572ea-bd2c-4dd9-ab3f-1aef5ea1a42d', 'javier.gacharna@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JAVIER FERMIN GACHARNA MUÑOZ', true, '2026-03-27 11:44:40.844', '2026-03-27 11:44:40.844');
INSERT INTO academic_work_plan."Usuario" VALUES ('5b52954a-09c0-426c-a913-5843c9de8256', 'jeammy.sierra@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JEAMMY JULIETH SIERRA HERNANDEZ', true, '2026-03-27 11:44:40.849', '2026-03-27 11:44:40.849');
INSERT INTO academic_work_plan."Usuario" VALUES ('6d7cf66a-53bb-4ac4-b9b9-df53b53c7392', 'jenny.lopez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JENNY ELISA LOPEZ RODRIGUEZ', true, '2026-03-27 11:44:40.854', '2026-03-27 11:44:40.854');
INSERT INTO academic_work_plan."Usuario" VALUES ('7c31af1b-fcb2-444b-b1db-a7362c9064ec', 'jerson.ortega@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JERSON SANTIAGO ORTEGA BONFANTE', true, '2026-03-27 11:44:40.861', '2026-03-27 11:44:40.861');
INSERT INTO academic_work_plan."Usuario" VALUES ('8234aa34-a6bc-4cd8-bb97-69e0529020af', 'jesubaut@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JESUS CAMILO BAUTISTA BELTRAN', true, '2026-03-27 11:44:40.865', '2026-03-27 11:44:40.865');
INSERT INTO academic_work_plan."Usuario" VALUES ('5a6d8798-fccc-425d-a0b8-797c7f0f5f19', 'jesus.bohorquez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JESUS EDUARDO BOHORQUEZ MENDEZ', true, '2026-03-27 11:44:40.87', '2026-03-27 11:44:40.87');
INSERT INTO academic_work_plan."Usuario" VALUES ('a325a2df-9f2a-4c73-9c4e-f80abfa26452', 'jesumoli@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JESUS MARIA MOLINA GIRALDO', true, '2026-03-27 11:44:40.875', '2026-03-27 11:44:40.875');
INSERT INTO academic_work_plan."Usuario" VALUES ('96d7ada1-90d0-4c9c-a9bc-f23880d50088', 'jesus.paguatian@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JESUS PAGUATIAN SANCHEZ', true, '2026-03-27 11:44:40.88', '2026-03-27 11:44:40.88');
INSERT INTO academic_work_plan."Usuario" VALUES ('122e2cc7-9778-4f58-a4b7-3fb3bb42d02b', 'jhon.loaizag@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JHON ALEXANDER LOAIZA GONZALEZ', true, '2026-03-27 11:44:40.884', '2026-03-27 11:44:40.884');
INSERT INTO academic_work_plan."Usuario" VALUES ('12d8bc7a-5ab5-42f8-a47c-f0a530c43fbd', 'alexmuno@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JHON ALEXANDER MUÑOZ GOMEZ', true, '2026-03-27 11:44:40.891', '2026-03-27 11:44:40.891');
INSERT INTO academic_work_plan."Usuario" VALUES ('110af442-5fd5-42a9-8c32-74eb21fe38f5', 'jhon.abadia@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JHON FRANCISCO ABADIA MOYA', true, '2026-03-27 11:44:40.897', '2026-03-27 11:44:40.897');
INSERT INTO academic_work_plan."Usuario" VALUES ('ca20fe6a-e6c7-46e4-8747-6ca98d033faa', 'jhon.galvis@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JHON FREDY GALVIS PEREZ', true, '2026-03-27 11:44:40.903', '2026-03-27 11:44:40.903');
INSERT INTO academic_work_plan."Usuario" VALUES ('f27cadc7-4ddc-4747-b9aa-afac1bb7bd89', 'joaquin.beltran@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOAQUIN BELTRAN RADA', true, '2026-03-27 11:44:40.908', '2026-03-27 11:44:40.908');
INSERT INTO academic_work_plan."Usuario" VALUES ('12f76477-137b-44a7-a353-0e668009957c', 'johnj.cuellar@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOHN JAIRO CUELLAR ESCOBAR', true, '2026-03-27 11:44:40.913', '2026-03-27 11:44:40.913');
INSERT INTO academic_work_plan."Usuario" VALUES ('794e71f6-bc82-4165-8b57-b34afa181aa6', 'jonathan.cervantes@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JONATHAN ALBERTO CERVANTES BARRAZA', true, '2026-03-27 11:44:40.918', '2026-03-27 11:44:40.918');
INSERT INTO academic_work_plan."Usuario" VALUES ('1a024499-2555-4a25-ba01-13c8f4a5c89e', 'jonny.barreto@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JONNY FERNANDO BARRETO CASTAÑEDA', true, '2026-03-27 11:44:40.924', '2026-03-27 11:44:40.924');
INSERT INTO academic_work_plan."Usuario" VALUES ('520edf31-3a53-4f4e-bca4-e57cbc3af210', 'jorge.bautista@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JORGE ELIECER BAUTISTA RODRIGUEZ', true, '2026-03-27 11:44:40.93', '2026-03-27 11:44:40.93');
INSERT INTO academic_work_plan."Usuario" VALUES ('8500e69b-e3ea-4a97-a42c-cc97a3fd0c9a', 'jorgefern@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JORGE ELIECER FERNANDEZ RUBIO', true, '2026-03-27 11:44:40.936', '2026-03-27 11:44:40.936');
INSERT INTO academic_work_plan."Usuario" VALUES ('1fe0bea5-4f89-47c3-9f62-58f29f93666e', 'ivanmari@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JORGE IVAN MARIN TABORDA', true, '2026-03-27 11:44:40.942', '2026-03-27 11:44:40.942');
INSERT INTO academic_work_plan."Usuario" VALUES ('4351c418-6aaa-48cb-a055-20b5f49f3b57', 'jorge.mejiat@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JORGE MEJIA TURIZO', true, '2026-03-27 11:44:40.947', '2026-03-27 11:44:40.947');
INSERT INTO academic_work_plan."Usuario" VALUES ('798fc8ab-af5c-4a32-9812-ce9211d85fbc', 'jorge.matajira@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JORGE MILTON MATAJIRA VERA', true, '2026-03-27 11:44:40.953', '2026-03-27 11:44:40.953');
INSERT INTO academic_work_plan."Usuario" VALUES ('ad11652e-0dec-42b5-bc4d-50b72938fb66', 'jorge.moralesp@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JORGE MORALES PAREDES', true, '2026-03-27 11:44:40.96', '2026-03-27 11:44:40.96');
INSERT INTO academic_work_plan."Usuario" VALUES ('73c4ec0f-1339-4174-85b6-8f32e7171c54', 'josea.loaiza@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE ALDEMAR LOAIZA NARANJO', true, '2026-03-27 11:44:40.967', '2026-03-27 11:44:40.967');
INSERT INTO academic_work_plan."Usuario" VALUES ('8d504780-7034-4b21-8826-c7a7acdcad1d', 'josecuel@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE ALEJANDRO CUELLAR TOVAR', true, '2026-03-27 11:44:40.973', '2026-03-27 11:44:40.973');
INSERT INTO academic_work_plan."Usuario" VALUES ('8020cc22-9709-46b4-b3ce-5c0cf1e45fc5', 'jose.garnica@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE ARMANDO SANTIAGO GARNICA', true, '2026-03-27 11:44:40.979', '2026-03-27 11:44:40.979');
INSERT INTO academic_work_plan."Usuario" VALUES ('2fd80fa3-bcc9-4aa8-b4b9-011f601ef65d', 'jose.correa@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE DEL CARMEN CORREA ALFONSO', true, '2026-03-27 11:44:40.985', '2026-03-27 11:44:40.985');
INSERT INTO academic_work_plan."Usuario" VALUES ('8f641b2f-d687-4ecf-8a1b-688dea70142f', 'jose.urreste@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE ENRIQUE URRESTE CAMPO', true, '2026-03-27 11:44:40.991', '2026-03-27 11:44:40.991');
INSERT INTO academic_work_plan."Usuario" VALUES ('9bae06a0-1953-4e0a-af1b-1be20a6b43e2', 'jose.fmunoz@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE FERNANDO MUÑOZ OSPINA', true, '2026-03-27 11:44:40.996', '2026-03-27 11:44:40.996');
INSERT INTO academic_work_plan."Usuario" VALUES ('ee23a671-2d1f-483c-99b9-7d21907a5cde', 'josepuel@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE FRANCISCO PUELLO SOCARRAS', true, '2026-03-27 11:44:41.002', '2026-03-27 11:44:41.002');
INSERT INTO academic_work_plan."Usuario" VALUES ('4a4118a3-ebff-4cd1-b9c5-8f01e54320a2', 'jose.solorzanom@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE GREGORIO SOLORZANO MOVILLA', true, '2026-03-27 11:44:41.006', '2026-03-27 11:44:41.006');
INSERT INTO academic_work_plan."Usuario" VALUES ('cf89873f-7660-451a-bca3-4472dabb8f8b', 'joseh.martinez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE HONORIO MARTINEZ TORRES', true, '2026-03-27 11:44:41.011', '2026-03-27 11:44:41.011');
INSERT INTO academic_work_plan."Usuario" VALUES ('8631bfdc-dcd5-48a4-a81b-8526ea8dad40', 'lisandro.bernal@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE LISANDRO BERNAL VELASCO', true, '2026-03-27 11:44:41.017', '2026-03-27 11:44:41.017');
INSERT INTO academic_work_plan."Usuario" VALUES ('ca7491f2-020a-4a64-8251-83b13fe96ac3', 'jose.silvas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE LUIS SILVA SUAREZ', true, '2026-03-27 11:44:41.021', '2026-03-27 11:44:41.021');
INSERT INTO academic_work_plan."Usuario" VALUES ('f671ee07-52d9-40f0-89ec-bf02acfa3596', 'josemjimenez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE MARIA JIMENEZ MUNIVE', true, '2026-03-27 11:44:41.027', '2026-03-27 11:44:41.027');
INSERT INTO academic_work_plan."Usuario" VALUES ('700af6dd-d322-48f7-95d1-16e801991117', 'jose.mayorga@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE MIGUEL MAYORGA GONZALEZ', true, '2026-03-27 11:44:41.033', '2026-03-27 11:44:41.033');
INSERT INTO academic_work_plan."Usuario" VALUES ('ba6dd614-90be-4d04-ba7d-1365257e71f1', 'josesilv@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE PLACIDO SILVA RUIZ', true, '2026-03-27 11:44:41.037', '2026-03-27 11:44:41.037');
INSERT INTO academic_work_plan."Usuario" VALUES ('4c15364c-297a-404a-9c4b-5286bb113b8e', 'jose.alvarez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE RICARDO ALVAREZ PUERTO', true, '2026-03-27 11:44:41.043', '2026-03-27 11:44:41.043');
INSERT INTO academic_work_plan."Usuario" VALUES ('25e96179-3b21-495f-9cc2-4018332ffab6', 'jose.calcetero@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE ROBERTO CALCETERO GUTIERREZ', true, '2026-03-27 11:44:41.047', '2026-03-27 11:44:41.047');
INSERT INTO academic_work_plan."Usuario" VALUES ('f641cbd2-61d3-4878-b53e-a3e87fcb068e', 'joseye.rodriguezm@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JOSE YEZID RODRIGUEZ MARTINEZ', true, '2026-03-27 11:44:41.052', '2026-03-27 11:44:41.052');
INSERT INTO academic_work_plan."Usuario" VALUES ('134807d7-12f8-4fb6-be83-5bdde72f3b1e', 'juan.pena@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JUAN ARTURO PEÑA LABRADOR', true, '2026-03-27 11:44:41.057', '2026-03-27 11:44:41.057');
INSERT INTO academic_work_plan."Usuario" VALUES ('3c28466d-e60d-4222-ad5f-ba371ea50a11', 'juan.zambrano@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JUAN CAMILO ZAMBRANO DE LA HOZ', true, '2026-03-27 11:44:41.063', '2026-03-27 11:44:41.063');
INSERT INTO academic_work_plan."Usuario" VALUES ('d5af3eda-68a0-48fd-a65e-7bdc1bd36d39', 'juan.castro@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JUAN CARLOS CASTRO BAÑOS', true, '2026-03-27 11:44:41.069', '2026-03-27 11:44:41.069');
INSERT INTO academic_work_plan."Usuario" VALUES ('b9c1f001-1d7e-40f7-bb96-dbf47e34485d', 'juan.correa@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JUAN CARLOS CORREA GÓMEZ', true, '2026-03-27 11:44:41.074', '2026-03-27 11:44:41.074');
INSERT INTO academic_work_plan."Usuario" VALUES ('0188cdde-722c-4d4d-b490-7da2b134ca2f', 'juan.gonzalez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JUAN CARLOS GONZALEZ VILLA', true, '2026-03-27 11:44:41.079', '2026-03-27 11:44:41.079');
INSERT INTO academic_work_plan."Usuario" VALUES ('6a38f0f7-5cc7-464f-a6d0-a289f47f0959', 'juan.quinteroc@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JUAN CARLOS QUINTERO CALVACHE', true, '2026-03-27 11:44:41.085', '2026-03-27 11:44:41.085');
INSERT INTO academic_work_plan."Usuario" VALUES ('2ff5d566-ba29-411a-b0d7-5378630e5912', 'juan.zapata@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JUAN CARLOS ZAPATA MARIN', true, '2026-03-27 11:44:41.089', '2026-03-27 11:44:41.089');
INSERT INTO academic_work_plan."Usuario" VALUES ('a572cecd-ffc8-4d01-8a20-cd24fe0de50d', 'juanj.sandoval@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JUAN DE JESUS SANDOVAL', true, '2026-03-27 11:44:41.094', '2026-03-27 11:44:41.094');
INSERT INTO academic_work_plan."Usuario" VALUES ('4410c201-6ec6-4717-9c02-0efe84d0851c', 'julian.barreto@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JULIAN CAMILO BARRETO GARCIA', true, '2026-03-27 11:44:41.099', '2026-03-27 11:44:41.099');
INSERT INTO academic_work_plan."Usuario" VALUES ('74331b1b-5a7f-4c71-a3e3-5526e892f2ea', 'julian.lopez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JULIAN FELIPE BELLO LOPEZ', true, '2026-03-27 11:44:41.105', '2026-03-27 11:44:41.105');
INSERT INTO academic_work_plan."Usuario" VALUES ('7e7167f0-2687-4cfa-bfcd-777a22f72f0a', 'julieth.rojas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JULIETH KARINA ROJAS GRANADOS', true, '2026-03-27 11:44:41.11', '2026-03-27 11:44:41.11');
INSERT INTO academic_work_plan."Usuario" VALUES ('56b208c2-8bf2-40f7-8e43-eb409833e70c', 'julio.caro@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JULIO CESAR CARO MORENO', true, '2026-03-27 11:44:41.115', '2026-03-27 11:44:41.115');
INSERT INTO academic_work_plan."Usuario" VALUES ('fc36d9b8-c2fc-442e-8dcf-66ceedd59a84', 'julio.cortes@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JULIO CESAR CORTES MUÑOZ', true, '2026-03-27 11:44:41.119', '2026-03-27 11:44:41.119');
INSERT INTO academic_work_plan."Usuario" VALUES ('221727a4-3da2-4c32-8fa4-56954731c2e8', 'julio.vasquez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JULIO CESAR VASQUEZ FIGUEROA', true, '2026-03-27 11:44:41.123', '2026-03-27 11:44:41.123');
INSERT INTO academic_work_plan."Usuario" VALUES ('829cbb78-d19f-4f0f-aebc-edcc51a39682', 'julios.escobar@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'JULIO SIMON ESCOBAR OSTOS', true, '2026-03-27 11:44:41.128', '2026-03-27 11:44:41.128');
INSERT INTO academic_work_plan."Usuario" VALUES ('d7f3bc02-6999-4e35-bcf0-84004853c300', 'karim.ramirez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'KARIM LORENA RAMIREZ PARRA', true, '2026-03-27 11:44:41.133', '2026-03-27 11:44:41.133');
INSERT INTO academic_work_plan."Usuario" VALUES ('4d941eea-122d-4e40-b705-68678c781fbd', 'info@krupscaiasterling.com', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'KRUPSCAIA ROIMA STERLING SANCHEZ', true, '2026-03-27 11:44:41.138', '2026-03-27 11:44:41.138');
INSERT INTO academic_work_plan."Usuario" VALUES ('b7e7ffb5-1c99-41f8-9b45-23e2f4d41fb4', 'lady.suarez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LADY ANDREA SUAREZ CARVAJAL', true, '2026-03-27 11:44:41.142', '2026-03-27 11:44:41.142');
INSERT INTO academic_work_plan."Usuario" VALUES ('4cfe90c3-4c60-4d47-9def-29b0a0dcd31f', 'carolina.bayona@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LADY CAROLINA BAYONA ESTUPIÑAN', true, '2026-03-27 11:44:41.146', '2026-03-27 11:44:41.146');
INSERT INTO academic_work_plan."Usuario" VALUES ('b8e30621-2361-4ec4-bfea-7f9163c446cf', 'leandrog.tamara@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LEANDRO GONZALEZ TAMARA', true, '2026-03-27 11:44:41.151', '2026-03-27 11:44:41.151');
INSERT INTO academic_work_plan."Usuario" VALUES ('da594af3-d86f-4500-ab6d-57c900dad99a', 'leidy.ariza@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LEIDY JOHANA ARIZA MARIN', true, '2026-03-27 11:44:41.155', '2026-03-27 11:44:41.155');
INSERT INTO academic_work_plan."Usuario" VALUES ('668e2676-4563-4cee-9ac8-b736d707ce17', 'leonardo.medina@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LEONARDO FABIO MEDINA ORTIZ', true, '2026-03-27 11:44:41.159', '2026-03-27 11:44:41.159');
INSERT INTO academic_work_plan."Usuario" VALUES ('73fde91b-c3f6-4fac-b94b-857b72434b62', 'lida.rivillas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LIDA PATRICIA RIVILLAS VALENCIA', true, '2026-03-27 11:44:41.164', '2026-03-27 11:44:41.164');
INSERT INTO academic_work_plan."Usuario" VALUES ('e043b713-f9f8-45ce-b1c1-9c6f2baa4789', 'lorenzo.noguera@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LORENZO ANTONIO NOGUERA', true, '2026-03-27 11:44:41.168', '2026-03-27 11:44:41.168');
INSERT INTO academic_work_plan."Usuario" VALUES ('3b3a02f8-67ad-41ad-a878-065d4a6ae762', 'luis.galeano@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUIS ALBERTO GALEANO ESCUCHA', true, '2026-03-27 11:44:41.173', '2026-03-27 11:44:41.173');
INSERT INTO academic_work_plan."Usuario" VALUES ('3217e256-c55b-42ee-b664-c73604e25235', 'luis.sanchez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUIS ALFONSO SANCHEZ CARDONA', true, '2026-03-27 11:44:41.177', '2026-03-27 11:44:41.177');
INSERT INTO academic_work_plan."Usuario" VALUES ('d7b92c2e-1a27-4676-95fa-4aa9b72850c7', 'luisc.toro@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUIS CARLOS TORO MARULANDA', true, '2026-03-27 11:44:41.182', '2026-03-27 11:44:41.182');
INSERT INTO academic_work_plan."Usuario" VALUES ('a3347397-7ee3-4a79-885f-9bdcac098e89', 'luis.amador@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUIS EDUARDO AMADOR CABRA', true, '2026-03-27 11:44:41.187', '2026-03-27 11:44:41.187');
INSERT INTO academic_work_plan."Usuario" VALUES ('8dc43de1-5d44-4ab2-91a7-d1d8369f8b3f', 'luise.torres@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUIS EDUARDO TORRES GALVIS', true, '2026-03-27 11:44:41.191', '2026-03-27 11:44:41.191');
INSERT INTO academic_work_plan."Usuario" VALUES ('4fb59748-8d88-449a-b350-411ac60247e0', 'luis.macea@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUIS FERNANDO MACEA MERCADO', true, '2026-03-27 11:44:41.196', '2026-03-27 11:44:41.196');
INSERT INTO academic_work_plan."Usuario" VALUES ('4fe67f09-76b4-4622-ae4b-016d783487d3', 'luis.duran@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUIS HERNANDO DURAN ANTOLINEZ', true, '2026-03-27 11:44:41.201', '2026-03-27 11:44:41.201');
INSERT INTO academic_work_plan."Usuario" VALUES ('3e3445e6-024d-475b-a640-bc7b882a411d', 'luis.pacheco@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUIS JAIR PACHECO', true, '2026-03-27 11:44:41.208', '2026-03-27 11:44:41.208');
INSERT INTO academic_work_plan."Usuario" VALUES ('e68f1bcc-0e20-4418-a67b-0670941a3605', 'luis.cabrera@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUIS MIGUEL CABRERA GONZALEZ', true, '2026-03-27 11:44:41.214', '2026-03-27 11:44:41.214');
INSERT INTO academic_work_plan."Usuario" VALUES ('20f46d5b-affc-43f6-93db-cdae6c50c0c1', 'luis.beltran@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUIS NELSON BELTRAN MORA', true, '2026-03-27 11:44:41.218', '2026-03-27 11:44:41.218');
INSERT INTO academic_work_plan."Usuario" VALUES ('0652dfad-a3ce-4dfd-bb4f-993b5203c67f', 'luz.mejia@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUZ ADRIANA MEJIA ALVAREZ', true, '2026-03-27 11:44:41.223', '2026-03-27 11:44:41.223');
INSERT INTO academic_work_plan."Usuario" VALUES ('771c9889-899a-4642-9e14-44172fd60e89', 'luz.santamaria@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LUZ STELLA SANTAMARIA DE FUENTES', true, '2026-03-27 11:44:41.228', '2026-03-27 11:44:41.228');
INSERT INTO academic_work_plan."Usuario" VALUES ('3357aead-5b8d-46bd-ad4c-a1946939102d', 'lydam.herrera@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'LYDA MARCELA HERRERA CAMARGO', true, '2026-03-27 11:44:41.233', '2026-03-27 11:44:41.233');
INSERT INTO academic_work_plan."Usuario" VALUES ('12d4d07b-8f4b-4831-a21b-45a8b35e7a37', 'manubayo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MANUEL BAYONA SARMIENTO', true, '2026-03-27 11:44:41.237', '2026-03-27 11:44:41.237');
INSERT INTO academic_work_plan."Usuario" VALUES ('c5de86b2-5ba7-431c-8c8f-abb6de917627', 'manuel.andrade@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MANUEL ENRIQUE ANDRADE CUESTA', true, '2026-03-27 11:44:41.242', '2026-03-27 11:44:41.242');
INSERT INTO academic_work_plan."Usuario" VALUES ('53268f4d-c452-4f3c-aef0-e49afae98ebc', 'manuel.peralta@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MANUEL ESTEBAN PERALTA MATOS', true, '2026-03-27 11:44:41.245', '2026-03-27 11:44:41.245');
INSERT INTO academic_work_plan."Usuario" VALUES ('0d044f42-1238-418b-8cf1-db959c49eec5', 'manuel.contento@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MANUEL RICARDO CONTENTO RUBIO', true, '2026-03-27 11:44:41.25', '2026-03-27 11:44:41.25');
INSERT INTO academic_work_plan."Usuario" VALUES ('a12f9eae-282a-4828-953b-81b224425a27', 'mara.amador@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARA LUZ AMADOR GIL', true, '2026-03-27 11:44:41.255', '2026-03-27 11:44:41.255');
INSERT INTO academic_work_plan."Usuario" VALUES ('0fd1fbe0-523d-4d4e-9e79-1a14bff1ba74', 'marcela.guerrero@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARCELA BIBIANA GUERRERO ROJAS', true, '2026-03-27 11:44:41.259', '2026-03-27 11:44:41.259');
INSERT INTO academic_work_plan."Usuario" VALUES ('7b7b1725-14d1-4e2e-abe8-9b227e996b25', 'margarita.medina@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARGARITA ROSA MEDINA VARGAS', true, '2026-03-27 11:44:41.263', '2026-03-27 11:44:41.263');
INSERT INTO academic_work_plan."Usuario" VALUES ('98e95cca-1d04-443b-9b3f-e56b49599abe', 'maria.hernandezl@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARIA CAROLINA HERNANDEZ LOSADA', true, '2026-03-27 11:44:41.267', '2026-03-27 11:44:41.267');
INSERT INTO academic_work_plan."Usuario" VALUES ('2476b4b7-7bb2-4c1f-97cb-d276245ef44e', 'mariap.sanchez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARIA DEL PILAR SANCHEZ MUÑOZ', true, '2026-03-27 11:44:41.271', '2026-03-27 11:44:41.271');
INSERT INTO academic_work_plan."Usuario" VALUES ('ee235e25-b79e-4892-ab65-4e896ee6be39', 'mariae.moncada@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARIA ELVIA MONCADA MARROQUIN', true, '2026-03-27 11:44:41.275', '2026-03-27 11:44:41.275');
INSERT INTO academic_work_plan."Usuario" VALUES ('524db7d3-ff80-4a65-b292-0674b1a5f5f9', 'maria.quinonez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARIA EUNICE QUIÑONEZ VARON ', true, '2026-03-27 11:44:41.279', '2026-03-27 11:44:41.279');
INSERT INTO academic_work_plan."Usuario" VALUES ('7bd590b9-2dde-4e78-ab46-ad185a223a39', 'maria.peralta@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARIA FERNANDA PERALTA GOYES', true, '2026-03-27 11:44:41.283', '2026-03-27 11:44:41.283');
INSERT INTO academic_work_plan."Usuario" VALUES ('3b928245-1484-484d-b6fb-3fb0c364a0bb', 'mariasier@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARIA LUCIA SIERRA SIERRA', true, '2026-03-27 11:44:41.288', '2026-03-27 11:44:41.288');
INSERT INTO academic_work_plan."Usuario" VALUES ('6db6c8e4-fb9c-4779-8d8f-a5b5075a08d5', 'marino.rengifo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARINO RENGIFO GARCIA', true, '2026-03-27 11:44:41.292', '2026-03-27 11:44:41.292');
INSERT INTO academic_work_plan."Usuario" VALUES ('a9483132-e406-496a-9f8c-821d81d1b07d', 'mario.zambrano@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARIO DE JESUS ZAMBRANO MIRANDA', true, '2026-03-27 11:44:41.296', '2026-03-27 11:44:41.296');
INSERT INTO academic_work_plan."Usuario" VALUES ('bc49e6c6-ce96-4bb9-8526-55814887573d', 'marthal.lealp@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARTHA LILIANA LEAL PULIDO', true, '2026-03-27 11:44:41.3', '2026-03-27 11:44:41.3');
INSERT INTO academic_work_plan."Usuario" VALUES ('9c8ee192-97bd-40a4-a72f-e33ff250f9d8', 'martha.vives@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARTHA PATRICIA VIVES HURTADO', true, '2026-03-27 11:44:41.306', '2026-03-27 11:44:41.306');
INSERT INTO academic_work_plan."Usuario" VALUES ('92d809b8-819f-4909-83d6-4ff417e246f6', 'mary.ortega@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MARY CRUZ ORTEGA HERNANDEZ', true, '2026-03-27 11:44:41.31', '2026-03-27 11:44:41.31');
INSERT INTO academic_work_plan."Usuario" VALUES ('3a23577a-cb08-45c5-8846-df31452a98f9', 'mauricio.jaimes@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MAURICIO JAIMES ROA', true, '2026-03-27 11:44:41.316', '2026-03-27 11:44:41.316');
INSERT INTO academic_work_plan."Usuario" VALUES ('b3934931-e20b-4403-9fb7-0e1b31d905df', 'mauricioj.luna@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MAURICIO JAVIER LUNA GALVAN', true, '2026-03-27 11:44:41.32', '2026-03-27 11:44:41.32');
INSERT INTO academic_work_plan."Usuario" VALUES ('465f6a78-f9c3-4a2f-83b0-8b2c3eaa691e', 'mauricio.tellez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MAURICIO TELLEZ VERA', true, '2026-03-27 11:44:41.324', '2026-03-27 11:44:41.324');
INSERT INTO academic_work_plan."Usuario" VALUES ('7decffd5-fa34-4656-92af-c7dfb167dfe1', 'miguel.borja@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MIGUEL ANTONIO BORJA ALARCON', true, '2026-03-27 11:44:41.329', '2026-03-27 11:44:41.329');
INSERT INTO academic_work_plan."Usuario" VALUES ('a42a0a32-e7c1-4da7-acd4-d417aaed4bf4', 'myriam.florez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MIRIAM LUCIA FLOREZ VILLOTA', true, '2026-03-27 11:44:41.334', '2026-03-27 11:44:41.334');
INSERT INTO academic_work_plan."Usuario" VALUES ('a7c9fe2f-6611-4791-87f8-0891713b07be', 'monica.fortich@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'MONICA PATRICIA FORTICH NAVARRO', true, '2026-03-27 11:44:41.338', '2026-03-27 11:44:41.338');
INSERT INTO academic_work_plan."Usuario" VALUES ('f5f32565-97a1-470e-a556-0cf7320c0c7c', 'nadin.madderaa@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'NADIN ANDRES MADERA ARIAS', true, '2026-03-27 11:44:41.342', '2026-03-27 11:44:41.342');
INSERT INTO academic_work_plan."Usuario" VALUES ('2c110578-f13a-4e68-9867-011f6a96f03d', 'naidu.duque@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'NAIDU DUQUE CANTE', true, '2026-03-27 11:44:41.346', '2026-03-27 11:44:41.346');
INSERT INTO academic_work_plan."Usuario" VALUES ('ebcffe83-44e5-405c-800e-b7ae02973a5c', 'nathaly.burbano@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'NATHALY BURBANO MUÑOZ', true, '2026-03-27 11:44:41.35', '2026-03-27 11:44:41.35');
INSERT INTO academic_work_plan."Usuario" VALUES ('2ec94bf1-edea-45c3-9ce0-a591623fab78', 'neise.vanegas@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'NEISE VANEGAS NIETO', true, '2026-03-27 11:44:41.354', '2026-03-27 11:44:41.354');
INSERT INTO academic_work_plan."Usuario" VALUES ('3e265cdc-78d7-4513-8439-8f768faabcdd', 'nelson.montero@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'NELSON ANDRES MONTERO RAMIREZ', true, '2026-03-27 11:44:41.358', '2026-03-27 11:44:41.358');
INSERT INTO academic_work_plan."Usuario" VALUES ('2a4779ee-50a6-4606-901d-e36ffe5dabe7', 'nelsrinc@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'NELSON DARIO RINCON GARCIA', true, '2026-03-27 11:44:41.362', '2026-03-27 11:44:41.362');
INSERT INTO academic_work_plan."Usuario" VALUES ('4b217f64-5835-4cf9-95b3-cbdf804b78d5', 'nelson.narvaez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'NELSON ORLANDO NARVAEZ MORA', true, '2026-03-27 11:44:41.366', '2026-03-27 11:44:41.366');
INSERT INTO academic_work_plan."Usuario" VALUES ('8b60a216-a308-4e8e-9918-e13608e5c4d9', 'nestor.avila@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'NESTOR ORLANDO AVILA CORTES', true, '2026-03-27 11:44:41.37', '2026-03-27 11:44:41.37');
INSERT INTO academic_work_plan."Usuario" VALUES ('afd6ab3c-fa37-44ea-b975-dd2af6ed976d', 'omar.rey@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'OMAR REY ANACONA', true, '2026-03-27 11:44:41.376', '2026-03-27 11:44:41.376');
INSERT INTO academic_work_plan."Usuario" VALUES ('1bc8d20c-47bf-4940-b1ee-15b1be41c954', 'onasis.ortega@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ONASIS RAFAEL ORTEGA NARVAEZ', true, '2026-03-27 11:44:41.38', '2026-03-27 11:44:41.38');
INSERT INTO academic_work_plan."Usuario" VALUES ('289ab5e0-5679-437f-856b-929e142e812a', 'orlando.acuna@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ORLANDO ACUÑA ANGULO', true, '2026-03-27 11:44:41.385', '2026-03-27 11:44:41.385');
INSERT INTO academic_work_plan."Usuario" VALUES ('52796294-d10c-4415-bfda-b27c8a89d0c0', 'orlando.moreno@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ORLANDO MORENO MORENO', true, '2026-03-27 11:44:41.389', '2026-03-27 11:44:41.389');
INSERT INTO academic_work_plan."Usuario" VALUES ('2221842b-059f-475f-82e0-a15e6cbd6fb4', 'orlando.velasco@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ORLANDO VELASCO ULLOA', true, '2026-03-27 11:44:41.393', '2026-03-27 11:44:41.393');
INSERT INTO academic_work_plan."Usuario" VALUES ('a4db569e-c57a-49b9-85e8-4802b24761ab', 'oscar.valenciam@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'OSCAR EDUARDO VALENCIA MESA', true, '2026-03-27 11:44:41.397', '2026-03-27 11:44:41.397');
INSERT INTO academic_work_plan."Usuario" VALUES ('0f8d1baf-d579-4a64-aa8d-8501fd5e2a35', 'oscar.salazar@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'OSCAR SALAZAR DUQUE', true, '2026-03-27 11:44:41.401', '2026-03-27 11:44:41.401');
INSERT INTO academic_work_plan."Usuario" VALUES ('e648356b-139c-4059-9324-387a07f9b6d2', 'pedrpaez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'PEDRO NEL PAEZ PEREZ', true, '2026-03-27 11:44:41.406', '2026-03-27 11:44:41.406');
INSERT INTO academic_work_plan."Usuario" VALUES ('d23a21f9-126d-4e23-921d-2986ad0fa63f', 'rafacarde@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RAFAEL ANTONIO CARDENAS VELEZ', true, '2026-03-27 11:44:41.41', '2026-03-27 11:44:41.41');
INSERT INTO academic_work_plan."Usuario" VALUES ('fc4664b0-581b-4776-9f09-a7d2c044d020', 'rafaelamaya@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RAFAEL ARTURO AMAYA MEJIA', true, '2026-03-27 11:44:41.415', '2026-03-27 11:44:41.415');
INSERT INTO academic_work_plan."Usuario" VALUES ('cae6f865-4ded-4388-9db9-e327aca0a853', 'ramibara@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RAMIRO CESAR BARAJAS GOMEZ', true, '2026-03-27 11:44:41.419', '2026-03-27 11:44:41.419');
INSERT INTO academic_work_plan."Usuario" VALUES ('20ef6ff8-a5d9-4122-bca1-d7303f9af0c6', 'ramiro.salazarr@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RAMIRO ENRIQUE SALAZAR RAMOS', true, '2026-03-27 11:44:41.424', '2026-03-27 11:44:41.424');
INSERT INTO academic_work_plan."Usuario" VALUES ('5b146f09-674f-42d5-aad4-6dd593633fe8', 'antobast@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RAMON ANTONIO BASTIDAS UNIGARRO', true, '2026-03-27 11:44:41.429', '2026-03-27 11:44:41.429');
INSERT INTO academic_work_plan."Usuario" VALUES ('fb13d1f5-5398-4fea-b791-7a79d5f817b5', 'ricardo.apolinar@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RICARDO ALEXANDER APOLINAR CARDENAS', true, '2026-03-27 11:44:41.433', '2026-03-27 11:44:41.433');
INSERT INTO academic_work_plan."Usuario" VALUES ('a9ee9262-ec50-4618-b447-53ec1cd27f4f', 'ricardo.escobar@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RICARDO ANTONIO ESCOBAR', true, '2026-03-27 11:44:41.438', '2026-03-27 11:44:41.438');
INSERT INTO academic_work_plan."Usuario" VALUES ('83dc95c8-9342-489b-bffa-efab3f6c341c', 'robert.ortiz@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ROBERT WILSON ORTIZ LOPEZ', true, '2026-03-27 11:44:41.442', '2026-03-27 11:44:41.442');
INSERT INTO academic_work_plan."Usuario" VALUES ('ef28fc92-68f6-43a8-8cf3-7aaec3219173', 'rodrigo.figueroa@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RODRIGO ALFONSO FIGUEROA GUERRERO', true, '2026-03-27 11:44:41.446', '2026-03-27 11:44:41.446');
INSERT INTO academic_work_plan."Usuario" VALUES ('113a8fb4-77ba-484f-a32f-3df4305ca08f', 'rodrigo.urrea@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RODRIGO ANTONIO URREA BELTRAN', true, '2026-03-27 11:44:41.451', '2026-03-27 11:44:41.451');
INSERT INTO academic_work_plan."Usuario" VALUES ('64b949f7-387a-4a49-9411-834575efc1cd', 'ronald.macuace@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RONALD ALEJANDRO MACUACE OTERO', true, '2026-03-27 11:44:41.456', '2026-03-27 11:44:41.456');
INSERT INTO academic_work_plan."Usuario" VALUES ('6d57bc3a-ef31-4864-a6e6-d971ef3ff6ef', 'rosalvina.alvis@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'ROSALVINA ALVIS BARRANCO', true, '2026-03-27 11:44:41.46', '2026-03-27 11:44:41.46');
INSERT INTO academic_work_plan."Usuario" VALUES ('24970f27-530a-46ce-8d57-c3bb9b80b611', 'ruben.naranjo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'RUBEN DARIO DE JESUS NARANJO SALDARRIAGA', true, '2026-03-27 11:44:41.464', '2026-03-27 11:44:41.464');
INSERT INTO academic_work_plan."Usuario" VALUES ('4bbe0277-a97f-4705-aedb-c954990e1a42', 'sandra.polo@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'SANDRA MILENA POLO BUITRAGO', true, '2026-03-27 11:44:41.468', '2026-03-27 11:44:41.468');
INSERT INTO academic_work_plan."Usuario" VALUES ('48ca7a58-1b27-4f35-a232-3943cd999a65', 'santos.beltran@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'SANTOS ALONSO BELTRAN BELTRAN', true, '2026-03-27 11:44:41.472', '2026-03-27 11:44:41.472');
INSERT INTO academic_work_plan."Usuario" VALUES ('f7ffe1ce-88b2-4fcb-b7b5-affd8bc6bf8b', 'sergchic@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'SERGIO ALBERTO CHICA VELEZ', true, '2026-03-27 11:44:41.476', '2026-03-27 11:44:41.476');
INSERT INTO academic_work_plan."Usuario" VALUES ('f81ee9eb-3bf1-4439-926f-5be98fdd1d09', 'shannon.rey@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'SHANNON REY CADAVID', true, '2026-03-27 11:44:41.48', '2026-03-27 11:44:41.48');
INSERT INTO academic_work_plan."Usuario" VALUES ('63e16e43-9f6b-44e3-aa58-fa51cc0d0b56', 'silvia.baldiris@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'SILVIA MARGARITA BALDIRIS NAVARRO', true, '2026-03-27 11:44:41.485', '2026-03-27 11:44:41.485');
INSERT INTO academic_work_plan."Usuario" VALUES ('be2f9f82-018d-4e29-ab3c-4e7c172a9396', 'silvio.rosero@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'SILVIO LEON ROSERO OTERO', true, '2026-03-27 11:44:41.489', '2026-03-27 11:44:41.489');
INSERT INTO academic_work_plan."Usuario" VALUES ('9eb2628a-6b88-4924-a206-3d9d5c1c8eca', 'simon.martinezu@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'SIMON MARTINEZ URBANEZ', true, '2026-03-27 11:44:41.493', '2026-03-27 11:44:41.493');
INSERT INTO academic_work_plan."Usuario" VALUES ('9b69682c-9b74-434b-8747-6e3a3f86798c', 'tatiana.espinosa@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'TATIANA MARCELA ESPINOSA BAUTISTA', true, '2026-03-27 11:44:41.497', '2026-03-27 11:44:41.497');
INSERT INTO academic_work_plan."Usuario" VALUES ('9526d4c6-70df-4d28-be2a-d55d0159f4c2', 'uriesand@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'URIEL SANDOVAL RUEDA', true, '2026-03-27 11:44:41.501', '2026-03-27 11:44:41.501');
INSERT INTO academic_work_plan."Usuario" VALUES ('2aa8fa3b-bb25-40fb-a2d0-7dcd31a86290', 'viviana.gallegor@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'VIVIANA GALLEGO RUDAS', true, '2026-03-27 11:44:41.506', '2026-03-27 11:44:41.506');
INSERT INTO academic_work_plan."Usuario" VALUES ('8be69db9-67b3-428d-b3ae-3f945bd44f2c', 'wendy.deleon@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'WENDY LORAINE DE LEON ZAMORA', true, '2026-03-27 11:44:41.51', '2026-03-27 11:44:41.51');
INSERT INTO academic_work_plan."Usuario" VALUES ('195a776f-4014-44d7-ac1a-22b3b1a7ea96', 'william.macias@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'WILLIAM BERNARDO MACIAS OROZCO', true, '2026-03-27 11:44:41.514', '2026-03-27 11:44:41.514');
INSERT INTO academic_work_plan."Usuario" VALUES ('28a98646-8bef-45df-81e8-69de1300340b', 'william.manjarres@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'WILLIAM DE JESUS MANJARRES DE AVILA', true, '2026-03-27 11:44:41.52', '2026-03-27 11:44:41.52');
INSERT INTO academic_work_plan."Usuario" VALUES ('73342704-3157-4cbf-9523-7820f8cae956', 'willjime@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'WILLIAM GUILLERMO JIMENEZ BENITEZ', true, '2026-03-27 11:44:41.524', '2026-03-27 11:44:41.524');
INSERT INTO academic_work_plan."Usuario" VALUES ('e24997e4-9cc9-484a-8a3f-338e8105d00b', 'william.alfonso@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'WILLIAM HERNANDO ALFONSO PIÑA', true, '2026-03-27 11:44:41.528', '2026-03-27 11:44:41.528');
INSERT INTO academic_work_plan."Usuario" VALUES ('aa4403d1-6da3-4dfa-a7d6-518c762ebd06', 'wilman.palacios@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'WILMAR ANTONIO PALACIOS MACHADO ', true, '2026-03-27 11:44:41.532', '2026-03-27 11:44:41.532');
INSERT INTO academic_work_plan."Usuario" VALUES ('a76dc6c0-d390-4bab-b295-4791fd74d3c1', 'wilsladi@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'WILSON HERNANDO LADINO ORJUELA', true, '2026-03-27 11:44:41.536', '2026-03-27 11:44:41.536');
INSERT INTO academic_work_plan."Usuario" VALUES ('670559d9-59f4-429e-930e-8f3b1ac5f196', 'wilsonr.pabon@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'WILSON RIGOBERTO PABON QUINTERO', true, '2026-03-27 11:44:41.54', '2026-03-27 11:44:41.54');
INSERT INTO academic_work_plan."Usuario" VALUES ('4be5d3a6-e8e5-4b7d-8ebd-7e6696eb600f', 'wilson.rodriguezc@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'WILSON RODRIGUEZ CALDERON', true, '2026-03-27 11:44:41.543', '2026-03-27 11:44:41.543');
INSERT INTO academic_work_plan."Usuario" VALUES ('2452b74f-5bb0-40c2-ae69-7f345530e61a', 'yesid.tafur@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'YESID HERNANDO TAFUR PRADA', true, '2026-03-27 11:44:41.548', '2026-03-27 11:44:41.548');
INSERT INTO academic_work_plan."Usuario" VALUES ('c594a57d-18bf-45c5-a9d0-0d34177bef3a', 'yolanda.rodriguez@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'YOLANDA RODRIGUEZ RINCON', true, '2026-03-27 11:44:41.551', '2026-03-27 11:44:41.551');
INSERT INTO academic_work_plan."Usuario" VALUES ('f2312f82-8ca9-4c8c-aadf-ee9460e8504d', 'yovannyromero@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'YOVANNY ORLANDO ROMERO RAMIREZ', true, '2026-03-27 11:44:41.556', '2026-03-27 11:44:41.556');
INSERT INTO academic_work_plan."Usuario" VALUES ('41e4fd67-846b-4c09-bf7f-c264094e56f0', 'yulieth.mera@esap.edu.co', '$2b$10$bEYEALefpHdXWDcm6DlkjuYBurqBe6zjB5hijVtCIT8Gk0ojG.AEO', 'YULIETH KARINA MERA PAZ', true, '2026-03-27 11:44:41.56', '2026-03-27 11:44:41.56');


--
-- Data for Name: UsuarioRol; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO academic_work_plan."UsuarioRol" VALUES ('3c9f4550-4840-4632-844d-52fdf9c6fe59', '809a97a1-95de-4065-97c4-63a4715861bb', '4b3e403e-e0a4-4f0a-9fc9-b7fbd1820c6a', '2026-03-26 19:07:09.086');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('edac9905-7056-4fa6-8f54-c2d731a3c99f', '6d411d0f-74b9-4bc0-ae15-73c753cb0dcb', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 13:26:28.383');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ca03eef6-548c-412c-815a-12887831ea8a', 'ffedf106-7837-457a-bfeb-3e3cf47328c2', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 13:26:28.395');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('53c587fd-4fcd-4980-a56f-2b7ab12ccfde', '0235be4e-9c05-4e55-8115-9bf06ed03afb', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 13:26:28.401');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d8a8ba13-03c5-41fe-affe-725c6174f050', 'd3d84d3c-226a-47ea-8086-86636232c698', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 13:26:28.408');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('7e2e1d86-89ba-47bd-90df-07be64e62a4f', 'fb13d1f5-5398-4fea-b791-7a79d5f817b5', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.433');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('57bb4836-cb86-4e45-92ea-d396c17b9241', 'a9ee9262-ec50-4618-b447-53ec1cd27f4f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.438');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('205637f8-2ea5-497b-9cbf-2cd9e8fef139', '83dc95c8-9342-489b-bffa-efab3f6c341c', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.442');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('efef2527-d911-46dd-af78-c41d21116599', 'ef28fc92-68f6-43a8-8cf3-7aaec3219173', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.446');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('48110ed9-5db9-4c67-818e-2eb734d07000', '113a8fb4-77ba-484f-a32f-3df4305ca08f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.451');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2b6abb9a-357d-40a1-961b-1b4957ad76a3', '64b949f7-387a-4a49-9411-834575efc1cd', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.456');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('462129c1-1f1b-427e-87a4-c1354e60390e', '6d57bc3a-ef31-4864-a6e6-d971ef3ff6ef', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.46');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ddd4e481-171b-4429-ba98-057acce14e9f', '24970f27-530a-46ce-8d57-c3bb9b80b611', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.464');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('42b32e8f-43b2-4d71-a6e8-aaa505f0d001', '4bbe0277-a97f-4705-aedb-c954990e1a42', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.468');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('39fe2ec9-a896-4779-be84-36e4736ea1be', '48ca7a58-1b27-4f35-a232-3943cd999a65', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.472');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('efcbf121-9435-4101-beb6-279f5c71fb66', 'f7ffe1ce-88b2-4fcb-b7b5-affd8bc6bf8b', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.476');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('75234e71-c67d-4768-af0d-048d5be1ae41', 'f81ee9eb-3bf1-4439-926f-5be98fdd1d09', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.48');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('56c99f24-8cc5-4e63-85f2-284301248adf', '63e16e43-9f6b-44e3-aa58-fa51cc0d0b56', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.485');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('7655b255-08e2-4999-9127-3ce1366b2104', 'be2f9f82-018d-4e29-ab3c-4e7c172a9396', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.489');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('0aab3108-1579-457d-ab1f-2f5dcaf84316', '9eb2628a-6b88-4924-a206-3d9d5c1c8eca', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.493');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9d834183-e963-4ea9-a171-e7d67a1f1090', '9b69682c-9b74-434b-8747-6e3a3f86798c', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.497');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('eee3cd56-db86-49ff-808b-434d9bd97a23', '9526d4c6-70df-4d28-be2a-d55d0159f4c2', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.501');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('cbd6f8ec-9f68-450c-a4cb-ea5c689ec17a', '2aa8fa3b-bb25-40fb-a2d0-7dcd31a86290', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.506');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('12a18a73-e0f4-4bd9-939c-61e96d240aba', '8be69db9-67b3-428d-b3ae-3f945bd44f2c', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.51');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('8221397f-907a-4754-92c9-37223cc03df3', '195a776f-4014-44d7-ac1a-22b3b1a7ea96', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.514');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('51bc3df0-feb8-419d-ad05-4f0dc9f6308a', '28a98646-8bef-45df-81e8-69de1300340b', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.52');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('76b9a0b3-ff70-40c7-82ed-037c83fb0ced', '73342704-3157-4cbf-9523-7820f8cae956', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.524');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9a7ae3b0-c80a-4a6e-9307-d4d6c87597e7', 'e24997e4-9cc9-484a-8a3f-338e8105d00b', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.528');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('943ca85f-dcda-4548-9d48-0c355242b7cc', 'aa4403d1-6da3-4dfa-a7d6-518c762ebd06', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.532');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('78a5d621-bb27-4557-a831-1be12b681743', 'a76dc6c0-d390-4bab-b295-4791fd74d3c1', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.536');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('3e723d58-e88c-4498-baf7-7e937014b91a', '670559d9-59f4-429e-930e-8f3b1ac5f196', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.54');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e07c3cf1-9658-41b2-87b7-e3a790163922', '4be5d3a6-e8e5-4b7d-8ebd-7e6696eb600f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.543');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('bb15b123-e2d5-4228-908f-a1b994966d44', '2452b74f-5bb0-40c2-ae69-7f345530e61a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.548');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('266d18c3-70b4-4c9a-9e49-4206df61ffca', 'c594a57d-18bf-45c5-a9d0-0d34177bef3a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.551');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e7a01931-6a85-48f2-8e3b-7cd736aceda9', 'f2312f82-8ca9-4c8c-aadf-ee9460e8504d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.556');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('270174d0-53d7-4c79-820c-001b0f668ff6', '41e4fd67-846b-4c09-bf7f-c264094e56f0', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.56');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2c8e1ebb-e780-4c51-a4dd-eb2284485b06', '6d2f4278-979b-4c66-a14f-fbdbb8f7f27f', 'de78dbbc-4e3d-451f-9143-b8e788574322', '2026-03-31 00:49:45.783');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('06d3e260-7074-4445-8b2f-ade4e1f41999', '4939e095-e40c-4dc8-8d13-3700e66bf857', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.233');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('0373934b-a31c-4395-a3fb-2022e275d340', '7cd89a78-09d9-4ba4-b91e-eddce7eea0b1', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.253');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d0cc36c8-7826-42f9-9532-53e05bb12bbf', '24a58417-6a63-465d-add9-a1d5c5240a30', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.263');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('96b2126d-2c68-4066-9c1e-4cb0ec2724da', '0fb161dc-861d-4bb2-8ce2-9c43173b963f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.271');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2a644977-710d-42bf-adf2-cd9b06dde388', '700e56d6-b96c-4d52-a040-43cb85d3863a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.278');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('67b9bf3d-d305-458a-b3fc-86ca8c891468', '697353bf-72ea-4a2a-a975-2b69443a288f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.287');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('c953fc73-3513-45dc-a74b-83f8e1502ea8', 'a9c1f219-99cf-4e9e-9b4e-d8ea08f5dc2b', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.292');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('f5b8e006-1b0f-45b4-a0f7-db642d1d2feb', '2304e59d-b3fd-4260-8db3-751ea0ae53a6', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.298');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('eba2b5a4-38a5-4824-a952-f64ad077b4c9', '3bf36118-d597-40d5-8aa0-fb06a256c3a5', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.303');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d073539a-3e50-485f-83f8-b27bfe979f05', '7ad2fd15-f8c7-4190-bc13-739189f8c019', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.308');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('723df6ed-f261-4f02-8fe5-122522010bf2', 'e1f3408f-7254-492a-8f08-9338c25b1449', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.314');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('45c655f2-3abe-4568-ae21-4a4807403aad', '264d09bb-d628-44e6-a24b-2b0d5188a9c6', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.319');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('8f679e5e-f658-413e-8e1f-0055c6bd9af2', '0cb75bb2-54ea-48a6-9a49-3697d046ff2e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.324');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('de06feb9-e25e-4691-80d9-4ae7a38f25c4', '2a6f4f4c-4442-49f3-9778-511891570680', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.33');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d3ecd50a-207e-454d-9d5c-165ee18baef4', '3982515d-4e1f-436d-9c68-b237b3b4e205', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.336');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9356d958-4cd5-4498-b6ca-9e90d01be149', 'def49971-2f2e-4a0a-ab63-cc551822249b', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.342');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ccd90107-d6d6-4dc4-987f-f68c85e9da03', '69977ddf-1156-4666-980b-42e1a8c464c9', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.348');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('23e4727f-640b-43e3-b044-9fc921ba1d43', '03353ae8-80e1-45e0-858d-f5b2b007aeb1', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.354');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('f354d82a-65ea-4822-afbb-cf7dc42b0cf4', 'a20d2fa9-d094-48ad-a2f5-a31cd42c6e07', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.359');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9f830764-4f8f-44f4-8f84-ffb4cad126ea', 'bbe48038-a205-40b4-8d58-2d15050804ec', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.365');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2cea338d-d9a9-4e00-bb29-1d1295f87aef', '54f05ee4-39c7-417c-bd14-ff2b6c884114', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.372');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('310a1ab4-9ce1-44ef-8f01-0f151da76323', '86a3f245-4090-4921-9b08-35b12489bd4a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.377');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('dda1da48-07cf-441e-9c5e-45430b3a9b8b', '62d8667e-3e27-45d2-aa8c-790e00e21a4d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.383');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9f3d7ccd-a3c4-4734-8b5f-9d5e4ad26d0a', 'e9967a69-b9c8-480c-9941-98f824d0e472', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.388');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('f39d53f4-667c-4145-8ff1-ca5279823b1d', 'ced26d4c-f34b-4a72-99b4-fd8ef2439bf1', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.393');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ffd4f527-7f43-476a-a15d-aff2d516e6e3', '6fbf6c60-9506-45bd-b820-a967f3b36d83', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.398');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('3d85ab58-daa7-4b0c-ba3e-311c87fefa20', '2dda6299-b6f2-4ede-8b87-d497dc248ce0', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.404');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('a567e2d0-d677-4ad0-a2eb-df334b849813', '4812a2ce-b8e6-476e-badc-2e95ccc26d4c', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.411');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('8cbc2c6a-c194-48e6-adcf-80c9a64a0a10', '15e2eadf-6a55-4885-9860-8e6e2e1ae6dd', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.416');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('095ed333-cfd0-43d2-a8b7-b8cfd2773089', '619c0c18-5554-453d-bb3c-3858eb601757', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.422');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d03bc533-6fc9-47fd-bcc6-925068c24740', '68880c27-960f-4ea5-b7a3-4b57d966c13b', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.427');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('7cc20439-5f34-4178-8a32-eab56e9733a6', '15f2918e-3840-4b8a-a9e4-1fb9a09cc349', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.433');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('eecef3db-24bf-4341-97ca-3a2e1cafb58b', 'd1d3101a-da8a-43f0-ba08-072f53646f77', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.438');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e649eb67-55d5-4079-8ded-d0558859b815', '6f7a87bb-34d4-4740-a1a6-1cf07c9eca28', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.443');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e2d21d3c-081a-44ad-b89b-8c05f6f60f81', '1578978b-ced0-4290-be5c-c1e56f015275', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.448');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('523b3f12-ffd8-4e93-bdae-f0de4886e61e', '78ee3ac9-e3db-4932-bfd1-625ca7e74a33', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.453');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('74981914-3390-473e-b1bc-bb1db7e9359b', '0d0aff4c-0ac7-4567-9c8b-e41b85425643', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.458');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('c60dbce3-deb0-4764-8604-87242bb1695e', 'de664374-ab7f-4fef-a1fd-d2dfbf4b397f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.463');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('da634e7a-7de0-4824-a6a0-dfd115aa4621', '85251896-32e0-4229-bc69-c975e42b5bf4', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.468');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('fbbae083-accc-47cd-97b4-4f1a6826f556', 'f618dacb-6f4e-4950-b221-80801c014f08', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.473');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9f9a56de-153e-4f89-be87-a78721dfe930', '70f40b66-e543-495a-89eb-7050d48ac127', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.479');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('a8f7799b-00f6-4875-aefe-66a1262eedce', '3d0990dd-3679-4625-bef1-31c21c4987ff', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.485');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('84cb4150-149e-4b5c-b588-615b1862be8e', '3691ee52-7657-4e53-9745-2f500efa4f14', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.49');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('07d0b8b3-dc1f-4d0e-9e6f-104dbb2ac436', '18749f7c-c357-4cfe-8057-46f296a0974a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.495');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ca80eb52-a1d6-495c-9131-87c7314e4af8', '5e759aa1-d742-42ef-9a6d-3f181a2245e9', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.499');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('0369060e-f291-4598-ae0a-bee68318a54e', '5990c94b-67b6-4d81-baaa-980d7aa9392a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.504');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e6087e54-33aa-4271-9c5e-a1f0b08fc46b', '2e840f18-d534-4ae1-8fc1-de49072af8c9', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.509');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('5cd28122-a464-4a42-a3e3-0fa34e889cab', 'f58ab47a-6234-43ea-927f-05746337d396', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.514');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('22d55add-a77a-486c-92f0-7c02123f21b1', 'ad03f36a-0694-433c-87d0-76a70133779e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.521');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('8062a976-5ca2-4278-b9d1-6e702148fab3', '39f67b82-7e52-462d-9f3b-70f33883f20f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.526');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('994ea9b3-1d39-4c6f-af28-ce37c11a4043', 'e1f8cf29-dcf5-49e6-8d05-38a36ddf089d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.53');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9732e4cb-27ca-40ee-ac33-afe823c432e3', 'cd76076a-3b29-40d7-9a01-206f4e514568', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.536');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ba542a64-5c02-4ba0-8c27-31a599e95e00', '30337b81-1b8b-448e-a2d1-762463230770', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.542');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('10776908-fa09-49ad-8f2d-da0b5e55d1f6', '3df0437e-daf4-4c44-9b85-5ff8c62b305a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.547');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('98c94242-f6b7-4738-ba00-274338ee42de', 'df6e663a-b0d4-4340-a932-30c044f02fc7', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.551');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('c5143e1e-c188-4073-b0b6-62160cb0018c', '2169218f-95c1-40e5-a02b-35350425ed2a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.557');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('be807b79-9c20-4bd2-ab7f-51c3fad98ec6', 'f426ef90-b054-44cf-8eb0-a86b4293ae80', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.561');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('4a1de874-2ef4-4b65-886d-23ba433ff631', '68ce2ca7-08a7-4a74-89cf-eeab0a4d2d67', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.566');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('6cd7f49b-6370-4f12-9598-8231b2376a30', 'bd18974a-f880-409a-9f43-c2e09b551dfd', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.571');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('1e296a44-32c8-48d6-90ed-d7bf5ec0e369', '7fb62874-00ca-4625-82bc-eb19e7665081', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.576');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('27aa87e6-ee80-48f9-ab8d-4bbbf1bb387c', '0b3b49ff-a97f-4185-8ac2-5086d7c06220', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.581');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('241fbeeb-984f-4f14-820e-da9c3d25129d', '564ffd85-0092-4db5-a49f-76f07aac12ba', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.586');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('182350fa-fbd9-496c-af35-d588d9cca4c8', 'bd81ba90-804a-471b-aec0-fbf3ce2a791b', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.595');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('38a1d1c8-f47f-4458-8a70-8d262f0bad2d', '92be8ea8-9b50-4274-8125-380252234393', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.603');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('c5ece787-fac9-4b71-93ff-b5ca6dd52849', '4a44ceca-1bc4-434f-8f45-8c8a37e505e2', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.607');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e7674f23-02ab-4987-a01b-4f5bb17ba1ca', 'd2e1d843-3791-47eb-a101-c24cd76ade84', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.612');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('c2ca41af-3cb4-4b9f-900c-49d1fb2bcadd', '93d023ac-bcb3-4808-a2b7-ce3e7a16ac24', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.618');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('96f4fa55-8b43-4aba-a071-0dd5715bad4a', '9288a6b3-f160-4297-b57e-0162c15fe7a6', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.623');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('51b6a328-e12b-43ed-98d0-6231adb2a7bd', '4a8058d9-30c6-4181-b5de-3cb3f0126d74', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.627');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2ce1f0df-fb3b-4f5c-9c93-f1d138364865', '7c03c6f4-7d01-4ebc-be75-09bdaa1b0870', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.632');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('72d481a6-35b7-448b-9afe-6b40fad166b6', 'd4468e98-c7b3-4fdd-8104-3e69360e0475', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.637');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('8bef4311-d33f-4c39-a3a5-7b3e40b0b4c7', '53832af7-5a89-4014-a042-ce1b18ee16e0', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.641');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d66bbff9-1085-4097-93aa-c72d196249b0', '2503d6db-d45a-4dfa-bf30-6036c906b621', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.646');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('72ba3423-5fad-44a0-9630-3a1eaff169d9', 'f60d0be5-96b3-4282-92ab-4091c75a4bcb', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.651');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('c78bd30c-96a0-4817-a867-b9f071b85e46', '35fc5e75-a59e-4594-b950-d091add0732e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.656');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('32ee805b-b97c-4498-8d7e-e118b2721580', 'a2c77f1c-23cc-4a2a-b90c-b4cc196c4963', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.661');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e790105b-fd32-4fbd-b0df-4259abb3cc4e', '7fffdfe1-3e1a-41c5-9793-5fe6595b1eca', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.666');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('645163f2-5e8b-4500-b4ac-d7fc620a6d3b', 'b3427551-1aa3-4aa8-86c2-b1081b37aae9', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.671');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('6625975c-d404-4db3-a7b3-ffa81338c31f', '4e7139ad-bf1c-40ca-91ed-16ab0027003d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.676');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('990cdf89-4a6e-4b10-ba4b-339a0db3b6b1', '1f1e5e9b-1112-40d9-bc82-5c37a0b78e3e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.682');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('67a72c61-a14e-4ca1-ae88-9598c3dc212d', '47df95ca-4100-4da8-b0d0-903d389a67ac', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.687');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('a09629e4-baa0-4219-bde9-4d302515b64e', 'f9df7cee-b34a-4ec2-bd8b-885b24834877', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.691');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('abf9bab4-11b0-483c-9770-2c23fed827b3', '72cec4de-e5ab-4eb6-ba43-58afc91f347d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.695');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('cc42d8a3-e6e4-4595-880c-6aaef5ecca12', '642862b1-0a24-4369-9368-d4bdb58e322c', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.701');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ef9fdb08-4765-4f6e-a220-5450978c1bf4', '42fcbae9-8680-44df-a311-227d501c5df4', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.705');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('14b6f211-7e0a-4ef9-a845-388063141969', '90d32d08-2f4a-4031-a2c6-2df1350be860', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.71');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('b915a3ac-d54d-4d8d-a945-76372b303496', 'be277eed-1829-4683-a8a7-426029778b56', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.717');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('6b00b3b0-f826-456e-9221-17cc9ab1fc15', '48d4acaf-4cb9-4818-a643-48428f17457d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.723');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('0f90b345-175a-4c5e-b8f4-dd5177312337', '939bee58-5eb9-4350-be65-205f2afc2ea5', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.729');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('b28b21c5-130c-4a55-b872-9d1cd8cdb750', '25d85f9c-8b18-4339-ab22-a8e16f659fc8', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.734');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('6d8f8ca8-66bf-45fd-b875-a9e2e292125a', 'f87fea88-c2ba-498c-b6c2-9a8a114ff9f3', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.739');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2b890639-f82f-409c-8a9b-9ef0b9037875', 'd8f2a18c-7ad4-4c10-9342-d6ab92a93705', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.743');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('3c8f73dc-7d70-499b-a935-ae811bfdbdeb', '5d6831ac-5837-4322-9020-7e6fb435c060', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.749');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('244a4d66-609a-4688-9e8c-be6e81cc4a5d', '479867eb-1430-490d-b78e-b4874b32df09', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.753');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('31db43fc-8248-4006-a946-f3aa2648e634', '6ad22a77-8ff9-402e-bddf-09e9aa40df4f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.759');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('0f7e6513-f84f-42bf-8d9d-e3566143229b', 'd0e2cc94-0c7f-4914-a061-ad68fcb0e781', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.764');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('f21683d3-bdee-4fb7-ac81-2db02d33969e', 'ce642f57-e36a-4d5d-997c-8a4b9f0bc2a5', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.77');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('0dc2c7f8-f72a-454e-8845-3b58b8a52ba9', '8d6d8380-b72d-4dcb-a6bd-b9cda9ff9426', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.775');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('30098b99-4112-4bc5-b184-b787f5956613', '642c3b15-85fe-47d8-b7f9-d63e52468d22', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.78');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('dcf5fe77-5ca8-42bf-94cd-8c3fa5e2339d', 'c8b9bb4e-f08d-4322-9db8-eb1e3188d25d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.785');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9a00a6c1-7326-49ae-b772-0c0cd85fcf44', '7adfc256-5975-47dc-884f-a0d43532d016', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.79');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('dd47a69c-ce4f-4753-a055-f59140e83fc8', 'bc80bfc0-a6d4-45a1-8296-f2dce672d87a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.794');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('afec4f1a-7eaa-4cf6-b43d-77f83c41df89', '965a2949-0d36-49d1-b2be-f1d2a8aed9ce', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.799');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('b20056be-782b-4b02-b28e-a3ed88ae30c2', 'a7f83e6e-8714-47b6-a14b-0ddcd20b29ff', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.804');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9da0350e-db62-49ec-ae0f-13eadaea4930', '01afe66c-0f76-468b-a18a-254509c485b5', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.808');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('f7abdac1-2411-4813-beaa-7acac8b4bd1e', '94c0ef9e-3b6c-4196-a2d0-e682b1a3acd2', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.813');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('8dd9bf3d-9199-4d22-a778-8a7e64864bd8', 'cc98f80d-cd90-42c7-a135-10965d826900', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.819');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('0a595c01-4421-401d-9067-a3d84ca052c3', '35f3b575-b31d-4e0e-8cf7-d83328e44367', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.823');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('c07dfc9a-2853-4766-aa36-0f71da00e92b', '7942eb91-3c77-4f39-81d1-f1e9654a6ccd', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.828');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('b6e052eb-71ba-4f19-8359-d450230c5cfb', 'bd0adc81-9c0d-4dd2-afec-460deaaa77c1', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.834');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('df454b9e-5f34-43cf-b891-19b42ace24d5', '3eb359d4-ee16-4f83-828e-ec597a4d0b51', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.839');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('c0394812-6fc0-4a48-9912-5b23d67a5f73', '95b572ea-bd2c-4dd9-ab3f-1aef5ea1a42d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.844');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('726d6546-f66a-4f5d-b674-0e43fe32d1cb', '5b52954a-09c0-426c-a913-5843c9de8256', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.849');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('3b721101-9a14-4a0f-9328-319c0af4ca36', '6d7cf66a-53bb-4ac4-b9b9-df53b53c7392', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.854');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2ee040a1-8e13-454a-b0f8-30aefc7ae30e', '7c31af1b-fcb2-444b-b1db-a7362c9064ec', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.861');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('8fc92523-46b8-400f-8e03-4a702540e909', '8234aa34-a6bc-4cd8-bb97-69e0529020af', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.865');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9e3792d6-d9b0-4456-97bc-1543804d6ec4', '5a6d8798-fccc-425d-a0b8-797c7f0f5f19', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.87');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('10119e16-d5f7-4240-a456-0cbd5aa845e3', 'a325a2df-9f2a-4c73-9c4e-f80abfa26452', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.875');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('a49218a2-12e7-4221-8a87-e224432aacff', '96d7ada1-90d0-4c9c-a9bc-f23880d50088', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.88');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('dcbb9ed2-9ac1-4f96-b842-14a66248ecb4', '122e2cc7-9778-4f58-a4b7-3fb3bb42d02b', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.884');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('887954a1-2327-4b50-8654-8bda40d0d4a2', '12d8bc7a-5ab5-42f8-a47c-f0a530c43fbd', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.891');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('6e9809ff-6d9a-4d3b-9f09-f22eb5d9b1d6', '110af442-5fd5-42a9-8c32-74eb21fe38f5', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.897');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('02a2e210-7390-47e9-920c-de8edbd8a4a6', 'ca20fe6a-e6c7-46e4-8747-6ca98d033faa', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.903');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('bdc72493-3646-4632-9f8a-10794711bd59', 'f27cadc7-4ddc-4747-b9aa-afac1bb7bd89', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.908');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('647a9797-3b66-4553-bd6f-23eea3e419b8', '12f76477-137b-44a7-a353-0e668009957c', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.913');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ec9abf06-e3db-44d2-adab-dc41d275df3e', '794e71f6-bc82-4165-8b57-b34afa181aa6', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.918');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2ebc8834-36b8-4b5d-8ccc-aa1fded5fa8f', '1a024499-2555-4a25-ba01-13c8f4a5c89e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.924');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('a20d83ef-448b-4a87-b381-0365e82db4bf', '520edf31-3a53-4f4e-bca4-e57cbc3af210', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.93');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2247bf1f-a84a-4bd6-a3e1-a524f1e98016', '8500e69b-e3ea-4a97-a42c-cc97a3fd0c9a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.936');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('f27cbe65-5b6c-4a10-a9c6-6692b7d0f363', '1fe0bea5-4f89-47c3-9f62-58f29f93666e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.942');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9642be49-c999-4d94-ade8-ec684f53698f', '4351c418-6aaa-48cb-a055-20b5f49f3b57', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.947');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d5afbc40-97d1-4e62-9510-cde8845d9e00', '798fc8ab-af5c-4a32-9812-ce9211d85fbc', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.953');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ac291952-def9-4817-b594-2c889e9e4e76', 'ad11652e-0dec-42b5-bc4d-50b72938fb66', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.96');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('17d8daff-a91d-4fc3-9a30-c8ba45f1714c', '73c4ec0f-1339-4174-85b6-8f32e7171c54', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.967');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('0a701603-7330-428c-9b6e-c32e49aacf12', '8d504780-7034-4b21-8826-c7a7acdcad1d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.973');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('16f6d41d-fa10-446b-8586-744cf2716ab0', '8020cc22-9709-46b4-b3ce-5c0cf1e45fc5', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.979');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9b4057f0-2ef4-4603-b9cd-6588f66b482b', '2fd80fa3-bcc9-4aa8-b4b9-011f601ef65d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.985');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('0dce49fe-b417-4291-934f-40b45d1434b8', '8f641b2f-d687-4ecf-8a1b-688dea70142f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.991');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('352b2769-874c-4121-a41c-7dbfdf977cee', '9bae06a0-1953-4e0a-af1b-1be20a6b43e2', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:40.996');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('7f417506-250f-4a98-b508-891d61d28b70', 'ee23a671-2d1f-483c-99b9-7d21907a5cde', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.002');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('291c1a31-e165-40fe-aaf7-db1ecd207dc3', '4a4118a3-ebff-4cd1-b9c5-8f01e54320a2', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.006');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('613167f1-da41-480e-8477-cd419de4e337', 'cf89873f-7660-451a-bca3-4472dabb8f8b', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.011');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('8569c694-4556-41c3-8190-e058d9c1eef6', '8631bfdc-dcd5-48a4-a81b-8526ea8dad40', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.017');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('223c6b75-045c-4dbe-bf6a-ef8fd5ddb6bc', 'ca7491f2-020a-4a64-8251-83b13fe96ac3', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.021');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('94c5719b-0334-4593-9d31-a54df45c0aef', 'f671ee07-52d9-40f0-89ec-bf02acfa3596', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.027');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9e4bc889-d33e-479b-ab33-e168424bb0ac', '700af6dd-d322-48f7-95d1-16e801991117', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.033');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('fa58e9b4-064e-4789-9f3e-88b1ca7a365f', 'ba6dd614-90be-4d04-ba7d-1365257e71f1', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.037');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('16e51d51-04d3-4fdd-9a69-7860820d53e6', '4c15364c-297a-404a-9c4b-5286bb113b8e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.043');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('4509ecfb-cfb3-47bb-a24b-f19a012c824a', '25e96179-3b21-495f-9cc2-4018332ffab6', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.047');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('b9eebb22-d771-442d-ba0c-8dd8097c650c', 'f641cbd2-61d3-4878-b53e-a3e87fcb068e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.052');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('3b529830-bc60-49bc-ba50-bb323d306c96', '134807d7-12f8-4fb6-be83-5bdde72f3b1e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.057');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2f11151f-dbed-4577-bc82-7bcf38753069', '3c28466d-e60d-4222-ad5f-ba371ea50a11', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.063');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('a21cad87-4a33-4a6a-a545-770d08307604', 'd5af3eda-68a0-48fd-a65e-7bdc1bd36d39', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.069');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('954d26f1-4d1d-41e1-8f5d-cad4c86f4012', 'b9c1f001-1d7e-40f7-bb96-dbf47e34485d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.074');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('7cc4617c-d0be-4e27-86a5-5d1022291161', '0188cdde-722c-4d4d-b490-7da2b134ca2f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.079');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d3fb6c07-ce61-4a96-93b3-03bed725ad28', '6a38f0f7-5cc7-464f-a6d0-a289f47f0959', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.085');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('c4d8d81a-251b-4678-bd12-55e371933a89', '2ff5d566-ba29-411a-b0d7-5378630e5912', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.089');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('b19f9c23-62b6-461b-acb5-b335ed82659d', 'a572cecd-ffc8-4d01-8a20-cd24fe0de50d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.094');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('4b2cbd62-36c3-44c5-8f8b-971144202303', '4410c201-6ec6-4717-9c02-0efe84d0851c', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.099');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('08da584d-e729-4f17-b813-6f7947e4f03c', '74331b1b-5a7f-4c71-a3e3-5526e892f2ea', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.105');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('21c7b7ad-f6cd-4bb5-bf40-7df90f3f8841', '7e7167f0-2687-4cfa-bfcd-777a22f72f0a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.11');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2ef32f71-a669-4dbf-9191-9eba9e85e589', '56b208c2-8bf2-40f7-8e43-eb409833e70c', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.115');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e6b28837-a58e-4fce-9039-2dda05bd9c18', 'fc36d9b8-c2fc-442e-8dcf-66ceedd59a84', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.119');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('370e5d68-34b8-4836-9024-f4d2dabb00aa', '221727a4-3da2-4c32-8fa4-56954731c2e8', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.123');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('6d954cf5-fe9f-4d44-bc02-c2bb6ca499a8', '829cbb78-d19f-4f0f-aebc-edcc51a39682', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.128');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2d3528cc-9511-4e21-9d04-01366e191e30', 'd7f3bc02-6999-4e35-bcf0-84004853c300', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.133');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('cca0af79-ac5a-4eb8-8eba-aac486ede084', '4d941eea-122d-4e40-b705-68678c781fbd', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.138');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('389d5a44-0a58-4b9e-89a0-cec012be1421', 'b7e7ffb5-1c99-41f8-9b45-23e2f4d41fb4', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.142');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2ef5ec05-cebb-46f0-ba14-2c563d7a8fe1', '4cfe90c3-4c60-4d47-9def-29b0a0dcd31f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.146');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('0bc4673a-23f7-4402-8f32-34eccf2daf69', 'b8e30621-2361-4ec4-bfea-7f9163c446cf', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.151');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('34a64cf5-9481-420b-8abc-299f84f9db34', 'da594af3-d86f-4500-ab6d-57c900dad99a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.155');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('63a1138e-cc6a-4fb4-96df-84d3bfbd5194', '668e2676-4563-4cee-9ac8-b736d707ce17', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.159');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('bfda6245-3d70-45f9-a91d-fc1f646907cd', '73fde91b-c3f6-4fac-b94b-857b72434b62', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.164');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('8a5c484d-ff46-4f1b-a251-452dfa6fe46c', 'e043b713-f9f8-45ce-b1c1-9c6f2baa4789', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.168');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('38d9f638-8693-4d1d-920c-721f3588ba44', '3b3a02f8-67ad-41ad-a878-065d4a6ae762', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.173');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('835a44fc-3dbf-4a83-bf8c-49203a93b212', '3217e256-c55b-42ee-b664-c73604e25235', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.177');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('5aecd309-4306-4075-be0e-c0501bb40002', 'd7b92c2e-1a27-4676-95fa-4aa9b72850c7', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.182');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('11bdb84a-608e-4211-b985-469040dbbcfa', 'a3347397-7ee3-4a79-885f-9bdcac098e89', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.187');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('4f3ba267-e737-4940-a417-912e64f09618', '8dc43de1-5d44-4ab2-91a7-d1d8369f8b3f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.191');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('86cf6dad-dd55-42b3-ac95-8ecc968936c3', '4fb59748-8d88-449a-b350-411ac60247e0', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.196');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d82cad5c-e1a9-4c6d-a501-7da87a32314f', '4fe67f09-76b4-4622-ae4b-016d783487d3', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.201');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('25196b9b-e468-4d1b-9509-d70c40084f66', '3e3445e6-024d-475b-a640-bc7b882a411d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.208');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('68956471-b5bf-4a7f-99e4-7554b71fa1c8', 'e68f1bcc-0e20-4418-a67b-0670941a3605', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.214');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('7443eb26-9af8-451a-a2c4-c5c401c26e8f', '20f46d5b-affc-43f6-93db-cdae6c50c0c1', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.218');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('b23d3dc2-0ef7-4903-bbb9-ac47f020e8c3', '0652dfad-a3ce-4dfd-bb4f-993b5203c67f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.223');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('a6a47b71-d07f-4602-b5dd-b252a406409e', '771c9889-899a-4642-9e14-44172fd60e89', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.228');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ef377b0d-b4db-471d-a866-137549313086', '3357aead-5b8d-46bd-ad4c-a1946939102d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.233');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('aaed9055-fe79-4620-b81c-93f6c6eb93cf', '12d4d07b-8f4b-4831-a21b-45a8b35e7a37', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.237');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('647541fc-4204-4f8c-aaab-c7eeb4bbb0b4', 'c5de86b2-5ba7-431c-8c8f-abb6de917627', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.242');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('3801a50b-5ed0-4ea1-8afb-35d0543134f9', '53268f4d-c452-4f3c-aef0-e49afae98ebc', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.245');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('5cf5852e-c92d-4182-846e-ee83638dab97', '0d044f42-1238-418b-8cf1-db959c49eec5', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.25');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('a18e1119-8a7d-4c6b-9f6f-4a7410ac5ef3', 'a12f9eae-282a-4828-953b-81b224425a27', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.255');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e103eae7-2b27-4928-8556-18a12fd72933', '0fd1fbe0-523d-4d4e-9e79-1a14bff1ba74', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.259');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('c1082457-12b3-4341-8b0b-0c48c7f61bfa', '7b7b1725-14d1-4e2e-abe8-9b227e996b25', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.263');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('80de645d-c36b-473b-aec2-d29a49f3e8fe', '98e95cca-1d04-443b-9b3f-e56b49599abe', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.267');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ebe73393-275a-4bba-a76d-6de3fbdad2f5', '2476b4b7-7bb2-4c1f-97cb-d276245ef44e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.271');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('7f1ddf3c-d890-4a8f-a5b1-162440c3d038', 'ee235e25-b79e-4892-ab65-4e896ee6be39', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.275');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e168a526-9d1b-474a-abaf-77f84b2c6488', '524db7d3-ff80-4a65-b292-0674b1a5f5f9', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.279');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('242cc8a3-c311-4508-b088-b03011d2cc93', '7bd590b9-2dde-4e78-ab46-ad185a223a39', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.283');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d5859822-fc34-48ae-ae60-0542f12dffd3', '3b928245-1484-484d-b6fb-3fb0c364a0bb', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.288');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('3b5af67c-11af-48cd-9f36-05ec9ae3b170', '6db6c8e4-fb9c-4779-8d8f-a5b5075a08d5', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.292');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('4008d907-c858-4d0c-94c5-7cb8ad067391', 'a9483132-e406-496a-9f8c-821d81d1b07d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.296');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('b6843f2b-399e-40f3-90a5-e874fc0de1da', 'bc49e6c6-ce96-4bb9-8526-55814887573d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.3');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('f47ae648-88f7-4392-8c9a-0e4e5e1a765c', '9c8ee192-97bd-40a4-a72f-e33ff250f9d8', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.306');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('09257ddc-b02a-46e9-8fcf-eb832ccf8242', '92d809b8-819f-4909-83d6-4ff417e246f6', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.31');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('64514396-50a5-4338-9ce5-f9a45d52405a', '3a23577a-cb08-45c5-8846-df31452a98f9', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.316');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('5e9515d8-4f0b-41d9-babb-10ff01389fc7', 'b3934931-e20b-4403-9fb7-0e1b31d905df', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.32');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('430cb049-3fa6-4806-b29b-17068c48df23', '465f6a78-f9c3-4a2f-83b0-8b2c3eaa691e', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.324');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('7756aba5-cdb8-4a4b-a384-dde5267a454e', '7decffd5-fa34-4656-92af-c7dfb167dfe1', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.329');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('73a816ed-f9b8-4c34-b5f0-f253bafd05f7', 'a42a0a32-e7c1-4da7-acd4-d417aaed4bf4', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.334');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('66337782-f16d-497b-aec1-fab263ed5940', 'a7c9fe2f-6611-4791-87f8-0891713b07be', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.338');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('dea7123b-e7da-495d-bd8c-94570df7dc75', 'f5f32565-97a1-470e-a556-0cf7320c0c7c', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.342');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('99b3c7c2-1efa-4dd3-84f6-028ed5212eb5', '2c110578-f13a-4e68-9867-011f6a96f03d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.346');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('5564ebc9-0e94-43ce-832f-fdfb2f8a43fd', 'ebcffe83-44e5-405c-800e-b7ae02973a5c', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.35');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('3d74c4fc-80e8-4027-8112-8fec739bc7a5', '0f771888-1b65-40d5-b89f-bc7599a86361', '6e1db221-1c82-43c8-968e-ab6948e1eec4', '2026-03-31 00:55:16.393');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('29a7990b-3b9d-4bc5-84f1-ee0d62cc100e', '5ec7977f-2b59-434f-95c6-580bd80a4a34', '951af3d3-7ecb-4566-8efa-5bab598eb7bc', '2026-03-31 19:29:39.434');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e86ebc59-086e-45ce-adff-f8727722dab1', '027caebd-dadb-481b-98ac-cb2faa13177f', '86dfbea6-860a-446b-b2ca-fe4dc2bce577', '2026-03-31 19:29:39.446');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('53f71456-6f04-4dbc-bfbb-1ae6c796cfcd', '84a85d7b-b25f-4232-b8fa-3530b74adf77', '91775891-fdb3-40b0-86d3-07fae783d248', '2026-03-31 19:29:39.459');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('fbf15191-784d-4372-a8f6-3f1763ee3924', '59d135fd-9648-48b3-b3e1-37b9d822efc3', '5ccb09dd-52a0-41b5-874c-2235ff67d1ac', '2026-03-31 19:29:39.467');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('b4c0e696-c92e-4bb9-b4a4-9e68fdd1dfec', '200285aa-e22f-4a2b-a6ad-b875de4d7add', '4d76a38f-5ae2-4550-bfb1-e49cce6774a6', '2026-03-31 19:29:39.485');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('642018cc-7a5b-4286-b7cf-9302b32f5ac6', 'af729b37-e704-444f-a6cf-a46e32d8b461', 'e7cdec1f-8674-45ac-a52a-c37a2505c1b2', '2026-03-31 00:59:26.292');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('713cdf00-e932-4f38-bd6d-07fba32e20a0', 'ae56d58c-5077-4744-bc1e-7bd20ce4fbbf', '4d76a38f-5ae2-4550-bfb1-e49cce6774a6', '2026-03-31 19:29:39.495');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('9b801259-8b41-42e7-bb94-83e7c47ba8bb', 'e53b58a0-df58-432a-af93-596ca9b19b0d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-31 20:32:38.41');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('4492aa8a-3f2f-4cdb-9b02-c6e9b41fca5d', '2ec94bf1-edea-45c3-9ce0-a591623fab78', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.354');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('a9f96c28-4d39-4cf1-be6b-a2ad92ba2815', '3e265cdc-78d7-4513-8439-8f768faabcdd', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.358');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('6c47a45a-4ef2-473d-9382-f6e9f3eeb598', '2a4779ee-50a6-4606-901d-e36ffe5dabe7', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.362');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('f8bc9a83-61c2-4136-93e1-bbcd4d65a754', '4b217f64-5835-4cf9-95b3-cbdf804b78d5', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.366');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('03de428d-17b5-4cc9-af5f-11dea6362bf4', '8b60a216-a308-4e8e-9918-e13608e5c4d9', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.37');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('cb2b95b7-ebc8-4645-ae2d-75bb16cf5126', 'afd6ab3c-fa37-44ea-b975-dd2af6ed976d', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.376');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('2b9bb58a-9713-4b38-b67c-fc7a95c8ca38', '1bc8d20c-47bf-4940-b1ee-15b1be41c954', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.38');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('b5073647-72e8-4918-a051-1a62848af6aa', '289ab5e0-5679-437f-856b-929e142e812a', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.385');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('d8b3f724-abd7-4f6c-8f23-75ba243ce9f9', '52796294-d10c-4415-bfda-b27c8a89d0c0', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.389');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('1812fe19-4714-41e0-9dcf-abc6ef91b54b', '2221842b-059f-475f-82e0-a15e6cbd6fb4', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.393');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('f1a60e1b-de0f-4770-991a-3347ec153635', 'a4db569e-c57a-49b9-85e8-4802b24761ab', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.397');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('3f70be08-03a7-4998-8516-c7dfd0550636', '0f8d1baf-d579-4a64-aa8d-8501fd5e2a35', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.401');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('e3b7df2f-e394-44a5-915a-09e99754c1fe', 'e648356b-139c-4059-9324-387a07f9b6d2', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.406');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('38e5d346-7b9b-41d2-a8fc-c8d7e2ed3c67', 'd23a21f9-126d-4e23-921d-2986ad0fa63f', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.41');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('382d476d-1a62-4508-a8e9-ac56b81e9185', 'fc4664b0-581b-4776-9f09-a7d2c044d020', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.415');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('ae0c5e7f-9b6b-43e2-a526-279c428d2f42', 'cae6f865-4ded-4388-9db9-e327aca0a853', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.419');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('967b9352-d464-462e-88a1-c670fe9828f3', '20ef6ff8-a5d9-4122-bca1-d7303f9af0c6', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.424');
INSERT INTO academic_work_plan."UsuarioRol" VALUES ('5ff6fdc1-9bfc-4fb9-b2af-22ba0a827281', '5b146f09-674f-42d5-aad4-6dd593633fe8', '7f24c657-07bf-47f7-b675-95fb9153c048', '2026-03-27 11:44:41.429');


--
-- Name: AprobacionJefatura AprobacionJefatura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."AprobacionJefatura"
    ADD CONSTRAINT "AprobacionJefatura_pkey" PRIMARY KEY (id);


--
-- Name: Asignatura Asignatura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Asignatura"
    ADD CONSTRAINT "Asignatura_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: CarpetaDigital CarpetaDigital_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."CarpetaDigital"
    ADD CONSTRAINT "CarpetaDigital_pkey" PRIMARY KEY (id);


--
-- Name: Certificado Certificado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Certificado"
    ADD CONSTRAINT "Certificado_pkey" PRIMARY KEY (id);


--
-- Name: Concertacion Concertacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Concertacion"
    ADD CONSTRAINT "Concertacion_pkey" PRIMARY KEY (id);


--
-- Name: ConfiguracionSistema ConfiguracionSistema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."ConfiguracionSistema"
    ADD CONSTRAINT "ConfiguracionSistema_pkey" PRIMARY KEY (clave);


--
-- Name: DetallesPta DetallesPta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."DetallesPta"
    ADD CONSTRAINT "DetallesPta_pkey" PRIMARY KEY (id);


--
-- Name: Docente Docente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Docente"
    ADD CONSTRAINT "Docente_pkey" PRIMARY KEY (id);


--
-- Name: DocumentoVersion DocumentoVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."DocumentoVersion"
    ADD CONSTRAINT "DocumentoVersion_pkey" PRIMARY KEY (id);


--
-- Name: Documento Documento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Documento"
    ADD CONSTRAINT "Documento_pkey" PRIMARY KEY (id);


--
-- Name: HistorialEstadoPTA HistorialEstadoPTA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."HistorialEstadoPTA"
    ADD CONSTRAINT "HistorialEstadoPTA_pkey" PRIMARY KEY (id);


--
-- Name: PTAUserData PTAUserData_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."PTAUserData"
    ADD CONSTRAINT "PTAUserData_pkey" PRIMARY KEY (id);


--
-- Name: PTAUserData PTAUserData_userId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."PTAUserData"
    ADD CONSTRAINT "PTAUserData_userId_key" UNIQUE ("userId");


--
-- Name: Permiso Permiso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Permiso"
    ADD CONSTRAINT "Permiso_pkey" PRIMARY KEY (id);


--
-- Name: PersonaPrograma PersonaPrograma_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."PersonaPrograma"
    ADD CONSTRAINT "PersonaPrograma_pkey" PRIMARY KEY (id);


--
-- Name: Persona Persona_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Persona"
    ADD CONSTRAINT "Persona_pkey" PRIMARY KEY (id);


--
-- Name: PlanTrabajoAcademico PlanTrabajoAcademico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."PlanTrabajoAcademico"
    ADD CONSTRAINT "PlanTrabajoAcademico_pkey" PRIMARY KEY (id);


--
-- Name: Programa Programa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Programa"
    ADD CONSTRAINT "Programa_pkey" PRIMARY KEY (id);


--
-- Name: PtaEvidencia PtaEvidencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."PtaEvidencia"
    ADD CONSTRAINT "PtaEvidencia_pkey" PRIMARY KEY (id);


--
-- Name: RolPermiso RolPermiso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."RolPermiso"
    ADD CONSTRAINT "RolPermiso_pkey" PRIMARY KEY (id);


--
-- Name: Rol Rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Rol"
    ADD CONSTRAINT "Rol_pkey" PRIMARY KEY (id);


--
-- Name: Sede Sede_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Sede"
    ADD CONSTRAINT "Sede_codigo_key" UNIQUE (codigo);


--
-- Name: Sede Sede_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Sede"
    ADD CONSTRAINT "Sede_pkey" PRIMARY KEY (id);


--
-- Name: SistemaAlerta SistemaAlerta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."SistemaAlerta"
    ADD CONSTRAINT "SistemaAlerta_pkey" PRIMARY KEY (id);


--
-- Name: SolicitudPTA SolicitudPTA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."SolicitudPTA"
    ADD CONSTRAINT "SolicitudPTA_pkey" PRIMARY KEY (id);


--
-- Name: Territorial Territorial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Territorial"
    ADD CONSTRAINT "Territorial_pkey" PRIMARY KEY (id);


--
-- Name: UsuarioRol UsuarioRol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."UsuarioRol"
    ADD CONSTRAINT "UsuarioRol_pkey" PRIMARY KEY (id);


--
-- Name: Usuario Usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Usuario"
    ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY (id);


--
-- Name: Asignatura_codigo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Asignatura_codigo_key" ON academic_work_plan."Asignatura" USING btree (codigo);


--
-- Name: AuditLog_accion_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_accion_idx" ON academic_work_plan."AuditLog" USING btree (accion);


--
-- Name: AuditLog_modulo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_modulo_idx" ON academic_work_plan."AuditLog" USING btree (modulo);


--
-- Name: AuditLog_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_timestamp_idx" ON academic_work_plan."AuditLog" USING btree ("timestamp" DESC);


--
-- Name: CarpetaDigital_personaId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CarpetaDigital_personaId_key" ON academic_work_plan."CarpetaDigital" USING btree ("personaId");


--
-- Name: Certificado_codigoQR_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Certificado_codigoQR_key" ON academic_work_plan."Certificado" USING btree ("codigoQR");


--
-- Name: Certificado_estado_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Certificado_estado_idx" ON academic_work_plan."Certificado" USING btree (estado);


--
-- Name: Certificado_personaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Certificado_personaId_idx" ON academic_work_plan."Certificado" USING btree ("personaId");


--
-- Name: Concertacion_ptaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Concertacion_ptaId_idx" ON academic_work_plan."Concertacion" USING btree ("ptaId");


--
-- Name: Docente_personaId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Docente_personaId_key" ON academic_work_plan."Docente" USING btree ("personaId");


--
-- Name: Permiso_recurso_accion_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permiso_recurso_accion_key" ON academic_work_plan."Permiso" USING btree (recurso, accion);


--
-- Name: PersonaPrograma_personaId_programaId_rolEnPrograma_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PersonaPrograma_personaId_programaId_rolEnPrograma_key" ON academic_work_plan."PersonaPrograma" USING btree ("personaId", "programaId", "rolEnPrograma");


--
-- Name: Persona_identificacion_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Persona_identificacion_key" ON academic_work_plan."Persona" USING btree (identificacion);


--
-- Name: Persona_usuarioId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Persona_usuarioId_key" ON academic_work_plan."Persona" USING btree ("usuarioId");


--
-- Name: PtaEvidencia_estadoRevision_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PtaEvidencia_estadoRevision_idx" ON academic_work_plan."PtaEvidencia" USING btree ("estadoRevision");


--
-- Name: PtaEvidencia_ptaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PtaEvidencia_ptaId_idx" ON academic_work_plan."PtaEvidencia" USING btree ("ptaId");


--
-- Name: RolPermiso_rolId_permisoId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RolPermiso_rolId_permisoId_key" ON academic_work_plan."RolPermiso" USING btree ("rolId", "permisoId");


--
-- Name: Rol_nombre_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Rol_nombre_key" ON academic_work_plan."Rol" USING btree (nombre);


--
-- Name: Territorial_codigo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Territorial_codigo_key" ON academic_work_plan."Territorial" USING btree (codigo);


--
-- Name: Territorial_nombre_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Territorial_nombre_key" ON academic_work_plan."Territorial" USING btree (nombre);


--
-- Name: UsuarioRol_usuarioId_rolId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UsuarioRol_usuarioId_rolId_key" ON academic_work_plan."UsuarioRol" USING btree ("usuarioId", "rolId");


--
-- Name: Usuario_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Usuario_email_key" ON academic_work_plan."Usuario" USING btree (email);


--
-- Name: idx_aprobacion_jefatura_pta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aprobacion_jefatura_pta ON academic_work_plan."AprobacionJefatura" USING btree ("ptaId");


--
-- Name: idx_aprobacion_jefatura_pta_territorial; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_aprobacion_jefatura_pta_territorial ON academic_work_plan."AprobacionJefatura" USING btree ("ptaId", "territorialId");


--
-- Name: idx_aprobacion_jefatura_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aprobacion_jefatura_user ON academic_work_plan."AprobacionJefatura" USING btree ("jefaturaUserId");


--
-- Name: idx_historial_pta_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_pta_tipo ON academic_work_plan."HistorialEstadoPTA" USING btree ("ptaId", "tipoAccion");


--
-- Name: idx_pta_docente_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pta_docente_periodo ON academic_work_plan."PlanTrabajoAcademico" USING btree ("docenteId", periodo);


--
-- Name: idx_pta_estado_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pta_estado_periodo ON academic_work_plan."PlanTrabajoAcademico" USING btree (estado, periodo);


--
-- Name: idx_solicitud_docente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitud_docente ON academic_work_plan."SolicitudPTA" USING btree ("docenteId");


--
-- Name: idx_solicitud_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitud_estado ON academic_work_plan."SolicitudPTA" USING btree (estado);


--
-- Name: AprobacionJefatura AprobacionJefatura_ptaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."AprobacionJefatura"
    ADD CONSTRAINT "AprobacionJefatura_ptaId_fkey" FOREIGN KEY ("ptaId") REFERENCES academic_work_plan."PlanTrabajoAcademico"(id) ON DELETE CASCADE;


--
-- Name: Asignatura Asignatura_programaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Asignatura"
    ADD CONSTRAINT "Asignatura_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES academic_work_plan."Programa"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CarpetaDigital CarpetaDigital_personaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."CarpetaDigital"
    ADD CONSTRAINT "CarpetaDigital_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES academic_work_plan."Persona"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Concertacion Concertacion_ptaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Concertacion"
    ADD CONSTRAINT "Concertacion_ptaId_fkey" FOREIGN KEY ("ptaId") REFERENCES academic_work_plan."PlanTrabajoAcademico"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DetallesPta DetallesPta_asignaturaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."DetallesPta"
    ADD CONSTRAINT "DetallesPta_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES academic_work_plan."Asignatura"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DetallesPta DetallesPta_ptaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."DetallesPta"
    ADD CONSTRAINT "DetallesPta_ptaId_fkey" FOREIGN KEY ("ptaId") REFERENCES academic_work_plan."PlanTrabajoAcademico"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Docente Docente_personaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Docente"
    ADD CONSTRAINT "Docente_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES academic_work_plan."Persona"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Docente Docente_sedeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Docente"
    ADD CONSTRAINT "Docente_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES academic_work_plan."Sede"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Docente Docente_territorialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Docente"
    ADD CONSTRAINT "Docente_territorialId_fkey" FOREIGN KEY ("territorialId") REFERENCES academic_work_plan."Territorial"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DocumentoVersion DocumentoVersion_documentoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."DocumentoVersion"
    ADD CONSTRAINT "DocumentoVersion_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES academic_work_plan."Documento"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Documento Documento_personaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Documento"
    ADD CONSTRAINT "Documento_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES academic_work_plan."Persona"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HistorialEstadoPTA HistorialEstadoPTA_ptaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."HistorialEstadoPTA"
    ADD CONSTRAINT "HistorialEstadoPTA_ptaId_fkey" FOREIGN KEY ("ptaId") REFERENCES academic_work_plan."PlanTrabajoAcademico"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PersonaPrograma PersonaPrograma_personaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."PersonaPrograma"
    ADD CONSTRAINT "PersonaPrograma_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES academic_work_plan."Persona"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PersonaPrograma PersonaPrograma_programaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."PersonaPrograma"
    ADD CONSTRAINT "PersonaPrograma_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES academic_work_plan."Programa"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Persona Persona_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Persona"
    ADD CONSTRAINT "Persona_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES academic_work_plan."Usuario"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PlanTrabajoAcademico PlanTrabajoAcademico_docenteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."PlanTrabajoAcademico"
    ADD CONSTRAINT "PlanTrabajoAcademico_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES academic_work_plan."Docente"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PtaEvidencia PtaEvidencia_ptaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."PtaEvidencia"
    ADD CONSTRAINT "PtaEvidencia_ptaId_fkey" FOREIGN KEY ("ptaId") REFERENCES academic_work_plan."PlanTrabajoAcademico"(id) ON DELETE CASCADE;


--
-- Name: RolPermiso RolPermiso_permisoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."RolPermiso"
    ADD CONSTRAINT "RolPermiso_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES academic_work_plan."Permiso"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolPermiso RolPermiso_rolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."RolPermiso"
    ADD CONSTRAINT "RolPermiso_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES academic_work_plan."Rol"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sede Sede_territorialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."Sede"
    ADD CONSTRAINT "Sede_territorialId_fkey" FOREIGN KEY ("territorialId") REFERENCES academic_work_plan."Territorial"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SolicitudPTA SolicitudPTA_docenteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."SolicitudPTA"
    ADD CONSTRAINT "SolicitudPTA_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES academic_work_plan."Docente"(id) ON DELETE CASCADE;


--
-- Name: UsuarioRol UsuarioRol_rolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."UsuarioRol"
    ADD CONSTRAINT "UsuarioRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES academic_work_plan."Rol"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UsuarioRol UsuarioRol_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY academic_work_plan."UsuarioRol"
    ADD CONSTRAINT "UsuarioRol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES academic_work_plan."Usuario"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
