#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

COMPOSE_FILE_LOCAL="docker-compose.local.yml"
ENV_FILE_LOCAL=".env.local"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ESAP SuperApp - Entorno LOCAL        ${NC}"
echo -e "${GREEN}========================================${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker no está instalado${NC}"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo -e "${RED}Error: docker compose no está disponible${NC}"
  exit 1
fi

if [ ! -f "$ENV_FILE_LOCAL" ]; then
  echo -e "${YELLOW}No existe ${ENV_FILE_LOCAL}. Creándolo desde .env.example...${NC}"
  cp .env.example "$ENV_FILE_LOCAL"
  cat <<'EOF' >> "$ENV_FILE_LOCAL"

# ================= LOCAL DATABASE =================
# Base de datos ya existente fuera de este compose
LOCAL_DB_HOST=host.docker.internal
LOCAL_DB_PORT=5432
LOCAL_DB_USER=postgres
LOCAL_DB_PASSWORD=postgres
LOCAL_DB_NAME=esap_db

# ================= LOCAL URLS =====================
LOCAL_CORS_ORIGIN=http://localhost
FRONTEND_VITE_API_URL=http://localhost/services
FRONTEND_VITE_ONLYOFFICE_URL=http://localhost:9000
EOF
  echo -e "${YELLOW}Revisa ${ENV_FILE_LOCAL} antes de continuar.${NC}"
fi

compose_local() {
  FRONTEND_NETWORK_KEY="superapp-net" \
  FRONTEND_CONTAINER_SUFFIX="-local" \
  FRONTEND_VITE_API_URL="${FRONTEND_VITE_API_URL:-http://localhost/services}" \
  FRONTEND_VITE_ONLYOFFICE_URL="${FRONTEND_VITE_ONLYOFFICE_URL:-http://localhost:9000}" \
  docker compose -f "$COMPOSE_FILE_LOCAL" --env-file "$ENV_FILE_LOCAL" "$@"
}

load_env_local() {
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE_LOCAL"
  set +a
}

check_tcp_port() {
  local host="$1"
  local port="$2"
  local label="$3"

  if command -v nc >/dev/null 2>&1; then
    if nc -z "$host" "$port" >/dev/null 2>&1; then
      echo -e "${GREEN}OK${NC} ${label} (${host}:${port})"
    else
      echo -e "${RED}FAIL${NC} ${label} (${host}:${port})"
      return 1
    fi
  else
    if (echo >"/dev/tcp/${host}/${port}") >/dev/null 2>&1; then
      echo -e "${GREEN}OK${NC} ${label} (${host}:${port})"
    else
      echo -e "${RED}FAIL${NC} ${label} (${host}:${port})"
      return 1
    fi
  fi
}

check_http_url() {
  local url="$1"
  local label="$2"

  if curl -fsS -o /dev/null "$url"; then
    echo -e "${GREEN}OK${NC} ${label} (${url})"
  else
    echo -e "${RED}FAIL${NC} ${label} (${url})"
    return 1
  fi
}

resolve_mfe_service() {
  case "$1" in
    gateway|frontend) echo "frontend" ;;
    shell|frontend-shell) echo "frontend-shell" ;;
    estructura-org|mfe-estructura-org|frontend-mfe-estructura-org) echo "frontend-mfe-estructura-org" ;;
    gestion-profesoral|mfe-gestion-profesoral|frontend-mfe-gestion-profesoral) echo "frontend-mfe-gestion-profesoral" ;;
    programas-academicos|mfe-programas-academicos|frontend-mfe-programas-academicos) echo "frontend-mfe-programas-academicos" ;;
    gestion-personas|mfe-gestion-personas|frontend-mfe-gestion-personas) echo "frontend-mfe-gestion-personas" ;;
    auditoria|mfe-auditoria|frontend-mfe-auditoria) echo "frontend-mfe-auditoria" ;;
    reportes|mfe-reportes|frontend-mfe-reportes) echo "frontend-mfe-reportes" ;;
    registro-academico|mfe-registro-academico|frontend-mfe-registro-academico) echo "frontend-mfe-registro-academico" ;;
    certificados-laborales|mfe-certificados-laborales|frontend-mfe-certificados-laborales) echo "frontend-mfe-certificados-laborales" ;;
    firma-electronica|mfe-firma-electronica|frontend-mfe-firma-electronica) echo "frontend-mfe-firma-electronica" ;;
    control-interno|mfe-control-interno|frontend-mfe-control-interno) echo "frontend-mfe-control-interno" ;;
    control-disciplinario|mfe-control-disciplinario|frontend-mfe-control-disciplinario) echo "frontend-mfe-control-disciplinario" ;;
    gestion-legal|mfe-gestion-legal|frontend-mfe-gestion-legal) echo "frontend-mfe-gestion-legal" ;;
    *) return 1 ;;
  esac
}

usage() {
  echo "Uso: $0 [comando]"
  echo ""
  echo "Comandos disponibles:"
  echo "  up                 - Levantar toda la app local sin PostgreSQL"
  echo "  down               - Detener toda la app local"
  echo "  restart            - Reiniciar toda la app local"
  echo "  up-backend         - Levantar sólo backend + redis + onlyoffice"
  echo "  up-frontend        - Levantar sólo gateway + shell + MFEs"
  echo "  logs [servicio]    - Ver logs"
  echo "  status             - Ver estado de servicios"
  echo "  health             - Validar puertos y URLs base"
  echo "  db-test            - Probar conexión TCP a la BD externa desde un contenedor"
  echo "  rebuild            - Reconstruir toda la app local"
  echo "  rebuild-service <servicio> - Reconstruir un servicio backend o infra"
  echo "  rebuild-mfe <nombre>       - Reconstruir shell, gateway o un MFE"
  echo ""
}

cmd_up() {
  echo -e "${GREEN}Levantando app local completa sin PostgreSQL...${NC}"
  compose_local up -d --build
  echo ""
  echo -e "${YELLOW}URLs locales:${NC}"
  echo "  Frontend:    http://localhost"
  echo "  API Gateway: http://localhost/services"
  echo "  OnlyOffice:  http://localhost:9000"
}

cmd_down() {
  echo -e "${YELLOW}Deteniendo app local...${NC}"
  compose_local down
}

cmd_restart() {
  echo -e "${YELLOW}Reiniciando app local...${NC}"
  compose_local restart
}

cmd_up_backend() {
  echo -e "${GREEN}Levantando backend local sin PostgreSQL...${NC}"
  compose_local up -d --build redis onlyoffice auth-service academic-registration-service academic-work-plan-service certification-service internal-disciplinary-control-service interoperability-service internal-institutional-control-service legal-management-service notifications-service travel-expenses-service audit-service api-gateway
}

cmd_up_frontend() {
  echo -e "${GREEN}Levantando frontend MFE local...${NC}"
  compose_local up -d --build frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal
}

cmd_logs() {
  if [ -n "$1" ]; then
    compose_local logs -f "$1"
  else
    compose_local logs -f
  fi
}

cmd_status() {
  compose_local ps
}

cmd_health() {
  local failed=0

  echo -e "${YELLOW}Estado de contenedores:${NC}"
  compose_local ps
  echo ""

  echo -e "${YELLOW}Validando puertos publicados:${NC}"
  check_tcp_port "localhost" "80" "Frontend gateway" || failed=1
  check_tcp_port "localhost" "3000" "API Gateway" || failed=1
  check_tcp_port "localhost" "9000" "OnlyOffice" || failed=1
  check_tcp_port "localhost" "3001" "Auth Service" || failed=1
  check_tcp_port "localhost" "3002" "Academic Registration Service" || failed=1
  check_tcp_port "localhost" "3003" "Academic Work Plan Service" || failed=1
  check_tcp_port "localhost" "3004" "Certification Service" || failed=1
  check_tcp_port "localhost" "3005" "Internal Disciplinary Control Service" || failed=1
  check_tcp_port "localhost" "3006" "Interoperability Service" || failed=1
  check_tcp_port "localhost" "3007" "Internal Institutional Control Service" || failed=1
  check_tcp_port "localhost" "3008" "Legal Management Service" || failed=1
  check_tcp_port "localhost" "3009" "Notifications Service" || failed=1
  check_tcp_port "localhost" "3010" "Travel Expenses Service" || failed=1
  check_tcp_port "localhost" "3011" "Audit Service" || failed=1
  echo ""

  echo -e "${YELLOW}Validando respuestas HTTP básicas:${NC}"
  check_http_url "http://localhost/" "Frontend" || failed=1
  check_http_url "http://localhost/services/" "API Gateway" || failed=1
  check_http_url "http://localhost:3005/health" "Disciplinary Health" || failed=1
  check_http_url "http://localhost:3011/health" "Audit Health" || failed=1
  check_http_url "http://localhost:9000/" "OnlyOffice" || failed=1

  if [ "$failed" -ne 0 ]; then
    echo ""
    echo -e "${RED}Se detectaron fallos en la validación local.${NC}"
    exit 1
  fi

  echo ""
  echo -e "${GREEN}Validación local completada correctamente.${NC}"
}

cmd_db_test() {
  load_env_local

  echo -e "${YELLOW}Probando conexión TCP a la base externa desde auth-service...${NC}"
  echo "  Host: ${LOCAL_DB_HOST:-host.docker.internal}"
  echo "  Port: ${LOCAL_DB_PORT:-5432}"
  echo "  DB:   ${LOCAL_DB_NAME:-esap_db}"
  echo "  User: ${LOCAL_DB_USER:-postgres}"
  echo ""

  compose_local run --build --rm --no-deps auth-service node -e "const net=require('net'); const host=process.env.DB_HOST; const port=Number(process.env.DB_PORT || 5432); const socket=net.createConnection({host, port}); socket.setTimeout(5000); socket.on('connect', () => { console.log('DB TCP OK ' + host + ':' + port); socket.end(); process.exit(0); }); socket.on('timeout', () => { console.error('DB TCP timeout ' + host + ':' + port); socket.destroy(); process.exit(1); }); socket.on('error', (err) => { console.error('DB TCP FAIL ' + host + ':' + port + ' -> ' + err.message); process.exit(1); });"
}

cmd_rebuild() {
  echo -e "${YELLOW}Reconstruyendo toda la app local...${NC}"
  compose_local build
  compose_local up -d
}

cmd_rebuild_service() {
  if [ -z "$1" ]; then
    echo -e "${RED}Debes indicar un servicio${NC}"
    exit 1
  fi
  compose_local build "$1"
  compose_local up -d --no-deps "$1"
}

cmd_rebuild_mfe() {
  if [ -z "$1" ]; then
    echo -e "${RED}Debes indicar gateway, shell o un MFE${NC}"
    exit 1
  fi

  local service
  if ! service=$(resolve_mfe_service "$1"); then
    echo -e "${RED}MFE no reconocido: $1${NC}"
    exit 1
  fi

  compose_local build "$service"
  compose_local up -d --no-deps "$service"
}

case "$1" in
  up) cmd_up ;;
  down) cmd_down ;;
  restart) cmd_restart ;;
  up-backend) cmd_up_backend ;;
  up-frontend) cmd_up_frontend ;;
  logs) shift; cmd_logs "$1" ;;
  status) cmd_status ;;
  health) cmd_health ;;
  db-test) cmd_db_test ;;
  rebuild) cmd_rebuild ;;
  rebuild-service) shift; cmd_rebuild_service "$1" ;;
  rebuild-mfe) shift; cmd_rebuild_mfe "$1" ;;
  *) usage ;;
esac
