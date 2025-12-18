# Migraciones de Base de Datos - Estructura Organizacional

Este directorio contiene las migraciones SQL para la estructura organizacional de ESAP.

## Contenido

- `001-create-estructura-organizacional.sql` - Creación de tablas y esquema
- `002-seed-estructura-organizacional.sql` - Datos iniciales (326 unidades organizacionales)

## Estructura de Datos

### Totales
- **1** Sede Central (nivel: nacional)
- **17** Territoriales (nivel: territorial)
- **308** CETAP - Centros Territoriales de Administración Pública (nivel: cetap)
- **TOTAL: 326** unidades organizacionales

### Distribución por Territorial

1. Sede Central - 1 CETAP (Sede Principal)
2. Antioquia - 35 CETAP
3. Atlántico - 12 CETAP
4. Bolívar - 14 CETAP
5. Boyacá - 24 CETAP
6. Caldas - 11 CETAP
7. Caquetá - 8 CETAP
8. Cauca - 16 CETAP
9. Cesar - 8 CETAP
10. Córdoba - 10 CETAP
11. Cundinamarca - 23 CETAP
12. Huila - 15 CETAP
13. Magdalena - 9 CETAP
14. Meta - 5 CETAP
15. Nariño - 25 CETAP
16. Norte de Santander - 16 CETAP
17. Quindío - 7 CETAP
18. Santander - 28 CETAP

## Ejecución de Migraciones

### Opción 1: Script Automatizado (Recomendado)

#### Desarrollo Local
```bash
cd backend/auth-service

# 1. Crear las tablas (solo primera vez)
node run-migration.js

# 2. Insertar datos iniciales
node run-migration-seed.js

# 3. O limpiar y reinsertar todo
node clean-and-seed.js
```

### Opción 2: Usando psql directamente

#### Para Desarrollo (DEV)
```bash
# Configurar variables de entorno
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASS=your_password
export DB_NAME=esap_db

# Ejecutar migraciones
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/001-create-estructura-organizacional.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/002-seed-estructura-organizacional.sql
```

#### Para QA
```bash
# Configurar conexión a QA
export DB_HOST=qa-db.esap.local
export DB_USER=esap_qa_user
export DB_PASS=qa_password
export DB_NAME=esap_qa_db

# Ejecutar migraciones
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/001-create-estructura-organizacional.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/002-seed-estructura-organizacional.sql
```

#### Para Pre-Producción (PRE)
```bash
# Configurar conexión a PRE
export DB_HOST=pre-db.esap.local
export DB_USER=esap_pre_user
export DB_PASS=pre_password
export DB_NAME=esap_pre_db

# Ejecutar migraciones
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/001-create-estructura-organizacional.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/002-seed-estructura-organizacional.sql
```

#### Para Producción (PROD)
```bash
# ⚠️ PRECAUCIÓN: Validar con el equipo antes de ejecutar en producción

# Configurar conexión a PROD
export DB_HOST=prod-db.esap.gov.co
export DB_USER=esap_prod_user
export DB_PASS=prod_password
export DB_NAME=esap_prod_db

# IMPORTANTE: Hacer backup antes de ejecutar
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# Ejecutar migraciones
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/001-create-estructura-organizacional.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/002-seed-estructura-organizacional.sql
```

## Verificación Post-Migración

### Usando Node.js
```bash
node check-data.js
```

### Usando SQL
```sql
-- Verificar totales por nivel
SELECT
  nivel,
  COUNT(*) as total,
  COUNT(CASE WHEN estado = 'activa' THEN 1 END) as activas
FROM auth.unidades_organizacionales
GROUP BY nivel
ORDER BY
  CASE nivel
    WHEN 'nacional' THEN 1
    WHEN 'territorial' THEN 2
    WHEN 'cetap' THEN 3
  END;

-- Resultado esperado:
-- nacional    | 1   | 1
-- territorial | 17  | 17
-- cetap       | 308 | 308
-- TOTAL: 326 registros
```

### Usando la API
```bash
# Estadísticas generales
curl http://localhost:3001/api/v1/estructura-organizacional/estadisticas

# Listar todas las unidades
curl http://localhost:3001/api/v1/estructura-organizacional

# Listar solo territoriales
curl "http://localhost:3001/api/v1/estructura-organizacional?nivel=territorial"

# Listar CETAP de un departamento
curl "http://localhost:3001/api/v1/estructura-organizacional?departamento=Antioquia"
```

## Regenerar Datos

Si necesitas regenerar el archivo SQL con datos actualizados desde el archivo TypeScript:

```bash
# 1. Actualizar src/data/territoriales-cetap-completo.ts con nuevos datos

# 2. Regenerar SQL
node generate-seed-data.js

# 3. Verificar que se generó correctamente
grep -c "INSERT INTO" migrations/002-seed-estructura-organizacional.sql
# Debe retornar: 326

# 4. Aplicar cambios
node clean-and-seed.js
```

## Rollback

Si necesitas revertir los cambios:

```sql
-- Eliminar solo los datos (mantener estructura)
DELETE FROM auth.asignaciones_usuario_estructura;
DELETE FROM auth.unidades_organizacionales;

-- Eliminar todo (tablas y datos)
DROP TABLE IF EXISTS auth.asignaciones_usuario_estructura CASCADE;
DROP TABLE IF EXISTS auth.unidades_organizacionales CASCADE;
```

## Notas Importantes

1. **Códigos Únicos**: Los códigos de CETAP incluyen el prefijo de la territorial para evitar duplicados
   - Ejemplo: `ESAP-ANT-CETAP-001` para el primer CETAP de Antioquia

2. **ON CONFLICT**: Las migraciones usan `ON CONFLICT (codigo) DO NOTHING` para evitar duplicados
   - Si ejecutas la migración múltiples veces, no insertará duplicados

3. **Transacciones**: La migración de datos usa `BEGIN`/`COMMIT` para garantizar atomicidad
   - Si algo falla, se revierten todos los cambios

4. **Índices**: Las tablas tienen índices en:
   - `nivel` - Para filtrar por tipo de unidad
   - `padre_id` - Para consultas jerárquicas
   - `estado` - Para filtrar activas/inactivas
   - `departamento` - Para búsquedas geográficas

## Soporte

Para problemas o preguntas sobre las migraciones, contactar al equipo de desarrollo.
