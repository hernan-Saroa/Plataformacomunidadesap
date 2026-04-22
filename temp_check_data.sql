SELECT 'users' as tabla, count(*) as total FROM auth."user"
UNION ALL SELECT 'roles', count(*) FROM auth.role
UNION ALL SELECT 'personas', count(*) FROM auth.personas
UNION ALL SELECT 'planes_anual', count(*) FROM control_interno.plan_anual
UNION ALL SELECT 'auditorias', count(*) FROM control_interno.auditoria
UNION ALL SELECT 'procesos_aud', count(*) FROM control_interno.proceso_auditable
UNION ALL SELECT 'notificaciones', count(*) FROM control_interno.notificacion
UNION ALL SELECT 'plan_anual_5', count(*) FROM control_interno.plan_anual_5_roles
UNION ALL SELECT 'actividades', count(*) FROM control_interno.actividad_plan_anual_5
UNION ALL SELECT 'kanban_etapas', count(*) FROM control_interno.etapa_kanban
UNION ALL SELECT 'hallazgos', count(*) FROM control_interno.hallazgo;
