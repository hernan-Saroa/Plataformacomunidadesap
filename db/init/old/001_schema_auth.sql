DROP SCHEMA IF EXISTS auth CASCADE;
CREATE SCHEMA auth;

CREATE TABLE IF NOT EXISTS auth.personas (
  id_tercero bigint PRIMARY KEY NOT NULL,
  num_identificacion VARCHAR(30) NOT NULL,
  tip_identificacion VARCHAR(6) NOT NULL,
  nom_largo VARCHAR(1000) NOT NULL,
  sig_tercero VARCHAR(10),
  nom_tercero VARCHAR(250) NOT NULL,
  pri_apellido VARCHAR(250),
  seg_apellido VARCHAR(250),
  gen_tercero VARCHAR(6) NOT NULL,
  est_civil VARCHAR(6),
  fec_nacimiento DATE,
  cod_nacionalidad VARCHAR(6),
  ind_vive smallint DEFAULT 1,
  dir_residencia VARCHAR(250),
  dir_email VARCHAR(100),
  tel_residencia VARCHAR(20),
  tel_celular VARCHAR(20),
  id_ubi_res bigint,
  id_ubi_nac bigint,
  num_tarjeta_militar VARCHAR(20),
  dis_tarjeta_militar VARCHAR(8),
  cod_anterior VARCHAR(30),
  cod_tercero VARCHAR(12),
  fec_creacion DATE,
  fec_modificacion DATE,
  usu_creacion VARCHAR(20),
  usu_modificacion VARCHAR(20),
  gru_sanguineo VARCHAR(2),
  frh_sanguineo VARCHAR(2),
  zon_origen VARCHAR(6),
  id_ubi_documento bigint,
  dig_chequeo CHAR(1),
  ind_sordera smallint,
  ind_prob_motores smallint,
  ind_invidente smallint,
  ind_vision_parcial smallint,
  fec_exp_documento DATE,
  fec_ult_act_laboral DATE,
  ind_act_laboral smallint,
  cod_cat_tercero VARCHAR(5),
  atr_tercero VARCHAR(6),
  nom_arc_foto VARCHAR(60),
  niv_ing_familiar integer,
  nom_barrio VARCHAR(100),
  dep_economica VARCHAR(6),
  num_per_familiar smallint,
  num_per_a_cargo integer,
  id_barrio integer,
  seg_nombre VARCHAR(250),
  cod_pai_tel VARCHAR(5),
  cod_are_tel VARCHAR(5),
  cod_are_num_fax VARCHAR(6),
  cod_are_tel_residencia VARCHAR(6),
  cod_pai_num_fax VARCHAR(6),
  cod_pai_tel_residencia VARCHAR(6),
  id_empresa bigint,
  num_fax VARCHAR(12),
  ind_act_dat_tercero smallint DEFAULT 0,
  cod_usuario_ldap VARCHAR(200),
  dir_email_per VARCHAR(100),
  cod_tip_identificacion VARCHAR(6) NOT NULL DEFAULT 'TIPIDE',
  emp_tip_identificacion bigint NOT NULL DEFAULT 0,
  tip_gen_tercero VARCHAR(6) NOT NULL DEFAULT 'TIPGEN',
  emp_gen_tercero bigint NOT NULL DEFAULT 0,
  num_est_economico VARCHAR(6),
  tip_est_economico VARCHAR(6) DEFAULT 'ESTRAT',
  emp_est_economico bigint DEFAULT 0,
  eps_tercero VARCHAR(6),
  tip_eps_tercero VARCHAR(6) DEFAULT 'CODEPS',
  emp_eps_tercero bigint DEFAULT 0,
  tip_est_civil VARCHAR(6) DEFAULT 'ESTCIV',
  emp_est_civil bigint DEFAULT 0,
  nat_tercero VARCHAR(6),
  tip_nat_tercero VARCHAR(6) DEFAULT 'NATTER',
  emp_nat_tercero bigint DEFAULT 0,
  tip_cod_nacionalidad VARCHAR(6) DEFAULT 'TIPNAC',
  emp_cod_nacionalidad bigint DEFAULT 0,
  fec_act_dat_tercero DATE,
  facebook VARCHAR(100),
  twitter VARCHAR(200),
  linkedin VARCHAR(200),
  skype VARCHAR(100),
  whatsapp VARCHAR(100),
  ind_con_legales smallint,
  ind_hoja_vida smallint,
  ind_habeas_data smallint,
  fec_habeas_data DATE,
  ip_habeas_data VARCHAR(4000),
  num_pasaporte VARCHAR(200),
  fec_vig_pasaporte DATE,
  nom_doc_firma VARCHAR(250),
  ext_doc_firma VARCHAR(10),
  doc_firma BYTEA,
  tam_doc_firma numeric(32,0),
  ind_exp_laborar smallint,
  ind_habeas_data_egre smallint DEFAULT 0,
  fec_habeas_data_egre DATE,
  ip_habeas_data_egre VARCHAR(4000),
  pwd_cvlac VARCHAR(4000),
  nacionalidad_cvlac VARCHAR(200),
  nombres_cvlac VARCHAR(4000),
  num_identi_cvlac VARCHAR(20),
  -- Campos de vinculación territorial
  id_seccional BIGINT,
  id_sede BIGINT
);

CREATE TABLE auth.informacion_adicional_personas (
  id_tercero bigint PRIMARY KEY NOT NULL,
  obs_tercero VARCHAR(1000),
  num_visa VARCHAR(20),
  cla_visa VARCHAR(20),
  cla_libreta VARCHAR(20),
  gru_sanguineo VARCHAR(2),
  frh_sanguineo VARCHAR(2),
  zon_origen VARCHAR(6),
  cod_raza VARCHAR(6),
  cod_gru_etnico VARCHAR(6),
  cod_religion VARCHAR(6),
  cod_estatura integer,
  fec_ult_act DATE,
  fec_creacion DATE,
  usu_creacion VARCHAR(20),
  usu_actualizacion VARCHAR(20),
  cla_tercero VARCHAR(20),
  ind_gru_vulnerable smallint,
  ind_vic_armado smallint,
  id_lug_desplazado bigint,
  ind_ori_sector smallint,
  ind_pol_especial smallint,
  num_per_grupo smallint,
  num_per_aportan smallint,
  val_ing_familiar numeric(14,2),
  ind_tip_vivienda smallint,
  ind_deu_vivienda smallint,
  pos_hermanos smallint,
  cod_pai_fronterizo VARCHAR(6),
  cod_capacidad VARCHAR(6),
  cod_resguardo VARCHAR(6),
  cam_foto TEXT,
  nom_resguardo VARCHAR(200),
  niv_estudio VARCHAR(6),
  tip_ocupacion VARCHAR(6),
  ind_aportante smallint NOT NULL,
  cod_gru_sanguineo VARCHAR(6) DEFAULT 'GRUSAN',
  emp_gru_sanguineo bigint DEFAULT 0,
  cod_frh_sanguineo VARCHAR(6) DEFAULT 'FACHR',
  emp_frh_sanguineo bigint DEFAULT 0,
  gen_raza VARCHAR(6) DEFAULT 'CODRAZ',
  emp_cod_raza bigint DEFAULT 0,
  gen_gru_etnico VARCHAR(6) DEFAULT 'GRUETN',
  emp_cod_gru_etnico bigint DEFAULT 0,
  gen_religion VARCHAR(6) DEFAULT 'CODREL',
  emp_cod_religion bigint DEFAULT 0,
  gen_capacidad VARCHAR(6) DEFAULT 'GRUCAP',
  emp_cod_capacidad bigint DEFAULT 0,
  gen_resguardo VARCHAR(6) DEFAULT 'GRURES',
  emp_cod_resguardo bigint DEFAULT 0,
  cod_niv_estudio VARCHAR(6) DEFAULT 'NIVFOR',
  emp_niv_estudio bigint DEFAULT 0,
  cod_tip_ocupacion VARCHAR(6) DEFAULT 'TIPOCU',
  emp_tip_ocupacion bigint DEFAULT 0,
  tip_sispen VARCHAR(6),
  cod_sipen VARCHAR(6),
  emp_sispen bigint,
  fec_afilia_sispen DATE,
  tip_afp VARCHAR(6),
  cod_afp VARCHAR(6),
  emp_afp bigint,
  codigo_afp VARCHAR(120),
  urbanizacion VARCHAR(4000),
  telefono_2 VARCHAR(20),
  tip_apelativo VARCHAR(6),
  cod_apelativo VARCHAR(6),
  emp_apelativo bigint,
  tel_oficina VARCHAR(20),
  num_cuenta_1 VARCHAR(100),
  id_banco_1 bigint,
  tip_cuenta_1 VARCHAR(6),
  cod_cuenta_1 VARCHAR(6),
  emp_cuenta_1 bigint,
  num_cuenta_2 VARCHAR(100),
  id_banco_2 bigint,
  tip_cuenta_2 VARCHAR(6),
  cod_cuenta_2 VARCHAR(6),
  emp_cuenta_2 bigint,
  tip_tabvia VARCHAR(6),
  cod_tabvia VARCHAR(6),
  emp_tabvia bigint,
  tel_emergencia VARCHAR(20),
  contacto_emergencia VARCHAR(1000),
  tip_sit_padres VARCHAR(6),
  cod_sit_padres VARCHAR(6),
  emp_sit_padres bigint,
  num_per_trabajan integer,
  numero_hermanos integer,
  num_hermanos_educ_superior smallint,
  tip_costeo_estudios VARCHAR(6),
  cod_costeo_estudios VARCHAR(6),
  emp_costeo_estudios bigint,
  numero_hijos smallint,
  perfil_profesional VARCHAR(4000),
  anios_experiencia smallint,
  tip_pue_indg VARCHAR(6) DEFAULT 'CODPUE',
  cod_pue_indg VARCHAR(6) DEFAULT 'CODZON',
  emp_pue_indg bigint,
  tip_zona_res VARCHAR(6),
  cod_zona_res VARCHAR(6),
  emp_zona_res bigint,
  tip_com_negra VARCHAR(6) DEFAULT 'CODCOM',
  cod_com_negra VARCHAR(6),
  emp_com_negra bigint,
  ind_rel_familiar smallint DEFAULT 0,
  tip_rel_familiar VARCHAR(6) DEFAULT 'TIPREL',
  cod_rel_familiar VARCHAR(6),
  emp_rel_familiar bigint,
  tip_discapacidad VARCHAR(6) DEFAULT 'CODDIS',
  cod_discapacidad VARCHAR(6),
  emp_discapacidad bigint,
  id_regimen_especial bigint,
  tip_regimen VARCHAR(6) DEFAULT 'REGESP',
  cod_regimen VARCHAR(6),
  emp_regimen bigint,
  tip_ley_beneficio VARCHAR(6) DEFAULT 'BENLEY',
  cod_ley_beneficio VARCHAR(6),
  emp_ley_beneficio bigint
);

CREATE TABLE auth.tipos_tercero (
  id_tip_tercero bigint PRIMARY KEY NOT NULL,
  id_tercero bigint NOT NULL,
  tip_tabla VARCHAR(6) NOT NULL,
  cod_tabla VARCHAR(6) NOT NULL,
  emp_tabla bigint NOT NULL DEFAULT 1,
  nom_tipo_tercero VARCHAR(30),
  fec_ult_act DATE,
  fec_creacion DATE,
  usu_creacion VARCHAR(20),
  usu_actualizacion VARCHAR(20),
  cla_tercero VARCHAR(64),
  gra_est_alumno VARCHAR(10),
  ind_activo smallint NOT NULL,
  ind_restaura smallint NOT NULL,
  ind_defecto smallint NOT NULL,
  id_empresa bigint NOT NULL,
  fec_fin DATE,
  fec_cla_tercero DATE
);

CREATE TABLE auth.cargos (
  id_cargo bigint PRIMARY KEY NOT NULL,
  cod_cargo VARCHAR(20) NOT NULL,
  id_cargo01 VARCHAR(20) NOT NULL,
  nom_cargo VARCHAR(250) NOT NULL,
  fec_ult_act DATE,
  fec_creacion DATE,
  nom_des_cargo VARCHAR(200),
  usu_creacion VARCHAR(20),
  usu_actualizacion VARCHAR(20),
  cod_equivale VARCHAR(20),
  tip_jer_cargo VARCHAR(6),
  cod_jer_cargo VARCHAR(6),
  emp_jer_cargo bigint
);

CREATE TABLE auth.dependencias (
  id_dependencia bigint PRIMARY KEY NOT NULL,
  id_empresa bigint NOT NULL,
  cod_dependencia VARCHAR(20) NOT NULL,
  id_cen_costo bigint NOT NULL,
  id_dependencia1 bigint NOT NULL,
  nom_dependencia VARCHAR(250),
  nom_responsable VARCHAR(40),
  tip_unidad smallint,
  fec_ult_act DATE,
  fec_creacion DATE,
  usu_creacion VARCHAR(20),
  usu_actualizacion VARCHAR(20),
  id_tercero bigint,
  id_sede bigint,
  cod_tip_unidad VARCHAR(6),
  cod_pai_telefono integer,
  cod_are_telefono integer,
  num_telefono VARCHAR(30),
  cod_pai_num_fax integer,
  cod_are_num_fax integer,
  num_apartado VARCHAR(20),
  url_dependencia VARCHAR(250),
  dir_email VARCHAR(250),
  id_geopolitica bigint,
  id_cargo bigint,
  tel_ext VARCHAR(5),
  dir_dependencia VARCHAR(250),
  num_fax VARCHAR(30),
  gen_tip_unidad VARCHAR(6) DEFAULT 'TIUORG',
  emp_cod_tip_unidad bigint DEFAULT 0,
  dir_email2 VARCHAR(250),
  fir_dependencia1 bigint,
  fir_dependencia2 bigint,
  fir_dependencia3 bigint,
  fir_dependencia4 bigint,
  id_dep_fir_cer1 bigint,
  id_dep_fir_cer2 bigint,
  id_dep_fir_cer3 bigint,
  id_dep_fir_cer4 bigint
);

CREATE TABLE auth.geopolitica (
  id_geopolitica bigint PRIMARY KEY NOT NULL,
  cod_geopolitica VARCHAR(20) NOT NULL,
  cod_pais smallint,
  cod_departamento smallint,
  cod_ciudad smallint,
  nom_div_geopolitica VARCHAR(250),
  num_habitantes bigint,
  tip_division VARCHAR(6),
  cod_division VARCHAR(6),
  cod_zon_geografica VARCHAR(6),
  fec_ult_act DATE,
  fec_creacion DATE,
  usu_creacion VARCHAR(20),
  usu_actualizacion VARCHAR(20),
  cod_intl_pais VARCHAR(3),
  cod_unso VARCHAR(3),
  cod_dian VARCHAR(3),
  cod_lat numeric(11,8),
  cod_lon numeric(11,8),
  id_padre bigint,
  cod_idioma VARCHAR(3),
  nom_idioma VARCHAR(250),
  cod_idm VARCHAR(3),
  nom_div_geopolitica_tot VARCHAR(200),
  cod_are_tel VARCHAR(6),
  cod_pais_defecto VARCHAR(3),
  ind_oculto smallint NOT NULL
);

CREATE TABLE auth.sedes (
  id_sede bigint PRIMARY KEY NOT NULL,
  id_empresa bigint NOT NULL,
  cod_sede VARCHAR(5) NOT NULL,
  nom_sede VARCHAR(50) NOT NULL,
  id_geopolitica bigint NOT NULL,
  dir_sede VARCHAR(250),
  fec_ult_act DATE,
  fec_creacion DATE,
  usu_creacion VARCHAR(20),
  usu_actualizacion VARCHAR(20),
  cod_atributo VARCHAR(10),
  id_seccional bigint,
  sede_act VARCHAR(30),
  num_latitud numeric(32,29),
  num_longitud numeric(32,29),
  cod_iac_inscripciones VARCHAR(250),
  cod_iac_matricula VARCHAR(250),
  cod_iac_otros_conceptos VARCHAR(250),
  fir_sede1 bigint,
  fir_sede2 bigint,
  fir_sede3 bigint,
  fir_sede4 bigint,
  id_dep_fir_cer1 bigint,
  id_dep_fir_cer2 bigint,
  id_dep_fir_cer3 bigint,
  id_dep_fir_cer4 bigint,
  -- Campos adicionales de contacto y configuración
  tel_sede VARCHAR(50),
  email_sede VARCHAR(100),
  capacidad_estudiantes INT,
  capacidad_docentes INT,
  permite_inscripciones BOOLEAN DEFAULT TRUE,
  permite_matriculas BOOLEAN DEFAULT TRUE,
  visible_portal BOOLEAN DEFAULT TRUE,
  observaciones TEXT
);

CREATE TABLE auth.seccionales (
  id_seccional bigint PRIMARY KEY NOT NULL,
  nom_seccional VARCHAR(100) NOT NULL,
  dir_seccional VARCHAR(250),
  id_ubi_seccional bigint,
  fec_creacion DATE,
  fec_ult_act DATE,
  usu_creacion VARCHAR(20),
  usu_actualizacion VARCHAR(20),
  cod_seccional VARCHAR(5),
  id_empresa bigint,
  nit_seccional VARCHAR(15),
  fir_seccional1 bigint,
  fir_seccional2 bigint,
  fir_seccional3 bigint,
  fir_seccional4 bigint,
  id_dep_fir_cer1 bigint,
  id_dep_fir_cer2 bigint,
  id_dep_fir_cer3 bigint,
  id_dep_fir_cer4 bigint
);

CREATE TABLE auth.generica (
  tip_tabla VARCHAR(6) NOT NULL,
  cod_tabla VARCHAR(6) NOT NULL,
  nom_tabla VARCHAR(20),
  cod_auxiliar1 VARCHAR(250),
  cod_auxiliar2 VARCHAR(250),
  nom_alias VARCHAR(1000),
  fec_uli_act DATE,
  fec_creacion DATE,
  usu_creacion VARCHAR(20),
  usu_actualizacion VARCHAR(20),
  cod_snies VARCHAR(10),
  nom_estructura VARCHAR(30),
  ind_privada smallint NOT NULL,
  ind_visible smallint DEFAULT 1,
  des_tabla VARCHAR(1000),
  cod_directorio VARCHAR(256),
  id_empresa bigint NOT NULL,
  PRIMARY KEY (tip_tabla, cod_tabla, id_empresa)
);

CREATE TABLE auth.centros_costo (
  id_cen_costo bigint PRIMARY KEY NOT NULL,
  id_empresa bigint NOT NULL,
  cod_cen_costo VARCHAR(20) NOT NULL,
  nom_cen_costo VARCHAR(250) NOT NULL,
  cod_cen_padre bigint NOT NULL,
  fec_ult_act DATE,
  fec_creacion DATE,
  usu_creacion VARCHAR(20),
  usu_actualizacion VARCHAR(20),
  est_centro smallint NOT NULL DEFAULT 1,
  id_geopolitica bigint,
  ind_movimiento integer NOT NULL
);

CREATE TABLE auth.user (
  id_user uuid PRIMARY KEY NOT NULL,
  public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  id_tercero bigint,
  is_active bool DEFAULT true,
  token integer,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE auth.role (
  id uuid PRIMARY KEY NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,      -- código técnico del rol (para backend)
  name VARCHAR(100) UNIQUE NOT NULL,     -- nombre visible en UI
  description text,
  category VARCHAR(20) NOT NULL,         -- academico | administrativo | directivo | operativo | sistema
  icon VARCHAR(50) DEFAULT 'Shield',     -- ícono del rol
  color VARCHAR(20) DEFAULT '#003DA5',   -- color del rol
  type VARCHAR(20) DEFAULT 'personalizado', -- sistema | personalizado
  is_active bool DEFAULT true,
  requires_2fa bool DEFAULT false,       -- requiere autenticación de dos factores
  created_by VARCHAR(100),               -- usuario que creó el rol
  updated_by VARCHAR(100),               -- usuario que actualizó el rol
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE auth.module (
  id_module uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description text,
  icon VARCHAR(50) DEFAULT 'Shield',
  color VARCHAR(20) DEFAULT '#003DA5',
  display_order integer DEFAULT 0,
  category VARCHAR(30) NOT NULL DEFAULT 'backoffice',  -- backoffice | portal
  is_active bool DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth.permission (
  id_permission uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description text,
  id_module uuid NOT NULL,
  is_active bool DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth.user_roles (
  id_user uuid REFERENCES auth.user(id_user) ON DELETE CASCADE,
  id_rol uuid REFERENCES auth.role(id) ON DELETE CASCADE,
  is_active bool DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (id_user, id_rol)
);

CREATE TABLE auth.role_permissions (
  id_rol uuid REFERENCES auth.role(id) ON DELETE CASCADE,
  id_permission uuid REFERENCES auth.permission(id_permission) ON DELETE CASCADE,
  is_active bool DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (id_rol, id_permission)
);

ALTER TABLE auth.informacion_adicional_personas ADD CONSTRAINT fk_infoper_personas FOREIGN KEY (id_tercero) REFERENCES auth.personas (id_tercero);

ALTER TABLE auth.tipos_tercero ADD CONSTRAINT fk_tipos_tercero_personas FOREIGN KEY (id_tercero) REFERENCES auth.personas (id_tercero);

ALTER TABLE auth.personas ADD CONSTRAINT fk_personas_ubi_res FOREIGN KEY (id_ubi_res) REFERENCES auth.geopolitica (id_geopolitica);

ALTER TABLE auth.personas ADD CONSTRAINT fk_personas_ubi_nac FOREIGN KEY (id_ubi_nac) REFERENCES auth.geopolitica (id_geopolitica);

ALTER TABLE auth.personas ADD CONSTRAINT fk_personas_ubi_doc FOREIGN KEY (id_ubi_documento) REFERENCES auth.geopolitica (id_geopolitica);

ALTER TABLE auth.personas ADD CONSTRAINT fk_personas_seccional FOREIGN KEY (id_seccional) REFERENCES auth.seccionales (id_seccional);

ALTER TABLE auth.personas ADD CONSTRAINT fk_personas_sede FOREIGN KEY (id_sede) REFERENCES auth.sedes (id_sede);

CREATE INDEX idx_personas_seccional ON auth.personas(id_seccional);

CREATE INDEX idx_personas_sede ON auth.personas(id_sede);

ALTER TABLE auth.informacion_adicional_personas ADD CONSTRAINT fk_infoper_lug_desplazado FOREIGN KEY (id_lug_desplazado) REFERENCES auth.geopolitica (id_geopolitica);

ALTER TABLE auth.centros_costo ADD CONSTRAINT fk_ccosto_padre FOREIGN KEY (cod_cen_padre) REFERENCES auth.centros_costo (id_cen_costo);

ALTER TABLE auth.centros_costo ADD CONSTRAINT fk_ccosto_geopolitica FOREIGN KEY (id_geopolitica) REFERENCES auth.geopolitica (id_geopolitica);

ALTER TABLE auth.geopolitica ADD CONSTRAINT fk_geopolitica_padre FOREIGN KEY (id_padre) REFERENCES auth.geopolitica (id_geopolitica);

ALTER TABLE auth.dependencias ADD CONSTRAINT fk_dep_ccosto FOREIGN KEY (id_cen_costo) REFERENCES auth.centros_costo (id_cen_costo);

ALTER TABLE auth.dependencias ADD CONSTRAINT fk_dep_padre FOREIGN KEY (id_dependencia1) REFERENCES auth.dependencias (id_dependencia);

ALTER TABLE auth.dependencias ADD CONSTRAINT fk_dep_sede FOREIGN KEY (id_sede) REFERENCES auth.sedes (id_sede);

ALTER TABLE auth.dependencias ADD CONSTRAINT fk_dep_geopolitica FOREIGN KEY (id_geopolitica) REFERENCES auth.geopolitica (id_geopolitica);

ALTER TABLE auth.dependencias ADD CONSTRAINT fk_dep_responsable FOREIGN KEY (id_tercero) REFERENCES auth.personas (id_tercero);

ALTER TABLE auth.dependencias ADD CONSTRAINT fk_dep_cargo FOREIGN KEY (id_cargo) REFERENCES auth.cargos (id_cargo);

ALTER TABLE auth.sedes ADD CONSTRAINT fk_sedes_geopolitica FOREIGN KEY (id_geopolitica) REFERENCES auth.geopolitica (id_geopolitica);

ALTER TABLE auth.sedes ADD CONSTRAINT fk_sedes_seccional FOREIGN KEY (id_seccional) REFERENCES auth.seccionales (id_seccional);

ALTER TABLE auth.seccionales ADD CONSTRAINT fk_seccional_geopolitica FOREIGN KEY (id_ubi_seccional) REFERENCES auth.geopolitica (id_geopolitica);

ALTER TABLE auth.user ADD CONSTRAINT fk_user_personas FOREIGN KEY (id_tercero) REFERENCES auth.personas (id_tercero);

ALTER TABLE auth.permission ADD CONSTRAINT fk_permission_module FOREIGN KEY (id_module) REFERENCES auth.module (id_module);
