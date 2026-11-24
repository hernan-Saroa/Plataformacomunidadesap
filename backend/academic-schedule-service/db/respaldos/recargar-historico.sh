#!/usr/bin/env bash
# ============================================================================
# Recarga la programación histórica 2026-1 / 2026-V1 (575 franjas) que retiró la
# migración 082 (EFDS-2447), desde el respaldo del repo.
#
#   ./recargar-historico.sh <contenedor-postgres>            # PRUEBA: informa y no guarda nada
#   ./recargar-historico.sh <contenedor-postgres> --aplicar  # carga de verdad
#
# Ejemplos: superapp-db-qa (QA), superapp-db-dev (dev), superapp-db (local).
# Idempotente: correrlo de nuevo no duplica filas. Solo escribe en
# "academic-schedule".programacion_historica. Usuario y base: PGUSER / PGDATABASE
# (por defecto postgres / esap_db).
# ============================================================================
set -euo pipefail
export MSYS_NO_PATHCONV=1 MSYS2_ENV_CONV_EXCL='*'

C="${1:-}"
MODO="${2:-}"
if [ -z "$C" ] || { [ -n "$MODO" ] && [ "$MODO" != "--aplicar" ]; }; then
  echo "Uso: $0 <contenedor-postgres> [--aplicar]" >&2
  exit 2
fi
APLICAR=0; [ "$MODO" = "--aplicar" ] && APLICAR=1
# pwd -W: ruta de Windows en Git Bash (docker cp no entiende /c/...); en Linux no existe y se usa pwd.
DIR="$(cd "$(dirname "$0")" && { pwd -W 2>/dev/null || pwd; })"
U="${PGUSER:-postgres}"; B="${PGDATABASE:-esap_db}"
T=/tmp/respaldo-historico

docker ps --format '{{.Names}}' | grep -Fxq "$C" || { echo "El contenedor $C no está corriendo." >&2; exit 1; }
docker exec "$C" rm -rf "$T"
docker exec "$C" mkdir -p "$T"
docker cp "$DIR/recargar_programacion_historica.sql" "$C:$T/"
docker cp "$DIR/programacion_historica.datos.sql" "$C:$T/"
[ "$APLICAR" = 1 ] && echo "Recargando la programación histórica en $C (APLICAR)…" || echo "Recarga de la programación histórica en $C: MODO PRUEBA (no guarda nada)…"
set +e
docker exec "$C" psql -q -U "$U" -d "$B" -v aplicar="$APLICAR" -f "$T/recargar_programacion_historica.sql"
R=$?
set -e
docker exec "$C" rm -rf "$T"
exit $R
