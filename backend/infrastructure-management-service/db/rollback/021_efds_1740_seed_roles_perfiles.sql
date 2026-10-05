-- ============================================================================
-- Migración 021 — EFDS-1740 RF-INF-011 Alineación Roles y Permisos Tabla 5.2 ERS
-- Idempotente: todos los INSERT usan IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- Se puede ejecutar N veces sin mutar datos existentes.
-- Dependencia: módulo auth.permission / auth.role / auth.role_permissions.
-- id_module Gestión Infraestructura = d2262ff0-1b96-4751-8741-2a0fc76ee1e2 (confirmado por SQL directo 2026-09-25)
-- ============================================================================
BEGIN;
SET LOCAL search_path TO auth, public;

-- ====== PARTE 1: PERMISOS ATÓMICOS 27 = 11 gestión + 5 param + 1 aprob + 10 report/futuro ======

INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'infraestructura.view', 'Ver módulo Gestión de Infraestructura', 'Permite acceder al módulo de infraestructura y ver espacios/sedes', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.create', 'Radicar solicitud de mantenimiento', 'Permite crear nuevas solicitudes UMI (RF-INF-001 EFDS-1730)', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.read_own', 'Ver mis solicitudes radicadas', 'Permite consultar solo las solicitudes donde el usuario es solicitante (SUBTAB Mis Solicitudes)', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.read_all', 'Ver bandeja general de solicitudes', 'Permite ver todas las solicitudes UMI, sin importar solicitante/responsable', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.assign', 'Asignar solicitud a técnico (Aprobar y Asignar)', 'RF-INF-005 EFDS-1734. Reemplaza ROLES_ASIGNADOR_PERMITIDOS hardcodeados', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.reject', 'Rechazar solicitud UMI (sin asignación)', 'RF-INF-005 EFDS-1734. Motivo rechazo visible al solicitante vía read_rejection_reason_own', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.redistribute', 'Redistribuir asignación vigente', 'RF-INF-005 EFDS-1734. Cambio técnico en estado ASIGNADA', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.forward_ti', 'Remitir solicitud a Oficina TIC (Remisión TI)', 'RF-INF-002 EFDS-1731. area_responsable_actual = TI', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.execute_assigned', 'Ejecutar solicitud asignada', 'Iniciar ejecución directa, valoración campo, registrar insumos, confirmar recepción insumos (EFDS-1735)', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.close_with_evidence', 'Cerrar técnicamente con evidencia fotográfica', 'RF-INF-007 EFDS-1736. Registro 1-5 evidencias, costo final COP, trabajo realizado, seguimiento', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.confirm_close_own', 'Confirmar conformidad en solicitud propia', 'RF-INF-008 EFDS-1737. Usuario que radicó la solicitud confirma el cierre técnico realizado', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.rate_close_own', 'Calificar servicio 1-5 en conformidad propia', 'RF-INF-009 EFDS-1738. Solo cuando confirm_close_own es exitoso', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.read_assigned', 'Ver Asignadas a mí técnico', 'SUBTAB Asignadas a mí. Filtro por código técnico/UserId/email en responsableAsignado', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.read_rejection_reason_own', 'Ver motivo de rechazo de solicitud propia', 'Cuando el Encargado UMI rechazó la solicitud (EFDS-1734)', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.read_ti', 'Ver Remitidas a TIC', 'SUBTAB Remitidas a TI. Filtro area_responsable_actual=TI', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.read_audit_history_any', 'Ver histórico asignaciones/observaciones completo', 'Traza auditoría 360° sin importar el estado de la solicitud', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.ti_tracing_full', 'Ver trazabilidad completa Oficina TIC', 'Incluye IDs tickets internos OTIC, si existieran', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.solicitud.authorize_special_categories', 'Autorizar categorías especiales UPS / CCTV', 'REG_002 cámaras CCTV y UPS requieren doble aprobación antes de ejecutar (RF-INF-004)', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.estadisticas.calificaciones.consolidadas', 'Ver consolidados calificación servicio', 'EFDS-1738 endpoint GET /mantenimiento/estadisticas/calificaciones-consolidadas', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.reportes.gestion', 'Acceso tab Reportes (RF-INF-010 EFDS 1739)', 'Ver dashboard KPI, distribución categoría, exportar Excel/PDF', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.param.categories_crud', 'CRUD categorías de servicio (CS_001..CS_008 + nuevas)', 'Tab Categorías Servicio (8+) EFDS-1732', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.param.rules_edit', 'Editar reglas negocio (inlcuye REG_001/REG_002)', 'Sliders categorías, auto-asignación, exclusiones Técnico Electricista CS_002', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.param.sla_times_edit', 'Editar SLA tiempos respuesta', 'SLA 1 día / 2 días / 3 días por categoría (EFDS-1733)', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.param.technicians_crud', 'CRUD catálogo técnicos asignables', 'Código técnico, nombre, lista exclusión categorías, asignación sedes', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.param.territorial_crud', 'CRUD sedes / bloques / espacios', 'Tabs Espacios y Aulas, Sedes Territoriales', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.param.approve_config', 'Aprobar cambios de parametrización 4-eyes', 'Flujo P6 hace cambios → P5 ADMINISTRADOR_FUNCIONAL aprueba', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now()),
  (gen_random_uuid(), 'infraestructura.reporting.export_excel', 'Exportar reporte Excel .xlsx', 'EFDS 1739 ST2', 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2', true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- ====== PARTE 2: 7 ROLES OFICIALES DE LA TABLA 5.2 ERS ======

INSERT INTO auth.role (id, code, name, description, category, icon, color, "type", is_active, requires_2fa, created_by, updated_by, created_at, updated_at, sistema_destino, alcance)
VALUES
  (gen_random_uuid(), 'SOLICITANTE_INFRA', 'P1 - Solicitante Dependencia', 'Radicador de solicitudes. Área solicitante (dependencias no UMI). RF-INF-001', 'funcional', 'user', 'slate', 'funcional', true, false, 'EFDS-1740-seed', 'EFDS-1740-seed', now(), now(), NULL, NULL::jsonb),
  (gen_random_uuid(), 'ANALISTA_ASIGNADOR_UMI', 'P2 - Analista Asignador (Encargado UMI)', 'Clasifica, asigna, rechaza, redistribuye, remite TI, aprueba cambios. Encargado operativo diario', 'funcional', 'shield-check', 'indigo', 'funcional', true, false, 'EFDS-1740-seed', 'EFDS-1740-seed', now(), now(), NULL, NULL::jsonb),
  (gen_random_uuid(), 'TECNICO_ELECTRICO_ESPECIALIZADO', 'P3 - Técnico Electricista CS_002', 'Solo categorías eléctricas CS_002. Excluye CCTV/UPS si REG_001 no lo permite. REG_001 especialización', 'funcional', 'zap', 'amber', 'funcional', true, false, 'EFDS-1740-seed', 'EFDS-1740-seed', now(), now(), NULL, NULL::jsonb),
  (gen_random_uuid(), 'TECNICO_UMI_MULTIPROPOSITO', 'P4 - Técnico UMI Multiproposito', '7 categorías excluyendo CS_002 electricidad. REG_001 exclusión', 'funcional', 'wrench', 'emerald', 'funcional', true, false, 'EFDS-1740-seed', 'EFDS-1740-seed', now(), now(), NULL, NULL::jsonb),
  (gen_random_uuid(), 'ADMINISTRADOR_FUNCIONAL_INFRA', 'P5 - Administrador Funcional (Coordinador Infra)', 'Consolidados, reportes, auditoría, aprobación parámetros 4-eyes, autoriza categorías especiales', 'funcional', 'briefcase', 'rose', 'funcional', true, false, 'EFDS-1740-seed', 'EFDS-1740-seed', now(), now(), NULL, NULL::jsonb),
  (gen_random_uuid(), 'ADMINISTRADOR_MODULO_INFRA', 'P6 - Administrador Módulo (Configurador)', 'CRUD sedes/espacios/categorías/sla/técnicos/reglas. Parametrización', 'sistema', 'settings', 'purple', 'configuracion', true, false, 'EFDS-1740-seed', 'EFDS-1740-seed', now(), now(), NULL, NULL::jsonb),
  (gen_random_uuid(), 'CONSULTA_CALIDAD_INFRA', 'P7 - Consultor Gestión Calidad', 'Solo lectura reportes/indicadores/auditoría/trazabilidad TI. 0 permisos de escritura', 'funcional', 'chart-bar', 'cyan', 'funcional', true, false, 'EFDS-1740-seed', 'EFDS-1740-seed', now(), now(), NULL, NULL::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ====== PARTE 3: ASIGNACIÓN MATRIZ PIVOTE 7 ROLES × PERMISOS (PROPUESTA_ROLES_Y_PERMISOS Sección 3) ======
-- Usamos CTEs para resolver UUIDs por code, así no dependemos de UUIDs hardcodeados.

WITH
  p AS (SELECT code, id_permission FROM auth.permission WHERE id_module = 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2' AND code LIKE 'infraestructura.%'),
  r AS (SELECT code, id FROM auth.role WHERE code IN (
    'SOLICITANTE_INFRA','ANALISTA_ASIGNADOR_UMI','TECNICO_ELECTRICO_ESPECIALIZADO',
    'TECNICO_UMI_MULTIPROPOSITO','ADMINISTRADOR_FUNCIONAL_INFRA','ADMINISTRADOR_MODULO_INFRA',
    'CONSULTA_CALIDAD_INFRA','SUPER_ADMIN','ADMIN','USER','GESTOR_MANTENIMIENTO','ADMINISTRADOR_FUNCIONAL','UMI','INFRAESTRUCTURA','COORDINADOR_INFRAESTRUCTURA','TECNICO_UMI'
  )),
  -- P1 SOLICITANTE: read/view + create + read_own + motivo rechazo + confirmar + calificar
  p1_perms(c_perm) AS (VALUES
    ('infraestructura.view'),('infraestructura.solicitud.create'),('infraestructura.solicitud.read_own'),
    ('infraestructura.solicitud.read_rejection_reason_own'),('infraestructura.solicitud.confirm_close_own'),('infraestructura.solicitud.rate_close_own')),
  -- P2 ANALISTA_ASIGNADOR: asign/rechazar/redistribuir/remitir/read_all/read_assigned_ti/historial/permisos operativos + ver reportes read (no export)
  p2_perms(c_perm) AS (VALUES
    ('infraestructura.view'),('infraestructura.solicitud.read_all'),('infraestructura.solicitud.assign'),
    ('infraestructura.solicitud.reject'),('infraestructura.solicitud.redistribute'),('infraestructura.solicitud.forward_ti'),
    ('infraestructura.solicitud.read_assigned'),('infraestructura.solicitud.read_ti'),('infraestructura.solicitud.read_audit_history_any'),
    ('infraestructura.estadisticas.calificaciones.consolidadas'),('infraestructura.reportes.gestion')),
  -- P3 TECNICO ELECTRICO: view + read_own (para radicar) + read_assigned + ejecutar + cerrar evidencia + (CS_002 se valida en código REG_001, no permiso aislado)
  p3_perms(c_perm) AS (VALUES
    ('infraestructura.view'),('infraestructura.solicitud.create'),('infraestructura.solicitud.read_own'),
    ('infraestructura.solicitud.read_assigned'),('infraestructura.solicitud.execute_assigned'),
    ('infraestructura.solicitud.close_with_evidence'),('infraestructura.solicitud.read_rejection_reason_own')),
  -- P4 TECNICO MULTI: mismo que P3 (exclude CS_002 se valida en service REG_001)
  p4_perms(c_perm) AS (SELECT c_perm FROM p3_perms),
  -- P5 ADMIN FUNCIONAL (Coordinador): reportes + auditoría + aprobación especial + parámetros aprobación 4-eyes + read_all/read_ti/read_hist + consolidados + permiso reportes
  p5_perms(c_perm) AS (VALUES
    ('infraestructura.view'),('infraestructura.solicitud.read_all'),('infraestructura.solicitud.read_ti'),
    ('infraestructura.solicitud.read_audit_history_any'),('infraestructura.solicitud.ti_tracing_full'),
    ('infraestructura.solicitud.authorize_special_categories'),('infraestructura.param.approve_config'),
    ('infraestructura.estadisticas.calificaciones.consolidadas'),('infraestructura.reportes.gestion'),('infraestructura.reporting.export_excel')),
  -- P6 ADMIN MODULO: todos los param CRUD + view + read_all + read_assigned_ti para validar configuración
  p6_perms(c_perm) AS (VALUES
    ('infraestructura.view'),('infraestructura.solicitud.read_all'),('infraestructura.solicitud.read_ti'),
    ('infraestructura.param.categories_crud'),('infraestructura.param.rules_edit'),('infraestructura.param.sla_times_edit'),
    ('infraestructura.param.technicians_crud'),('infraestructura.param.territorial_crud')),
  -- P7 CALIDAD: solo lectura reportes auditoría trazabilidad consolidados 0 escritura
  p7_perms(c_perm) AS (VALUES
    ('infraestructura.view'),('infraestructura.solicitud.read_all'),('infraestructura.solicitud.read_ti'),
    ('infraestructura.solicitud.read_audit_history_any'),('infraestructura.solicitud.ti_tracing_full'),
    ('infraestructura.estadisticas.calificaciones.consolidadas'),('infraestructura.reportes.gestion'),('infraestructura.reporting.export_excel'))
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
  SELECT r.id, p.id_permission, true, now(), now()
  FROM r CROSS JOIN p
  JOIN (
    SELECT 'SOLICITANTE_INFRA' AS rol, c_perm FROM p1_perms UNION ALL
    SELECT 'ANALISTA_ASIGNADOR_UMI' AS rol, c_perm FROM p2_perms UNION ALL
    SELECT 'TECNICO_ELECTRICO_ESPECIALIZADO' AS rol, c_perm FROM p3_perms UNION ALL
    SELECT 'TECNICO_UMI_MULTIPROPOSITO' AS rol, c_perm FROM p4_perms UNION ALL
    SELECT 'ADMINISTRADOR_FUNCIONAL_INFRA' AS rol, c_perm FROM p5_perms UNION ALL
    SELECT 'ADMINISTRADOR_MODULO_INFRA' AS rol, c_perm FROM p6_perms UNION ALL
    SELECT 'CONSULTA_CALIDAD_INFRA' AS rol, c_perm FROM p7_perms UNION ALL
    -- FALLBACK LEGACY OQ-2 (equivalencias por rol histórico)
    SELECT 'ADMIN' AS rol, c_perm FROM p2_perms UNION ALL
    SELECT 'GESTOR_MANTENIMIENTO' AS rol, c_perm FROM p2_perms UNION ALL
    SELECT 'ADMINISTRADOR_FUNCIONAL' AS rol, c_perm FROM p5_perms UNION ALL
    SELECT 'UMI' AS rol, c_perm FROM p2_perms UNION ALL
    SELECT 'INFRAESTRUCTURA' AS rol, c_perm FROM p2_perms UNION ALL
    SELECT 'COORDINADOR_INFRAESTRUCTURA' AS rol, c_perm FROM p5_perms UNION ALL
    SELECT 'TECNICO_UMI' AS rol, c_perm FROM p4_perms UNION ALL
    SELECT 'USER' AS rol, c_perm FROM p1_perms
  ) matrix ON matrix.rol = r.code AND matrix.c_perm = p.code
ON CONFLICT (id_rol, id_permission) DO NOTHING;

-- ====== PARTE 4: SUPER_ADMIN RECIBE TODOS LOS 27 PERMISOS DE INFRA ======
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
  SELECT r.id, p.id_permission, true, now(), now()
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code = 'SUPER_ADMIN' AND p.id_module = 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2'
ON CONFLICT (id_rol, id_permission) DO NOTHING;

COMMIT;
