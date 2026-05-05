-- Elimina registros fantasma creados por el auto-aprovisionamiento de PTA
-- cuando un docente de auth no tenía mapeo en academic_work_plan."Docente".
-- El auto-aprovisionamiento usaba el id_person de auth como ID del Docente,
-- generando duplicados que violan la FK PlanTrabajoAcademico_docenteId_fkey.
--
-- Solo elimina los registros cuyo id NO coincide con ningún Docente real
-- (es decir, que no tienen identificacion en Persona).

DELETE FROM academic_work_plan."Docente" d
WHERE d.id IN (
  SELECT d2.id
  FROM academic_work_plan."Docente" d2
  JOIN academic_work_plan."Persona" p ON p.id = d2."personaId"
  WHERE (p.identificacion IS NULL OR p.identificacion = '')
    AND d2."correoInstitucional" IN (
      SELECT d3."correoInstitucional"
      FROM academic_work_plan."Docente" d3
      WHERE d3."correoInstitucional" IS NOT NULL
      GROUP BY d3."correoInstitucional"
      HAVING COUNT(*) > 1
    )
);

DELETE FROM academic_work_plan."Persona"
WHERE id IN (
  SELECT ap.id FROM academic_work_plan."Persona" ap
  WHERE (ap.identificacion IS NULL OR ap.identificacion = '')
    AND NOT EXISTS (
      SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = ap.id
    )
    AND ap."usuarioId" IN (
      SELECT au.id FROM academic_work_plan."Usuario" au
      WHERE au.password = 'N/A'
    )
);

DELETE FROM academic_work_plan."Usuario"
WHERE password = 'N/A'
  AND NOT EXISTS (
    SELECT 1 FROM academic_work_plan."Persona" p WHERE p."usuarioId" = academic_work_plan."Usuario".id
  );
