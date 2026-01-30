-- ============================================
-- Migración: Crear tabla plantilla_auto
-- Fecha: 2026-01-16
-- Descripción: Crea la tabla para almacenar plantillas de autos disciplinarios
-- ============================================

-- Crear tabla plantilla_auto en el esquema internal_disciplinary_control
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.plantilla_auto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "htmlContent" TEXT NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    nombre VARCHAR(100),
    descripcion TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_plantilla_auto_estado ON internal_disciplinary_control.plantilla_auto(estado);
CREATE INDEX IF NOT EXISTS idx_plantilla_auto_created_at ON internal_disciplinary_control.plantilla_auto("createdAt");

-- Agregar trigger para actualizar updatedAt automáticamente
CREATE OR REPLACE FUNCTION internal_disciplinary_control.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plantilla_auto_updated_at
    BEFORE UPDATE ON internal_disciplinary_control.plantilla_auto
    FOR EACH ROW EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();

-- Insertar plantilla por defecto
INSERT INTO internal_disciplinary_control.plantilla_auto (
    id, "htmlContent", estado, nombre, descripcion, "createdAt", "updatedAt"
)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440000',
        '<p>En el proceso disciplinario [RADICADO], iniciado el [FECHA_QUEJA], se ha determinado lo siguiente:</p>

<p><strong>HECHOS:</strong></p>
<p>[HECHOS]</p>

<p><strong>DENUNCIANTE:</strong> [DENUNCIANTE_NOMBRE] - [DENUNCIANTE_DOCUMENTO]</p>
<p><strong>DISCIPLINABLE:</strong> [DISCIPLINABLE_NOMBRE] - [DISCIPLINABLE_DOCUMENTO] - [DISCIPLINABLE_CARGO]</p>

<p>Por lo anterior, se resuelve:</p>

<p>PRIMERO: Iniciar proceso disciplinario contra [DISCIPLINABLE_NOMBRE] por los hechos descritos.</p>

<p>SEGUNDO: Notificar al investigado de los cargos formulados.</p>

<p>TERCERO: Designar abogado instructor para el proceso.</p>

<p>Dado en Bogotá D.C., a los [FECHA_ACTUAL].</p>',
        'activo',
        'Plantilla General de Autos',
        'Plantilla por defecto para la generación de autos disciplinarios con todas las variables disponibles',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO NOTHING;

-- Verificar que la tabla se creó correctamente
-- SELECT 'Tabla plantilla_auto creada exitosamente' AS resultado,
--        COUNT(*) AS registros_insertados
-- FROM internal_disciplinary_control.plantilla_auto;