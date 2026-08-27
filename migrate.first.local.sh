#!/bin/bash

# =====================================================
# Ejecutar scripts SQL faltantes (fuera de db/migrations)
# Usa variables desde backend/auth-service/.env
# Pasos
# 1. chmod +x run_missing_sql.local.sh -> Dar permisos de ejecución
# 2. ./run_missing_sql.local.sh -> Ejecutar scripts faltantes
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
  # Fallback para Windows (Git Bash)
  PSQL_WINDOWS="/c/Program Files/PostgreSQL/18/bin/psql"
  if [ -x "$PSQL_FALLBACK" ]; then
    export PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH"
  elif [ -x "$PSQL_WINDOWS" ]; then
    export PATH="/c/Program Files/PostgreSQL/18/bin:$PATH"
  else
    echo "Error: psql no encontrado. Instala Postgres CLI o agrega psql al PATH."
    exit 1
  fi
fi

if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ] || [ -z "$DB_SCHEMA" ]; then
  echo "Error: Variables DB_* incompletas en $ENV_FILE"
  exit 1
fi

DB_DIR="db"

if [ ! -d "$DB_DIR" ]; then
  echo "No existe la carpeta $DB_DIR, nada que hacer."
  exit 0
fi

# Encontrar todos los archivos .sql en db/ excepto en db/migrations/
MISSING_FILES=$(find "$DB_DIR" -name "*.sql" -type f | grep -v "^$DB_DIR/migrations/" | sort)

if [ -z "$MISSING_FILES" ]; then
  echo "No hay archivos .sql fuera de $DB_DIR/migrations/"
  exit 0
fi

export PGPASSWORD="${DB_PASS:-}"

echo "========================================"
echo "  Ejecutando scripts SQL faltantes"
echo "  DB: $DB_HOST:$DB_PORT/$DB_NAME (schema: $DB_SCHEMA)"
echo "========================================"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE SCHEMA IF NOT EXISTS $DB_SCHEMA;" >/dev/null
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE TABLE IF NOT EXISTS $DB_SCHEMA.migrations_db_log (filename TEXT PRIMARY KEY, executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now());" >/dev/null

MIGRATIONS_APPLIED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT filename FROM $DB_SCHEMA.migrations_db_log" 2>/dev/null)

SCRIPT_COUNT=0
SCRIPT_SUCCESS=0
SCRIPT_FAILED=0

for file in $MISSING_FILES; do
  filename=$(basename "$file")
  relpath=$(echo "$file" | sed "s|^$DB_DIR/||")

  if echo "$MIGRATIONS_APPLIED" | grep -Fxq "$relpath" || echo "$MIGRATIONS_APPLIED" | grep -Fxq "$filename"; then
    echo "Saltando (ya aplicada): $relpath"
    continue
  fi

  SCRIPT_COUNT=$((SCRIPT_COUNT + 1))
  echo "[$SCRIPT_COUNT] Ejecutando: $relpath"

  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" 2>&1; then
    echo "    ✓ OK"
    SCRIPT_SUCCESS=$((SCRIPT_SUCCESS + 1))
    escaped_relpath=$(printf "%s" "$relpath" | sed "s/'/''/g")
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO $DB_SCHEMA.migrations_db_log (filename) VALUES ('$escaped_relpath') ON CONFLICT (filename) DO NOTHING;" >/dev/null
  else
    echo "    ✗ ERROR"
    SCRIPT_FAILED=$((SCRIPT_FAILED + 1))
  fi
done

echo ""
echo "========================================"
echo "Total: $SCRIPT_COUNT | Exitosas: $SCRIPT_SUCCESS | Fallidas: $SCRIPT_FAILED"
echo "========================================"

if [ "$SCRIPT_FAILED" -gt 0 ]; then
  exit 1
fi