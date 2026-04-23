-- Eliminar columnas que no pertenecen al esquema objetivo

ALTER TABLE auth.personas
  DROP COLUMN IF EXISTS sig_tercero,
  DROP COLUMN IF EXISTS est_civil,
  DROP COLUMN IF EXISTS cod_nacionalidad,
  DROP COLUMN IF EXISTS ind_vive,
  DROP COLUMN IF EXISTS tel_residencia,
  DROP COLUMN IF EXISTS id_ubi_res,
  DROP COLUMN IF EXISTS id_ubi_nac,
  DROP COLUMN IF EXISTS num_tarjeta_militar,
  DROP COLUMN IF EXISTS dis_tarjeta_militar,
  DROP COLUMN IF EXISTS cod_anterior,
  DROP COLUMN IF EXISTS cod_tercero,
  DROP COLUMN IF EXISTS gru_sanguineo,
  DROP COLUMN IF EXISTS frh_sanguineo,
  DROP COLUMN IF EXISTS zon_origen,
  DROP COLUMN IF EXISTS id_ubi_documento,
  DROP COLUMN IF EXISTS dig_chequeo,
  DROP COLUMN IF EXISTS ind_sordera,
  DROP COLUMN IF EXISTS ind_prob_motores,
  DROP COLUMN IF EXISTS ind_invidente,
  DROP COLUMN IF EXISTS ind_vision_parcial,
  DROP COLUMN IF EXISTS fec_exp_documento,
  DROP COLUMN IF EXISTS fec_ult_act_laboral,
  DROP COLUMN IF EXISTS ind_act_laboral,
  DROP COLUMN IF EXISTS cod_cat_tercero,
  DROP COLUMN IF EXISTS atr_tercero,
  DROP COLUMN IF EXISTS nom_arc_foto,
  DROP COLUMN IF EXISTS niv_ing_familiar,
  DROP COLUMN IF EXISTS nom_barrio,
  DROP COLUMN IF EXISTS dep_economica,
  DROP COLUMN IF EXISTS num_per_familiar,
  DROP COLUMN IF EXISTS num_per_a_cargo,
  DROP COLUMN IF EXISTS id_barrio,
  DROP COLUMN IF EXISTS seg_nombre,
  DROP COLUMN IF EXISTS cod_pai_tel,
  DROP COLUMN IF EXISTS cod_are_tel,
  DROP COLUMN IF EXISTS cod_are_num_fax,
  DROP COLUMN IF EXISTS cod_are_tel_residencia,
  DROP COLUMN IF EXISTS cod_pai_num_fax,
  DROP COLUMN IF EXISTS cod_pai_tel_residencia,
  DROP COLUMN IF EXISTS id_empresa,
  DROP COLUMN IF EXISTS num_fax,
  DROP COLUMN IF EXISTS ind_act_dat_tercero,
  DROP COLUMN IF EXISTS cod_usuario_ldap,
  DROP COLUMN IF EXISTS dir_email_per,
  DROP COLUMN IF EXISTS cod_tip_identificacion,
  DROP COLUMN IF EXISTS emp_tip_identificacion,
  DROP COLUMN IF EXISTS tip_gen_tercero,
  DROP COLUMN IF EXISTS emp_gen_tercero,
  DROP COLUMN IF EXISTS num_est_economico,
  DROP COLUMN IF EXISTS tip_est_economico,
  DROP COLUMN IF EXISTS emp_est_economico,
  DROP COLUMN IF EXISTS eps_tercero,
  DROP COLUMN IF EXISTS tip_eps_tercero,
  DROP COLUMN IF EXISTS emp_eps_tercero,
  DROP COLUMN IF EXISTS tip_est_civil,
  DROP COLUMN IF EXISTS emp_est_civil,
  DROP COLUMN IF EXISTS nat_tercero,
  DROP COLUMN IF EXISTS tip_nat_tercero,
  DROP COLUMN IF EXISTS emp_nat_tercero,
  DROP COLUMN IF EXISTS tip_cod_nacionalidad,
  DROP COLUMN IF EXISTS emp_cod_nacionalidad,
  DROP COLUMN IF EXISTS fec_act_dat_tercero,
  DROP COLUMN IF EXISTS facebook,
  DROP COLUMN IF EXISTS twitter,
  DROP COLUMN IF EXISTS linkedin,
  DROP COLUMN IF EXISTS skype,
  DROP COLUMN IF EXISTS whatsapp,
  DROP COLUMN IF EXISTS ind_con_legales,
  DROP COLUMN IF EXISTS ind_hoja_vida,
  DROP COLUMN IF EXISTS ind_habeas_data,
  DROP COLUMN IF EXISTS fec_habeas_data,
  DROP COLUMN IF EXISTS ip_habeas_data,
  DROP COLUMN IF EXISTS num_pasaporte,
  DROP COLUMN IF EXISTS fec_vig_pasaporte,
  DROP COLUMN IF EXISTS nom_doc_firma,
  DROP COLUMN IF EXISTS ext_doc_firma,
  DROP COLUMN IF EXISTS doc_firma,
  DROP COLUMN IF EXISTS tam_doc_firma,
  DROP COLUMN IF EXISTS ind_exp_laborar,
  DROP COLUMN IF EXISTS ind_habeas_data_egre,
  DROP COLUMN IF EXISTS fec_habeas_data_egre,
  DROP COLUMN IF EXISTS ip_habeas_data_egre,
  DROP COLUMN IF EXISTS pwd_cvlac,
  DROP COLUMN IF EXISTS nacionalidad_cvlac,
  DROP COLUMN IF EXISTS nombres_cvlac,
  DROP COLUMN IF EXISTS num_identi_cvlac;


-- Eliminar tablas no utilizadas en el esquema auth
-- Se incluyen CASCADE para limpiar llaves foraneas entre ellas

DROP TABLE IF EXISTS auth.informacion_adicional_personas CASCADE;
DROP TABLE IF EXISTS auth.tipos_tercero CASCADE;
DROP TABLE IF EXISTS auth.dependencias CASCADE;
DROP TABLE IF EXISTS auth.cargos CASCADE;
DROP TABLE IF EXISTS auth.centros_costo CASCADE;
DROP TABLE IF EXISTS auth.generica CASCADE;

ALTER TABLE auth.sedes
  DROP COLUMN IF EXISTS cod_iac_inscripciones,
  DROP COLUMN IF EXISTS cod_iac_matricula,
  DROP COLUMN IF EXISTS cod_iac_otros_conceptos,
  DROP COLUMN IF EXISTS fir_sede1,
  DROP COLUMN IF EXISTS fir_sede2,
  DROP COLUMN IF EXISTS fir_sede3,
  DROP COLUMN IF EXISTS fir_sede4,
  DROP COLUMN IF EXISTS id_dep_fir_cer1,
  DROP COLUMN IF EXISTS id_dep_fir_cer2,
  DROP COLUMN IF EXISTS id_dep_fir_cer3,
  DROP COLUMN IF EXISTS id_dep_fir_cer4;

  -- Try removing personas.id_tercero only if no dependencies remain outside auth."user".
DO $$
DECLARE
    personas_tbl REGCLASS := 'auth.personas'::regclass;
    id_tercero_attnum SMALLINT;
    fk_count INTEGER := 0;
    view_count INTEGER := 0;
BEGIN
    SELECT a.attnum
    INTO id_tercero_attnum
    FROM pg_attribute a
    WHERE a.attrelid = personas_tbl
      AND a.attname = 'id_tercero'
      AND NOT a.attisdropped;

    IF id_tercero_attnum IS NULL THEN
        RETURN;
    END IF;

    SELECT COUNT(*)
    INTO fk_count
    FROM pg_constraint con
    WHERE con.contype = 'f'
      AND con.confrelid = personas_tbl
      AND con.confkey = ARRAY[id_tercero_attnum];

    SELECT COUNT(*)
    INTO view_count
    FROM pg_depend d
    JOIN pg_rewrite r ON r.oid = d.objid
    JOIN pg_class v ON v.oid = r.ev_class
    WHERE d.refobjid = personas_tbl
      AND d.refobjsubid = id_tercero_attnum
      AND v.relkind IN ('v', 'm');

    IF fk_count = 0 AND view_count = 0 THEN
        ALTER TABLE auth.personas DROP CONSTRAINT IF EXISTS personas_id_tercero_key;
        ALTER TABLE auth.personas DROP COLUMN IF EXISTS id_tercero;
    ELSE
        RAISE NOTICE 'No se elimina auth.personas.id_tercero en esta migracion. Dependencias activas -> FKs: %, Views: %', fk_count, view_count;
    END IF;
END
$$;