-- ============================================================================
-- Migration: Revisión del estudio previo — subtarea EFDS-1246
-- Descripción: Permite aprobar o devolver con observaciones el estudio previo
--              enviado a revisión (numeral 3.4 de la matriz de flujo).
--
-- Ciclo completo tras esta migración:
--   BORRADOR → EN_REVISION → APROBADO
--                          ↘ DEVUELTO → BORRADOR (el gestor corrige y reenvía)
-- ============================================================================

-- Nuevos estados admitidos en la actividad
ALTER TABLE hiring.proceso_actividades
  DROP CONSTRAINT IF EXISTS ck_pa_estado;

ALTER TABLE hiring.proceso_actividades
  ADD CONSTRAINT ck_pa_estado
  CHECK (estado IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'DEVUELTO'));

-- Quién revisó y cuándo
ALTER TABLE hiring.proceso_actividades
  ADD COLUMN IF NOT EXISTS revisado_por  varchar(120),
  ADD COLUMN IF NOT EXISTS revisado_at   timestamptz;

-- ------------------------------------------------------- observaciones ------
-- Historial de revisiones: cada aprobación o devolución queda registrada.
-- Tabla aparte y no una columna, porque un estudio previo puede devolverse
-- varias veces y hay que conservar el motivo de cada devolución.
CREATE TABLE IF NOT EXISTS hiring.revisiones (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_actividad_id  uuid        NOT NULL REFERENCES hiring.proceso_actividades(id) ON DELETE CASCADE,
  decision              varchar(20) NOT NULL,
  observaciones         text,
  -- Versión de la actividad revisada: permite saber sobre qué contenido
  -- se pronunció el revisor, aunque el gestor lo haya corregido después.
  version_revisada      int         NOT NULL,
  revisado_por          varchar(120) NOT NULL,
  revisado_por_id       varchar(120),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_revision_decision CHECK (decision IN ('APROBADO', 'DEVUELTO')),
  -- Una devolución sin motivo deja al gestor sin saber qué corregir
  CONSTRAINT ck_revision_observaciones
    CHECK (decision <> 'DEVUELTO' OR (observaciones IS NOT NULL AND length(trim(observaciones)) > 0))
);

CREATE INDEX IF NOT EXISTS idx_revisiones_actividad
  ON hiring.revisiones(proceso_actividad_id, created_at DESC);

-- ---------------------------------------------------------- rol revisor -----
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.role WHERE code = 'REVISOR_CONTRATACION') THEN
    INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'REVISOR_CONTRATACION',
      'Revisor de Contratación',
      'Abogado de la Dirección de Contratación que revisa y aprueba los documentos del proceso',
      'backoffice',
      'ClipboardCheck',
      '#10B981',
      'sistema',
      true,
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Rol REVISOR_CONTRATACION creado';
  END IF;

  SELECT id INTO v_role_id FROM auth.role WHERE code = 'REVISOR_CONTRATACION';

  -- El superusuario lo necesita para poder probar el flujo completo
  INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
  SELECT u.id_user, v_role_id, true, NOW(), NOW()
  FROM auth."user" u
  WHERE u.username = 'superuser@esap.edu.co'
    AND NOT EXISTS (
      SELECT 1 FROM auth.user_roles ur
      WHERE ur.id_user = u.id_user AND ur.id_rol = v_role_id
    );
END $$;
