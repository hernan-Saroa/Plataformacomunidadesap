-- Migration 385: Trazabilidad de derivación Comunicación → Proceso / Expediente / Consulta
-- Contexto: en el Centro de Comunicaciones → Clasificación IA ahora se puede ASOCIAR una
-- comunicación a un proceso existente o CREAR un proceso nuevo (Defensa Judicial, Juzgamiento
-- Disciplinario o Asesoría Jurídica). Se requiere trazabilidad en ambos sentidos.
--
--  - correos_juridicos.modulo_destino : módulo al que se derivó la comunicación.
--  - correos_juridicos.consulta_id     : consulta de Asesoría Jurídica asociada (tabla aparte).
--  - expedientes.origen_comunicacion_id     : comunicación que dio origen al proceso.
--  - consultas_juridicas.origen_comunicacion_id : comunicación que dio origen a la consulta.

-- Comunicación (correos_juridicos): consulta asociada (Asesoría) + módulo destino
ALTER TABLE legal_management.correos_juridicos
ADD COLUMN IF NOT EXISTS consulta_id UUID,
ADD COLUMN IF NOT EXISTS modulo_destino VARCHAR(50);

-- Expedientes (Defensa Judicial / Juzgamiento Disciplinario): comunicación de origen
ALTER TABLE legal_management.expedientes
ADD COLUMN IF NOT EXISTS origen_comunicacion_id UUID;

-- Consultas Jurídicas (Asesoría Jurídica): comunicación de origen
ALTER TABLE legal_management.consultas_juridicas
ADD COLUMN IF NOT EXISTS origen_comunicacion_id UUID;

-- Índices para consultas inversas (proceso/consulta → comunicación de origen)
CREATE INDEX IF NOT EXISTS idx_correos_juridicos_consulta
    ON legal_management.correos_juridicos(consulta_id);
CREATE INDEX IF NOT EXISTS idx_expedientes_origen_comunicacion
    ON legal_management.expedientes(origen_comunicacion_id);
CREATE INDEX IF NOT EXISTS idx_consultas_origen_comunicacion
    ON legal_management.consultas_juridicas(origen_comunicacion_id);
