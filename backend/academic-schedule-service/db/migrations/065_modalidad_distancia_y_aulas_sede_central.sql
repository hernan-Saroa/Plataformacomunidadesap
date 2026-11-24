-- ============================================================================
-- 065 · Modalidad «a distancia» del grupo y aulas de la Sede Central.
--
-- 1) Pedido de Tomás (nov-2026): un grupo A DISTANCIA funciona igual que el
--    virtual (063): sin aula, sesiones mediadas por tecnología, horario opcional
--    que puede definir el docente asignado. Se amplía el CHECK de la modalidad.
--
-- 2) Las aulas reales (019) quedaron amarradas al CÓDIGO 'CET-0288', que es el de
--    la Sede Central en la base de desarrollo. Los códigos de CETAP los asigna cada
--    carga, así que en otra base la Sede Central puede ser otro código (en QA es
--    'CET-0001') y entonces NINGUNA aula sale válida para un grupo de la Sede
--    Central («No hay aulas válidas para la oferta de este grupo»).
--    Se re-vinculan las aulas de la sede 'SC' al CETAP llamado exactamente
--    «Sede Central» de la territorial de la Sede Central, SOLO si ese CETAP es único
--    (regla unívoca: si hay cero o varios, no se adivina y se avisa).
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

-- 1) Modalidad a distancia.
ALTER TABLE "academic-schedule".grupo DROP CONSTRAINT IF EXISTS chk_grupo_modalidad;
ALTER TABLE "academic-schedule".grupo
  ADD CONSTRAINT chk_grupo_modalidad CHECK (modalidad IN ('presencial', 'virtual', 'distancia'));

COMMENT ON COLUMN "academic-schedule".grupo.modalidad IS
  'presencial | virtual | distancia. Virtual y distancia: sesiones mediadas por tecnología, sin aula; el horario es opcional y lo puede definir el docente asignado.';

-- 2) Aulas de la Sede Central → el CETAP «Sede Central» de esta base.
DO $$
DECLARE
  v_codigos TEXT[];
  v_cambiadas INT;
BEGIN
  SELECT array_agg(DISTINCT c.codigo) INTO v_codigos
    FROM academic_work_plan.cetap c
    JOIN academic_work_plan.direccion_territorial dt ON dt.id = c.id_direccion_territorial
   WHERE lower(btrim(c.nombre)) = 'sede central'
     AND (upper(dt.codigo) = 'SC' OR upper(replace(dt.nombre, ' ', '_')) = 'SEDE_CENTRAL');

  IF v_codigos IS NULL OR array_length(v_codigos, 1) <> 1 THEN
    RAISE NOTICE '065: no se re-vinculan aulas: hay % CETAP «Sede Central» en la territorial de la Sede Central (se necesita exactamente 1).',
      COALESCE(array_length(v_codigos, 1), 0);
    RETURN;
  END IF;

  UPDATE "academic-schedule".aula
     SET codigo_cetap = v_codigos[1]
   WHERE upper(btrim(sede_codigo)) = 'SC'
     AND codigo_cetap IS DISTINCT FROM v_codigos[1];
  GET DIAGNOSTICS v_cambiadas = ROW_COUNT;
  RAISE NOTICE '065: % aulas de la Sede Central quedaron en el CETAP %.', v_cambiadas, v_codigos[1];
END $$;

-- ── CANARIO ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_grupo_modalidad'
                  AND pg_get_constraintdef(oid) LIKE '%distancia%') THEN
    RAISE EXCEPTION '065: la modalidad «distancia» no quedó permitida.';
  END IF;
END $$;
