-- ============================================================================
-- Migración 022 · EFDS-1740 Seed USUARIOS PRUEBA 7 perfiles P1–P7 Tabla 5.2 ERS
-- Fuente: C:\Users\Alexander\Desktop\esapapis\auth\cuentas_prueba_EFDS-1740.csv
--
-- ¡NADA QUEMADO! 0 UUIDs literales.
--   · Identificador OFICIAL persona: id_person (UUID) = persona_id (migración 159 core).
--     Toda relación user ↔ persona ↔ módulos ↔ permisos ↔ login VA POR id_person.
--   · id_tercero: USO CONDICIONAL legacy-backward. Si la columna existe en auth.personas
--     (estado actual pre-159-terminado) se inserta con valor BIGINT dinámico.
--     Cuando migración 159 termine y la borre, el INSERT dinámico la omite automáticamente.
--   · Clave natural única por usuario: username (email) — UNIQUE constraint en auth.user.
--   · id_user = gen_random_uuid() on-the-fly si no existe.
--   · id_rol → lookup por role.code (no UUID).
--   · Existencia persona → lookup por dir_email o num_identificacion (key natural).
--   · password_hash bcrypt rounds=10 (estándar repo, se generó hasheando el password_temp14 del CSV).
--   · password_temp = true (todos son passwords temporales 14 chars según CSV).
--
-- Usuarios (7):
--   perfil P1 SOLICITANTE GENERAL      → solicitante.umi@esap.edu.co      / J2NDyZNNmjbAJk   → SOLICITANTE_INFRA
--   perfil P2 ANALISTA ASIGNADOR       → analista.asignador.umi@esap.edu.co  / XdFJGtDiXHgnJW → ANALISTA_ASIGNADOR_UMI
--   perfil P3 ELECTRICO CS-002         → tecnico.electrico.umi@esap.edu.co / vjLNkEcfJNGipC   → TECNICO_ELECTRICO_ESPECIALIZADO
--   perfil P4 TECNICO MULTIPROPOSITO   → tecnico.multi.umi@esap.edu.co     / DMPypwWkJMk6ZK   → TECNICO_UMI_MULTIPROPOSITO
--   perfil P5 ADMIN FUNCIONAL (COORD)  → admin.funcional.umi@esap.edu.co   / RSAPJWZSwx9R9m   → ADMINISTRADOR_FUNCIONAL_INFRA
--   perfil P6 ADMIN MODULO (CONFIG)    → admin.modulo.umi@esap.edu.co      / AA7itWCQQspT9f   → ADMINISTRADOR_MODULO_INFRA
--   perfil P7 CALIDAD REPORTES ONLY    → calidad.reportes.umi@esap.edu.co  / VipBMdehNGd8Ee   → CONSULTA_CALIDAD_INFRA
--
-- A cada usuario se le asignan DOS roles siempre: (1) USER (base) + (2) perfil Px especifico.
-- ============================================================================
SET LOCAL search_path = auth, public;

DO $$
DECLARE
  v_rol_user UUID;

  v_usuarios JSONB := $UMI_DATA$
  [
    {
      "num_id": "900000001", "tip_id": "CC",
      "nombre": "Solicitante UMI Prueba P1",
      "pri_nombre": "Solicitante", "seg_nombre": null,
      "pri_apellido": "UMI", "seg_apellido": "Prueba",
      "genero": "O", "fec_nac": "1990-01-01",
      "direccion": "ESAP Sede Central",
      "email": "solicitante.umi@esap.edu.co",
      "celular": "3100000101",
      "rol_code": "SOLICITANTE_INFRA",
      "pwd_hash": "$2b$10$ANQVwCIc1rr9AxDDz4v.c.8h.az41rZJvphfwQa1Tb1ARqny11VrG"
    },
    {
      "num_id": "900000002", "tip_id": "CC",
      "nombre": "Analista Asignador Prueba P2",
      "pri_nombre": "Analista", "seg_nombre": "Asignador",
      "pri_apellido": "UMI", "seg_apellido": "Prueba",
      "genero": "O", "fec_nac": "1990-01-02",
      "direccion": "ESAP Sede Central",
      "email": "analista.asignador.umi@esap.edu.co",
      "celular": "3100000102",
      "rol_code": "ANALISTA_ASIGNADOR_UMI",
      "pwd_hash": "$2b$10$3wtS4iaANhqtFKStmN0CfuDCN6XR3yYKbKoz45nhDg93iY/5F7flG"
    },
    {
      "num_id": "900000003", "tip_id": "CC",
      "nombre": "Técnico Electricista Prueba P3",
      "pri_nombre": "Técnico", "seg_nombre": "Electricista",
      "pri_apellido": "UMI", "seg_apellido": "Prueba",
      "genero": "M", "fec_nac": "1990-01-03",
      "direccion": "ESAP Sede Central",
      "email": "tecnico.electrico.umi@esap.edu.co",
      "celular": "3100000103",
      "rol_code": "TECNICO_ELECTRICO_ESPECIALIZADO",
      "pwd_hash": "$2b$10$EijiouG7XWiILViQOYIdvupudZcnevZ2Lm7VYsM49PSSlKE/pWbo."
    },
    {
      "num_id": "900000004", "tip_id": "CC",
      "nombre": "Técnico Multiproposito Prueba P4",
      "pri_nombre": "Técnico", "seg_nombre": "Multiproposito",
      "pri_apellido": "UMI", "seg_apellido": "Prueba",
      "genero": "M", "fec_nac": "1990-01-04",
      "direccion": "ESAP Sede Central",
      "email": "tecnico.multi.umi@esap.edu.co",
      "celular": "3100000104",
      "rol_code": "TECNICO_UMI_MULTIPROPOSITO",
      "pwd_hash": "$2b$10$WtWnJL5CsH/6K3x6oNdE4O3sqU3QRFuQeY1bOGwq1a.BKDiMaITcG"
    },
    {
      "num_id": "900000005", "tip_id": "CC",
      "nombre": "Admin Funcional Coordinador Prueba P5",
      "pri_nombre": "Admin", "seg_nombre": "Funcional",
      "pri_apellido": "UMI", "seg_apellido": "Prueba",
      "genero": "O", "fec_nac": "1990-01-05",
      "direccion": "ESAP Sede Central",
      "email": "admin.funcional.umi@esap.edu.co",
      "celular": "3100000105",
      "rol_code": "ADMINISTRADOR_FUNCIONAL_INFRA",
      "pwd_hash": "$2b$10$MlqqMk.4F3MiVLNIrEuHLeMA/KRcCnhyEedoNxE/4Kpv.OCV7mTZq"
    },
    {
      "num_id": "900000006", "tip_id": "CC",
      "nombre": "Admin Modulo Config Prueba P6",
      "pri_nombre": "Admin", "seg_nombre": "Modulo",
      "pri_apellido": "UMI", "seg_apellido": "Prueba",
      "genero": "O", "fec_nac": "1990-01-06",
      "direccion": "ESAP Sede Central",
      "email": "admin.modulo.umi@esap.edu.co",
      "celular": "3100000106",
      "rol_code": "ADMINISTRADOR_MODULO_INFRA",
      "pwd_hash": "$2b$10$gvISy9ZXQXvBlk5.2CFDnOWn66nihi.JpY3f6INEtsUITIMmpdunK"
    },
    {
      "num_id": "900000007", "tip_id": "CC",
      "nombre": "Calidad Reportes Only Prueba P7",
      "pri_nombre": "Calidad", "seg_nombre": "Reportes",
      "pri_apellido": "UMI", "seg_apellido": "Prueba",
      "genero": "O", "fec_nac": "1990-01-07",
      "direccion": "ESAP Sede Central",
      "email": "calidad.reportes.umi@esap.edu.co",
      "celular": "3100000107",
      "rol_code": "CONSULTA_CALIDAD_INFRA",
      "pwd_hash": "$2b$10$8n9GtfePsEaQUT21uEI4IOe8AX1c678LDLbnt46vt8SOa/3a1i.Fa"
    }
  ]$UMI_DATA$::jsonb;

  _u             RECORD;
  _tid           BIGINT;
  _pid           UUID;
  _uid           UUID;
  _rid           UUID;
  _ex            BOOLEAN;
  _has_id_tercero BOOLEAN;
  _ins_cols      TEXT;
  _ins_vals      TEXT;
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
    _ins_vals := '%L, %L, %L, %L, %L, %L, %L, %L, %s::DATE, %L, %L, %L, %L';
  ELSE
    _ins_cols := 'num_identificacion, tip_identificacion,
                  nom_largo, nom_tercero, pri_apellido, seg_apellido,
                  gen_tercero, fec_nacimiento, dir_residencia,
                  dir_email, tel_celular, usu_creacion';
    _ins_vals := '%L, %L, %L, %L, %L, %L, %L, %s::DATE, %L, %L, %L, %L';
  END IF;

  SELECT id INTO STRICT v_rol_user FROM auth.role WHERE code = 'USER';

  FOR _u IN SELECT * FROM jsonb_to_recordset(v_usuarios) AS x(
    num_id       TEXT, tip_id TEXT,
    nombre       TEXT, pri_nombre TEXT, seg_nombre TEXT,
    pri_apellido TEXT, seg_apellido TEXT,
    genero       TEXT, fec_nac TEXT, direccion TEXT,
    email        TEXT, celular TEXT,
    rol_code     TEXT, pwd_hash TEXT
  ) LOOP
    ---------------------------------------------------------------
    -- A) Persona (id_tercero dinámico; key natural: email/num_id)
    ---------------------------------------------------------------
    SELECT id_person INTO _pid
    FROM auth.personas
    WHERE dir_email = _u.email
       OR num_identificacion = _u.num_id
    ORDER BY CASE WHEN dir_email = _u.email THEN 0 ELSE 1 END
    LIMIT 1;

    IF _pid IS NULL THEN
      BEGIN
        _tid := _u.num_id::BIGINT;
        IF _has_id_tercero AND EXISTS (SELECT 1 FROM auth.personas WHERE id_tercero = _tid) THEN
          SELECT COALESCE(MAX(id_tercero) + 1, 900000000 + 1) INTO STRICT _tid FROM auth.personas;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        IF _has_id_tercero THEN
          SELECT COALESCE(MAX(id_tercero) + 1, 900000000 + 1) INTO STRICT _tid FROM auth.personas;
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
          _tid, _u.num_id, _u.tip_id,
          _u.nombre, _u.pri_nombre, _u.pri_apellido, _u.seg_apellido,
          _u.genero,
          CASE WHEN _u.fec_nac IS NOT NULL THEN _u.fec_nac::DATE ELSE NULL END,
          _u.direccion,
          _u.email, _u.celular,
          'seed_efds1740_um022';
      ELSE
        EXECUTE format(
          'INSERT INTO auth.personas (%s) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT DO NOTHING RETURNING id_person',
          _ins_cols
        )
        INTO STRICT _pid
        USING
          _u.num_id, _u.tip_id,
          _u.nombre, _u.pri_nombre, _u.pri_apellido, _u.seg_apellido,
          _u.genero,
          CASE WHEN _u.fec_nac IS NOT NULL THEN _u.fec_nac::DATE ELSE NULL END,
          _u.direccion,
          _u.email, _u.celular,
          'seed_efds1740_um022';
      END IF;
    END IF;

    ---------------------------------------------------------------
    -- B) Usuario auth (UPSERT por username = email — UNIQUE)
    ---------------------------------------------------------------
    SELECT id_user INTO _uid FROM auth."user" WHERE username = _u.email;
    _ex := (_uid IS NOT NULL);

    IF NOT _ex THEN
      _uid := gen_random_uuid();
      INSERT INTO auth."user" (
        id_user, public_id, username, password_hash, is_active,
        id_person, password_temp
      ) VALUES (
        _uid, gen_random_uuid(), _u.email, _u.pwd_hash, true,
        _pid, true
      );
    ELSE
      UPDATE auth."user"
      SET password_hash = _u.pwd_hash,
          is_active     = true,
          password_temp = true,
          id_person     = COALESCE(id_person, _pid)
      WHERE id_user = _uid
        AND (password_hash <> _u.pwd_hash OR is_active <> true OR password_temp <> true OR id_person IS DISTINCT FROM _pid);
    END IF;

    ---------------------------------------------------------------
    -- C) Roles: USER (base) + Px (perfil específico)
    ---------------------------------------------------------------
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
    VALUES (_uid, v_rol_user, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    SELECT id INTO _rid FROM auth.role WHERE code = _u.rol_code;
    IF _rid IS NOT NULL THEN
      INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
      VALUES (_uid, _rid, true, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    END IF;

  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- Sanity check: reporte final de usuarios insertados/actualizados
-- ---------------------------------------------------------------------------
SELECT u.username,
       p.nom_largo,
       array_agg(DISTINCT r.code ORDER BY r.code) AS roles_asignados,
       u.password_temp,
       u.is_active
FROM auth."user" u
JOIN auth.personas p ON p.id_person = u.id_person
JOIN auth.user_roles ur ON ur.id_user = u.id_user
JOIN auth.role r ON r.id = ur.id_rol
WHERE u.username IN (
  'solicitante.umi@esap.edu.co',
  'analista.asignador.umi@esap.edu.co',
  'tecnico.electrico.umi@esap.edu.co',
  'tecnico.multi.umi@esap.edu.co',
  'admin.funcional.umi@esap.edu.co',
  'admin.modulo.umi@esap.edu.co',
  'calidad.reportes.umi@esap.edu.co'
)
GROUP BY 1,2,4,5
ORDER BY 1;
