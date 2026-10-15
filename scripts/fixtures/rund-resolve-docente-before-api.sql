SELECT d.id FROM rund."Docente" d
JOIN auth.personas p ON p.id_person=d."personaId"
LEFT JOIN auth."user" u ON u.id_person=p.id_person
WHERE (p.id_person::text=$1 OR u.id_user::text=$1
  OR UPPER(regexp_replace(BTRIM(p.num_identificacion::text),'\.', '', 'g'))
     = UPPER(regexp_replace(BTRIM($1::text),'\.', '', 'g')))
  AND ($2::text IS NULL OR d."periodoCarga"=$2::text)
ORDER BY CASE WHEN $2::text IS NOT NULL AND d."periodoCarga"=$2::text THEN 0 ELSE 1 END,
  d."updatedAt" DESC NULLS LAST LIMIT 1
