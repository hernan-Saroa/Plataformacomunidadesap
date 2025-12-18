# 📋 GUÍA DE MIGRACIONES - CONFIGURACIÓN DE CERTIFICADOS LABORALES

## 🎯 RESUMEN EJECUTIVO

He revisado **TODAS** las migraciones y consolidado en **3 archivos finales** que contienen todo lo necesario.

---

## ✅ MIGRACIONES FINALES (USAR ESTAS)

Ejecutar en este orden exacto:

### 1️⃣ `FINAL_01_create_firmantes.sql`
**Qué hace:**
- Crea la tabla `firmantes` para almacenar personas autorizadas a firmar certificados
- Inserta el firmante principal: ALBA LUCÍA MARÍN ZULUAGA
- Crea índices para búsqueda rápida

**Por qué es necesaria:** Sin esta tabla, no puedes tener firmantes ni sus firmas digitales.

### 2️⃣ `FINAL_02_create_certificate_template_config.sql`
**Qué hace:**
- Crea la tabla `certificate_template_config` con TODAS las columnas necesarias:
  - `firmante_id`: Referencia al firmante
  - `entity_logo_url`, `entity_logo_filename`, `entity_logo_size`: Logo ESAP
  - `typography_font`: Fuente tipográfica (Times New Roman por defecto)
  - `cargo_title`: Título del cargo
  - `certificate_content_html`: Contenido HTML con variables
  - Campos de auditoría y control de versión
- Inserta configuración inicial con las **variables correctas** ya incluidas
- Crea foreign key hacia tabla `firmantes`

**Por qué es necesaria:** Esta es la tabla principal que usa tu aplicación. Sin ella, nada funciona.

### 3️⃣ `FINAL_03_create_template_changes_and_validations.sql`
**Qué hace:**
- Crea tabla `template_config_changes`: Historial de cambios (logo, firma, nombre, tipografía, contenido)
- Crea tabla `certificate_validations`: Validaciones de certificados vía QR
- Crea índices para ambas tablas

**Por qué es necesaria:**
- Sin `template_config_changes`, no funciona el historial que muestra los cambios
- Sin `certificate_validations`, no se puede validar certificados por QR

---

## ❌ MIGRACIONES ANTIGUAS (ELIMINAR ESTAS)

Estas migraciones son **redundantes o están duplicadas**. Puedes eliminarlas con seguridad:

### ⛔ Eliminar:
1. `20251211_create_certificate_template_config.sql` - Reemplazada por FINAL_02
2. `20251211_update_certificate_template_config.sql` - Lógica ya incluida en FINAL_02
3. `20251211_fix_certificate_template_config.sql` - Lógica ya incluida en FINAL_02
4. `20251211_create_firmantes.sql` - Reemplazada por FINAL_01
5. `20251211_create_template_config_changes.sql` - Reemplazada por FINAL_03
6. `20251211_create_certificate_validations.sql` - Reemplazada por FINAL_03
7. `20251212_add_template_content_fields.sql` - Campos ya incluidos en FINAL_02
8. `20251212_update_certificate_content_with_variables.sql` - Datos ya correctos en FINAL_02

---

## 🚀 INSTRUCCIONES DE EJECUCIÓN

### Opción 1: Base de datos NUEVA (recomendado)

Si estás creando la base de datos desde cero:

```bash
# 1. Conectarse a PostgreSQL
psql -U postgres -d esap_db

# 2. Cambiar al esquema certification
SET search_path TO certification, public;

# 3. Ejecutar en orden
\i db/migrations/FINAL_01_create_firmantes.sql
\i db/migrations/FINAL_02_create_certificate_template_config.sql
\i db/migrations/FINAL_03_create_template_changes_and_validations.sql
```

### Opción 2: Base de datos EXISTENTE

Si ya tienes datos y quieres migrar:

**IMPORTANTE:** Las migraciones finales usan `CREATE TABLE IF NOT EXISTS`, así que son seguras de ejecutar incluso si las tablas ya existen.

```bash
# 1. Hacer BACKUP de la base de datos
pg_dump -U postgres esap_db > backup_$(date +%Y%m%d).sql

# 2. Conectarse a PostgreSQL
psql -U postgres -d esap_db

# 3. Ejecutar migraciones (saltarán las tablas que ya existen)
SET search_path TO certification, public;
\i db/migrations/FINAL_01_create_firmantes.sql
\i db/migrations/FINAL_02_create_certificate_template_config.sql
\i db/migrations/FINAL_03_create_template_changes_and_validations.sql
```

---

## 🔍 VERIFICACIÓN

Después de ejecutar, verifica que todo esté correcto:

```sql
-- Ver tablas creadas
\dt

-- Verificar firmante principal
SELECT * FROM firmantes WHERE es_principal = true;

-- Verificar configuración de plantilla
SELECT id, version, status, is_active FROM certificate_template_config;

-- Verificar que las tablas de historial existen
\d template_config_changes
\d certificate_validations
```

Deberías ver:
- ✅ 1 firmante principal (ALBA LUCÍA MARÍN ZULUAGA)
- ✅ 1 configuración de plantilla activa con variables
- ✅ Todas las columnas necesarias en `certificate_template_config`

---

## 📊 COMPARACIÓN: ANTES vs DESPUÉS

### ANTES (8 archivos, duplicados, confusos):
```
20251211_create_certificate_template_config.sql    ❌ Duplicada
20251211_update_certificate_template_config.sql    ❌ Duplicada
20251211_fix_certificate_template_config.sql       ❌ Duplicada
20251211_create_firmantes.sql                      ❌ Duplicada
20251211_create_template_config_changes.sql        ❌ Duplicada
20251211_create_certificate_validations.sql        ❌ Duplicada
20251212_add_template_content_fields.sql           ❌ Parcial
20251212_update_certificate_content_with_variables.sql ❌ Innecesaria
```

### DESPUÉS (3 archivos, consolidados, claros):
```
FINAL_01_create_firmantes.sql                      ✅ Esencial
FINAL_02_create_certificate_template_config.sql    ✅ Esencial
FINAL_03_create_template_changes_and_validations.sql ✅ Esencial
```

---

## 🛡️ SEGURIDAD

Las 3 migraciones finales son **idempotentes** (se pueden ejecutar múltiples veces sin causar problemas) porque usan:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `INSERT ... WHERE NOT EXISTS`
- `ON CONFLICT DO NOTHING`

---

## 🎓 ORDEN DE DEPENDENCIAS

```
FINAL_01 (firmantes)
    ↓
    └─> FINAL_02 (certificate_template_config)
            ├─> Usa foreign key a firmantes
            ↓
            └─> FINAL_03 (template_config_changes + certificate_validations)
                    └─> Usa foreign key a certificate_template_config
```

---

## 📝 NOTAS IMPORTANTES

1. **No perderás datos:** Las migraciones finales respetan datos existentes
2. **Variables correctas:** El contenido HTML ya tiene las variables finales (`[FECHA_EXPEDICION_COMPLETA]`, etc.)
3. **TypeORM compatible:** Las columnas coinciden exactamente con `template-config.entity.ts`
4. **Esquema certification:** Todas usan `SET search_path TO certification, public;`

---

## ❓ SI TIENES DUDAS

1. ¿Ya ejecutaste las migraciones antiguas? → Las nuevas son compatibles, puedes ejecutarlas de todas formas
2. ¿Tienes datos en producción? → Haz backup primero, las migraciones son seguras pero siempre mejor prevenir
3. ¿Quieres empezar de cero? → Borra las tablas y ejecuta las 3 migraciones finales en orden
