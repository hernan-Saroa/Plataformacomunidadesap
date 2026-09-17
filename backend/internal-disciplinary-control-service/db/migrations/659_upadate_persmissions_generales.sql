-- ============================================
-- MIGRATION 659: Permisos generales
-- ============================================
-- actualiza los permisos generales

DO $$
DECLARE
  v_es_jefe_ocid uuid;
  v_es_radicador uuid;
  v_es_profesional uuid;
BEGIN
  SELECT id_permission INTO v_es_jefe_ocid FROM auth.permission WHERE code = 'control-disciplinario.es_jefe_ocid';
  SELECT id_permission INTO v_es_radicador FROM auth.permission WHERE code = 'control-disciplinario.es_radicador';
  SELECT id_permission INTO v_es_profesional FROM auth.permission WHERE code = 'control-disciplinario.es_profesional';

  UPDATE auth.permission
  SET code = 'control-disciplinario.general.es_jefe_ocid', name = 'Es Jefe OCID'
  WHERE id_permission = v_es_jefe_ocid;

  UPDATE auth.permission
  SET code = 'control-disciplinario.general.es_radicador', name = 'Es Radicador'
  WHERE id_permission = v_es_radicador;

  UPDATE auth.permission
  SET code = 'control-disciplinario.general.es_profesional', name = 'Es Profesional'
  WHERE id_permission = v_es_profesional;

  RAISE NOTICE 'Permisos actualizados correctamente: Es Jefe OCID, Es Radicador, Es Profesional';
END $$;