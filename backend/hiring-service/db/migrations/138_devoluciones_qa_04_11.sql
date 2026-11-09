-- ============================================================================
-- 138 · Devoluciones de la sesión de pruebas de QA del 04/11/2026
--
-- Lo que la sesión pidió y necesita base. El resto se resolvió en el código.
--
--   1. 8.2 · La notificación al supervisor es obligatoria (EFDS-1165). Sale
--      del módulo por correo; si no sale, quien designa carga la evidencia de
--      que le avisó por fuera. Se guarda en la designación.
--
--   2. 8.2 · El correo al supervisor lleva copia al abogado revisor del proceso
--      y al correo general de Contratación (EFDS-1165). El buzón general se
--      configura en Alertas → Configuración; nace vacío: hasta que la Dirección
--      lo escriba, esa copia no sale.
--
--   3. 8.8 · La publicación en la página web de la ESAP vuelve a ser
--      obligatoria (EFDS-1166): RP, garantías, ARL y publicación web se llenan
--      en cualquier orden después del contrato, pero las cuatro tienen que
--      estar completas para pasar a la etapa 9. Se quita el «no detiene el
--      flujo» que le había puesto la 125, en la versión activa y en el borrador.
--
--   4. Etapa 9 · El gestor de archivo y supervisión carga la reunión de inicio
--      (9.1) y el reporte de presunto incumplimiento (INC.1), con lo que le
--      hace llegar el supervisor, que no entra a la plataforma (EFDS-1167). El
--      abogado estructurador conserva la 9.1.
--
--   5. Rol nuevo «Estructurador de apoyo» (EFDS-1167): la persona
--      administrativa que apoya la reasignación de supervisor. Solo registra y
--      notifica la reasignación (9.3); del resto del proceso, solo consulta.
--
--   6. 8.1 · El plazo del contrato se pacta con un número y su unidad (días,
--      meses o años) o con una fecha cierta (EFDS-1162). plazo_dias se sigue
--      llenando: de entrada si es en días, y si no, con el acta de inicio.
--
--   7. 9.5 · Las modificaciones se habilitan desde la firma del contrato (8.1),
--      no desde el acta de inicio (EFDS-1162), y hay un tipo «Otro» con
--      descripción libre. El tope del 50 % en adiciones pasa a ser solo
--      informativo, en el código.
--
--   8. 7.2 · El informe definitivo admite documentos adicionales opcionales y
--      una justificación de los cambios frente al preliminar (EFDS-1159).
--
--   9. 6.4 · La publicación y el traslado del informe preliminar quedan como
--      registro informativo: dónde se publicó, el enlace del proceso y las
--      observaciones del traslado (EFDS-1156). Antes el medio solo quedaba en
--      la trazabilidad.
--
--  10. 5.12.1 · Actividad nueva «Observaciones al pliego definitivo»
--      (EFDS-1153, EFDS-1152): después de la audiencia de riesgos, con la
--      misma metodología que la 5.6 (por interesado, varios archivos, respuesta
--      global o individual, si modificó el pliego). Solo en licitación pública,
--      como la 5.6.1; las demás la tienen excluida. Corre desde la apertura y
--      no frena la recepción de ofertas. La 5.3 pasa a llamarse «Publicación
--      del proyecto de pliego», como pidió la sesión.
--
--  11. 5.2 · Cronograma por actividad (EFDS-1152), además del de etapas de la
--      135: cada actividad con fecha de inicio y de fin, cuántos días antes se
--      avisa, a quién (quien la hace, abogado estructurador, abogado revisor,
--      gestor de archivo o correos escritos a mano) y por qué canal (campana,
--      correo o ambos). Alerta CRONOGRAMA_ACTIVIDAD antes del vencimiento y al
--      vencer sin cumplirse. Sigue sin ser obligatorio. Los cambios de fechas
--      quedan en cronograma_cambios, con la adenda de cronograma que los
--      originó si la hubo; la adenda que prorroga el cierre mueve la 6.1.
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- ===================================================== 1. evidencia 8.2 --

ALTER TABLE hiring.supervisiones_contrato
  ADD COLUMN IF NOT EXISTS evidencia_aviso_documento_id uuid;

COMMENT ON COLUMN hiring.supervisiones_contrato.evidencia_aviso_documento_id IS
  'Evidencia de la notificación al supervisor dada por fuera, cuando el correo del módulo no salió (138).';

-- ======================================================= 2. buzón general --

CREATE TABLE IF NOT EXISTS hiring.correos_institucionales (
  clave       varchar(60) PRIMARY KEY,
  correo      varchar(200),
  descripcion text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  varchar(120)
);

INSERT INTO hiring.correos_institucionales (clave, correo, descripcion)
VALUES ('CONTRATACION_GENERAL', NULL,
        'Recibe copia de la notificación de designación y de reasignación del supervisor, junto con el abogado revisor del proceso')
ON CONFLICT (clave) DO NOTHING;

-- ================================================= 3. 8.8 obligatoria --

UPDATE hiring.flujo_asignaciones a
   SET secuencia = jsonb_set(COALESCE(a.secuencia, '{"dependeDe": ["8.1"]}'::jsonb), '{noBloquea}', 'false'::jsonb),
       updated_by = 'migracion-138',
       updated_at = now()
  FROM hiring.flujo_versiones v
 WHERE v.id = a.version_id
   AND v.estado IN ('ACTIVA', 'BORRADOR')
   AND a.numeral = '8.8'
   AND a.modalidad IS NULL
   AND COALESCE((a.secuencia->>'noBloquea')::boolean, false);

-- ====================================== 4. gestor de archivo en la etapa 9 --

INSERT INTO hiring.alcances_permiso (rol_id, accion, etapa, numeral, tramite, confirmado, created_by)
SELECT r.id, s.accion, NULL, s.numeral, s.tramite, true, 'migracion-138'
  FROM (VALUES
    ('editar', '9.1', NULL),
    ('ver',    NULL,  'INC.1'),
    ('editar', NULL,  'INC.1')
  ) AS s(accion, numeral, tramite)
  JOIN auth.role r ON r.code = 'GESTOR_DE_ARCHIVO_Y_SUPERVISION'
 WHERE NOT EXISTS (
   SELECT 1 FROM hiring.alcances_permiso ap
    WHERE ap.rol_id = r.id AND ap.accion = s.accion AND ap.activo AND ap.etapa IS NULL
      AND COALESCE(ap.numeral, '') = COALESCE(s.numeral, '')
      AND COALESCE(ap.tramite, '') = COALESCE(s.tramite, ''));

-- ================================================ 5. estructurador de apoyo --

INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active,
                       alcance, created_by, created_at, updated_at, sistema_destino)
VALUES ('b7c1e0a4-5d2f-4c8e-9a31-6e0f2d4b8c17', 'ESTRUCTURADOR_DE_APOYO', 'Estructurador De Apoyo',
        'Apoya al abogado estructurador en la reasignación de supervisor', 'sistema', 'Shield',
        '#003DA5', 'personalizado', true,
        '{"tipo": "Global", "cetap": "Todos", "programa": "Todos", "territorial": "Todas"}'::jsonb,
        'migracion-138', now(), now(), 'Backoffice')
ON CONFLICT (code) DO UPDATE
   SET is_active = true, updated_by = 'migracion-138', updated_at = now();

-- Ver para consultar; editar y decidir solo cuentan donde el alcance lo dice
-- (la 9.3). view-all: tiene que poder encontrar el proceso cuyo supervisor
-- cambia, sin estar en él.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
SELECT r.id, p.id_permission, true, now(), now()
  FROM auth.role r
  JOIN auth.permission p ON p.code IN ('contratacion.ver', 'contratacion.editar', 'contratacion.decidir',
                                       'contratacion.proceso.view-all')
 WHERE r.code = 'ESTRUCTURADOR_DE_APOYO'
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true, updated_at = now()
 WHERE auth.role_permissions.is_active IS DISTINCT FROM true;

INSERT INTO hiring.alcances_permiso (rol_id, accion, etapa, numeral, confirmado, created_by)
SELECT r.id, s.accion, NULL, s.numeral, false, 'migracion-138'
  FROM (VALUES ('ver', NULL), ('editar', '9.3'), ('decidir', '9.3')) AS s(accion, numeral)
  JOIN auth.role r ON r.code = 'ESTRUCTURADOR_DE_APOYO'
 WHERE NOT EXISTS (
   SELECT 1 FROM hiring.alcances_permiso ap
    WHERE ap.rol_id = r.id AND ap.accion = s.accion AND ap.activo AND ap.etapa IS NULL
      AND ap.tramite IS NULL AND COALESCE(ap.numeral, '') = COALESCE(s.numeral, ''));

-- ======================================================= 6. plazo 8.1 --

ALTER TABLE hiring.contratos
  ADD COLUMN IF NOT EXISTS plazo_unidad varchar(10),
  ADD COLUMN IF NOT EXISTS plazo_cantidad int,
  ADD COLUMN IF NOT EXISTS plazo_fecha_fin date;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_contrato_plazo_unidad') THEN
    ALTER TABLE hiring.contratos
      ADD CONSTRAINT ck_contrato_plazo_unidad
      CHECK (plazo_unidad IS NULL OR plazo_unidad IN ('DIAS', 'MESES', 'ANIOS'));
  END IF;
END $$;

-- Los contratos de antes se pactaron en días.
UPDATE hiring.contratos
   SET plazo_unidad = 'DIAS', plazo_cantidad = plazo_dias
 WHERE plazo_dias IS NOT NULL AND plazo_unidad IS NULL AND plazo_fecha_fin IS NULL;

-- ================================================ 7. modificaciones 9.5 --

ALTER TABLE hiring.modificaciones_contrato
  ADD COLUMN IF NOT EXISTS descripcion varchar(300);

ALTER TABLE hiring.modificaciones_contrato DROP CONSTRAINT IF EXISTS ck_modificacion_tipo;
ALTER TABLE hiring.modificaciones_contrato
  ADD CONSTRAINT ck_modificacion_tipo
  CHECK (tipo IN ('ADICION', 'PRORROGA', 'CESION', 'ACLARATORIO', 'SUSPENSION', 'REANUDACION',
                  'TERMINACION_ANTICIPADA', 'OTRO'));

ALTER TABLE hiring.modificaciones_contrato DROP CONSTRAINT IF EXISTS ck_modificacion_otro;
ALTER TABLE hiring.modificaciones_contrato
  ADD CONSTRAINT ck_modificacion_otro
  CHECK (tipo <> 'OTRO' OR (descripcion IS NOT NULL AND length(trim(descripcion)) > 0));

UPDATE hiring.flujo_asignaciones a
   SET secuencia = jsonb_set(a.secuencia, '{dependeDe}', '["8.1"]'::jsonb),
       updated_by = 'migracion-138',
       updated_at = now()
  FROM hiring.flujo_versiones v
 WHERE v.id = a.version_id
   AND v.estado IN ('ACTIVA', 'BORRADOR')
   AND a.numeral = '9.5'
   AND a.secuencia->'dependeDe' = '["8.7"]'::jsonb;

-- ============================================ 8. informe definitivo 7.2 --

ALTER TABLE hiring.informes_definitivos
  ADD COLUMN IF NOT EXISTS anexos_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS justificacion_cambios text;

-- ========================================== 9. traslado del preliminar 6.4 --

ALTER TABLE hiring.informes_evaluacion
  ADD COLUMN IF NOT EXISTS medio_publicacion text,
  ADD COLUMN IF NOT EXISTS enlace_proceso varchar(1000),
  ADD COLUMN IF NOT EXISTS observaciones_traslado text;

-- ============================== 10. observaciones al pliego definitivo --

ALTER TABLE hiring.observaciones_pliego
  ADD COLUMN IF NOT EXISTS pliego varchar(12) NOT NULL DEFAULT 'PROYECTO';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_observacion_pliego') THEN
    ALTER TABLE hiring.observaciones_pliego
      ADD CONSTRAINT ck_observacion_pliego CHECK (pliego IN ('PROYECTO', 'DEFINITIVO'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_observaciones_pliego_proceso_pliego
  ON hiring.observaciones_pliego (proceso_id, pliego);

-- Va entre la audiencia (5.12) y las adendas (5.13).
UPDATE hiring.actividades SET orden = 15 WHERE numeral = '5.13' AND orden = 14;

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden, activa, avisos_por_correo)
VALUES ('5.12.1', 5, 'Observaciones al pliego definitivo',
        'Recepción y respuesta de las observaciones que presentan los interesados al pliego definitivo, desde la apertura del proceso.',
        14, true, true)
ON CONFLICT (numeral) DO NOTHING;

INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
SELECT '5.12.1', m.codigo,
       'Las observaciones al pliego definitivo, con la segunda sesión del Comité, solo se adelantan en licitación pública'
  FROM hiring.modalidades m
 WHERE m.codigo <> 'LICITACION_PUBLICA'
ON CONFLICT DO NOTHING;

-- Los procesos ya creados: donde no aplica queda en NO_APLICA, como nace en
-- los nuevos; donde aplica se crea al registrar la primera observación.
INSERT INTO hiring.proceso_actividades (proceso_id, numeral, estado, datos)
SELECT p.id, '5.12.1', 'NO_APLICA', '{}'::jsonb
  FROM hiring.procesos p
 WHERE p.modalidad IS NOT NULL AND p.modalidad <> 'LICITACION_PUBLICA'
ON CONFLICT DO NOTHING;

UPDATE hiring.actividades
   SET nombre = 'Publicación del proyecto de pliego'
 WHERE numeral = '5.3' AND nombre = 'Publicación del proyecto de pliego (SECOP II y página web)';

-- ===================================== 11. cronograma por actividad 5.2 --

CREATE TABLE IF NOT EXISTS hiring.cronograma_actividades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id      uuid NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  numeral         varchar(20) NOT NULL REFERENCES hiring.actividades(numeral),
  fecha_inicio    date,
  fecha_fin       date NOT NULL,
  dias_antes      smallint CHECK (dias_antes IS NULL OR dias_antes BETWEEN 0 AND 90),
  avisar_a        jsonb NOT NULL DEFAULT '["QUIEN_LA_HACE"]'::jsonb,
  canal           varchar(10) NOT NULL DEFAULT 'CAMPANA' CHECK (canal IN ('CAMPANA', 'CORREO', 'AMBOS')),
  correos         jsonb NOT NULL DEFAULT '[]'::jsonb,
  nota            text,
  updated_by      varchar(200),
  updated_by_id   varchar(100),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cronograma_actividad UNIQUE (proceso_id, numeral),
  CONSTRAINT ck_cronograma_actividad_fechas CHECK (fecha_inicio IS NULL OR fecha_inicio <= fecha_fin)
);

COMMENT ON TABLE hiring.cronograma_actividades IS
  'Cronograma del proceso por actividad (5.2, 138): fechas y a quién y por dónde se avisa; opcional, alimenta la alerta CRONOGRAMA_ACTIVIDAD';

CREATE TABLE IF NOT EXISTS hiring.cronograma_cambios (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id          uuid NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  ambito              varchar(10) NOT NULL CHECK (ambito IN ('ETAPA', 'ACTIVIDAD')),
  clave               varchar(20) NOT NULL,
  fecha_inicio_antes  date,
  fecha_fin_antes     date,
  fecha_inicio_nueva  date,
  fecha_fin_nueva     date,
  adenda_id           uuid REFERENCES hiring.adendas(id) ON DELETE SET NULL,
  motivo              text,
  usuario_nombre      varchar(200),
  usuario_id          varchar(100),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_cronograma_cambios_proceso ON hiring.cronograma_cambios (proceso_id, created_at DESC);

COMMENT ON TABLE hiring.cronograma_cambios IS
  'Historial de cambios de fechas del cronograma (etapas y actividades), con la adenda que los originó si la hubo (138)';

COMMIT;
