-- ============================================
-- Migración 108: Calcular Próxima Auditoría Automática
-- Fecha: 2026-01-23
-- Descripción: Calcula automáticamente proxima_auditoria para procesos
--              que tienen ultima_auditoria pero no proxima_auditoria
-- ============================================

-- Función auxiliar para calcular años según frecuencia
CREATE OR REPLACE FUNCTION control_interno.calcular_anos_frecuencia(frecuencia TEXT)
RETURNS INTEGER AS $$
BEGIN
    CASE 
        WHEN LOWER(frecuencia) LIKE '%anual%' THEN RETURN 1;
        WHEN LOWER(frecuencia) LIKE '%bienal%' THEN RETURN 2;
        WHEN LOWER(frecuencia) LIKE '%trienal%' THEN RETURN 3;
        WHEN LOWER(frecuencia) LIKE '%cuatrienal%' THEN RETURN 4;
        ELSE
            -- Intentar extraer número del string (ej: "Cada 2 años")
            BEGIN
                RETURN COALESCE(
                    (SELECT (regexp_match(frecuencia, '\d+'))[1]::INTEGER),
                    1  -- Por defecto anual
                );
            END;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Actualizar procesos que tienen ultima_auditoria pero no proxima_auditoria
UPDATE control_interno.proceso_auditable
SET proxima_auditoria = (
    ultima_auditoria + 
    (control_interno.calcular_anos_frecuencia(frecuencia_auditoria) || ' years')::INTERVAL
)
WHERE ultima_auditoria IS NOT NULL 
  AND proxima_auditoria IS NULL;

-- Limpiar función auxiliar (opcional, puede dejarse para uso futuro)
-- DROP FUNCTION IF EXISTS control_interno.calcular_anos_frecuencia(TEXT);

COMMENT ON FUNCTION control_interno.calcular_anos_frecuencia IS 'Calcula el número de años según la frecuencia de auditoría';

