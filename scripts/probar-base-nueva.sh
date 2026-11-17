#!/usr/bin/env bash
# ============================================================================
# Construye una BASE NUEVA, en un contenedor DESECHABLE, solo con lo que hay en el repo:
#   db/init/*.sql  →  db/migrations/*.sql  →  backend/*/db/migrations/*.sql
# (el mismo orden que deploy.*.sh: globales antes que las de cada servicio).
#
# Sirve para comprobar que las migraciones de una ronda NO dependen de datos del local.
# No toca ningún ambiente: crea el contenedor `esap-base-nueva` y lo deja arriba para que se
# pueda apuntar un servicio a él (puerto 55433). Retirarlo: docker rm -f esap-base-nueva
#
# Uso:  scripts/probar-base-nueva.sh [log]     (log por defecto: base-nueva.log)
# Imprime los archivos con errores. Los errores previos a esta ronda (p. ej. db/init en una
# base vacía) salen igual: lo que importa es que las migraciones NUEVAS no aparezcan.
# ============================================================================
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# En Windows (Git Bash) docker.exe necesita rutas de Windows para `docker cp`; en Linux no cambia nada.
export MSYS_NO_PATHCONV=1 MSYS2_ENV_CONV_EXCL="*"
RAIZ_D="$RAIZ"; command -v cygpath >/dev/null 2>&1 && RAIZ_D="$(cygpath -m "$RAIZ")"
LOG="${1:-base-nueva.log}"
NOMBRE=esap-base-nueva
PUERTO="${PUERTO_BASE_NUEVA:-55433}"
CLAVE="${DB_PASSWORD:-esap_secure_password_2024}"

docker rm -f "$NOMBRE" >/dev/null 2>&1 || true
docker run -d --name "$NOMBRE" -e POSTGRES_PASSWORD="$CLAVE" -e POSTGRES_DB=esap_db -p "$PUERTO":5432 postgres:16 >/dev/null
for _ in $(seq 1 60); do docker exec "$NOMBRE" pg_isready -U postgres -d esap_db >/dev/null 2>&1 && break; sleep 1; done
sleep 3 # el servidor reinicia una vez tras initdb

docker exec "$NOMBRE" mkdir -p /m
docker cp "$RAIZ_D/db/init" "$NOMBRE":/m/init
docker cp "$RAIZ_D/db/migrations" "$NOMBRE":/m/global
i=0
for d in "$RAIZ"/backend/*/db/migrations; do
  [ -d "$d" ] || continue; i=$((i+1))
  dd="$d"; command -v cygpath >/dev/null 2>&1 && dd="$(cygpath -m "$d")"
  docker cp "$dd" "$NOMBRE":/m/svc$i
done

# Lista ordenada: init, globales (por nombre), luego cada servicio (por nombre).
docker exec "$NOMBRE" bash -c '
  cd /m; : > all.sql
  for d in init global; do
    for f in $(ls $d/*.sql 2>/dev/null | sort -t/ -k2); do echo "\echo >>> $f" >> all.sql; echo "\i /m/$f" >> all.sql; done
  done
  for d in svc*; do
    for f in $(ls $d/*.sql 2>/dev/null | sort -t/ -k2); do echo "\echo >>> $f" >> all.sql; echo "\i /m/$f" >> all.sql; done
  done'
docker exec "$NOMBRE" psql -U postgres -d esap_db -q -f /m/all.sql >"$LOG" 2>&1 || true

echo "Archivos con error (los que aparecen justo antes de un ERROR):"
awk '/^>>> /{f=$2} /ERROR:/{print f}' "$LOG" | sort | uniq -c | sort -rn | head -40
echo "Detalle completo en $LOG. Base nueva en el puerto $PUERTO (contenedor $NOMBRE)."
