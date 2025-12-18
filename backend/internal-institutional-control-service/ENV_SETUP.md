# Configuración de Variables de Entorno

## Archivo .env

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Configuración de Base de Datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=esap_db
DB_SCHEMA=control_interno

# Configuración del Servidor
NODE_ENV=development
PORT=3007

# Configuración SSL (opcional)
DB_SSL=false

# Schema Adicional ESAP (opcional)
DB_SCHEMA_ESAP=esap
```

## Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASS` | Contraseña de PostgreSQL | `postgres` |
| `DB_NAME` | Nombre de la base de datos | `esap_db` |
| `DB_SCHEMA` | Schema principal | `control_interno` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto del servidor | `3007` |
| `DB_SSL` | Habilitar SSL | `false` |
| `DB_SCHEMA_ESAP` | Schema adicional ESAP | `esap` |

## Instalación

1. Copia el contenido de arriba
2. Crea el archivo `.env` en la raíz del proyecto
3. Ajusta los valores según tu configuración

