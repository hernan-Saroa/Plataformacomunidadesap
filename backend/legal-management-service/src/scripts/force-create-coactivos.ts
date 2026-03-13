
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno desde el archivo .env raíz del servicio
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
    console.log('Iniciando migración manual de Procesos Coactivos...');

    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'esap_db'
    });

    try {
        await client.connect();
        console.log('Conectado a la base de datos.');

        // 1. Crear ENUM type
        console.log('Creando tipo ENUM estado_proceso_coactivo...');
        await client.query(`
      DO $$ BEGIN
          CREATE TYPE estado_proceso_coactivo AS ENUM (
              'PERSUASIVA', 
              'COACTIVA',
              'MEDIDAS_CAUTELARES',
              'EXCEPCIONES',
              'LIQUIDACION'
          );
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `);

        // 2. Crear Tabla procesos_coactivos
        console.log('Creando tabla procesos_coactivos...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS procesos_coactivos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        radicado VARCHAR(50) UNIQUE NOT NULL,
        deudor JSONB NOT NULL DEFAULT '{}',
        obligacion JSONB NOT NULL DEFAULT '{}',
        estado estado_proceso_coactivo DEFAULT 'PERSUASIVA',
        responsable VARCHAR(255),
        documentos_adjuntos INTEGER DEFAULT 0,
        notificaciones_enviadas INTEGER DEFAULT 0,
        observaciones TEXT,
        ultima_actuacion TIMESTAMP,
        fecha_creacion TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // Indexes 
        await client.query(`CREATE INDEX IF NOT EXISTS idx_procesos_coactivos_radicado ON procesos_coactivos(radicado);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_procesos_coactivos_estado ON procesos_coactivos(estado);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_procesos_coactivos_fecha ON procesos_coactivos(fecha_creacion DESC);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_procesos_coactivos_deudor ON procesos_coactivos USING GIN (deudor);`);

        // 3. Crear Tabla procesos_coactivos_adjuntos
        console.log('Creando tabla procesos_coactivos_adjuntos...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS procesos_coactivos_adjuntos (
          id uuid NOT NULL DEFAULT uuid_generate_v4(),
          proceso_id uuid NOT NULL,
          nombre_original character varying NOT NULL,
          nombre_archivo character varying NOT NULL,
          mime_type character varying NOT NULL,
          tamano integer NOT NULL,
          fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_procesos_coactivos_adjuntos" PRIMARY KEY (id),
          CONSTRAINT "FK_procesos_coactivos_adjuntos_proceso" FOREIGN KEY (proceso_id) REFERENCES procesos_coactivos(id) ON DELETE CASCADE
      );
    `);

        await client.query(`CREATE INDEX IF NOT EXISTS "IDX_procesos_coactivos_adjuntos_proceso_id" ON procesos_coactivos_adjuntos (proceso_id);`);

        console.log('✅ Migración completada exitosamente.');

    } catch (err) {
        console.error('❌ Error ejecutando migración:', err);
    } finally {
        await client.end();
    }
}

run();
