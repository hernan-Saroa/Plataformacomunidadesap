-- Check counts before delete
SELECT 'Docentes' AS tabla, count(*) AS total FROM academic_work_plan."Docente"
UNION ALL
SELECT 'PTAs', count(*) FROM academic_work_plan."PlanTrabajoAcademico"
UNION ALL
SELECT 'Evidencias', count(*) FROM academic_work_plan."PtaEvidencia"
UNION ALL
SELECT 'Historial', count(*) FROM academic_work_plan."HistorialEstadoPTA"
UNION ALL
SELECT 'Eventos', count(*) FROM academic_work_plan."PtaEvento"
UNION ALL
SELECT 'Solicitudes', count(*) FROM academic_work_plan."SolicitudPTA"
UNION ALL
SELECT 'Aprobaciones', count(*) FROM academic_work_plan."AprobacionJefatura"
UNION ALL
SELECT 'ComponentApproval', count(*) FROM academic_work_plan."PtaComponentApproval";
