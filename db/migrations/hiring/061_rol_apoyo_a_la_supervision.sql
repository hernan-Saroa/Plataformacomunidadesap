-- ============================================================================
-- 061 · El rol de Apoyo a la Supervisión, que faltaba del catálogo
--
-- EFDS-1183 (RF-SIS-02). La 060 sembró tres de los cuatro roles del «Formato
-- usuario roles permisos Contratación Jun2026» que ninguna actividad había
-- necesitado. El cuarto es este, y no llegó por descuido: es el único rol del
-- catálogo cuyo trabajo es enteramente de lectura, así que ningún endpoint lo
-- exigía por sí solo y nada obligaba a declararlo.
--
-- La Hoja2 lo describe como los «administrativos y de apoyo» —«generamos
-- informes, estadísticas, certificaciones de contratos, indicadores,
-- seguimiento a la supervisión»— con atributo «Consulta y reportes». Es la
-- fila que sostiene EFDS-1189: quien consulta las estadísticas de gestión.
--
-- Idempotente y aditiva, como la 060: solo inserta lo que falta, no desactiva
-- ni borra nada, y lo que la entidad haya ajustado desde el backoffice de
-- roles sobrevive a reaplicarla.
-- ============================================================================

INSERT INTO auth.role (id, code, name, description, category, type, is_active, color, icon, sistema_destino)
VALUES
  (uuid_generate_v4(),
   'APOYO_SUPERVISION',
   'Apoyo a la Supervisión',
   'Personal administrativo y de apoyo: genera informes, estadísticas, certificaciones e indicadores, y hace seguimiento a la supervisión. Su trabajo es enteramente de consulta.',
   'backoffice', 'sistema', true, '#0891B2', 'ClipboardList', 'Backoffice')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------ qué permisos otorga el rol ----
--
-- Copiado de ROLES_QUE_OTORGAN, como el resto de la 060. Los cinco son de
-- lectura: no hay un solo permiso de escritura en la fila, que es justo lo que
-- el formato le reconoce.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM (VALUES
  ('contratacion.proceso.view',      'APOYO_SUPERVISION'),
  ('contratacion.expediente.view',   'APOYO_SUPERVISION'),
  ('contratacion.seguimiento.ver',   'APOYO_SUPERVISION'),
  ('contratacion.modificacion.ver',  'APOYO_SUPERVISION'),
  ('contratacion.reporte.view',      'APOYO_SUPERVISION')
) AS par(permiso, rol)
JOIN auth.role r       ON r.code = par.rol
JOIN auth.permission p ON p.code = par.permiso
ON CONFLICT (id_rol, id_permission) DO NOTHING;
