-- Migration: Create procesos_coactivos_adjuntos in legal_management schema if it doesn't exist
-- This migration ensures the table is created in the correct schema

-- Create the table in legal_management if it doesn't exist in any schema
DO $$ 
BEGIN
    -- Check if table exists in legal_management
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'legal_management' AND table_name = 'procesos_coactivos_adjuntos'
    ) THEN
        -- Check if it exists in public and move it
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'procesos_coactivos_adjuntos'
        ) THEN
            ALTER TABLE public.procesos_coactivos_adjuntos SET SCHEMA legal_management;
            RAISE NOTICE 'Moved TABLE procesos_coactivos_adjuntos to legal_management schema';
        ELSE
            -- Create the table fresh in legal_management
            CREATE TABLE legal_management.procesos_coactivos_adjuntos (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                proceso_id uuid NOT NULL,
                nombre_original character varying NOT NULL,
                nombre_archivo character varying NOT NULL,
                mime_type character varying NOT NULL,
                tamano integer NOT NULL,
                fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_procesos_coactivos_adjuntos" PRIMARY KEY (id),
                CONSTRAINT "FK_procesos_coactivos_adjuntos_proceso" 
                    FOREIGN KEY (proceso_id) 
                    REFERENCES legal_management.procesos_coactivos(id) 
                    ON DELETE CASCADE
            );
            
            -- Create index
            CREATE INDEX IF NOT EXISTS "IDX_procesos_coactivos_adjuntos_proceso_id" 
                ON legal_management.procesos_coactivos_adjuntos (proceso_id);
                
            RAISE NOTICE 'Created TABLE legal_management.procesos_coactivos_adjuntos';
        END IF;
    ELSE
        RAISE NOTICE 'Table legal_management.procesos_coactivos_adjuntos already exists';
    END IF;
END $$;
