-- Migración 146: Agregar fecha_hechos y fecha_caducidad a disciplinary_news
-- Ley 734 de 2002, Art. 30: la acción disciplinaria caduca 5 años desde la ocurrencia de los hechos

ALTER TABLE internal_disciplinary_control.disciplinary_news
  ADD COLUMN IF NOT EXISTS "fechaHechos" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "fechaCaducidad" TIMESTAMP NULL;

-- Calcular retroactivamente fechaCaducidad para registros existentes que tengan fechaHechos
UPDATE internal_disciplinary_control.disciplinary_news
SET "fechaCaducidad" = "fechaHechos" + INTERVAL '5 years'
WHERE "fechaHechos" IS NOT NULL AND "fechaCaducidad" IS NULL;
