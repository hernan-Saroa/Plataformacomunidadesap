BEGIN;
SET LOCAL search_path TO auth, public;

-- ---------------------------------------------------------------------------
-- Ajuste inicial de tabs/permisos:
-- P1 solicitante sin reportes ni permisos heredados de conformidad/calificación.
-- P5 coordinador funcional sin reportes de gestión ni exportación.
-- P7 consulta calidad mantiene reportes, pero la ocultación de inventario/sedes
-- se resuelve en frontend por visibilidad de tabs.
-- ---------------------------------------------------------------------------

WITH roles_objetivo AS (
  SELECT id, code
  FROM auth.role
  WHERE code IN (
    'SOLICITANTE_INFRA',
    'ADMINISTRADOR_FUNCIONAL_INFRA'
  )
),
permisos_a_remover AS (
  SELECT id_permission, code
  FROM auth.permission
  WHERE code IN (
    'infraestructura.reportes.gestion',
    'infraestructura.reportes.consolidados',
    'infraestructura.reporting.export_excel',
    'infraestructura.estadisticas.calificaciones.consolidadas',
    'infraestructura.solicitud.conformidad',
    'infraestructura.solicitud.calificacion',
    'infraestructura.solicitud.read'
  )
)
DELETE FROM auth.role_permissions rp
USING roles_objetivo r, permisos_a_remover p
WHERE rp.id_rol = r.id
  AND rp.id_permission = p.id_permission
  AND (
    (r.code = 'SOLICITANTE_INFRA' AND p.code IN (
      'infraestructura.reportes.gestion',
      'infraestructura.reportes.consolidados',
      'infraestructura.reporting.export_excel',
      'infraestructura.estadisticas.calificaciones.consolidadas',
      'infraestructura.solicitud.conformidad',
      'infraestructura.solicitud.calificacion',
      'infraestructura.solicitud.read'
    ))
    OR
    (r.code = 'ADMINISTRADOR_FUNCIONAL_INFRA' AND p.code IN (
      'infraestructura.reportes.gestion',
      'infraestructura.reportes.consolidados',
      'infraestructura.reporting.export_excel',
      'infraestructura.estadisticas.calificaciones.consolidadas'
    ))
  );

COMMIT;
