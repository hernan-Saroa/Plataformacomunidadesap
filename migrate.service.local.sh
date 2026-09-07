#!/bin/bash

# =====================================================
# Migraciones locales por servicio (sin Docker)
# Carga las variables DB_* desde backend/<servicio>/.env
# Uso:
#   chmod +x migrate.service.local.sh
#   ./migrate.service.local.sh <nombre-servicio>
# Ejemplos:
#   ./migrate.service.local.sh auth-service
#   ./migrate.service.local.sh travel-expenses-service
#   ./migrate.service.local.sh notifications-service
# =====================================================

set -e

if [ -z "$1" ]; then
  echo "Error: Debes indicar el nombre del servicio."
  echo "Uso:   ./migrate.service.local.sh <nombre-servicio>"
  echo "Ej:    ./migrate.service.local.sh travel-expenses-service"
  exit 1
fi

SERVICE_NAME="$1"
ENV_FILE="backend/${SERVICE_NAME}/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: No se encontró $ENV_FILE"
  exit 1
fi

# Cargar variables del .env (compatibles con bash; limpiando BOM y CR para Mac/Linux/Windows)
CLEAN_ENV=$(mktemp)
while IFS= read -r line || [ -n "$line" ]; do
  # Remover BOM (UTF-8) si está presente al inicio
  line="${line#$'\xef\xbb\xbf'}"
  # Remover retorno de carro (\r) típico de Windows
  line="${line%$'\r'}"
  echo "$line" >> "$CLEAN_ENV"
done < "$ENV_FILE"

set -a
source "$CLEAN_ENV"
set +a
rm -f "$CLEAN_ENV"

if ! command -v psql >/dev/null 2>&1; then
  # Fallback para macOS
  PSQL_FALLBACK="/Applications/Postgres.app/Contents/Versions/16/bin/psql"
  PSQL_WINDOWS_18="/c/Program Files/PostgreSQL/18/bin/psql"
  PSQL_WINDOWS_17="/c/Program Files/PostgreSQL/17/bin/psql"
  if [ -x "$PSQL_FALLBACK" ]; then
    export PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH"
  elif [ -x "$PSQL_WINDOWS_18" ]; then
    export PATH="/c/Program Files/PostgreSQL/18/bin:$PATH"
  elif [ -x "$PSQL_WINDOWS_17" ]; then
    export PATH="/c/Program Files/PostgreSQL/17/bin:$PATH"
  else
    echo "Error: psql no encontrado. Instala Postgres CLI o agrega psql al PATH."
    exit 1
  fi
fi

if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ] || [ -z "$DB_SCHEMA" ]; then
  echo "Error: Variables DB_* incompletas en $ENV_FILE"
  exit 1
fi

# Buscar migraciones del servicio en ubicaciones conocidas (en orden de prioridad)
CANDIDATE_DIRS=(
  "backend/${SERVICE_NAME}/db/migrations"
  "backend/${SERVICE_NAME}/db"
)

MIGRATIONS_DIR=""
for dir in "${CANDIDATE_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    MIGRATIONS_DIR="$dir"
    break
  fi
done

if [ -z "$MIGRATIONS_DIR" ]; then
  echo "Error: No se encontró ninguna carpeta de migraciones para el servicio '$SERVICE_NAME'."
  echo "Buscado en:"
  for dir in "${CANDIDATE_DIRS[@]}"; do echo "  - $dir"; done
  exit 1
fi

MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' ! -path '*/old/*' ! -path '*/archive/*' ! -path '*/.*' 2>/dev/null | sort)
if [ -z "$MIGRATION_FILES" ]; then
  echo "No hay archivos .sql en $MIGRATIONS_DIR"
  exit 0
fi

export PGPASSWORD="${DB_PASS:-}"

echo "========================================"
echo "  Servicio:   $SERVICE_NAME"
echo "  Migraciones: $MIGRATIONS_DIR"
echo "  DB:         $DB_HOST:$DB_PORT/$DB_NAME (schema: $DB_SCHEMA)"
echo "========================================"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE SCHEMA IF NOT EXISTS $DB_SCHEMA;" >/dev/null
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE TABLE IF NOT EXISTS $DB_SCHEMA.migrations_db_log (filename TEXT PRIMARY KEY, executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now());" >/dev/null

MIGRATIONS_APPLIED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT filename FROM $DB_SCHEMA.migrations_db_log" 2>/dev/null)

MIGRATION_COUNT=0
MIGRATION_SUCCESS=0
MIGRATION_FAILED=0

for file in $MIGRATION_FILES; do
  filename=$(basename "$file")
  relpath="${SERVICE_NAME}/${filename}"

  if echo "$MIGRATIONS_APPLIED" | grep -Fxq "$relpath" || echo "$MIGRATIONS_APPLIED" | grep -Fxq "$filename"; then
    echo "Saltando (ya aplicada): $relpath"
    continue
  fi

  MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
  echo "[$MIGRATION_COUNT] Ejecutando: $relpath"

  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" 2>&1; then
    echo "    OK"
    MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
    escaped_relpath=$(printf "%s" "$relpath" | sed "s/'/''/g")
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO $DB_SCHEMA.migrations_db_log (filename) VALUES ('$escaped_relpath') ON CONFLICT (filename) DO NOTHING;" >/dev/null
  else
    echo "    ERROR"
    MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
  fi
done

echo ""
echo "========================================"
echo "Total: $MIGRATION_COUNT | Exitosas: $MIGRATION_SUCCESS | Fallidas: $MIGRATION_FAILED"
echo "========================================"

if [ "$MIGRATION_FAILED" -gt 0 ]; then
  exit 1
fi