# Migraciones - Internal Disciplinary Control Service

## Migración de Plantilla Auto

### Descripción
Esta migración crea la tabla `plantilla_auto` para almacenar las plantillas de autos disciplinarios de manera persistente en la base de datos.

### Archivos
- `create_plantilla_auto_table.sql` - Script SQL que crea la tabla y inserta datos por defecto
- `migrate-plantilla-auto.js` - Script Node.js para ejecutar la migración
- `seed.sql` - Actualizado para incluir la plantilla por defecto

### Ejecución
```bash
# Desde el directorio del servicio
cd backend/internal-disciplinary-control-service
node migrate-plantilla-auto.js
```

### Estructura de la tabla
```sql
CREATE TABLE internal_disciplinary_control.plantilla_auto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    htmlContent TEXT NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'activo',
    nombre VARCHAR(100),
    descripcion TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Datos por defecto
La migración inserta una plantilla por defecto con:
- Todas las variables disponibles ([RADICADO], [FECHA_QUEJA], etc.)
- Estado 'activo'
- Nombre: "Plantilla General de Autos"
- Descripción completa

### Verificación
Después de ejecutar la migración, puedes verificar con:
```sql
SELECT * FROM internal_disciplinary_control.plantilla_auto;
```

### Notas
- La tabla se crea en el esquema `internal_disciplinary_control`
- Incluye índices para optimizar consultas por estado y fecha de creación
- Tiene un trigger automático para actualizar `updatedAt`
- La plantilla por defecto se inserta con `ON CONFLICT DO NOTHING` para evitar duplicados