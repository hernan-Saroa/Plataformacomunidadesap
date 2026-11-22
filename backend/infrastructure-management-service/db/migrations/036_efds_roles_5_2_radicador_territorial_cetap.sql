-- ============================================================================
-- Migración 036 — EFDS Alineación Roles 5.2 ERS v0.2: Radicador, DT y CETAP
-- Idempotente: ON CONFLICT DO NOTHING.
-- Registra los roles explícitos de la tabla 5.2 del ERS v0.2:
-- 1. Radicador (RADICADOR_INFRA)
-- 2. Coordinador Administrativo y Financiero DT (COORDINADOR_ADMINISTRATIVO_DT)
-- 3. Responsable CETAP (RESPONSABLE_CETAP)
-- Asigna permisos atómicos del módulo gestion-infraestructura y asocia
-- a los usuarios de prueba correspondientes (ej. usuariojhonradicador@esap.edu.co).
-- ============================================================================

BEGIN;
SET LOCAL search_path TO auth, public;

DO $$
DECLARE
  v_mod_id UUID;
  v_radicador_role_id UUID;
  v_dt_role_id UUID;
  v_cetap_role_id UUID;
  v_jhon_user_id UUID;
  v_solicitante_user_id UUID;
BEGIN

  -- 1. Obtener ID del módulo de infraestructura
  SELECT id_module INTO v_mod_id
    FROM auth.module
   WHERE code = 'gestion-infraestructura';

  IF v_mod_id IS NULL THEN
    RAISE NOTICE 'Módulo gestion-infraestructura no encontrado, omitiendo...';
    RETURN;
  END IF;

  -- 2. Insertar Roles Explícitos de Tabla 5.2 ERS v0.2
  INSERT INTO auth.role (id, code, name, description, category, icon, color, "type", is_active, requires_2fa, created_by, updated_by, created_at, updated_at)
  VALUES
    (
      gen_random_uuid(),
      'RADICADOR_INFRA',
      'Radicador',
      'Radica solicitudes en nombre de su área a través del formulario de la Super App y consulta su estado (ERS v0.2 Numeral 5.2).',
      'funcional',
      'file-plus',
      'sky',
      'funcional',
      true,
      false,
      'EFDS-seed-5.2',
      'EFDS-seed-5.2',
      now(),
      now()
    ),
    (
      gen_random_uuid(),
      'COORDINADOR_ADMINISTRATIVO_DT',
      'Coordinador Administrativo DT',
      'Enlace territorial / Asignador territorial: recibe, asigna, valida cierre y escala solicitudes de su Dirección Territorial (ERS v0.2 Numeral 5.2).',
      'funcional',
      'map-pin',
      'amber',
      'funcional',
      true,
      false,
      'EFDS-seed-5.2',
      'EFDS-seed-5.2',
      now(),
      now()
    ),
    (
      gen_random_uuid(),
      'RESPONSABLE_CETAP',
      'Responsable CETAP',
      'Radica y hace seguimiento a las solicitudes de infraestructura del CETAP municipal (ERS v0.2 Numeral 5.2).',
      'funcional',
      'building',
      'emerald',
      'funcional',
      true,
      false,
      'EFDS-seed-5.2',
      'EFDS-seed-5.2',
      now(),
      now()
    )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = true,
        updated_at = now();

  -- Obtener UUIDs de los roles
  SELECT id INTO v_radicador_role_id FROM auth.role WHERE code = 'RADICADOR_INFRA';
  SELECT id INTO v_dt_role_id FROM auth.role WHERE code = 'COORDINADOR_ADMINISTRATIVO_DT';
  SELECT id INTO v_cetap_role_id FROM auth.role WHERE code = 'RESPONSABLE_CETAP';

  -- 3. Asignar Permisos a RADICADOR_INFRA
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
  SELECT v_radicador_role_id, p.id_permission, true, now(), now()
    FROM auth.permission p
   WHERE p.id_module = v_mod_id
     AND p.code IN (
       'infraestructura.view',
       'infraestructura.solicitud.create',
       'infraestructura.solicitud.read_own',
       'infraestructura.solicitud.read_rejection_reason_own',
       'infraestructura.solicitud.confirm_close_own',
       'infraestructura.solicitud.rate_close_own'
     )
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

  -- 4. Asignar Permisos EXCLUSIVAMENTE a COORDINADOR_ADMINISTRATIVO_DT (ERS v0.2 Numeral 5.2)
  -- JEFATURA_TERRITORIAL (académico PTA) y DIRECTOR_TERRITORIAL (institucional) NO gestionan mantenimiento.
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
  SELECT v_dt_role_id, p.id_permission, true, now(), now()
    FROM auth.permission p
   WHERE p.id_module = v_mod_id
     AND p.code IN (
       'infraestructura.view',
       'infraestructura.solicitud.create',
       'infraestructura.solicitud.read_own',
       'infraestructura.solicitud.read_all',
       'infraestructura.solicitud.assign',
       'infraestructura.solicitud.reject',
       'infraestructura.solicitud.redistribute',
       'infraestructura.solicitud.close_with_evidence',
       'infraestructura.solicitud.read_audit_history_any',
       'infraestructura.solicitud.confirm_close_own',
       'infraestructura.solicitud.rate_close_own'
     )
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

  -- 4.1. Revocar de forma preventiva cualquier permiso de infraestructura que haya quedado
  -- erróneamente asociado a JEFATURA_TERRITORIAL o DIRECTOR_TERRITORIAL
  DELETE FROM auth.role_permissions
   WHERE id_rol IN (
     SELECT id FROM auth.role WHERE code IN ('JEFATURA_TERRITORIAL', 'DIRECTOR_TERRITORIAL')
   )
   AND id_permission IN (
     SELECT id_permission FROM auth.permission WHERE id_module = v_mod_id
   );

  -- 5. Asignar Permisos a RESPONSABLE_CETAP
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
  SELECT v_cetap_role_id, p.id_permission, true, now(), now()
    FROM auth.permission p
   WHERE p.id_module = v_mod_id
     AND p.code IN (
       'infraestructura.view',
       'infraestructura.solicitud.create',
       'infraestructura.solicitud.read_own',
       'infraestructura.solicitud.read_rejection_reason_own',
       'infraestructura.solicitud.confirm_close_own',
       'infraestructura.solicitud.rate_close_own'
     )
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

  -- 6. Asignar el rol RADICADOR_INFRA al usuario de prueba usuariojhonradicador@esap.edu.co
  SELECT id_user INTO v_jhon_user_id
    FROM auth.user
   WHERE username = 'usuariojhonradicador@esap.edu.co'
   LIMIT 1;

  IF v_jhon_user_id IS NOT NULL AND v_radicador_role_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
    VALUES (v_jhon_user_id, v_radicador_role_id, true, now(), now())
    ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true;
  END IF;

  -- 7. Configurar territorialidad para pruebas (Vincular a Antioquia id_seccional = 2)
  -- Para que las pruebas de Escenario 1, 2 y 3 funcionen con el usuario con rol territorial
  SELECT id_user INTO v_solicitante_user_id
    FROM auth.user
   WHERE username = 'solicitante.dependencia@esap.edu.co'
   LIMIT 1;

  IF v_solicitante_user_id IS NOT NULL THEN
    -- Asignar rol COORDINADOR_ADMINISTRATIVO_DT y retirar JEFATURA_TERRITORIAL de solicitante.dependencia
    IF v_dt_role_id IS NOT NULL THEN
      INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
      VALUES (v_solicitante_user_id, v_dt_role_id, true, now(), now())
      ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true;

      DELETE FROM auth.user_roles
       WHERE id_user = v_solicitante_user_id
         AND id_rol IN (SELECT id FROM auth.role WHERE code = 'JEFATURA_TERRITORIAL');
    END IF;

    -- Asignar seccional Antioquia (id: 2) en la persona del usuario
    UPDATE auth.personas
       SET id_seccional = 2
     WHERE id_person = (SELECT id_person FROM auth.user WHERE id_user = v_solicitante_user_id);

    -- Registrar también en tabla satélite jefatura_territorial para compatibilidad total
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'academic-schedule' AND table_name = 'jefatura_territorial') THEN
      DELETE FROM "academic-schedule".jefatura_territorial WHERE id_user = v_solicitante_user_id;
      INSERT INTO "academic-schedule".jefatura_territorial (id_user, id_direccion_territorial, asignado_en)
      VALUES (v_solicitante_user_id, 2, now());
    END IF;
  END IF;

END $$;

COMMIT;
