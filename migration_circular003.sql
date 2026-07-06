ALTER TABLE academic_work_plan.programa ADD COLUMN categoria_horas_circular003 VARCHAR(50);
ALTER TABLE academic_work_plan.programa ADD COLUMN descripcion_categoria_circular003 VARCHAR(120);

UPDATE academic_work_plan.programa SET
  categoria_horas_circular003 = CASE
    WHEN horas_pregrado_central IS NOT NULL AND horas_pregrado_central > 0 THEN 'pregrado_sede_central'
    WHEN tipo ILIKE '%maestria%' THEN 'maestria'
    WHEN tipo ILIKE '%especializacion%' THEN 'especializacion'
    WHEN tipo ILIKE '%pregrado%' THEN 'pregrado_territorial'
    ELSE NULL
  END,
  descripcion_categoria_circular003 = CASE
    WHEN horas_pregrado_central IS NOT NULL AND horas_pregrado_central > 0 THEN 'Pregrado Sede Central (AP/EP) - Bloque Fijo'
    WHEN tipo ILIKE '%maestria%' THEN 'Maestria - 12h por credito'
    WHEN tipo ILIKE '%especializacion%' THEN 'Especializacion - 16h por credito'
    WHEN tipo ILIKE '%pregrado%' THEN 'APT / Territorial - 16h por credito'
    ELSE NULL
  END
WHERE categoria_horas_circular003 IS NULL;

SELECT codigo, categoria_horas_circular003 FROM academic_work_plan.programa LIMIT 3;
