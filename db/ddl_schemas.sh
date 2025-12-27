#!/usr/bin/env bash
set -euo pipefail

# Dump DDL por esquema (sin datos)
# Genera un archivo .sql por esquema usando pg_dump --schema-only

# Asegurar pg_dump en PATH (fallback para Postgres.app en macOS)
if ! command -v pg_dump >/dev/null 2>&1; then
  PG_FALLBACK="/Applications/Postgres.app/Contents/Versions/16/bin/pg_dump"
  if [ -x "$PG_FALLBACK" ]; then
    export PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH"
  else
    echo "Error: pg_dump no encontrado. Instala Postgres CLI o agrega pg_dump al PATH."
    exit 1
  fi
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASS:-}
DB_NAME=${DB_NAME:-esap_db}

SCHEMAS=(
  auth
  certification
  internal_disciplinary_control
  control_interno
  legal_management
  academic_registration
  academic_work_plan
  requerimientos_oc
)

OUTPUT_DIR="$(dirname "$0")/schema_ddls"
mkdir -p "$OUTPUT_DIR"

export PGPASSWORD="$DB_PASS"

echo "--------------------------------------------------------------"
echo "---- DDL for DB_HOST '$DB_HOST' Pass: '$DB_PASS' ----"
echo "--------------------------------------------------------------"

for schema in "${SCHEMAS[@]}"; do
  outfile="$OUTPUT_DIR/${schema}_ddl_$(date +%Y%m%d_%H%M%S).sql"
  echo "🧩 Dumping DDL for schema '$schema' -> $outfile"
  if ! pg_dump \
      --host="$DB_HOST" \
      --port="$DB_PORT" \
      --username="$DB_USER" \
      --dbname="$DB_NAME" \
      --schema="$schema" \
      --schema-only \
      --no-owner \
      --no-privileges \
      --encoding=UTF8 \
      > "$outfile"; then
    echo "⚠️  Esquema '$schema' no encontrado o sin objetos. Se omite."
    rm -f "$outfile"
    continue
  fi
done

echo "-------------------------------------------"
echo "---- DDL exportado en $OUTPUT_DIR ----"
echo "-------------------------------------------"
