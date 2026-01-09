-- ============================================
-- SEED AUTH-SERVICE (ESQUEMA auth)
-- ============================================

-- TRUNCATE opcional (solo en desarrollo)
TRUNCATE TABLE auth.user_roles, auth.role_permissions, auth."user", auth.role, auth.permission, auth.module, auth.personas RESTART IDENTITY CASCADE;

-- ============================================
-- PERSONAS DE PRUEBA
-- ============================================
INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, pri_apellido, gen_tercero, dir_email)
VALUES
  (1, '123456789', 'CC', 'Super User',         'Super',      'Usuario',      'M', 'superuser@esap.edu.co'),
  (2, '123456789', 'CC', 'Admin Sistema',      'Admin',      'Sistema',      'M', 'admin@esap.edu.co'),
  (3, '123456790', 'CC', 'Estudiante Prueba',  'Estudiante', 'Prueba',       'M', 'estudiante@esap.edu.co'),
  (4, '123456791', 'CC', 'Docente Planta',     'Docente',    'Planta',       'F', 'planta@esap.edu.co'),
  (5, '123456792', 'CC', 'Docente Cátedra',    'Docente',    'Cátedra',      'M', 'catedra@esap.edu.co'),
  (6, '123456793', 'CC', 'Gestor Certificados','Gestor',     'Certificados', 'F', 'cerlaboral@esap.edu.co'),
  -- Usuarios del mock data
  (7, '52123456', 'CC', 'María Elena Rodríguez', 'María Elena', 'Rodríguez', 'F', 'maria.rodriguez@esap.edu.co'),
  (8, '1098765432', 'CC', 'Carlos Alberto Martínez', 'Carlos Alberto', 'Martínez', 'M', 'carlos.martinez@esap.edu.co'),
  (9, '31456789', 'CC', 'Ana Patricia Gómez', 'Ana Patricia', 'Gómez', 'F', 'ana.gomez@esap.edu.co'),
  (10, '72345678', 'CC', 'Jorge Luis Hernández', 'Jorge Luis', 'Hernández', 'M', 'jorge.hernandez@esap.edu.co'),
  (11, '63789012', 'CC', 'Sandra Milena Torres', 'Sandra Milena', 'Torres', 'F', 'sandra.torres@esap.edu.co'),
  (12, '1123456789', 'CC', 'Diego Fernando Ramírez', 'Diego Fernando', 'Ramírez', 'M', 'diego.ramirez@esap.edu.co'),
  (13, '42567890', 'CC', 'Claudia Marcela Díaz', 'Claudia Marcela', 'Díaz', 'F', 'claudia.diaz@esap.edu.co'),
  (14, '10345678', 'CC', 'Roberto Antonio Pérez', 'Roberto Antonio', 'Pérez', 'M', 'roberto.perez@esap.edu.co'),
  (15, '59012345', 'CC', 'Luisa Fernanda Castro', 'Luisa Fernanda', 'Castro', 'F', 'luisa.castro@esap.edu.co'),
  (16, '88123456', 'CC', 'Andrés Felipe Vargas', 'Andrés Felipe', 'Vargas', 'M', 'andres.vargas@esap.edu.co'),
  (17, '26234567', 'CC', 'Patricia del Carmen Ruiz', 'Patricia del Carmen', 'Ruiz', 'F', 'patricia.ruiz@esap.edu.co'),
  (18, '93345678', 'CC', 'Miguel Ángel Sánchez', 'Miguel Ángel', 'Sánchez', 'M', 'miguel.sanchez@esap.edu.co'),
  (19, '29456789', 'CC', 'Gloria Stella Morales', 'Gloria Stella', 'Morales', 'F', 'gloria.morales@esap.edu.co'),
  (20, '74567890', 'CC', 'Héctor Fabio Mejía', 'Héctor Fabio', 'Mejía', 'M', 'hector.mejia@esap.edu.co'),
  (21, '38678901', 'CC', 'Carolina Jiménez Ospina', 'Carolina', 'Jiménez Ospina', 'F', 'carolina.jimenez@esap.edu.co'),
  -- Usuarios de Control Interno
  (22, '123456794', 'CC', 'Jefe Control Interno', 'Jefe', 'Control Interno', 'M', 'jefe.control@esap.edu.co'),
  (23, '123456795', 'CC', 'Auditor Líder', 'Auditor', 'Líder', 'M', 'auditor.lider@esap.edu.co')
ON CONFLICT (id_tercero) DO NOTHING;


-- ============================================
-- MÓDULOS DEL SISTEMA (31 módulos)
-- ============================================
INSERT INTO auth.module (code, name, description, icon, color, display_order, category)
VALUES
-- BACKOFFICE (19 módulos)
('system_access', 'Acceso a Sistemas', 'Control de acceso a los diferentes sistemas de la plataforma', 'Key', '#6366f1', 0, 'backoffice'),
('users', 'Usuarios y Personas', 'Gestión de usuarios, personas y vinculaciones del sistema', 'Users', '#3b82f6', 1, 'backoffice'),
('organization', 'Estructura Organizacional', 'Gestión de territoriales, sedes y jerarquía institucional', 'Building2', '#10b981', 2, 'backoffice'),
('programs', 'Programas Académicos', 'Gestión de programas, pensum y oferta académica', 'GraduationCap', '#8b5cf6', 3, 'backoffice'),
('students', 'Estudiantes', 'Gestión de estudiantes, matrículas y registro académico', 'UserCheck', '#06b6d4', 4, 'backoffice'),
('graduates', 'Graduados', 'Gestión de graduados, títulos y verificación de grados', 'Award', '#14b8a6', 5, 'backoffice'),
('professors', 'Gestión Profesoral', 'Gestión de docentes, carga académica y contratos', 'BookOpen', '#f59e0b', 6, 'backoffice'),
('calendar', 'Calendario Académico', 'Gestión del calendario académico y periodos', 'Calendar', '#ef4444', 7, 'backoffice'),
('certificates_labor', 'Certificados Laborales', 'Gestión de certificados laborales y solicitudes', 'FileText', '#84cc16', 8, 'backoffice'),
('aspirants', 'Aspirantes', 'Gestión de aspirantes y proceso de admisión', 'UserPlus', '#a855f7', 9, 'backoffice'),
('control', 'Control Interno', 'Auditorías, hallazgos y planes de mejoramiento', 'Shield', '#f97316', 10, 'backoffice'),
('dashboard', 'Dashboard Ejecutivo', 'Métricas, KPIs y reportes ejecutivos del sistema', 'BarChart3', '#0ea5e9', 11, 'backoffice'),
('community', 'Comunidad ESAP', 'Gestión de la comunidad y red social universitaria', 'Heart', '#ec4899', 12, 'backoffice'),
('jobs', 'Bolsa de Empleo', 'Gestión de ofertas laborales y empleabilidad', 'Briefcase', '#22c55e', 13, 'backoffice'),
('certificates', 'Certificados Académicos', 'Gestión de certificados académicos', 'FileCheck', '#0891b2', 14, 'backoffice'),
('documents', 'Carpeta Digital', 'Gestión de documentos y carpeta digital estudiantil', 'FolderOpen', '#7c3aed', 15, 'backoffice'),
('reports', 'Reportes', 'Generación y gestión de reportes del sistema', 'FileSpreadsheet', '#64748b', 16, 'backoffice'),
('audit', 'Auditoría', 'Logs de auditoría y seguridad del sistema', 'Eye', '#dc2626', 17, 'backoffice'),
('roles', 'Roles y Permisos', 'Gestión de roles, permisos y control de acceso', 'Lock', '#7c2d12', 18, 'backoffice'),
('admin', 'Administración', 'Configuración y administración del sistema', 'Settings', '#171717', 19, 'backoffice'),
-- PORTAL TRANSACCIONAL (12 módulos)
('portal_profile', 'Perfil y Cuenta', 'Gestión del perfil personal y configuración de cuenta', 'User', '#3b82f6', 20, 'portal'),
('portal_posts', 'Publicaciones y Feed', 'Publicaciones, comentarios y feed de contenido', 'MessageSquare', '#8b5cf6', 21, 'portal'),
('portal_groups', 'Grupos y Comunidades', 'Gestión de grupos de interés y comunidades', 'Users2', '#10b981', 22, 'portal'),
('portal_events', 'Eventos', 'Gestión de eventos académicos y sociales', 'CalendarDays', '#f59e0b', 23, 'portal'),
('portal_news', 'Noticias y Anuncios', 'Noticias institucionales y anuncios oficiales', 'Newspaper', '#ef4444', 24, 'portal'),
('portal_jobs', 'Bolsa de Empleo Portal', 'Ofertas laborales y postulaciones', 'Briefcase', '#22c55e', 25, 'portal'),
('portal_messages', 'Mensajería', 'Mensajes privados y conversaciones', 'Mail', '#06b6d4', 26, 'portal'),
('portal_notifications', 'Notificaciones', 'Centro de notificaciones y alertas', 'Bell', '#a855f7', 27, 'portal'),
('portal_search', 'Búsqueda y Descubrimiento', 'Búsqueda de usuarios, contenido y recursos', 'Search', '#64748b', 28, 'portal'),
('portal_connections', 'Conexiones y Red', 'Gestión de conexiones y red de contactos', 'Link', '#ec4899', 29, 'portal'),
('portal_academic', 'Académico Portal', 'Información académica del estudiante', 'BookOpen', '#0ea5e9', 30, 'portal'),
('portal_moderation', 'Moderación Portal', 'Moderación de contenido y usuarios del portal', 'ShieldCheck', '#dc2626', 31, 'portal')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order,
  category = EXCLUDED.category,
  updated_at = NOW();

-- ============================================
-- PERMISOS (270+ permisos del sistema)
-- ============================================
INSERT INTO auth.permission (code, name, description, id_module)
SELECT p.code, p.name, p.description, m.id_module
FROM (VALUES
-- ==========================================================================
-- 0. ACCESO A SISTEMAS (3 permisos)
-- ==========================================================================
('system.access_backoffice', 'Acceso al Backoffice', 'Permite ingresar al sistema administrativo ESAP (gestión interna)', 'system_access'),
('system.access_portal', 'Acceso al Portal Transaccional', 'Permite ingresar a la red social universitaria ESAP', 'system_access'),
('system.access_both', 'Acceso a Ambos Sistemas', 'Acceso completo tanto a Backoffice como Portal Transaccional', 'system_access'),

-- ==========================================================================
-- 1. USUARIOS Y PERSONAS (12 permisos)
-- ==========================================================================
('users.view', 'Ver Usuarios', 'Consultar lista de usuarios del sistema', 'users'),
('users.create', 'Crear Usuarios', 'Registrar nuevos usuarios en el sistema', 'users'),
('users.edit', 'Editar Usuarios', 'Modificar datos de usuarios existentes', 'users'),
('users.delete', 'Eliminar Usuarios', 'Dar de baja usuarios del sistema', 'users'),
('users.export', 'Exportar Usuarios', 'Descargar datos de usuarios en Excel/CSV', 'users'),
('users.assign_roles', 'Asignar Roles', 'Gestionar roles de usuarios (modelo Usuario Persona)', 'users'),
('users.assign_territorial', 'Asignar Territorial', 'Vincular usuario a dirección territorial', 'users'),
('users.assign_sede', 'Asignar Sede', 'Vincular usuario a sede específica', 'users'),
('users.manage_persona', 'Gestionar Persona', 'Administrar modelo Usuario Persona (múltiples roles)', 'users'),
('users.view_enrollment', 'Ver Vinculaciones', 'Consultar vinculaciones académicas', 'users'),
('users.activate_deactivate', 'Activar/Desactivar', 'Cambiar estado de usuarios', 'users'),
('users.import', 'Importar Usuarios', 'Carga masiva de usuarios', 'users'),

-- ==========================================================================
-- 2. ESTRUCTURA ORGANIZACIONAL (10 permisos)
-- ==========================================================================
('org.view_territorial', 'Ver Territoriales', 'Consultar 17 direcciones territoriales de Colombia', 'organization'),
('org.view_sedes', 'Ver Sedes', 'Consultar 71+ sedes y puntos de atención', 'organization'),
('org.create_sede', 'Crear Sede', 'Registrar nuevas sedes en el sistema', 'organization'),
('org.edit_sede', 'Editar Sede', 'Modificar información de sedes existentes', 'organization'),
('org.delete_sede', 'Eliminar Sede', 'Dar de baja sedes del sistema', 'organization'),
('org.assign_users', 'Asignar Usuarios a Sede', 'Vincular personal a sedes específicas', 'organization'),
('org.view_hierarchy', 'Ver Jerarquía', 'Visualizar estructura Nacional > Territorial > Sede', 'organization'),
('org.export_structure', 'Exportar Estructura', 'Descargar organigrama completo', 'organization'),
('org.manage_territorial', 'Gestionar Territoriales', 'Administrar direcciones territoriales', 'organization'),
('org.view_map', 'Ver Mapa', 'Visualizar sedes en mapa geográfico de Colombia', 'organization'),

-- ==========================================================================
-- 3. PROGRAMAS ACADÉMICOS (10 permisos)
-- ==========================================================================
('programs.view', 'Ver Programas', 'Consultar programas académicos', 'programs'),
('programs.create', 'Crear Programa', 'Registrar nuevo programa académico', 'programs'),
('programs.edit', 'Editar Programa', 'Modificar programa existente', 'programs'),
('programs.delete', 'Eliminar Programa', 'Dar de baja programa académico', 'programs'),
('programs.view_students', 'Ver Estudiantes', 'Ver estudiantes matriculados por programa', 'programs'),
('programs.assign_sede', 'Asignar Sede', 'Vincular programa a sede específica', 'programs'),
('programs.view_curriculum', 'Ver Pensum', 'Consultar plan de estudios', 'programs'),
('programs.edit_curriculum', 'Editar Pensum', 'Modificar plan de estudios', 'programs'),
('programs.export', 'Exportar Programas', 'Descargar datos de programas', 'programs'),
('programs.view_stats', 'Ver Estadísticas', 'Consultar métricas por programa', 'programs'),

-- ==========================================================================
-- 4. ESTUDIANTES (8 permisos)
-- ==========================================================================
('students.view', 'Ver Estudiantes', 'Consultar información estudiantil', 'students'),
('students.enroll', 'Matricular', 'Gestionar matrículas de estudiantes', 'students'),
('students.grades', 'Calificaciones', 'Gestionar calificaciones y notas', 'students'),
('students.attendance', 'Asistencia', 'Registrar y consultar asistencia', 'students'),
('students.export', 'Exportar Estudiantes', 'Descargar datos de estudiantes', 'students'),
('students.academic_programs', 'Ver Programas', 'Consultar programas académicos vinculados', 'students'),
('students.financial_status', 'Estado Financiero', 'Ver estado de pagos y cartera', 'students'),
('students.disciplinary', 'Registro Disciplinario', 'Ver y crear anotaciones disciplinarias', 'students'),

-- ==========================================================================
-- 5. GRADUADOS (7 permisos)
-- ==========================================================================
('graduates.view', 'Ver Graduados', 'Consultar base de datos de graduados', 'graduates'),
('graduates.manage', 'Gestionar Graduados', 'Administrar registros de graduados', 'graduates'),
('graduates.verify', 'Verificar Títulos', 'Generar certificados de verificación de títulos', 'graduates'),
('graduates.export', 'Exportar Graduados', 'Descargar datos de graduados', 'graduates'),
('graduates.certificates', 'Certificados de Título', 'Emitir certificados de graduación', 'graduates'),
('graduates.view_stats', 'Ver Estadísticas', 'Consultar métricas de graduados', 'graduates'),
('graduates.verify_qr', 'Verificar con QR', 'Validar títulos mediante código QR', 'graduates'),

-- ==========================================================================
-- 6. GESTIÓN PROFESORAL (12 permisos)
-- ==========================================================================
('professors.view', 'Ver Profesores', 'Consultar información de docentes', 'professors'),
('professors.create', 'Crear Profesor', 'Registrar nuevos docentes en el sistema', 'professors'),
('professors.edit', 'Editar Profesor', 'Modificar información de docentes', 'professors'),
('professors.delete', 'Eliminar Profesor', 'Dar de baja docentes', 'professors'),
('professors.assign_load', 'Asignar Carga Académica', 'Gestionar horas y materias de docentes', 'professors'),
('professors.view_schedule', 'Ver Horarios', 'Consultar horarios de profesores', 'professors'),
('professors.create_schedule', 'Crear Horarios', 'Generar horarios académicos', 'professors'),
('professors.view_evaluation', 'Ver Evaluaciones', 'Consultar evaluaciones docentes', 'professors'),
('professors.manage_contracts', 'Gestionar Contratos', 'Administrar contratos laborales', 'professors'),
('professors.export', 'Exportar Profesores', 'Descargar datos de docentes', 'professors'),
('professors.view_performance', 'Ver Desempeño', 'Consultar métricas de desempeño', 'professors'),
('professors.assign_sede', 'Asignar Sede', 'Vincular docente a sede específica', 'professors'),

-- ==========================================================================
-- 7. CALENDARIO ACADÉMICO (8 permisos)
-- ==========================================================================
('calendar.view', 'Ver Calendario', 'Consultar calendario académico ESAP 2026', 'calendar'),
('calendar.edit', 'Editar Calendario', 'Modificar eventos del calendario académico', 'calendar'),
('calendar.create_events', 'Crear Eventos', 'Agregar nuevos eventos académicos', 'calendar'),
('calendar.delete_events', 'Eliminar Eventos', 'Quitar eventos del calendario', 'calendar'),
('calendar.manage_periods', 'Gestionar Periodos', 'Administrar periodos 2026-1, 2026-2, 2026-3', 'calendar'),
('calendar.export', 'Exportar Calendario', 'Descargar calendario en diferentes formatos', 'calendar'),
('calendar.notifications', 'Gestionar Notificaciones', 'Configurar alertas y recordatorios', 'calendar'),
('calendar.view_by_sede', 'Ver por Sede', 'Filtrar eventos académicos por sede', 'calendar'),

-- ==========================================================================
-- 8. CERTIFICADOS LABORALES (10 permisos)
-- ==========================================================================
('cert_labor.view', 'Ver Solicitudes', 'Consultar solicitudes de certificados laborales', 'certificates_labor'),
('cert_labor.create', 'Crear Solicitud', 'Generar nueva solicitud de certificado', 'certificates_labor'),
('cert_labor.generate', 'Generar Certificado', 'Emitir certificado laboral firmado', 'certificates_labor'),
('cert_labor.approve', 'Aprobar Solicitud', 'Aprobar o rechazar solicitudes', 'certificates_labor'),
('cert_labor.verify', 'Verificar Certificado', 'Validar autenticidad mediante código QR', 'certificates_labor'),
('cert_labor.export', 'Exportar Certificados', 'Descargar registros de certificados', 'certificates_labor'),
('cert_labor.manage_templates', 'Gestionar Plantillas', 'Administrar plantillas de certificados', 'certificates_labor'),
('cert_labor.view_stats', 'Ver Estadísticas', 'Consultar métricas de certificados emitidos', 'certificates_labor'),
('cert_labor.send_notification', 'Enviar Notificación', 'Notificar al solicitante', 'certificates_labor'),
('cert_labor.download_pdf', 'Descargar PDF', 'Descargar certificado en PDF', 'certificates_labor'),

-- ==========================================================================
-- 9. ASPIRANTES (9 permisos)
-- ==========================================================================
('aspirants.view', 'Ver Aspirantes', 'Consultar lista de aspirantes', 'aspirants'),
('aspirants.create', 'Crear Aspirante', 'Registrar nuevo aspirante', 'aspirants'),
('aspirants.edit', 'Editar Aspirante', 'Modificar datos de aspirante', 'aspirants'),
('aspirants.delete', 'Eliminar Aspirante', 'Dar de baja aspirante', 'aspirants'),
('aspirants.approve', 'Aprobar Aspirante', 'Aprobar ingreso de aspirante', 'aspirants'),
('aspirants.reject', 'Rechazar Aspirante', 'Rechazar solicitud de ingreso', 'aspirants'),
('aspirants.export', 'Exportar Aspirantes', 'Descargar datos de aspirantes', 'aspirants'),
('aspirants.view_documents', 'Ver Documentos', 'Consultar carpeta digital de aspirante', 'aspirants'),
('aspirants.convert_to_student', 'Convertir a Estudiante', 'Matricular aspirante como estudiante', 'aspirants'),

-- ==========================================================================
-- 10. CONTROL INTERNO (15 permisos)
-- ==========================================================================
('control.view_audits', 'Ver Auditorías', 'Consultar auditorías registradas', 'control'),
('control.create_audit', 'Crear Auditoría', 'Registrar nueva auditoría', 'control'),
('control.edit_audit', 'Editar Auditoría', 'Modificar auditoría existente', 'control'),
('control.view_findings', 'Ver Hallazgos', 'Consultar hallazgos de auditoría', 'control'),
('control.create_finding', 'Crear Hallazgo', 'Registrar nuevo hallazgo', 'control'),
('control.assign_finding', 'Asignar Hallazgo', 'Asignar responsable de hallazgo', 'control'),
('control.close_finding', 'Cerrar Hallazgo', 'Cerrar hallazgo corregido', 'control'),
('control.view_action_plans', 'Ver Planes de Acción', 'Consultar planes de mejora', 'control'),
('control.create_action_plan', 'Crear Plan de Acción', 'Generar nuevo plan de mejora', 'control'),
('control.export', 'Exportar Datos', 'Descargar reportes de control', 'control'),
('control.view_dashboard', 'Ver Dashboard', 'Consultar métricas de control interno', 'control'),
('control.request_extension', 'Solicitar Ampliación de Plazo', 'Solicitar ampliación de plazo de auditoría en curso', 'control'),
('control.approve_extension', 'Aprobar Ampliación de Plazo', 'Autorizar ampliación de plazo de auditoría (solo Jefe OCI o Admin)', 'control'),
('control.view_extensions', 'Ver Solicitudes de Ampliación', 'Consultar solicitudes de ampliación de plazo', 'control'),
('control.view_extension_history', 'Ver Historial de Ampliaciones', 'Consultar historial completo de ampliaciones de plazo', 'control'),

-- ==========================================================================
-- 11. DASHBOARD EJECUTIVO (25 permisos)
-- ==========================================================================
('dashboard.view', 'Ver Dashboard', 'Acceso al dashboard ejecutivo general', 'dashboard'),
('dashboard.view_kpis', 'Ver KPIs', 'Consultar indicadores clave de rendimiento', 'dashboard'),
('dashboard.export', 'Exportar Dashboard', 'Descargar reportes ejecutivos en Excel/PDF', 'dashboard'),
('dashboard.users_total', 'Total Usuarios', 'Ver cantidad total de usuarios del sistema', 'dashboard'),
('dashboard.users_active', 'Usuarios Activos', 'Ver usuarios activos en el sistema', 'dashboard'),
('dashboard.users_growth', 'Crecimiento Usuarios', 'Ver tendencia de crecimiento de usuarios', 'dashboard'),
('dashboard.users_retention', 'Retención Usuarios', 'Ver tasa de retención de usuarios', 'dashboard'),
('dashboard.users_by_role', 'Usuarios por Rol', 'Ver distribución de usuarios por roles', 'dashboard'),
('dashboard.users_by_location', 'Usuarios por Ubicación', 'Ver distribución de usuarios por ciudad/región', 'dashboard'),
('dashboard.users_by_device', 'Usuarios por Dispositivo', 'Ver dispositivos utilizados por usuarios', 'dashboard'),
('dashboard.view_by_sede', 'Métricas por Sede', 'Filtrar dashboard por sede específica', 'dashboard'),
('dashboard.view_by_territorial', 'Métricas por Territorial', 'Filtrar dashboard por dirección territorial', 'dashboard'),
('dashboard.view_by_nacional', 'Métricas Nacionales', 'Ver consolidado nacional de todas las territoriales', 'dashboard'),
('dashboard.academic_programs', 'Programas Académicos', 'Ver métricas de programas académicos', 'dashboard'),
('dashboard.students_metrics', 'Métricas Estudiantes', 'Ver estadísticas de estudiantes activos', 'dashboard'),
('dashboard.professors_metrics', 'Métricas Profesores', 'Ver estadísticas de docentes', 'dashboard'),
('dashboard.enrollment_metrics', 'Métricas Matrículas', 'Ver datos de proceso de matrículas', 'dashboard'),
('dashboard.system_health', 'Salud del Sistema', 'Ver uptime, performance y estabilidad', 'dashboard'),
('dashboard.api_metrics', 'Métricas API', 'Ver llamadas API, latencia y errores', 'dashboard'),
('dashboard.security_metrics', 'Métricas Seguridad', 'Ver alertas de seguridad y cumplimiento', 'dashboard'),
('dashboard.certificates_labor', 'Certificados Laborales', 'Ver métricas de certificados laborales emitidos', 'dashboard'),
('dashboard.certificates_academic', 'Certificados Académicos', 'Ver métricas de certificados académicos', 'dashboard'),
('dashboard.certificates_graduates', 'Certificados Graduados', 'Ver verificación de títulos y grados', 'dashboard'),
('dashboard.real_time', 'Datos Tiempo Real', 'Acceso a métricas en tiempo real (actualización automática)', 'dashboard'),
('dashboard.custom_reports', 'Reportes Personalizados', 'Crear y guardar reportes ejecutivos personalizados', 'dashboard'),

-- ==========================================================================
-- 12. COMUNIDAD ESAP (9 permisos)
-- ==========================================================================
('community.view', 'Ver Comunidad', 'Acceso a la red social universitaria', 'community'),
('community.post', 'Crear Publicaciones', 'Publicar contenido en la comunidad', 'community'),
('community.moderate', 'Moderar Contenido', 'Moderar y eliminar publicaciones', 'community'),
('community.events', 'Gestionar Eventos', 'Crear y administrar eventos comunitarios', 'community'),
('community.announcements', 'Anuncios Oficiales', 'Publicar anuncios institucionales', 'community'),
('community.groups', 'Gestionar Grupos', 'Crear y administrar grupos de interés', 'community'),
('community.analytics', 'Ver Analíticas', 'Consultar métricas de engagement', 'community'),
('community.delete', 'Eliminar Contenido', 'Eliminar publicaciones y comentarios', 'community'),
('community.reports', 'Ver Reportes', 'Consultar reportes de usuarios', 'community'),

-- ==========================================================================
-- 13. BOLSA DE EMPLEO (7 permisos)
-- ==========================================================================
('jobs.view', 'Ver Ofertas', 'Consultar ofertas laborales publicadas', 'jobs'),
('jobs.create', 'Publicar Ofertas', 'Crear nuevas ofertas de empleo', 'jobs'),
('jobs.edit', 'Editar Ofertas', 'Modificar ofertas existentes', 'jobs'),
('jobs.delete', 'Eliminar Ofertas', 'Dar de baja ofertas laborales', 'jobs'),
('jobs.manage', 'Gestionar Ofertas', 'Administrar bolsa de trabajo completa', 'jobs'),
('jobs.applications', 'Ver Aplicaciones', 'Revisar postulaciones de candidatos', 'jobs'),
('jobs.analytics', 'Analíticas de Empleo', 'Ver estadísticas de empleabilidad', 'jobs'),

-- ==========================================================================
-- 14. CERTIFICADOS ACADÉMICOS (6 permisos)
-- ==========================================================================
('certificates.view', 'Ver Solicitudes', 'Consultar solicitudes de certificados', 'certificates'),
('certificates.generate', 'Generar Certificados', 'Emitir certificados académicos', 'certificates'),
('certificates.approve', 'Aprobar Solicitudes', 'Aprobar/rechazar solicitudes', 'certificates'),
('certificates.verify', 'Verificar Certificados', 'Validar autenticidad de certificados', 'certificates'),
('certificates.export', 'Exportar Certificados', 'Descargar registros', 'certificates'),
('certificates.manage_templates', 'Gestionar Plantillas', 'Administrar plantillas de certificados', 'certificates'),

-- ==========================================================================
-- 15. CARPETA DIGITAL (5 permisos)
-- ==========================================================================
('documents.view', 'Ver Documentos', 'Consultar documentos de estudiantes', 'documents'),
('documents.upload', 'Cargar Documentos', 'Subir archivos a carpeta digital', 'documents'),
('documents.manage', 'Gestionar Documentos', 'Administrar carpeta digital completa', 'documents'),
('documents.validate', 'Validar Documentos', 'Aprobar/rechazar documentos cargados', 'documents'),
('documents.download', 'Descargar Documentos', 'Descargar archivos de carpeta digital', 'documents'),

-- ==========================================================================
-- 16. REPORTES (7 permisos)
-- ==========================================================================
('reports.view', 'Ver Reportes', 'Consultar reportes del sistema', 'reports'),
('reports.create', 'Crear Reportes', 'Generar nuevos reportes', 'reports'),
('reports.export', 'Exportar Reportes', 'Descargar reportes en Excel/PDF', 'reports'),
('reports.schedule', 'Programar Reportes', 'Automatizar generación de reportes', 'reports'),
('reports.analytics', 'Analíticas Avanzadas', 'Acceso a herramientas de análisis', 'reports'),
('reports.custom', 'Reportes Personalizados', 'Crear reportes con filtros personalizados', 'reports'),
('reports.share', 'Compartir Reportes', 'Compartir reportes con otros usuarios', 'reports'),

-- ==========================================================================
-- 17. AUDITORÍA (7 permisos)
-- ==========================================================================
('audit.view', 'Ver Logs', 'Consultar logs de auditoría del sistema', 'audit'),
('audit.export', 'Exportar Logs', 'Descargar registros de auditoría', 'audit'),
('audit.analyze', 'Analizar Actividad', 'Análisis de seguridad y comportamiento', 'audit'),
('audit.security', 'Gestión de Seguridad', 'Administrar políticas de seguridad', 'audit'),
('audit.compliance', 'Cumplimiento Normativo', 'Verificar cumplimiento de normativas', 'audit'),
('audit.alerts', 'Alertas de Seguridad', 'Configurar alertas de eventos críticos', 'audit'),
('audit.user_activity', 'Actividad de Usuarios', 'Rastrear actividad de usuarios específicos', 'audit'),

-- ==========================================================================
-- 18. ROLES Y PERMISOS (8 permisos)
-- ==========================================================================
('roles.view', 'Ver Roles', 'Consultar roles del sistema', 'roles'),
('roles.create', 'Crear Roles', 'Crear nuevos roles personalizados', 'roles'),
('roles.edit', 'Editar Roles', 'Modificar roles existentes', 'roles'),
('roles.delete', 'Eliminar Roles', 'Eliminar roles del sistema', 'roles'),
('roles.assign_permissions', 'Asignar Permisos', 'Configurar permisos de roles', 'roles'),
('roles.manage_access', 'Gestionar Accesos', 'Administrar control de acceso', 'roles'),
('roles.generate_qr', 'Generar QR de Roles', 'Generar códigos QR para asignación de roles', 'roles'),
('roles.audit', 'Auditar Roles', 'Ver historial de cambios en roles', 'roles'),

-- ==========================================================================
-- 19. ADMINISTRACIÓN (8 permisos)
-- ==========================================================================
('admin.settings', 'Configuración General', 'Ajustes generales del sistema', 'admin'),
('admin.backup', 'Respaldos', 'Gestionar backups del sistema', 'admin'),
('admin.maintenance', 'Mantenimiento', 'Modo de mantenimiento y actualizaciones', 'admin'),
('admin.integrations', 'Integraciones', 'Configurar integraciones externas', 'admin'),
('admin.notifications', 'Notificaciones Sistema', 'Gestionar notificaciones globales', 'admin'),
('admin.database', 'Gestión de Base de Datos', 'Administración avanzada de BD', 'admin'),
('admin.logs', 'Logs del Sistema', 'Consultar logs técnicos del sistema', 'admin'),
('admin.performance', 'Monitoreo de Rendimiento', 'Monitorear performance del sistema', 'admin'),

-- ==========================================================================
-- PORTAL TRANSACCIONAL - PERMISOS DE USUARIOS FINALES
-- ==========================================================================

-- ==========================================================================
-- 20. PERFIL Y CUENTA - PORTAL (12 permisos)
-- ==========================================================================
('portal.profile.view', 'Ver Perfil', 'Visualizar perfil propio y de otros usuarios', 'portal_profile'),
('portal.profile.edit', 'Editar Perfil', 'Modificar información personal del perfil', 'portal_profile'),
('portal.profile.upload_photo', 'Subir Foto de Perfil', 'Cambiar foto de perfil', 'portal_profile'),
('portal.profile.privacy', 'Configurar Privacidad', 'Ajustar configuración de privacidad del perfil', 'portal_profile'),
('portal.profile.change_password', 'Cambiar Contraseña', 'Modificar contraseña de acceso', 'portal_profile'),
('portal.profile.enable_2fa', 'Activar 2FA', 'Habilitar autenticación de dos factores', 'portal_profile'),
('portal.profile.view_activity', 'Ver Historial de Actividad', 'Consultar historial de acciones', 'portal_profile'),
('portal.profile.export_data', 'Exportar Datos Personales', 'Descargar información personal (GDPR)', 'portal_profile'),
('portal.profile.delete_account', 'Eliminar Cuenta', 'Solicitar eliminación permanente de cuenta', 'portal_profile'),
('portal.profile.verify_identity', 'Verificar Identidad', 'Proceso de verificación de identidad', 'portal_profile'),
('portal.profile.view_stats', 'Ver Estadísticas', 'Ver estadísticas y métricas de perfil', 'portal_profile'),
('portal.profile.customize_theme', 'Personalizar Tema', 'Cambiar apariencia y tema del portal', 'portal_profile'),

-- ==========================================================================
-- 21. PUBLICACIONES Y FEED - PORTAL (15 permisos)
-- ==========================================================================
('portal.posts.view_feed', 'Ver Feed', 'Visualizar feed de publicaciones de la comunidad', 'portal_posts'),
('portal.posts.create', 'Crear Publicación', 'Publicar contenido en el feed', 'portal_posts'),
('portal.posts.edit_own', 'Editar Publicaciones Propias', 'Modificar publicaciones creadas por uno mismo', 'portal_posts'),
('portal.posts.delete_own', 'Eliminar Publicaciones Propias', 'Borrar publicaciones creadas por uno mismo', 'portal_posts'),
('portal.posts.like', 'Dar Like', 'Reaccionar con me gusta a publicaciones', 'portal_posts'),
('portal.posts.unlike', 'Quitar Like', 'Quitar me gusta de publicaciones', 'portal_posts'),
('portal.posts.comment', 'Comentar', 'Escribir comentarios en publicaciones', 'portal_posts'),
('portal.posts.edit_comment', 'Editar Comentarios', 'Modificar comentarios propios', 'portal_posts'),
('portal.posts.delete_comment', 'Eliminar Comentarios', 'Borrar comentarios propios', 'portal_posts'),
('portal.posts.share', 'Compartir Publicaciones', 'Compartir publicaciones en el feed', 'portal_posts'),
('portal.posts.save', 'Guardar Publicaciones', 'Guardar publicaciones en favoritos', 'portal_posts'),
('portal.posts.unsave', 'Quitar de Guardadas', 'Remover publicaciones de favoritos', 'portal_posts'),
('portal.posts.report', 'Reportar Contenido', 'Reportar contenido inapropiado', 'portal_posts'),
('portal.posts.view_saved', 'Ver Publicaciones Guardadas', 'Acceder a publicaciones guardadas', 'portal_posts'),
('portal.posts.upload_media', 'Subir Multimedia', 'Adjuntar imágenes y videos a publicaciones', 'portal_posts'),

-- ==========================================================================
-- 22. GRUPOS Y COMUNIDADES - PORTAL (10 permisos)
-- ==========================================================================
('portal.groups.view', 'Ver Grupos', 'Visualizar grupos y comunidades disponibles', 'portal_groups'),
('portal.groups.create', 'Crear Grupo', 'Crear nuevos grupos de interés', 'portal_groups'),
('portal.groups.join', 'Unirse a Grupo', 'Unirse a grupos públicos o por invitación', 'portal_groups'),
('portal.groups.leave', 'Salir de Grupo', 'Abandonar grupos', 'portal_groups'),
('portal.groups.admin_own', 'Administrar Grupos Propios', 'Gestionar grupos creados por uno mismo', 'portal_groups'),
('portal.groups.invite', 'Invitar Miembros', 'Invitar usuarios a grupos', 'portal_groups'),
('portal.groups.remove_member', 'Remover Miembros', 'Expulsar miembros del grupo (administradores)', 'portal_groups'),
('portal.groups.edit', 'Editar Grupo', 'Modificar información del grupo', 'portal_groups'),
('portal.groups.delete', 'Eliminar Grupo', 'Borrar grupos propios', 'portal_groups'),
('portal.groups.post', 'Publicar en Grupo', 'Crear publicaciones dentro del grupo', 'portal_groups'),

-- ==========================================================================
-- 23. EVENTOS - PORTAL (9 permisos)
-- ==========================================================================
('portal.events.view', 'Ver Eventos', 'Visualizar eventos disponibles', 'portal_events'),
('portal.events.create', 'Crear Evento', 'Crear nuevos eventos (roles autorizados)', 'portal_events'),
('portal.events.edit_own', 'Editar Eventos Propios', 'Modificar eventos creados', 'portal_events'),
('portal.events.delete_own', 'Eliminar Eventos Propios', 'Borrar eventos creados', 'portal_events'),
('portal.events.register', 'Registrarse a Evento', 'Inscribirse en eventos', 'portal_events'),
('portal.events.cancel_registration', 'Cancelar Registro', 'Cancelar inscripción en evento', 'portal_events'),
('portal.events.view_my_events', 'Ver Mis Eventos', 'Ver eventos a los que estoy inscrito', 'portal_events'),
('portal.events.comment', 'Comentar en Eventos', 'Escribir comentarios en eventos', 'portal_events'),
('portal.events.rate', 'Calificar Eventos', 'Calificar eventos asistidos', 'portal_events'),

-- ==========================================================================
-- 24. NOTICIAS Y ANUNCIOS - PORTAL (6 permisos)
-- ==========================================================================
('portal.news.view', 'Ver Noticias', 'Leer noticias y anuncios institucionales', 'portal_news'),
('portal.news.comment', 'Comentar Noticias', 'Escribir comentarios en noticias', 'portal_news'),
('portal.news.like', 'Dar Like a Noticias', 'Reaccionar a noticias institucionales', 'portal_news'),
('portal.news.share', 'Compartir Noticias', 'Compartir noticias en el feed', 'portal_news'),
('portal.news.save', 'Guardar Noticias', 'Guardar noticias en favoritos', 'portal_news'),
('portal.news.view_saved', 'Ver Noticias Guardadas', 'Acceder a noticias guardadas', 'portal_news'),

-- ==========================================================================
-- 25. BOLSA DE EMPLEO - PORTAL (8 permisos)
-- ==========================================================================
('portal.jobs.view', 'Ver Ofertas Laborales', 'Visualizar ofertas de empleo disponibles', 'portal_jobs'),
('portal.jobs.apply', 'Aplicar a Empleos', 'Postularse a ofertas laborales', 'portal_jobs'),
('portal.jobs.save', 'Guardar Ofertas', 'Marcar ofertas como favoritas', 'portal_jobs'),
('portal.jobs.view_applications', 'Ver Mis Aplicaciones', 'Ver postulaciones enviadas', 'portal_jobs'),
('portal.jobs.withdraw_application', 'Retirar Aplicación', 'Cancelar postulación enviada', 'portal_jobs'),
('portal.jobs.upload_cv', 'Subir Hoja de Vida', 'Cargar CV al perfil', 'portal_jobs'),
('portal.jobs.update_cv', 'Actualizar CV', 'Modificar hoja de vida', 'portal_jobs'),
('portal.jobs.create_offer', 'Publicar Oferta Laboral', 'Crear ofertas de empleo (graduados/empresas)', 'portal_jobs'),

-- ==========================================================================
-- 26. MENSAJERÍA - PORTAL (10 permisos)
-- ==========================================================================
('portal.messages.view', 'Ver Mensajes', 'Acceder a bandeja de mensajes privados', 'portal_messages'),
('portal.messages.send', 'Enviar Mensajes', 'Enviar mensajes privados a usuarios', 'portal_messages'),
('portal.messages.reply', 'Responder Mensajes', 'Responder mensajes recibidos', 'portal_messages'),
('portal.messages.delete', 'Eliminar Mensajes', 'Borrar mensajes de conversaciones', 'portal_messages'),
('portal.messages.view_conversations', 'Ver Conversaciones', 'Ver historial de conversaciones', 'portal_messages'),
('portal.messages.create_group_chat', 'Crear Chat Grupal', 'Iniciar conversaciones grupales', 'portal_messages'),
('portal.messages.leave_group_chat', 'Salir de Chat Grupal', 'Abandonar chats grupales', 'portal_messages'),
('portal.messages.block_user', 'Bloquear Usuario', 'Bloquear usuarios en mensajería', 'portal_messages'),
('portal.messages.unblock_user', 'Desbloquear Usuario', 'Desbloquear usuarios bloqueados', 'portal_messages'),
('portal.messages.attach_files', 'Adjuntar Archivos', 'Enviar archivos en mensajes', 'portal_messages'),

-- ==========================================================================
-- 27. NOTIFICACIONES - PORTAL (7 permisos)
-- ==========================================================================
('portal.notifications.view', 'Ver Notificaciones', 'Acceder al centro de notificaciones', 'portal_notifications'),
('portal.notifications.mark_read', 'Marcar como Leída', 'Marcar notificaciones individuales como leídas', 'portal_notifications'),
('portal.notifications.mark_all_read', 'Marcar Todas Leídas', 'Marcar todas las notificaciones como leídas', 'portal_notifications'),
('portal.notifications.delete', 'Eliminar Notificaciones', 'Borrar notificaciones', 'portal_notifications'),
('portal.notifications.configure', 'Configurar Notificaciones', 'Ajustar preferencias de notificaciones', 'portal_notifications'),
('portal.notifications.email_alerts', 'Alertas por Email', 'Recibir notificaciones por correo electrónico', 'portal_notifications'),
('portal.notifications.push_alerts', 'Alertas Push', 'Recibir notificaciones push en dispositivos', 'portal_notifications'),

-- ==========================================================================
-- 28. BÚSQUEDA Y DESCUBRIMIENTO - PORTAL (6 permisos)
-- ==========================================================================
('portal.search.users', 'Buscar Usuarios', 'Buscar y encontrar otros usuarios', 'portal_search'),
('portal.search.posts', 'Buscar Publicaciones', 'Buscar contenido en el feed', 'portal_search'),
('portal.search.events', 'Buscar Eventos', 'Buscar eventos académicos y sociales', 'portal_search'),
('portal.search.groups', 'Buscar Grupos', 'Buscar grupos y comunidades', 'portal_search'),
('portal.search.jobs', 'Buscar Empleos', 'Buscar ofertas laborales', 'portal_search'),
('portal.search.advanced_filters', 'Filtros Avanzados', 'Usar filtros avanzados de búsqueda', 'portal_search'),

-- ==========================================================================
-- 29. CONEXIONES Y RED - PORTAL (8 permisos)
-- ==========================================================================
('portal.connections.view', 'Ver Conexiones', 'Ver lista de conexiones y amigos', 'portal_connections'),
('portal.connections.send_request', 'Enviar Solicitud', 'Enviar solicitud de conexión a usuarios', 'portal_connections'),
('portal.connections.accept_request', 'Aceptar Solicitud', 'Aceptar solicitudes de conexión recibidas', 'portal_connections'),
('portal.connections.reject_request', 'Rechazar Solicitud', 'Rechazar solicitudes de conexión', 'portal_connections'),
('portal.connections.remove', 'Eliminar Conexión', 'Quitar conexión establecida', 'portal_connections'),
('portal.connections.view_suggestions', 'Ver Sugerencias', 'Ver usuarios sugeridos para conectar', 'portal_connections'),
('portal.connections.follow', 'Seguir Usuario', 'Seguir usuarios públicos', 'portal_connections'),
('portal.connections.unfollow', 'Dejar de Seguir', 'Dejar de seguir usuarios', 'portal_connections'),

-- ==========================================================================
-- 30. ACADÉMICO PORTAL (7 permisos)
-- ==========================================================================
('portal.academic.view_grades', 'Ver Calificaciones', 'Consultar calificaciones y notas', 'portal_academic'),
('portal.academic.view_schedule', 'Ver Horario', 'Ver horario de clases y actividades', 'portal_academic'),
('portal.academic.view_calendar', 'Ver Calendario Académico', 'Consultar calendario académico institucional', 'portal_academic'),
('portal.academic.view_program', 'Ver Programa Académico', 'Consultar plan de estudios y pensum', 'portal_academic'),
('portal.academic.request_certificate', 'Solicitar Certificados', 'Pedir certificados académicos', 'portal_academic'),
('portal.academic.view_documents', 'Ver Carpeta Digital', 'Acceder a documentos académicos', 'portal_academic'),
('portal.academic.upload_documents', 'Subir Documentos', 'Cargar documentos a carpeta digital', 'portal_academic'),

-- ==========================================================================
-- 31. MODERACIÓN PORTAL (8 permisos)
-- ==========================================================================
('portal.moderate.view_reports', 'Ver Reportes', 'Ver contenido reportado por usuarios', 'portal_moderation'),
('portal.moderate.delete_content', 'Eliminar Contenido', 'Borrar publicaciones de otros usuarios', 'portal_moderation'),
('portal.moderate.block_user', 'Bloquear Usuario', 'Bloquear usuarios del portal', 'portal_moderation'),
('portal.moderate.unblock_user', 'Desbloquear Usuario', 'Desbloquear usuarios bloqueados', 'portal_moderation'),
('portal.moderate.warn_user', 'Advertir Usuario', 'Enviar advertencia a usuarios', 'portal_moderation'),
('portal.moderate.close_report', 'Cerrar Reporte', 'Cerrar reportes resueltos', 'portal_moderation'),
('portal.moderate.ban_user', 'Expulsar Usuario', 'Expulsar usuarios permanentemente del portal', 'portal_moderation'),
('portal.moderate.view_analytics', 'Ver Analíticas de Moderación', 'Ver métricas y estadísticas de moderación', 'portal_moderation')
) AS p(code, name, description, module_code)
JOIN auth.module m ON m.code = p.module_code
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  id_module = EXCLUDED.id_module,
  updated_at = NOW();

-- ============================================
-- ROLES (con code + category)
-- ============================================
INSERT INTO auth.role (id, code, name, description, category, icon, color)
VALUES
  -- Sistema
  ('660e8400-e29b-41d4-a716-446655440001', 'SUPER_ADMIN',             'Super Administrador',                'Acceso total al sistema con todos los permisos administrativos', 'sistema',        'Shield', '#dc2626'),
  -- Académico
  ('660e8400-e29b-41d4-a716-446655440002', 'ESTUDIANTE',              'Estudiante',                         'Rol básico para estudiantes activos de la institución',          'academico',      'GraduationCap', '#003da5'),
  ('660e8400-e29b-41d4-a716-446655440003', 'DOCENTE',                 'Docente',                            'Acceso para profesores con permisos de gestión académica',       'academico',      'BookOpen', '#16a34a'),
  ('660e8400-e29b-41d4-a716-446655440005', 'GRADUADO',                'Graduado',                           'Ex-estudiantes graduados con acceso a servicios alumni',         'academico',      'Award', '#10b981'),
  ('660e8400-e29b-41d4-a716-446655440006', 'ASPIRANTE',               'Aspirante',                          'Personas en proceso de admisión a la institución',               'academico',      'UserCircle', '#9333ea'),
  ('660e8400-e29b-41d4-a716-446655440009', 'COORD_ACAD',              'Coordinador Académico',              'Coordinación de actividades académicas y curriculares',          'academico',      'Building2', '#0891b2'),
  ('660e8400-e29b-41d4-a716-446655440010', 'INVESTIGADOR',            'Investigador',                       'Personal dedicado a actividades de investigación',               'academico',      'Building2', '#0891b2'),
  -- Administrativo
  ('660e8400-e29b-41d4-a716-446655440008', 'JEFE_ADMISIONES',         'Jefe de Admisiones',                 'Gestión completa del proceso de admisiones y matrículas',        'administrativo', 'FileText', '#7c3aed'),
  ('660e8400-e29b-41d4-a716-446655440011', 'ADMIN',                   'Administrativo General',             'Personal administrativo general',                                'administrativo', 'Briefcase', '#f97316'),
  ('660e8400-e29b-41d4-a716-446655440012', 'SEC_ACAD',                'Secretario Académico',               'Secretaría académica y gestión administrativa académica',        'administrativo', 'Cog', '#9716f9'),
  -- Directivo
  ('660e8400-e29b-41d4-a716-446655440007', 'COORDINADOR_REGIONAL',    'Coordinador Regional',               'Gestión de operaciones en sedes regionales',                     'directivo',      'Building2', '#0891b2'),
  ('660e8400-e29b-41d4-a716-446655440013', 'DIRECTIVO',               'Directivo',                          'Personal directivo de la institución',                           'directivo',      'Briefcase', '#f97316'),
  ('660e8400-e29b-41d4-a716-446655440014', 'DIR_TERRITORIAL',         'Director Territorial',               'Dirección de territoriales y sedes regionales',                  'directivo',      'Briefcase', '#f97316'),
  ('660e8400-e29b-41d4-a716-446655440015', 'COORDINADOR_CERT_LABORAL','Coordinador Certificados Laborales', 'Gestión de certificados laborales',                              'directivo',      'Briefcase', '#f97316'),
  ('660e8400-e29b-41d4-a716-446655440016', 'JEFE_CONTROL_INTERNO',    'Jefe de Control Interno',            'Jefe de Oficina de Control Interno con autoridad para aprobar ampliaciones de plazo de auditorías', 'directivo', 'Shield', '#dc2626'),
  -- Control Interno
  ('660e8400-e29b-41d4-a716-446655440017', 'AUDITOR_LIDER',           'Auditor Líder',                      'Auditor líder responsable de ejecutar auditorías y solicitar ampliaciones de plazo', 'administrativo', 'FileCheck', '#f97316')
ON CONFLICT (code) DO NOTHING;


-- ============================================
-- USUARIOS (password: 123456)
-- hash: $2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.
-- ============================================
INSERT INTO auth."user" (id_user, username, password_hash, id_tercero)
VALUES
  ('770e8400-e29b-41d4-a716-446655440001', 'superuser@esap.edu.co',  '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 1),
  ('770e8400-e29b-41d4-a716-446655440002', 'admin@esap.edu.co',      '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 2),
  ('770e8400-e29b-41d4-a716-446655440003', 'estudiante@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 3),
  ('770e8400-e29b-41d4-a716-446655440004', 'planta@esap.edu.co',     '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 4),
  ('770e8400-e29b-41d4-a716-446655440005', 'catedra@esap.edu.co',    '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 5),
  ('770e8400-e29b-41d4-a716-446655440006', 'cerlaboral@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 6),
  ('bad814a8-909b-4ff4-94a1-ecf1d29a3495', 'maria.rodriguez@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 7),
  ('5afc9552-2818-4886-b1f1-831166d58208', 'carlos.martinez@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 8),
  ('e577a80c-6506-4572-8dbd-68a7ac022be1', 'ana.gomez@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 9),
  ('7f54c078-6aca-4c8f-8c9c-dfc32b9259a2', 'jorge.hernandez@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 10),
  ('5895d7fd-8e2e-45ee-a854-2ac9f743a5ec', 'sandra.torres@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 11),
  ('5c9cbd1d-5f86-43f2-b4a0-f628769802ed', 'diego.ramirez@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 12),
  ('57fea1ac-3b8a-4869-9f51-ddbf2670510c', 'claudia.diaz@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 13),
  ('932e8d3d-58c3-4f50-990f-b6cbeed6fcd7', 'roberto.perez@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 14),
  ('2a005f9a-6f39-4b87-9b91-67f5dd2b9c47', 'luisa.castro@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 15),
  ('5fb2e9d9-c963-4904-9b47-77a85a43b0d5', 'andres.vargas@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 16),
  ('672a86f7-10f3-4c09-95e4-d478a1a609f6', 'patricia.ruiz@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 17),
  ('88a31661-19ec-43a5-8312-62fd5d5a43f1', 'miguel.sanchez@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 18),
  ('ed905ae3-0dd9-4e28-acb1-81897416f59c', 'gloria.morales@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 19),
  ('c4cd6c30-e096-4d55-ac83-5bcda4b145f7', 'hector.mejia@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 20),
  ('1d069f45-aae1-4176-ab03-55476e950a19', 'carolina.jimenez@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 21),
  -- Usuarios de Control Interno
  ('770e8400-e29b-41d4-a716-446655440007', 'jefe.control@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 22),
  ('770e8400-e29b-41d4-a716-446655440008', 'auditor.lider@esap.edu.co', '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.', 23)
ON CONFLICT (id_user) DO NOTHING;

-- ============================================
-- SUPERUSER → ROLE SUPER_ADMIN → ALL PERMISSIONS
-- ============================================

-- Asignar TODOS los permisos al rol SUPER_ADMIN
INSERT INTO auth.role_permissions (id_rol, id_permission)
SELECT r.id, p.id_permission
FROM auth.role r
CROSS JOIN auth.permission p
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT (id_rol, id_permission) DO NOTHING;

-- Asignar rol SUPER_ADMIN al usuario superuser
INSERT INTO auth.user_roles (id_user, id_rol)
SELECT u.id_user, r.id
FROM auth."user" u
JOIN auth.role r ON r.code = 'SUPER_ADMIN'
WHERE u.username = 'superuser@esap.edu.co'
ON CONFLICT (id_user, id_rol) DO NOTHING;

-- Asignar TODOS los permisos al rol ADMIN
INSERT INTO auth.role_permissions (id_rol, id_permission)
SELECT r.id, p.id_permission
FROM auth.role r
CROSS JOIN auth.permission p
WHERE r.code = 'ADMIN'
ON CONFLICT (id_rol, id_permission) DO NOTHING;

-- ============================================
-- ASIGNACIÓN DE PERMISOS A ROLES DE CONTROL INTERNO
-- ============================================

-- Asignar permisos al rol AUDITOR_LIDER
INSERT INTO auth.role_permissions (id_rol, id_permission)
SELECT r.id, p.id_permission
FROM auth.role r
JOIN auth.permission p ON p.code IN (
  'control.view_audits',
  'control.edit_audit',
  'control.view_findings',
  'control.create_finding',
  'control.view_action_plans',
  'control.request_extension',
  'control.view_extensions',
  'control.view_extension_history',
  'control.view_dashboard',
  'system.access_backoffice'
)
WHERE r.code = 'AUDITOR_LIDER'
ON CONFLICT (id_rol, id_permission) DO NOTHING;

-- Asignar TODOS los permisos de control interno al rol JEFE_CONTROL_INTERNO
INSERT INTO auth.role_permissions (id_rol, id_permission)
SELECT r.id, p.id_permission
FROM auth.role r
JOIN auth.permission p ON p.code LIKE 'control.%'
WHERE r.code = 'JEFE_CONTROL_INTERNO'
ON CONFLICT (id_rol, id_permission) DO NOTHING;

-- Asignar también acceso al backoffice al JEFE_CONTROL_INTERNO
INSERT INTO auth.role_permissions (id_rol, id_permission)
SELECT r.id, p.id_permission
FROM auth.role r
JOIN auth.permission p ON p.code = 'system.access_backoffice'
WHERE r.code = 'JEFE_CONTROL_INTERNO'
ON CONFLICT (id_rol, id_permission) DO NOTHING;

-- Asignar roles base a los usuarios principales
INSERT INTO auth.user_roles (id_user, id_rol)
SELECT u.id_user, r.id
FROM auth."user" u
JOIN auth.role r
  ON (
       (u.username = 'admin@esap.edu.co'        AND r.code = 'ADMIN')
    OR (u.username = 'estudiante@esap.edu.co'   AND r.code = 'ESTUDIANTE')
    OR (u.username IN ('planta@esap.edu.co',
                       'catedra@esap.edu.co')   AND r.code = 'DOCENTE')
    OR (u.username = 'cerlaboral@esap.edu.co'   AND r.code = 'COORDINADOR_CERT_LABORAL')
    OR (u.username = 'jefe.control@esap.edu.co' AND r.code = 'JEFE_CONTROL_INTERNO')
    OR (u.username = 'auditor.lider@esap.edu.co' AND r.code = 'AUDITOR_LIDER')
  )
ON CONFLICT (id_user, id_rol) DO NOTHING;