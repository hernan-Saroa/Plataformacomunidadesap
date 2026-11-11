BEGIN;

-- One identity and one publication across periods, PTA and RUND. Pending
-- versions never replace the published version. Keep decisions for traceability.
CREATE TABLE IF NOT EXISTS academic_work_plan.rund_foto_perfil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES auth.personas(id_person),
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
  ON academic_work_plan.rund_foto_perfil(persona_id) WHERE estado='APROBADA';
CREATE UNIQUE INDEX IF NOT EXISTS rund_foto_pendiente_persona
  ON academic_work_plan.rund_foto_perfil(persona_id) WHERE estado='PENDIENTE';
CREATE INDEX IF NOT EXISTS rund_foto_persona_fecha
  ON academic_work_plan.rund_foto_perfil(persona_id,creado_en DESC);

INSERT INTO auth.permission(id_permission,code,name,description,id_module,is_active)
SELECT gen_random_uuid(),v.code,v.name,v.description,m.id_module,true
FROM auth.module m CROSS JOIN (VALUES
  ('banco-docentes.rund.photos.manage','RUND · Cargar fotos de perfil',
   'Carga fotos individuales y masivas en Identidad. Todas requieren aprobación antes de publicarse.'),
  ('banco-docentes.rund.photos.validate','RUND · Validar fotos de perfil',
   'Consulta las fotos pendientes, aprueba su publicación o las rechaza con una observación.')
) AS v(code,name,description) WHERE m.code='gestion-profesoral'
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,id_module=EXCLUDED.id_module;

-- Preserve custom roles and user assignments. Enable the existing operational
-- roles; these grants remain independently configurable in RUND permissions.
INSERT INTO auth.role_permissions(id_rol,id_permission,is_active,created_at,updated_at)
SELECT r.id,p.id_permission,true,now(),now() FROM auth.role r JOIN auth.permission p
 ON (r.code='RUND_CARGADOR' AND p.code='banco-docentes.rund.photos.manage')
 OR (r.code='RUND_APROBADOR' AND p.code='banco-docentes.rund.photos.validate')
ON CONFLICT(id_rol,id_permission) DO NOTHING;
COMMIT;
