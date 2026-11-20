#!/usr/bin/env bash
# ============================================================================
# Carga de datos de Programación Académica en un ambiente (EFDS-2434).
#
#   1. PUENTE docente–área   (db/data/programacion-academica/puente_docente_area.csv)
#   2. CATÁLOGO con las áreas decididas (db/data/programacion-academica/catalogo-importable-2026-1.xlsx)
#
# Es IDEMPOTENTE: el puente reemplaza el puente completo (correrlo dos veces deja lo mismo) y el
# importador del catálogo actualiza lo existente. Por defecto corre en MODO PRUEBA (vista previa,
# no escribe nada): hay que pasar --aplicar para escribir.
#
# Uso:
#   ESAP_USUARIO=superuser@esap.edu.co ESAP_CLAVE='...' \
#     scripts/cargar-datos-programacion.sh --url https://esap-qa.fabricasoftware.co            # prueba
#   ... --aplicar                                                                               # escribe
#   ... --catalogo 2026-1 [--aplicar]      # además carga el catálogo en ese periodo (código AAAA-S)
#   (el gateway se asume en <url>/services; otro prefijo: --ruta-gateway /otro)
#
# La cuenta debe poder importar el RUND (superusuario o GESTION_PROFESORAL). No imprime la clave.
# Requisitos: bash y curl.
# ============================================================================
set -euo pipefail

URL=""; GW_RUTA="/services"; APLICAR="false"; CATALOGO=""
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/db/data/programacion-academica"
PUENTE="$DIR/puente_docente_area.csv"
EXCEL="$DIR/catalogo-importable-2026-1.xlsx"

while [ $# -gt 0 ]; do
  case "$1" in
    --url) URL="${2%/}"; shift 2 ;;
    --ruta-gateway) GW_RUTA="$2"; shift 2 ;;
    --aplicar) APLICAR="true"; shift ;;
    --catalogo) CATALOGO="$2"; shift 2 ;;
    --puente) PUENTE="$2"; shift 2 ;;
    --excel) EXCEL="$2"; shift 2 ;;
    -h|--help) sed -n 2,23p "$0"; exit 0 ;;
    *) echo "Argumento desconocido: $1" >&2; exit 2 ;;
  esac
done
[ -n "$URL" ] || { echo "Falta --url (por ejemplo https://esap-qa.fabricasoftware.co)" >&2; exit 2; }
: "${ESAP_USUARIO:?Defina ESAP_USUARIO}"; : "${ESAP_CLAVE:?Defina ESAP_CLAVE}"
[ -f "$PUENTE" ] || { echo "No existe el archivo del puente: $PUENTE" >&2; exit 2; }
DRY="true"; [ "$APLICAR" = "true" ] && DRY="false"
# En Windows (Git Bash) el curl nativo necesita rutas de Windows; en Linux no cambia nada.
if command -v cygpath >/dev/null 2>&1; then PUENTE="$(cygpath -m "$PUENTE")"; EXCEL="$(cygpath -m "$EXCEL")"; fi
GW="$URL$GW_RUTA"   # el gateway cuelga de /services en todos los ambientes
echo "Ambiente: $URL · modo: $([ "$DRY" = "true" ] && echo 'PRUEBA (no escribe)' || echo 'APLICAR')"

# 1. Sesión: el token viaja en la cookie HttpOnly (esap_access_token); se lee del almacén de cookies de curl.
JAR="$(mktemp)"; trap 'rm -f "$JAR"' EXIT
curl -fsS -c "$JAR" -o /dev/null -X POST "$GW/auth/api/v1/login" -H 'Content-Type: application/json'   --data "$(printf '{"username":"%s","password":"%s"}' "$ESAP_USUARIO" "$ESAP_CLAVE")"   || { echo "No se pudo iniciar sesión." >&2; exit 1; }
TOKEN="$(awk '$6=="esap_access_token"{print $7}' "$JAR" | tail -n1)"
[ -n "$TOKEN" ] || { echo "El login no devolvió token." >&2; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

# 2. Puente docente–área (vista previa o definitivo).
echo; echo "== Puente docente–área ($PUENTE)"
OUT="$(curl -sS -w '\n[HTTP %{http_code}]' -X POST "$GW/pta/api/v1/banco-docentes/nucleos/puente?dry_run=$DRY" -H "$AUTH" -F "file=@$PUENTE;type=text/csv")" || true
echo "$OUT"
case "$OUT" in *"[HTTP 200]"*|*"[HTTP 201]"*) ;; *) echo "La carga del puente falló." >&2; exit 1 ;; esac

# 3. Catálogo (opcional): periodo por código.
if [ -n "$CATALOGO" ]; then
  [ -f "$EXCEL" ] || { echo "No existe el Excel del catálogo: $EXCEL" >&2; exit 2; }
  echo; echo "== Catálogo en el periodo $CATALOGO ($EXCEL)"
  OUT="$(curl -sS -w '\n[HTTP %{http_code}]' -X POST "$GW/pta/api/v1/asignaturas-import/upload?dry_run=$DRY&periodo_codigo=$CATALOGO" -H "$AUTH" \
    -F "file=@$EXCEL;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")" || true
  echo "$OUT"
  case "$OUT" in *"[HTTP 200]"*|*"[HTTP 201]"*) ;; *) echo "La carga del catálogo falló." >&2; exit 1 ;; esac
fi

# 4. Cobertura resultante (solo lectura).
echo; echo "== Cobertura de núcleos de docentes"
curl -fsS "$GW/pta/api/v1/banco-docentes/nucleos/cobertura" -H "$AUTH" || true
echo
[ "$DRY" = "true" ] && echo "Fue una PRUEBA: no se escribió nada. Repita con --aplicar para cargar."
