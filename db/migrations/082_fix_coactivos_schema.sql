-- Migration: Fix Coactivos Schema (Move from public to legal_management)
-- Correction for migrations 071 and 072 which created tables in public schema by mistake.

-- 1. Move ENUM 'estado_proceso_coactivo' if it exists in public
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_namespace n ON t.typnamespace = n.oid 
        WHERE t.typname = 'estado_proceso_coactivo' AND n.nspname = 'public'
    ) THEN
        ALTER TYPE public.estado_proceso_coactivo SET SCHEMA legal_management;
        RAISE NOTICE 'Moved TYPE estado_proceso_coactivo to legal_management schema';
    END IF;
END $$;

-- 2. Move Table 'procesos_coactivos' if it exists in public
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'procesos_coactivos'
    ) THEN
        ALTER TABLE public.procesos_coactivos SET SCHEMA legal_management;
        RAISE NOTICE 'Moved TABLE procesos_coactivos to legal_management schema';
    END IF;
END $$;

-- 3. Move Table 'procesos_coactivos_adjuntos' if it exists in public
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'procesos_coactivos_adjuntos'
    ) THEN
        ALTER TABLE public.procesos_coactivos_adjuntos SET SCHEMA legal_management;
        RAISE NOTICE 'Moved TABLE procesos_coactivos_adjuntos to legal_management schema';
    END IF;
END $$;
