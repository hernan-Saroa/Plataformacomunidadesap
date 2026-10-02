-- ============================================================
-- Migración 664: el equipo OCI queda con tres roles (EFDS-2197)
-- ============================================================
-- Asignar Profesional ofrecía siete roles (Jefe OCIG, Auditor Líder, Auditor,
-- Auditor Júnior, Profesional OCI, Apoyo Técnico, Aprobador PAI). Solo deben
-- existir tres: Jefe OCI, Auditor y Aprobador Plan Anual. Los profesionales ya
-- configurados pasan al rol que les corresponde:
--   Jefe OCIG                                   -> Jefe OCI
--   Auditor Líder / Júnior / Sénior,
--   Profesional OCI y Apoyo Técnico             -> Auditor
--   Aprobador PAI                               -> Aprobador Plan Anual
-- El Auditor Líder de cada auditoría se sigue eligiendo en la auditoría, entre
-- los profesionales con rol Auditor. Idempotente: solo actualiza los nombres
-- anteriores.
-- ============================================================

UPDATE control_interno.configuracion_profesionales_ocig
   SET rol_ocig = CASE
         WHEN rol_ocig = 'Jefe OCIG' THEN 'Jefe OCI'
         WHEN rol_ocig = 'Aprobador PAI' THEN 'Aprobador Plan Anual'
         ELSE 'Auditor'
       END,
       updated_at = CURRENT_TIMESTAMP
 WHERE rol_ocig IN (
         'Jefe OCIG',
         'Auditor Líder', 'Auditor Lider',
         'Auditor Sénior', 'Auditor Senior',
         'Auditor Júnior', 'Auditor Junior',
         'Profesional OCI',
         'Apoyo Técnico',
         'Aprobador PAI'
       );

-- La migración 201 agregó "Aprobador PAI" también como especialidad. Es un rol, no
-- una especialidad: deja de ofrecerse en Asignar Profesional. Los profesionales que
-- ya la tienen la conservan en su configuración.
UPDATE control_interno.especialidades_ocig
   SET activo = false
 WHERE nombre = 'Aprobador PAI'
   AND activo = true;
