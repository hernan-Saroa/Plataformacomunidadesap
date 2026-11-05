-- REQ-RUND foto de perfil (674 embebido): una identidad y una publicación por persona, entre periodos, PTA y RUND.
-- Las versiones pendientes nunca reemplazan la publicada; las decisiones se conservan por trazabilidad.
-- persona_id es una referencia lógica a Auth (sin FK entre esquemas de servicios distintos).
BEGIN;

CREATE TABLE IF NOT EXISTS rund.rund_foto_perfil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL,
  contenido bytea NOT NULL CHECK (octet_length(contenido) BETWEEN 1 AND 2097152),
  mime varchar(10) NOT NULL CHECK (mime IN ('image/png','image/jpeg')),
  nombre varchar(255) NOT NULL,
  ancho integer NOT NULL CHECK (ancho BETWEEN 200 AND 4096),
  alto integer NOT NULL CHECK (alto BETWEEN 200 AND 4096),
  estado varchar(12) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA','REEMPLAZADA','ARCHIVADA')),
  origen varchar(12) NOT NULL CHECK (origen IN ('PTA','RUND','MASIVA')),
  creado_por text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  revisado_por text,
  revisado_en timestamptz,
  observacion varchar(1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS rund_foto_publicada_persona
  ON rund.rund_foto_perfil(persona_id) WHERE estado='APROBADA';
CREATE UNIQUE INDEX IF NOT EXISTS rund_foto_pendiente_persona
  ON rund.rund_foto_perfil(persona_id) WHERE estado='PENDIENTE';
CREATE INDEX IF NOT EXISTS rund_foto_persona_fecha
  ON rund.rund_foto_perfil(persona_id,creado_en DESC);

-- Permisos del catálogo de Auth (no asigna personas). Se prefiere el módulo 'rund'.
INSERT INTO auth.permission(id_permission,code,name,description,id_module,is_active)
SELECT gen_random_uuid(),v.code,v.name,v.description,m.id_module,true
FROM (SELECT id_module FROM auth.module WHERE code IN ('rund','gestion-profesoral') ORDER BY (code='rund') DESC LIMIT 1) m
CROSS JOIN (VALUES
  ('banco-docentes.rund.photos.manage','RUND · Cargar fotos de perfil',
   'Carga fotos individuales y masivas en Identidad. Todas requieren aprobación antes de publicarse.'),
  ('banco-docentes.rund.photos.validate','RUND · Validar fotos de perfil',
   'Consulta las fotos pendientes, aprueba su publicación o las rechaza con una observación.')
) AS v(code,name,description)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,id_module=EXCLUDED.id_module;

-- Los roles operativos existentes quedan habilitados; los permisos siguen siendo configurables por separado.
INSERT INTO auth.role_permissions(id_rol,id_permission,is_active,created_at,updated_at)
SELECT r.id,p.id_permission,true,now(),now() FROM auth.role r JOIN auth.permission p
 ON (r.code='RUND_CARGADOR' AND p.code='banco-docentes.rund.photos.manage')
 OR (r.code='RUND_APROBADOR' AND p.code='banco-docentes.rund.photos.validate')
ON CONFLICT(id_rol,id_permission) DO NOTHING;

COMMIT;
