#!/bin/bash

# =====================================================
# Migraciones locales (sin Docker)
# Usa variables desde backend/auth-service/.env
# Pasos
# 1. chmod +x migrate.local.sh -> Dar permisos de ejecución
# 2. ./migrate.local.sh -> Ejecutar migraciones
# =====================================================

set -e

ENV_FILE="backend/auth-service/.env"

if [ -f "$ENV_FILE" ]; then
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
else
  echo "Error: No se encontro $ENV_FILE"
  exit 1
fi

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

MIGRATIONS_DIR="db/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "No existe la carpeta $MIGRATIONS_DIR, nada que hacer."
  exit 0
fi

MIGRATION_FILES=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)
if [ -z "$MIGRATION_FILES" ]; then
  echo "No hay archivos .sql en $MIGRATIONS_DIR"
  exit 0
fi

export PGPASSWORD="${DB_PASS:-}"

echo "========================================"
echo "  Ejecutando migraciones locales"
echo "  DB: $DB_HOST:$DB_PORT/$DB_NAME (schema: $DB_SCHEMA)"
echo "========================================"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE SCHEMA IF NOT EXISTS $DB_SCHEMA;" >/dev/null
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE TABLE IF NOT EXISTS $DB_SCHEMA.migrations_db_log (filename TEXT PRIMARY KEY, executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now());" >/dev/null

MIGRATIONS_APPLIED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT filename FROM $DB_SCHEMA.migrations_db_log" 2>/dev/null)

MIGRATION_COUNT=0
MIGRATION_SUCCESS=0
MIGRATION_FAILED=0

for file in $MIGRATION_FILES; do
  filename=$(basename "$file")

  if echo "$MIGRATIONS_APPLIED" | grep -Fxq "$filename"; then
    echo "Saltando (ya aplicada): $filename"
    continue
  fi

  MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
  echo "[$MIGRATION_COUNT] Ejecutando: $filename"

  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" 2>&1; then
    echo "    ✓ OK"
    MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
    escaped_filename=$(printf "%s" "$filename" | sed "s/'/''/g")
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO $DB_SCHEMA.migrations_db_log (filename) VALUES ('$escaped_filename') ON CONFLICT (filename) DO NOTHING;" >/dev/null
  else
    echo "    ✗ ERROR"
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