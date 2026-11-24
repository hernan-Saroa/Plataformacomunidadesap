-- Migración 034: RF-INF-013 & RF-INF-005 Descentralización Territorial, Modalidad de Ejecutor y VoBo DT
-- Tabla satélite 1:1: "infrastructure-management".solicitud_ejecucion_territorial

BEGIN;

CREATE TABLE IF NOT EXISTS "infrastructure-management".solicitud_ejecucion_territorial (
    id_solicitud UUID PRIMARY KEY REFERENCES "infrastructure-management".solicitud_mantenimiento(id_solicitud) ON DELETE CASCADE,
    modalidad_ejecutor_territorial VARCHAR(40) NOT NULL DEFAULT 'CUADRILLA_CENTRAL_COMISION',
    proveedor_local_nombre VARCHAR(200) NULL,
    proveedor_local_nit VARCHAR(50) NULL,
    orden_compra_contrato_local VARCHAR(100) NULL,
    vobo_cierre_dt_aprobado BOOLEAN NULL,
    vobo_cierre_dt_usuario_id UUID NULL,
    vobo_cierre_dt_usuario VARCHAR(150) NULL,
    vobo_cierre_dt_fecha TIMESTAMPTZ NULL,
    vobo_cierre_dt_observaciones TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_modalidad_ejecutor CHECK (
        modalidad_ejecutor_territorial IN (
            'CUADRILLA_CENTRAL_COMISION',
            'PROVEEDOR_LOCAL_CONTRATADO',
            'PERSONAL_PLANTA_TERRITORIAL'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_sol_ejec_terr_modalidad 
    ON "infrastructure-management".solicitud_ejecucion_territorial (modalidad_ejecutor_territorial);

CREATE INDEX IF NOT EXISTS idx_sol_ejec_terr_vobo 
    ON "infrastructure-management".solicitud_ejecucion_territorial (vobo_cierre_dt_aprobado);

COMMENT ON TABLE "infrastructure-management".solicitud_ejecucion_territorial IS 
  'Extensión satélite 1:1 para el seguimiento y ejecución de solicitudes en Direcciones Territoriales y CETAPs (RF-INF-013 / RF-INF-005).';

COMMENT ON COLUMN "infrastructure-management".solicitud_ejecucion_territorial.modalidad_ejecutor_territorial IS 
  'Modalidad de ejecución: CUADRILLA_CENTRAL_COMISION, PROVEEDOR_LOCAL_CONTRATADO, PERSONAL_PLANTA_TERRITORIAL.';

COMMENT ON COLUMN "infrastructure-management".solicitud_ejecucion_territorial.vobo_cierre_dt_aprobado IS 
  'Visto bueno de cierre técnico emitido por la Coordinación Administrativa de la Dirección Territorial.';

-- Conceder permisos de gestión de infraestructura a la Jefatura / Coordinación Territorial
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, TRUE
FROM auth.role r
CROSS JOIN auth.permission p
WHERE r.code = 'JEFATURA_TERRITORIAL'
  AND p.code IN (
      'infraestructura.view',
      'infraestructura.solicitud.read_all',
      'infraestructura.mantenimiento',
      'infraestructura.solicitud.assign'
  )
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp 
      WHERE rp.id_rol = r.id AND rp.id_permission = p.id_permission
  );

COMMIT;
