-- ============================================================================
-- 008 · Valor estimado del proceso
--
-- El valor estimado se capturaba como campo dinámico del estudio previo
-- (hiring.campos_formulario, código 'valor_estimado'), es decir después de que
-- el proceso ya había nacido con una modalidad elegida a mano.
--
-- EFDS-1147 exige que el sistema sugiera la modalidad según la cuantía, y para
-- eso la cuantía tiene que conocerse al crear el proceso. Por eso sube de dato
-- del formulario a dato del proceso.
--
-- El campo dinámico se conserva pero pasa a solo lectura: el estudio previo lo
-- sigue mostrando en su sitio dentro del documento, alimentado desde el
-- proceso, y así el dato vive en un único lugar.
-- ============================================================================

-- Nullable: los procesos creados antes de esta migración no tienen valor y no
-- se les puede inventar uno. Las creaciones nuevas lo exigen en el DTO.
ALTER TABLE hiring.procesos
  ADD COLUMN IF NOT EXISTS valor_estimado numeric(18, 2);

COMMENT ON COLUMN hiring.procesos.valor_estimado IS
  'Valor estimado del contrato en pesos. Base para determinar la modalidad por cuantía (EFDS-1147).';

-- No negativos. Se admite nulo por lo anterior.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'procesos_valor_estimado_no_negativo'
  ) THEN
    ALTER TABLE hiring.procesos
      ADD CONSTRAINT procesos_valor_estimado_no_negativo
      CHECK (valor_estimado IS NULL OR valor_estimado >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Arrastre del dato que ya esté diligenciado en los estudios previos, para no
-- perder lo capturado antes de este cambio.
-- ---------------------------------------------------------------------------
UPDATE hiring.procesos p
SET valor_estimado = (a.datos ->> 'valor_estimado')::numeric
FROM hiring.proceso_actividades a
WHERE a.proceso_id = p.id
  AND a.numeral = '3.1'
  AND p.valor_estimado IS NULL
  AND a.datos ->> 'valor_estimado' ~ '^[0-9]+(\.[0-9]+)?$';

-- ---------------------------------------------------------------------------
-- El campo del formulario pasa a solo lectura: su valor ahora vive en el
-- proceso. Se deja visible porque el estudio previo debe seguir mostrándolo.
-- ---------------------------------------------------------------------------
ALTER TABLE hiring.campos_formulario
  ADD COLUMN IF NOT EXISTS solo_lectura boolean NOT NULL DEFAULT false;

UPDATE hiring.campos_formulario
SET solo_lectura = true
WHERE codigo = 'valor_estimado';
