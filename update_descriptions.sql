-- ═══════════════════════════════════════════════════════════════
-- Agregar descripciones profesionales a los roles OCIG
-- ═══════════════════════════════════════════════════════════════

UPDATE auth.role SET description = 'Jefe de la Oficina de Control Interno de Gestión. Lidera la planeación, ejecución y seguimiento de las auditorías internas. Responsable de aprobar los planes de auditoría, asignar equipos de trabajo y presentar informes de resultados al Comité Institucional.'
WHERE id = 'b0000000-0000-0000-0000-000000000000'; -- Jefe OCI

UPDATE auth.role SET description = 'Auditor con experiencia avanzada en el ejercicio de auditoría interna. Puede liderar auditorías de alta complejidad, supervisar equipos de auditores y participar en la formulación del Plan Anual de Auditoría. Revisa y valida los papeles de trabajo del equipo.'
WHERE id = 'b0000001-0000-0000-0000-000000000001'; -- Auditor Sénior

UPDATE auth.role SET description = 'Profesional encargado de ejecutar las auditorías asignadas conforme a los procedimientos establecidos. Elabora papeles de trabajo, recopila evidencia, documenta hallazgos y participa en la formulación de informes de auditoría.'
WHERE id = 'b0000002-0000-0000-0000-000000000002'; -- Auditor

UPDATE auth.role SET description = 'Auditor en formación que apoya la ejecución de auditorías bajo supervisión de un Auditor Sénior o Auditor. Participa en la recopilación de evidencia, elaboración de listas de chequeo y documentación de observaciones preliminares.'
WHERE id = 'b0000003-0000-0000-0000-000000000003'; -- Auditor Júnior

UPDATE auth.role SET description = 'Profesional de apoyo técnico y operativo para la Oficina de Control Interno. Brinda soporte en la gestión documental, seguimiento de planes de mejoramiento, consolidación de informes y administración de los sistemas de información de la OCI.'
WHERE id = 'b0000004-0000-0000-0000-000000000004'; -- Apoyo Técnico

-- Verificar resultado
SELECT name, description FROM auth.role 
WHERE id IN (
  'b0000000-0000-0000-0000-000000000000',
  'b0000001-0000-0000-0000-000000000001',
  'b0000002-0000-0000-0000-000000000002',
  'b0000003-0000-0000-0000-000000000003',
  'b0000004-0000-0000-0000-000000000004'
)
ORDER BY name;
