-- ============================================================================
-- Migration: Create infrastructure-management schema
-- Description: Crear esquema para la gestión de infraestructura física, sedes, espacios y mantenimientos de la ESAP
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS "infrastructure-management";

COMMENT ON SCHEMA "infrastructure-management" IS 'Esquema para la gestión de infraestructura física, sedes territoriales, bloques, aulas, espacios y solicitudes de mantenimiento ESAP';

-- Tabla de Sedes Territoriales y Direcciones
CREATE TABLE IF NOT EXISTS "infrastructure-management".sede (
    id_sede UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'TERRITORIAL', -- SEDE_CENTRAL, TERRITORIAL, CETAP
    departamento VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    email_contacto VARCHAR(100),
    is_activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Bloques o Edificios dentro de una sede
CREATE TABLE IF NOT EXISTS "infrastructure-management".bloque_edificio (
    id_bloque UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_sede UUID NOT NULL REFERENCES "infrastructure-management".sede(id_sede) ON DELETE CASCADE,
    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    pisos INT NOT NULL DEFAULT 1,
    descripcion TEXT,
    is_activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_sede_bloque UNIQUE (id_sede, codigo)
);

-- Tabla de Espacios Físicos (Aulas, Oficinas, Auditorios, Laboratorios, etc.)
CREATE TABLE IF NOT EXISTS "infrastructure-management".espacio_fisico (
    id_espacio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_bloque UUID NOT NULL REFERENCES "infrastructure-management".bloque_edificio(id_bloque) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- AULA, AUDITORIO, LABORATORIO, OFICINA, BIBLIOTECA, SALA_CONSEJO
    capacidad INT NOT NULL DEFAULT 30,
    piso INT NOT NULL DEFAULT 1,
    area_m2 NUMERIC(8, 2),
    tiene_aire_acondicionado BOOLEAN DEFAULT false,
    tiene_videobeam BOOLEAN DEFAULT false,
    tiene_computadores BOOLEAN DEFAULT false,
    estado VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE', -- DISPONIBLE, MANTENIMIENTO, INACTIVO, RESERVADO
    is_activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Solicitudes y Órdenes de Mantenimiento
CREATE TABLE IF NOT EXISTS "infrastructure-management".solicitud_mantenimiento (
    id_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consecutivo VARCHAR(50) NOT NULL UNIQUE,
    id_espacio UUID REFERENCES "infrastructure-management".espacio_fisico(id_espacio) ON DELETE SET NULL,
    id_sede UUID NOT NULL REFERENCES "infrastructure-management".sede(id_sede) ON DELETE CASCADE,
    tipo_mantenimiento VARCHAR(50) NOT NULL, -- PREVENTIVO, CORRECTIVO, LOCATIVO, TECNOLOGICO
    prioridad VARCHAR(30) NOT NULL DEFAULT 'MEDIA', -- BAJA, MEDIA, ALTA, URGENTE
    descripcion TEXT NOT NULL,
    solicitante_email VARCHAR(150) NOT NULL,
    solicitante_nombre VARCHAR(150) NOT NULL,
    responsable_asignado VARCHAR(150),
    fecha_programada DATE,
    fecha_ejecucion DATE,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, EN_PROCESO, COMPLETADO, RECHAZADO
    observaciones TEXT,
    costo_estimado NUMERIC(14, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos semilla iniciales de sedes principales de la ESAP
INSERT INTO "infrastructure-management".sede (codigo, nombre, tipo, departamento, municipio, direccion)
VALUES 
    ('SEDE-CENTRAL', 'Sede Central - Bogotá D.C.', 'SEDE_CENTRAL', 'Bogotá D.C.', 'Bogotá', 'Calle 44 # 53 - 37 CAN'),
    ('TERR-ANTIOQUIA', 'Territorial Antioquia - Chocó', 'TERRITORIAL', 'Antioquia', 'Medellín', 'Calle 56 # 41 - 147'),
    ('TERR-VALLE', 'Territorial Valle del Cauca', 'TERRITORIAL', 'Valle del Cauca', 'Cali', 'Avenida 2N # 24N - 32'),
    ('TERR-ATLANTICO', 'Territorial Atlántico - Magdalena - Cesar - Guajira', 'TERRITORIAL', 'Atlántico', 'Barranquilla', 'Carrera 54 # 59 - 247'),
    ('TERR-SANTANDER', 'Territorial Santander', 'TERRITORIAL', 'Santander', 'Bucaramanga', 'Calle 34 # 27 - 09')
ON CONFLICT (codigo) DO NOTHING;
