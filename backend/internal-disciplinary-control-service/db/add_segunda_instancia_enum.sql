-- Script para agregar SEGUNDA_INSTANCIA al enum de PostgreSQL
-- Ejecutar en la base de datos plataforma_comunidades

-- Verificar los valores actuales del enum
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'disciplinary_processes_etapaactual_enum'
);

-- Agregar el nuevo valor SEGUNDA_INSTANCIA al enum
ALTER TYPE internal_disciplinary_control.disciplinary_processes_etapaactual_enum 
ADD VALUE IF NOT EXISTS 'SEGUNDA_INSTANCIA';

-- Verificar que se agregó correctamente
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'disciplinary_processes_etapaactual_enum'
);
