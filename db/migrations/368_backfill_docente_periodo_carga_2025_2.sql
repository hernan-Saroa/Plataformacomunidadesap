-- Backfill historical Banco de Docentes rows that were created before periodoCarga
-- became mandatory in the module. These rows belong to the 2025-2 load.
UPDATE academic_work_plan."Docente" d
SET "periodoCarga" = '2025-2',
    "updatedAt" = NOW()
WHERE (d."periodoCarga" IS NULL OR BTRIM(d."periodoCarga") = '')
  AND NOT EXISTS (
    SELECT 1
    FROM academic_work_plan."Docente" existing
    WHERE existing."personaId" = d."personaId"
      AND existing."periodoCarga" = '2025-2'
  );
