-- ============================================================================
-- Migración 023 · EFDS-1736/1740 Seed DINÁMICO 4 técnicos reales
-- (Versión CORREGIDA / NUEVA — no rompe ni modifica la migración 016 original
--  que ya está versionada y posiblemente aplicada en otros ambientes).
--
-- Idempotente 100%: UPSERT por clave natural (email / username).
-- ¡NINGÚN UUID HARDCODEADO, NINGÚN id_tercero QUEMADO, NINGÚN id_user literal!
--
-- COMPATIBILIDAD MIGRACIÓN 159 CORE (id_person = persona_id OFICIAL):
--   · id_person (UUID) = identificador oficial para user ↔ persona ↔ módulos ↔ permisos ↔ login.
--   · id_tercero: USO CONDICIONAL legacy. Si la columna existe en auth.personas se inserta
--     con valor BIGINT dinámico. Cuando migración 159 termine y la borre, el INSERT dinámico
--     la omite automáticamente (ON CONFLICT genérico sin nombrar columnas).
--   · Existencia de persona validad por (dir_email OR num_identificacion) — key natural.
--
-- Qué hace:
--   A) auth.personas      → crea/actualiza 4 personas (Porky, Jorge, Luis, Hernando).
--   B) auth.user          → crea/actualiza 4 users (username = email). password Esap2026* (bcrypt rounds=10).
--   C) auth.user_roles    → USER (base) + P3 ELECTRICO (SÓLO Porky) + P4 MULTI (Jorge/Luis/Hernando).
--   D) infrastructure-management.catalogo_item TECNICO_MANTENIMIENTO
--        → UPDATE metadata {correos, usuarioIdsAutorizados} resolviendo
--          auth.user POR username (nunca UUID literal).
--
-- Técnicos (reales, alineados a seed 010):
--   codigo TEC-ELC-001  Daniel Porky            porky@esap.edu.co           P3 TECNICO_ELECTRICO_ESPECIALIZADO
--   codigo TEC-GEN-001  Jorge Armando Cerón     jorge.ceron@esap.edu.co     P4 TECNICO_UMI_MULTIPROPOSITO
--   codigo TEC-FON-001  Luis Hernán Guevara     luis.guevara@esap.edu.co    P4 TECNICO_UMI_MULTIPROPOSITO
--   codigo TEC-CAR-001  Hernando A. Prieto      hernando.prieto@esap.edu.co P4 TECNICO_UMI_MULTIPROPOSITO
--
-- Password común 4 técnicos: Esap2026*
--   bcrypt hash (rounds=10): $2b$10$ahmHbHM8lJZnuBEX6Y/qduHESNsjWQE7y6DMrLlLk3zR1oVws6Od.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- BLOQUE 1 · auth schema: personas + user + user_roles (4 técnicos reales)
-- ---------------------------------------------------------------------------
SET LOCAL search_path = auth, public;

DO $$
DECLARE
  v_rol_user      UUID;
  v_rol_p3_elect  UUID;
  v_rol_p4_multi  UUID;
  v_pwd_hash CONSTANT TEXT := '$2b$10$ahmHbHM8lJZnuBEX6Y/qduHESNsjWQE7y6DMrLlLk3zR1oVws6Od.';

  v_tecs JSONB := $UMI_DATA$
  [
    {
      "num_id": "123456790", "tip_id": "CC",
      "nombre": "Daniel Porky", "pri_nombre": "Daniel", "seg_nombre": null,
      "pri_apellido": "Porky", "seg_apellido": null,
      "genero": "M", "fec_nac": "1995-04-15",
      "direccion": "Calle 72 # 9-45, Bogotá",
      "email": "porky@esap.edu.co",
      "celular": "3105550189",
      "rol_code": "TECNICO_ELECTRICO_ESPECIALIZADO",
      "codigo_tecnico": "TEC-ELC-001"
    },
    {
      "num_id": "134567890", "tip_id": "CC",
      "nombre": "Jorge Armando Cerón", "pri_nombre": "Jorge", "seg_nombre": "Armando",
      "pri_apellido": "Cerón", "seg_apellido": null,
      "genero": "M", "fec_nac": "1985-09-01",
      "direccion": "Carrera 68 # 50-25, Bogotá",
      "email": "jorge.ceron@esap.edu.co",
      "celular": "3100000003",
      "rol_code": "TECNICO_UMI_MULTIPROPOSITO",
      "codigo_tecnico": "TEC-GEN-001"
    },
    {
      "num_id": "145678901", "tip_id": "CC",
      "nombre": "Luis Hernán Guevara", "pri_nombre": "Luis", "seg_nombre": "Hernán",
      "pri_apellido": "Guevara", "seg_apellido": null,
      "genero": "M", "fec_nac": "1978-02-22",
      "direccion": "Calle 45 # 17-40, Bogotá",
      "email": "luis.guevara@esap.edu.co",
      "celular": "3100000004",
      "rol_code": "TECNICO_UMI_MULTIPROPOSITO",
      "codigo_tecnico": "TEC-FON-001"
    },
    {
      "num_id": "246801357", "tip_id": "CC",
      "nombre": "Hernando Alfonso Prieto Martinez", "pri_nombre": "Hernando", "seg_nombre": "Alfonso",
      "pri_apellido": "Prieto", "seg_apellido": "Martinez",
      "genero": "M", "fec_nac": null,
      "direccion": null,
      "email": "hernando.prieto@esap.edu.co",
      "celular": "+57 310 000 0005",
      "rol_code": "TECNICO_UMI_MULTIPROPOSITO",
      "codigo_tecnico": "TEC-CAR-001"
    }
  ]$UMI_DATA$::jsonb;

  _t             RECORD;
  _tid           BIGINT;
  _pid           UUID;
  _uid           UUID;
  _rid           UUID;
  _has_id_tercero BOOLEAN;
  _ins_cols      TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'auth.personas'::regclass
      AND attname  = 'id_tercero'
      AND NOT attisdropped
  ) INTO _has_id_tercero;

  IF _has_id_tercero THEN
    _ins_cols := 'id_tercero, num_identificacion, tip_identificacion,
                  nom_largo, nom_tercero, pri_apellido, seg_apellido,
                  gen_tercero, fec_nacimiento, dir_residencia,
                  dir_email, tel_celular, usu_creacion';
  ELSE
    _ins_cols := 'num_identificacion, tip_identificacion,
                  nom_largo, nom_tercero, pri_apellido, seg_apellido,
                  gen_tercero, fec_nacimiento, dir_residencia,
                  dir_email, tel_celular, usu_creacion';
  END IF;

  -- Resolver roles por CODE (no UUID)
  SELECT id INTO STRICT v_rol_user     FROM auth.role WHERE code = 'USER';
  SELECT id INTO v_rol_p3_elect        FROM auth.role WHERE code = 'TECNICO_ELECTRICO_ESPECIALIZADO';
  SELECT id INTO v_rol_p4_multi        FROM auth.role WHERE code = 'TECNICO_UMI_MULTIPROPOSITO';

  FOR _t IN SELECT * FROM jsonb_to_recordset(v_tecs) AS x(
    num_id         TEXT, tip_id TEXT,
    nombre         TEXT, pri_nombre TEXT, seg_nombre TEXT,
    pri_apellido   TEXT, seg_apellido TEXT,
    genero         TEXT, fec_nac TEXT, direccion TEXT,
    email          TEXT, celular TEXT,
    rol_code       TEXT, codigo_tecnico TEXT
  ) LOOP

    -------------------------------------------------------------------
    -- A) Persona (UPSERT por email o num_identificacion — key natural)
    -------------------------------------------------------------------
    SELECT id_person INTO _pid
    FROM auth.personas
    WHERE dir_email = _t.email
       OR num_identificacion = _t.num_id
    ORDER BY CASE WHEN dir_email = _t.email THEN 0 ELSE 1 END
    LIMIT 1;

    IF _pid IS NULL THEN
      BEGIN
        _tid := _t.num_id::BIGINT;
        IF _has_id_tercero AND EXISTS (SELECT 1 FROM auth.personas WHERE id_tercero = _tid) THEN
          SELECT COALESCE(MAX(id_tercero) + 1, 99999999 + 1) INTO STRICT _tid FROM auth.personas;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        IF _has_id_tercero THEN
          SELECT COALESCE(MAX(id_tercero) + 1, 99999999 + 1) INTO STRICT _tid FROM auth.personas;
        ELSE
          _tid := NULL;
        END IF;
      END;

      IF _has_id_tercero THEN
        EXECUTE format(
          'INSERT INTO auth.personas (%s) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT DO NOTHING RETURNING id_person',
          _ins_cols
        )
        INTO STRICT _pid
        USING
          _tid, _t.num_id, _t.tip_id,
          _t.nombre, _t.pri_nombre, _t.pri_apellido, _t.seg_apellido,
          _t.genero,
          CASE WHEN _t.fec_nac IS NOT NULL THEN _t.fec_nac::DATE ELSE NULL END,
          _t.direccion,
          _t.email, _t.celular,
          'seed_tec_um023';
      ELSE
        EXECUTE format(
          'INSERT INTO auth.personas (%s) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT DO NOTHING RETURNING id_person',
          _ins_cols
        )
        INTO STRICT _pid
        USING
          _t.num_id, _t.tip_id,
          _t.nombre, _t.pri_nombre, _t.pri_apellido, _t.seg_apellido,
          _t.genero,
          CASE WHEN _t.fec_nac IS NOT NULL THEN _t.fec_nac::DATE ELSE NULL END,
          _t.direccion,
          _t.email, _t.celular,
          'seed_tec_um023';
      END IF;
    END IF;

    -------------------------------------------------------------------
    -- B) Usuario auth (UPSERT por username = email — UNIQUE)
    -------------------------------------------------------------------
    SELECT id_user INTO _uid FROM auth."user" WHERE username = _t.email;

    IF _uid IS NULL THEN
      _uid := gen_random_uuid();
      INSERT INTO auth."user" (
        id_user, public_id, username, password_hash, is_active,
        id_person, password_temp
      ) VALUES (
        _uid, gen_random_uuid(), _t.email, v_pwd_hash, true,
        _pid, true
      );
    ELSE
      UPDATE auth."user"
      SET password_hash = v_pwd_hash,
          is_active     = true,
          password_temp = true,
          id_person     = COALESCE(id_person, _pid)
      WHERE id_user = _uid
        AND (password_hash <> v_pwd_hash OR is_active <> true OR password_temp <> true OR id_person IS DISTINCT FROM _pid);
    END IF;

    -------------------------------------------------------------------
    -- C) Roles: USER (base) + P3 o P4
    -------------------------------------------------------------------
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
    VALUES (_uid, v_rol_user, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    _rid := CASE _t.rol_code
              WHEN 'TECNICO_ELECTRICO_ESPECIALIZADO' THEN v_rol_p3_elect
              ELSE v_rol_p4_multi
            END;
    IF _rid IS NOT NULL THEN
      INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
      VALUES (_uid, _rid, true, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    END IF;

  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- BLOQUE 2 · infrastructure-management.catalogo_item TECNICO_MANTENIMIENTO
--            Actualización DINÁMICA metadata (lookup por username NO UUID).
-- ---------------------------------------------------------------------------
SET LOCAL search_path = "infrastructure-management", public;

DO $$
DECLARE
  _cod  TEXT;
  _mail TEXT;
  _uids JSONB;
BEGIN
  FOR _cod, _mail IN VALUES
    ('TEC-ELC-001', 'porky@esap.edu.co'),
    ('TEC-GEN-001', 'jorge.ceron@esap.edu.co'),
    ('TEC-FON-001', 'luis.guevara@esap.edu.co'),
    ('TEC-CAR-001', 'hernando.prieto@esap.edu.co')
  LOOP
    SELECT COALESCE(jsonb_agg(u.id_user::TEXT), '[]'::JSONB)
      INTO STRICT _uids
      FROM auth."user" u
      WHERE u.username = _mail;

    UPDATE catalogo_item
       SET metadata = jsonb_set(
                        jsonb_set(
                          COALESCE(metadata, '{}'::JSONB),
                          '{correos}',
                          to_jsonb(ARRAY[_mail]),
                          true
                        ),
                        '{usuarioIdsAutorizados}',
                        _uids,
                        true
                      )
    WHERE catalogo = 'TECNICO_MANTENIMIENTO'
      AND codigo   = _cod;
  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- Sanity check (SÓLO LECTURA): confirmar técnicos insertados + metadata
-- ---------------------------------------------------------------------------
SELECT
  t.codigo,
  t.nombre              AS tecnico_nombre_display_seed010,
  u.username            AS auth_username,
  u.is_active           AS auth_activo,
  u.password_temp       AS auth_password_temp,
  array_agg(DISTINCT r.code ORDER BY r.code) AS auth_roles,
  t.metadata->>'correos'              AS meta_correos,
  t.metadata->>'usuarioIdsAutorizados' AS meta_userids
FROM "infrastructure-management".catalogo_item t
LEFT JOIN auth."user" u
  ON u.username = (t.metadata->'correos'->>0)
LEFT JOIN auth.user_roles ur ON ur.id_user = u.id_user
LEFT JOIN auth.role       r  ON r.id      = ur.id_rol
WHERE t.catalogo = 'TECNICO_MANTENIMIENTO'
  AND t.codigo   IN ('TEC-ELC-001','TEC-GEN-001','TEC-FON-001','TEC-CAR-001')
GROUP BY 1,2,3,4,5,7,8
ORDER BY 1;
