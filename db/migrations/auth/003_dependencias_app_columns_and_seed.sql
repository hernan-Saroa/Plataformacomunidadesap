-- Migration: auth.dependencias base + app columns + seed
-- Created: 2026-09-03
-- Description: Esta migration es autocontenida. Crea la tabla
--   `auth.dependencias` si no existe (compatible con el DDL completo
--   de `auth.DEPENDENCIAS` en schema.sql) y luego agrega las columnas
--   de aplicación que requiere el módulo transversal de dependencias
--   (descripcion, activo, creado_en, actualizado_en). Finalmente siembra
--   dependencias de la ESAP que el módulo de viáticos referencia por
--   código.
--
--   Si `schema.sql` ya corrió y la tabla existe con todos los campos
--   del sistema legacy, el `CREATE TABLE IF NOT EXISTS` es no-op y los
--   `ADD COLUMN IF NOT EXISTS` agregan únicamente las columnas nuevas.
--
--   Si la migration corre en una BD limpia sin schema.sql, el `CREATE
--   TABLE` deja la tabla con la estructura mínima requerida por
--   `auth-service Dependencia` entity + la app. Los seeds son
--   idempotentes por `cod_dependencia`.
--
-- -----------------------------------------------------------------------------
-- ⚠️  NOTAS DE ENCODING — leer antes de editar este archivo
-- -----------------------------------------------------------------------------
-- 1. El archivo DEBE estar guardado en UTF-8 sin BOM. Si tu editor lo guarda
--    como Latin-1 (Windows-1252) o UTF-8 con BOM, los caracteres acentuados
--    del seed se almacenarán como mojibake (ej. `SubdirecciÃ³n` en lugar
--    de `Subdirección`).
--
-- 2. Para evitar depender del encoding del archivo, los literales con
--    caracteres no-ASCII del bloque seed usan la sintaxis U&'...' de
--    estándar SQL, que codifica cada carácter como `\<code point>`:
--        ó = \00F3   é = \00E9   í = \00ED   á = \00E1   ú = \00FA
--        ñ = \00F1   Á = \00C1   É = \00C9   Í = \00CD   Ó = \00D3
--        Ú = \00DA   Ñ = \00D1   ¿ = \00BF
--    PostgreSQL interpreta `U&'...'` y convierte el code point a UTF-8 al
--    almacenar, sea cual sea el client_encoding del archivo.
--
-- 3. Antes de ejecutar, verifica que tu BD y cluster PostgreSQL usan UTF-8:
--        SHOW server_encoding;        -- debe ser UTF8
--        SHOW lc_collate;             -- debe terminar en .UTF-8
--        SHOW client_encoding;        -- psql lo negocia solo, pero puedes
--                                     -- forzarlo con SET abajo.
-- -----------------------------------------------------------------------------

-- Forzar el encoding del cliente al inicio. Ignora el locale del sistema
-- operativo y garantiza que psql lea el archivo como UTF-8.
SET client_encoding = 'UTF8';

SET search_path TO auth;

-- -----------------------------------------------------------------------------
-- 1) Crear tabla base si no existe (estructura mínima compatible con la
--    entity Dependencia de auth-service y con el DDL legacy de schema.sql).
--    Solo se ejecuta la primera vez; CREATE TABLE IF NOT EXISTS es no-op
--    en corridas subsecuentes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "auth"."dependencias" (
    "id_dependencia"   NUMERIC(11,0) PRIMARY KEY,
    "id_empresa"       NUMERIC(11,0) NOT NULL DEFAULT 1,
    "cod_dependencia"  VARCHAR(20) NOT NULL UNIQUE,
    "nom_dependencia"  VARCHAR(250) NOT NULL,
    "dir_dependencia"  VARCHAR(250),
    "dir_email"        VARCHAR(250),
    "url_dependencia"  VARCHAR(250),
    "id_geopolitica"   NUMERIC(11,0),
    "id_sede"          NUMERIC(11,0),
    "id_cargo"         NUMERIC(11,0),
    "id_tercero"       NUMERIC(11,0),
    "tip_unidad"       NUMERIC(1,0),
    "gen_tip_unidad"   VARCHAR(6) DEFAULT 'TIUORG',
    "descripcion"      VARCHAR(500),
    "activo"           BOOLEAN NOT NULL DEFAULT TRUE,
    "creado_en"        TIMESTAMP NOT NULL DEFAULT NOW(),
    "actualizado_en"   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2) Columnas de aplicación (idempotente — funciona aunque la tabla
--    haya sido creada por schema.sql con identificadores UPPER_CASE
--    entre comillas dobles). Las columnas ya creadas por el paso 1
--    vuelven a crearse silenciosamente.
-- -----------------------------------------------------------------------------
ALTER TABLE "auth"."dependencias"
    ADD COLUMN IF NOT EXISTS "descripcion"     VARCHAR(500);
ALTER TABLE "auth"."dependencias"
    ADD COLUMN IF NOT EXISTS "activo"          BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "auth"."dependencias"
    ADD COLUMN IF NOT EXISTS "creado_en"       TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE "auth"."dependencias"
    ADD COLUMN IF NOT EXISTS "actualizado_en"  TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS "idx_dependencias_activo"
    ON "auth"."dependencias" ("activo");

COMMENT ON TABLE "auth"."dependencias"
    IS U&'Cat\00E1logo transversal de dependencias ESAP. Referenciada por travel_expenses.saldos_tiquetes y otros microservicios.';

-- -----------------------------------------------------------------------------
-- 3) Semilla de dependencias ESAP (idempotente por cod_dependencia).
--    Si la tabla ya tiene registros con los mismos códigos, ON CONFLICT
--    los ignora. Si la tabla no tiene secuencia para id_dependencia (BD
--    limpia creada en el paso 1), inicializamos los IDs explícitamente.
--
--    Todos los literales con tildes/ñ están escritos con sintaxis U&'...'
--    (ver bloque de encoding arriba) para evitar mojibake aunque el
--    archivo se haya guardado accidentalmente en Latin-1.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    next_id NUMERIC(11,0);
BEGIN
    SELECT COALESCE(MAX(id_dependencia), 0) + 1
      INTO next_id
      FROM auth.dependencias;

    INSERT INTO auth.dependencias
        (id_dependencia, id_empresa, cod_dependencia, nom_dependencia,
         gen_tip_unidad, descripcion, activo)
    VALUES
        (next_id + 0,  1, 'DEP-PLAN-01',
            U&'Subdirecci\00F3n de Planificaci\00F3n',
            'TIUORG',
            U&'Planificaci\00F3n estrat\00E9gica y proyectos institucionales',
            TRUE),
        (next_id + 1,  1, 'DEP-ACAD-01',
            U&'Subdirecci\00F3n Acad\00E9mica',
            'TIUORG',
            U&'Gesti\00F3n de programas acad\00E9micos y oferta educativa',
            TRUE),
        (next_id + 2,  1, 'DEP-ADM-01',
            U&'Subdirecci\00F3n Administrativa y Financiera',
            'TIUORG',
            U&'Gesti\00F3n administrativa, financiera y presupuestal',
            TRUE),
        (next_id + 3,  1, 'DEP-TH-01',
            U&'Subdirecci\00F3n de Talento Humano',
            'TIUORG',
            U&'Gesti\00F3n del talento humano y bienestar',
            TRUE),
        (next_id + 4,  1, 'DEP-OFI-JUR-01',
            U&'Oficina Asesora Jur\00EDdica',
            'TIUORG',
            U&'Asesor\00EDa jur\00EDdica institucional',
            TRUE),
        (next_id + 5,  1, 'DEP-CONT-INT-01',
            'Oficina de Control Interno',
            'TIUORG',
            U&'Control interno disciplinario y auditor\00EDas',
            TRUE)
    ON CONFLICT (cod_dependencia) DO NOTHING;
END$$;
