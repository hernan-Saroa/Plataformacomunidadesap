-- Migration 375: de-duplica actividades de EXTENSIÓN por id dentro de cada sección
-- en la configuración del PTA.
--
-- Contexto: en academic_work_plan."ConfiguracionSistema".valor->'ext_actividades'
-- la sección 'fortalecimiento' quedó con actividades repetidas (LAB_01..13 e
-- INV_AP_01..08 duplicadas ×2), porque al fusionar las claves/alias por defecto
-- (laboratorio_innovacion, investigacion_aplicada → fortalecimiento) se agregaron
-- dos veces. Eso generaba en el formulario del docente:
--   - "two children with the same key (LAB_12)" (React) y selección ambigua,
--   - conteos inflados de actividades (p.ej. 51 en vez de 30).
--
-- Esta migración es ADITIVA/correctiva e IDEMPOTENTE: reejecutarla no cambia nada
-- una vez limpio. Conserva la PRIMERA aparición de cada id y respeta el orden.
-- Los elementos sin id se conservan todos.

DO $$
DECLARE
  r RECORD;
  sec RECORD;
  new_ext jsonb;
  deduped jsonb;
BEGIN
  FOR r IN
    SELECT clave, valor
      FROM academic_work_plan."ConfiguracionSistema"
     WHERE valor ? 'ext_actividades'
       AND jsonb_typeof(valor->'ext_actividades') = 'object'
  LOOP
    new_ext := r.valor->'ext_actividades';

    FOR sec IN
      SELECT key, value
        FROM jsonb_each(r.valor->'ext_actividades')
       WHERE jsonb_typeof(value) = 'array'
    LOOP
      SELECT jsonb_agg(elem ORDER BY ord)
        INTO deduped
        FROM (
          SELECT elem, ord,
                 row_number() OVER (
                   PARTITION BY COALESCE(NULLIF(elem->>'id', ''), 'no-id-' || ord::text)
                   ORDER BY ord
                 ) AS rn
            FROM jsonb_array_elements(sec.value) WITH ORDINALITY AS t(elem, ord)
        ) s
       WHERE rn = 1;

      new_ext := jsonb_set(new_ext, ARRAY[sec.key], COALESCE(deduped, '[]'::jsonb));
    END LOOP;

    UPDATE academic_work_plan."ConfiguracionSistema"
       SET valor = jsonb_set(valor, '{ext_actividades}', new_ext)
     WHERE clave = r.clave;
  END LOOP;
END $$;
