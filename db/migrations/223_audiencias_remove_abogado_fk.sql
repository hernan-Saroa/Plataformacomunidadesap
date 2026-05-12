-- Desacoplar audiencias de la tabla abogados:
-- 1. Eliminar FK abogado_id -> abogados.id
-- 2. Agregar columnas abogado_nombre y abogado_email directamente en audiencias
-- El abogado_id pasa a ser el ID del usuario del servicio de auth

ALTER TABLE legal_management.audiencias
    DROP CONSTRAINT IF EXISTS audiencias_abogado_id_fkey;

ALTER TABLE legal_management.audiencias
    ADD COLUMN IF NOT EXISTS abogado_nombre VARCHAR(255),
    ADD COLUMN IF NOT EXISTS abogado_email VARCHAR(255);
