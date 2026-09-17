-- ============================================
-- MIGRATION 435: Permiso "Editar Informe/Término" en Términos e Informes (SIGL)
-- ============================================
-- Contexto: el detalle de un informe del submódulo Términos e Informes era de solo
-- consulta. Los únicos cambios posibles eran la etapa, las notas, los adjuntos y las
-- alertas; no había forma de corregir los datos del informe ya creado (nombre, ente
-- solicitante, destinatario, fuente normativa, responsable, prioridad) ni —sobre todo—
-- de mover la FECHA DE VENCIMIENTO o la parametrización del plazo (unidad de días y
-- fecha base del término), que es justamente lo que cambia cuando una entidad prorroga
-- o adelanta la entrega de un informe.
--
-- Esta migración crea el permiso dedicado `gestion-legal.terminos.edit`
-- ("Editar Informe de Términos"), que es el que habilita el botón "Editar" del detalle
-- (frontend: ModalDetalleSolicitudInforme -> ModalEditarTermino). Se deja como permiso
-- propio y NO derivado de `gestion-legal.terminos.manage`/`.ver` a propósito: esos dos
-- son permisos de ACCESO al submódulo (ver el menú y el listado), mientras que este es
-- de ESCRITURA sobre un informe ya creado. Así un rol puede seguir viendo el módulo sin
-- poder reescribir plazos ajenos.
--
-- Asignación inicial: JEFE_GESTION_LEGAL y SECRETARIADO_GESTION_LEGAL, que son los
-- roles con vista global del SIGL (ver backend/legal-management-service/src/auth/
-- legal-access.ts -> GLOBAL_LEGAL_ROLES) y ya administran los términos del área.
-- Se excluyen a propósito:
--   - MONITOREO_GESTION_LEGAL         -> rol de solo lectura/seguimiento.
--   - CONSULTA_SEGUIMIENTO_GESTION_LEGAL -> rol de solo consulta (migración 432).
--   - RESUELVE_GESTION_LEGAL          -> abogado asignado; ve únicamente sus propios
--                                        términos y no debe poder reescribir el plazo
--                                        que se le impuso. Si el área decide otra cosa,
--                                        basta con otorgarle el permiso desde la
--                                        administración de roles, sin tocar código.

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-legal';

  IF v_module_id IS NULL THEN
    RAISE NOTICE 'Módulo gestion-legal no existe; nada que hacer';
    RETURN;
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'gestion-legal.terminos.edit',
    'Editar Informe de Términos',
    'Permite editar un informe/término ya creado desde su detalle: datos generales, fuente normativa, responsable, prioridad, fecha de vencimiento y parametrización del plazo (unidad de días y fecha base). Al mover el vencimiento se reevalúan las reglas globales de alerta.',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = true;

  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code IN ('JEFE_GESTION_LEGAL', 'SECRETARIADO_GESTION_LEGAL')
    AND p.code = 'gestion-legal.terminos.edit'
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
END $$;
