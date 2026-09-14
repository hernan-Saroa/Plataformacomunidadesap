#!/bin/bash

# =====================================================
# Script de Despliegue para ESAP SuperApp - ENTORNO QA
# Uso: ./deploy.qa.sh [comando]
# =====================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  ESAP SuperApp - Entorno QA           ${NC}"
echo -e "${CYAN}========================================${NC}"

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker no está instalado${NC}"
    exit 1
fi

# Verificar Docker Compose (nuevo: docker compose, legacy: docker-compose)
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose no está instalado${NC}"
    exit 1
fi

# Cargar variables de entorno
if [ -f .env.qa ]; then
    echo -e "${YELLOW}Cargando variables de entorno desde .env.qa...${NC}"
    set -a
    # shellcheck disable=SC1091
    source .env.qa
    set +a
else
    echo -e "${RED}Error: Archivo .env.qa no encontrado${NC}"
    echo -e "${YELLOW}Crea el archivo .env.qa con las variables de entorno necesarias Ej: cp .env.example .env.qa${NC}"
    echo -e "${YELLOW}cp .env.example .env.qa${NC}"
    exit 1
fi

COMPOSE_FILE_ENV="docker-compose.qa.yml"
COMPOSE_FILE_MFE="docker-compose.frontend-mfe.yml"
SERVER_URL_ENV="${SERVER_URL_ENV:-NOT_DEFINED}"
ENV_FILE=".env.qa"
ENV_NETWORK_KEY="superapp-net-qa"
ENV_CONTAINER_SUFFIX="-qa"
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
export COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-1}"
FRONTEND_NGINX_CONTAINERS="${FRONTEND_NGINX_CONTAINERS:-superapp-frontend-qa}"
FRONTEND_MFE_SERVICES=(
    frontend
    frontend-shell
    frontend-mfe-estructura-org
    frontend-mfe-gestion-profesoral
    frontend-mfe-programas-academicos
    frontend-mfe-gestion-personas
    frontend-mfe-auditoria
    frontend-mfe-reportes
    frontend-mfe-registro-academico
    frontend-mfe-certificados-laborales
    frontend-mfe-firma-electronica
    frontend-mfe-control-interno
    frontend-mfe-control-disciplinario
    frontend-mfe-gestion-legal
    frontend-mfe-pta
    frontend-mfe-contratacion
    frontend-mfe-viaticos
    frontend-mfe-programacion-academica
)
FRONTEND_MFE_APP_SERVICES=(
    frontend-shell
    frontend-mfe-estructura-org
    frontend-mfe-gestion-profesoral
    frontend-mfe-programas-academicos
    frontend-mfe-gestion-personas
    frontend-mfe-auditoria
    frontend-mfe-reportes
    frontend-mfe-registro-academico
    frontend-mfe-certificados-laborales
    frontend-mfe-firma-electronica
    frontend-mfe-control-interno
    frontend-mfe-control-disciplinario
    frontend-mfe-gestion-legal
    frontend-mfe-pta
    frontend-mfe-contratacion
    frontend-mfe-viaticos
    frontend-mfe-programacion-academica
)
BACKEND_ENV_SERVICES=(
    api-gateway
    auth-service
    academic-registration-service
    academic-work-plan-service
    certification-service
    internal-disciplinary-control-service
    interoperability-service
    internal-institutional-control-service
    legal-management-service
    notifications-service
    travel-expenses-service
    audit-service
    hiring-service
    academic-schedule-service
)

compose_env() {
    ESAP_BUILD_DATE="${ESAP_BUILD_DATE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}" \
    docker compose -f "$COMPOSE_FILE_ENV" --env-file "$ENV_FILE" "$@"
}

compose_env_mfe() {
    FRONTEND_APP_DOCKERFILE="${FRONTEND_APP_DOCKERFILE:-Dockerfile.frontend.app}" \
    FRONTEND_NETWORK_KEY="$ENV_NETWORK_KEY" \
    FRONTEND_CONTAINER_SUFFIX="$ENV_CONTAINER_SUFFIX" \
    FRONTEND_VITE_API_URL="${FRONTEND_VITE_API_URL:-$SERVER_URL_ENV/services}" \
    FRONTEND_VITE_ONLYOFFICE_URL="${FRONTEND_VITE_ONLYOFFICE_URL:-$SERVER_URL_ENV:9000}" \
    ESAP_BUILD_DATE="${ESAP_BUILD_DATE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}" \
    docker compose -f "$COMPOSE_FILE_ENV" -f "$COMPOSE_FILE_MFE" --env-file "$ENV_FILE" "$@"
}

compose_env_mfe_prebuilt() {
    FRONTEND_APP_DOCKERFILE="Dockerfile.frontend.app.prebuilt" compose_env_mfe "$@"
}

compose_env_mfe_gateway_prebuilt() {
    FRONTEND_GATEWAY_DOCKERFILE="Dockerfile.frontend.gateway.prebuilt" compose_env_mfe "$@"
}

restart_frontend_nginx() {
    local container
    local restarted=0

    for container in $FRONTEND_NGINX_CONTAINERS; do
        if ! docker inspect "$container" >/dev/null 2>&1; then
            continue
        fi

        if [ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null)" != "true" ]; then
            echo -e "${YELLOW}Nginx frontend ${container} no está en ejecución. Omitiendo reinicio.${NC}"
            continue
        fi

        echo -e "${YELLOW}Validando configuración Nginx frontend en ${container}...${NC}"
        docker exec "$container" nginx -t

        echo -e "${YELLOW}Reiniciando Nginx frontend ${container} para tomar cambios...${NC}"
        docker restart "$container" >/dev/null
        echo -e "${GREEN}Nginx frontend ${container} reiniciado${NC}"
        restarted=1
    done

    if [ "$restarted" -eq 0 ]; then
        echo -e "${YELLOW}No se encontró un Nginx frontend activo (${FRONTEND_NGINX_CONTAINERS}). Omitiendo reinicio.${NC}"
    fi
}

cleanup_build_artifacts() {
    echo -e "${YELLOW}Limpiando artefactos locales del backend para reducir el contexto de build...${NC}"
    find backend -maxdepth 2 -type d \( -name node_modules -o -name dist -o -name build \) -prune -exec rm -rf {} +
}

get_docker_free_mb() {
    local docker_root
    docker_root=$(docker info -f '{{.DockerRootDir}}' 2>/dev/null || true)

    if [ -z "$docker_root" ] || [ ! -d "$docker_root" ]; then
        return 1
    fi

    df -Pm "$docker_root" | awk 'NR==2 {print $4}'
}

ensure_docker_disk_space() {
    local min_free_mb="${MIN_DOCKER_FREE_MB:-10240}"
    local free_mb

    if ! free_mb=$(get_docker_free_mb); then
        echo -e "${YELLOW}No fue posible validar espacio libre de Docker. Continuando...${NC}"
        return 0
    fi

    echo -e "${YELLOW}Espacio libre Docker: ${free_mb} MB (mínimo recomendado: ${min_free_mb} MB)${NC}"

    if [ "$free_mb" -ge "$min_free_mb" ]; then
        return 0
    fi

    echo -e "${RED}Espacio insuficiente para construir imágenes Docker.${NC}"

    if [ "${AUTO_CLEAN_DOCKER:-false}" = "true" ]; then
        echo -e "${YELLOW}AUTO_CLEAN_DOCKER=true: ejecutando limpieza segura antes del build...${NC}"
        cmd_clean_safe

        if ! free_mb=$(get_docker_free_mb); then
            return 0
        fi

        echo -e "${YELLOW}Espacio libre Docker después de limpiar: ${free_mb} MB${NC}"
        if [ "$free_mb" -ge "$min_free_mb" ]; then
            return 0
        fi
    fi

    echo -e "${YELLOW}Ejecuta en el server QA:${NC}"
    echo -e "${YELLOW}  ./deploy.qa.sh clean-safe${NC}"
    echo -e "${YELLOW}Luego repite el deploy, o usa:${NC}"
    echo -e "${YELLOW}  AUTO_CLEAN_DOCKER=true $0 ${1:-rebuild}${NC}"
    echo -e "${YELLOW}Si solo cambió frontend, usa un rebuild puntual con menor umbral, por ejemplo:${NC}"
    echo -e "${YELLOW}  MIN_DOCKER_FREE_MB=4096 $0 rebuild-mfe control-interno${NC}"
    exit 1
}

ensure_frontend_dependencies() {
    if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
        echo -e "${YELLOW}Node/npm no están disponibles en el host. Se usará el build Docker tradicional.${NC}"
        return 1
    fi

    local node_major
    node_major=$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)
    if [ "$node_major" -lt 20 ]; then
        echo -e "${YELLOW}Node $(node -v) no es suficiente para Vite 6. Usa Node 20+ para activar el modo rápido.${NC}"
        return 1
    fi

    if [ ! -x node_modules/vite/bin/vite.js ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
        echo -e "${YELLOW}Instalando/sincronizando dependencias frontend una sola vez en el host...${NC}"
        PUPPETEER_SKIP_DOWNLOAD=1 \
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
        npm install --legacy-peer-deps --prefer-offline --no-audit
    else
        echo -e "${GREEN}Dependencias frontend ya sincronizadas.${NC}"
    fi
}

build_frontend_assets_once() {
    if ! ensure_frontend_dependencies; then
        return 1
    fi

    echo -e "${YELLOW}Compilando shell + MFEs una sola vez en el host...${NC}"
    echo -e "${YELLOW}Paralelismo configurable con FRONTEND_BUILD_PARALLELISM, actual: ${FRONTEND_BUILD_PARALLELISM:-2}${NC}"
    PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    VITE_API_URL="${FRONTEND_VITE_API_URL:-$SERVER_URL_ENV/services}" \
    VITE_ONLYOFFICE_URL="${FRONTEND_VITE_ONLYOFFICE_URL:-$SERVER_URL_ENV:9000}" \
    VITE_LOGIN_OPTIONS="${VITE_LOGIN_OPTIONS:-both}" \
    ESAP_BUILD_DATE="${ESAP_BUILD_DATE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}" \
    FRONTEND_BUILD_PARALLELISM="${FRONTEND_BUILD_PARALLELISM:-2}" \
    npm run build
}

append_unique() {
    local value="$1"
    shift
    local existing
    for existing in "$@"; do
        if [ "$existing" = "$value" ]; then
            return 0
        fi
    done
    return 1
}

get_git_change_range() {
    if git rev-parse --verify ORIG_HEAD >/dev/null 2>&1; then
        local orig_head current_head
        orig_head=$(git rev-parse ORIG_HEAD)
        current_head=$(git rev-parse HEAD)
        if [ "$orig_head" != "$current_head" ]; then
            echo "ORIG_HEAD..HEAD"
            return 0
        fi
    fi

    if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
        echo "HEAD~1..HEAD"
        return 0
    fi

    return 1
}

cmd_rebuild_changed() {
    local range="${2:-}"
    local changed_files
    local backend_services=()
    local frontend_services=()
    local changed_file service_dir service_name
    local rebuild_all_frontend=0
    local run_migrations=0

    if [ -z "$range" ]; then
        if ! range=$(get_git_change_range); then
            echo -e "${RED}No fue posible determinar un rango de cambios automáticamente.${NC}"
            echo -e "${YELLOW}Usa: $0 rebuild-changed <rango-git>${NC}"
            echo -e "${YELLOW}Ejemplo: $0 rebuild-changed HEAD~3..HEAD${NC}"
            exit 1
        fi
    fi

    echo -e "${GREEN}Analizando cambios en el rango: ${range}${NC}"
    changed_files=$(git diff --name-only "$range")

    if [ -z "$changed_files" ]; then
        echo -e "${YELLOW}No se detectaron archivos cambiados en ${range}; se reconstruirá frontend-shell para actualizar la fecha de build.${NC}"
    fi

    while IFS= read -r changed_file; do
        [ -z "$changed_file" ] && continue

        case "$changed_file" in
            db/migrations/*)
                run_migrations=1
                ;;
            backend/*/.env.example)
                ;;
            backend/*/*)
                service_dir=$(echo "$changed_file" | cut -d/ -f2)
                service_name="$service_dir"
                if ! append_unique "$service_name" "${backend_services[@]}"; then
                    backend_services+=("$service_name")
                fi
                ;;
            apps/mfe-estructura-org/*)
                service_name="frontend-mfe-estructura-org"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-gestion-profesoral/*)
                service_name="frontend-mfe-gestion-profesoral"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-programas-academicos/*)
                service_name="frontend-mfe-programas-academicos"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-gestion-personas/*)
                service_name="frontend-mfe-gestion-personas"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-auditoria/*)
                service_name="frontend-mfe-auditoria"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-reportes/*)
                service_name="frontend-mfe-reportes"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-registro-academico/*)
                service_name="frontend-mfe-registro-academico"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-certificados-laborales/*)
                service_name="frontend-mfe-certificados-laborales"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-firma-electronica/*)
                service_name="frontend-mfe-firma-electronica"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-control-interno/*)
                service_name="frontend-mfe-control-interno"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-control-disciplinario/*)
                service_name="frontend-mfe-control-disciplinario"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-gestion-legal/*)
                service_name="frontend-mfe-gestion-legal"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-pta/*)
                service_name="frontend-mfe-pta"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-contratacion/*)
                service_name="frontend-mfe-contratacion"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-viaticos/*)
                service_name="frontend-mfe-viaticos"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/mfe-programacion-academica/*)
                service_name="frontend-mfe-programacion-academica"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            apps/shell/*)
                service_name="frontend-shell"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            nginx.frontend.gateway.conf|Dockerfile.frontend.gateway)
                service_name="frontend"
                if ! append_unique "$service_name" "${frontend_services[@]}"; then frontend_services+=("$service_name"); fi
                ;;
            nginx.frontend.static.conf|Dockerfile.frontend.app|docker-compose.frontend-mfe.yml|package.json|package-lock.json|.npmrc|tsconfig.json|tsconfig.node.json|vite.config.ts|scripts/*|packages/*|apps/enums/*|apps/hooks/*|apps/lib/*|apps/services/*|apps/data/*)
                rebuild_all_frontend=1
                ;;
        esac
    done <<< "$changed_files"

    if [ $rebuild_all_frontend -eq 1 ]; then
        frontend_services=("${FRONTEND_MFE_SERVICES[@]}")
    fi

    if ! append_unique "frontend-shell" "${frontend_services[@]}"; then
        frontend_services+=("frontend-shell")
    fi

    if [ ${#backend_services[@]} -eq 0 ] && [ ${#frontend_services[@]} -eq 0 ] && [ $run_migrations -eq 0 ]; then
        echo -e "${YELLOW}No se detectaron servicios afectados por los cambios.${NC}"
        exit 0
    fi

    ensure_docker_disk_space
    cleanup_build_artifacts

    if [ ${#backend_services[@]} -gt 0 ]; then
        echo -e "${YELLOW}Reconstruyendo backend afectado:${NC} ${backend_services[*]}"
        for service_name in "${backend_services[@]}"; do
            echo -e "${YELLOW}Construyendo backend: ${service_name}${NC}"
            compose_env build "$service_name"
            compose_env up -d --no-deps "$service_name"
            echo -e "${YELLOW}Ejecutando migraciones para: ${service_name}...${NC}"
            cmd_db_migrate "$service_name" || echo -e "${YELLOW}Advertencia: Algunas migraciones de ${service_name} pueden haber fallado${NC}"
        done
    fi

    if [ ${#frontend_services[@]} -gt 0 ]; then
        echo -e "${YELLOW}Reconstruyendo frontend afectado:${NC} ${frontend_services[*]}"
        compose_env_mfe build "${frontend_services[@]}"
        if [[ " ${frontend_services[*]} " == *" frontend "* ]]; then
            compose_env_mfe up -d "${frontend_services[@]}"
        else
            compose_env_mfe up -d --no-deps "${frontend_services[@]}"
        fi
        restart_frontend_nginx
    fi

    if [ $run_migrations -eq 1 ]; then
        echo -e "${YELLOW}Ejecutando migraciones generales de base de datos (db/migrations)...${NC}"
        cmd_db_migrate "global" || echo -e "${YELLOW}Advertencia: Algunas migraciones globales pueden haber fallado${NC}"
    fi

    echo -e "${GREEN}Deploy inteligente completado.${NC}"
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
        pta|mfe-pta|frontend-mfe-pta) echo "frontend-mfe-pta" ;;
        contratacion|mfe-contratacion|frontend-mfe-contratacion) echo "frontend-mfe-contratacion" ;;
        viaticos|mfe-viaticos|frontend-mfe-viaticos) echo "frontend-mfe-viaticos" ;;
        programacion-academica|mfe-programacion-academica|frontend-mfe-programacion-academica) echo "frontend-mfe-programacion-academica" ;;
        *) return 1 ;;
    esac
}

# Función para mostrar uso
usage() {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  up        - Iniciar todos los servicios"
    echo "  down      - Detener todos los servicios"
    echo "  restart   - Reiniciar todos los servicios"
    echo "  rebuild   - Reconstruir sin bajar servicios y publicar al finalizar"
    echo "  rebuild-fresh - Bajar stack, limpiar imágenes/cache y reconstruir todo sin borrar DB"
    echo "  rebuild-all-mfe - Reconstruir backend + gateway + shell + todos los MFEs"
    echo "  rebuild-changed [rango] - Reconstruir solo servicios afectados por el último pull o por un rango git"
    echo "  rebuild-frontend - Reconstruir y reiniciar solo frontend"
    echo "  rebuild-service <servicio> - Reconstruir y reiniciar solo un servicio"
    echo "  rebuild-select - Seleccionar interactivamente un servicio para rebuild"
    echo "  up-mfe    - Iniciar frontend desacoplado: gateway + shell + MFEs"
    echo "  down-mfe  - Detener frontend desacoplado"
    echo "  restart-mfe - Reiniciar frontend desacoplado"
    echo "  status-mfe - Ver estado de gateway, shell y MFEs"
    echo "  logs-mfe [servicio] - Ver logs del stack MFE o de un MFE puntual"
    echo "  rebuild-mfe <nombre> - Reconstruir y reiniciar gateway, shell o un MFE"
    echo "  rebuild-mfe-select - Seleccionar interactivamente un servicio frontend MFE"
    echo "  logs      - Ver logs de todos los servicios"
    echo "  status    - Ver estado de los servicios"
    echo "  clean     - Limpiar contenedores e imágenes no usados (NO borra volúmenes)"
    echo "  clean-safe - Limpieza segura Docker (preserva volúmenes de BD QA)"
    echo "  db-backup  - Crear backup de la base de datos"
    echo "  db-migrate - Ejecutar migraciones de base de datos"
    echo "  db-reset   - PELIGROSO: Eliminar volumen de DB y reiniciar (requiere confirmación)"
    echo ""
}

# Comando: up
cmd_up() {
    echo -e "${GREEN}Iniciando servicios QA...${NC}"
    compose_env up -d
    restart_frontend_nginx
    echo -e "${GREEN}Servicios QA iniciados exitosamente${NC}"

    # Esperar a que la base de datos esté lista
    echo -e "${YELLOW}Esperando a que la base de datos esté lista...${NC}"
    sleep 5

    # Ejecutar migraciones automáticamente
    echo -e "${YELLOW}Ejecutando migraciones de base de datos...${NC}"
    cmd_db_migrate || echo -e "${YELLOW}Advertencia: Algunas migraciones pueden haber fallado${NC}"

    echo ""
    echo -e "${YELLOW}URLs de acceso (QA):${NC}"
    echo "  Frontend:    ${SERVER_URL_ENV}"
    echo "  API Gateway: ${SERVER_URL_ENV}/services"
    echo ""
}

# Comando: down
cmd_down() {
    echo -e "${YELLOW}Deteniendo servicios QA...${NC}"
    compose_env down
    echo -e "${GREEN}Servicios QA detenidos${NC}"
}

# Comando: restart
cmd_restart() {
    echo -e "${YELLOW}Reiniciando servicios QA...${NC}"
    compose_env restart
    restart_frontend_nginx
    echo -e "${GREEN}Servicios QA reiniciados${NC}"
}

# Comando: rebuild
cmd_rebuild() {
    echo -e "${YELLOW}Reconstruyendo servicios QA (sin detener la versión actual)...${NC}"
    echo -e "${YELLOW}La aplicación seguirá disponible mientras termina el build.${NC}"

    ensure_docker_disk_space
    cleanup_build_artifacts

    # Construir imágenes con los contenedores actuales activos.
    compose_env build

    # Publicar nueva versión una vez terminado el build.
    compose_env up -d
    restart_frontend_nginx
    # Ejecutar migraciones por microservicio y globales
    echo -e "${YELLOW}Ejecutando migraciones de base de datos por microservicio...${NC}"
    for svc in "${BACKEND_ENV_SERVICES[@]}"; do
        cmd_db_migrate "$svc" || true
    done
    echo -e "${YELLOW}Ejecutando migraciones globales...${NC}"
    cmd_db_migrate "global" || true
    echo -e "${GREEN}Nueva versión QA publicada. Servicios reconstruidos y reiniciados.${NC}"
}

cmd_rebuild_fresh() {
    if [ ! -f "$COMPOSE_FILE_MFE" ]; then
        echo -e "${RED}Error: Archivo ${COMPOSE_FILE_MFE} no encontrado${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Reconstrucción fresca QA: se detendrá el stack y habrá downtime.${NC}"
    echo -e "${YELLOW}Se eliminarán contenedores detenidos, imágenes no usadas y caché Docker.${NC}"
    echo -e "${GREEN}No se ejecutará docker volume prune ni docker compose down -v; los volúmenes de DB se conservan.${NC}"
    echo -e "${YELLOW}Recomendado antes de producción: ejecutar db-backup manualmente si hay espacio suficiente.${NC}"

    if [ "${REBUILD_FRESH_CONFIRM:-false}" != "true" ]; then
        echo ""
        read -p "Escribe REBUILD_FRESH para continuar: " confirm
        if [ "$confirm" != "REBUILD_FRESH" ]; then
            echo -e "${YELLOW}Operación cancelada${NC}"
            exit 1
        fi
    fi

    cleanup_build_artifacts

    echo -e "${YELLOW}Deteniendo stack QA sin borrar volúmenes...${NC}"
    compose_env_mfe down --remove-orphans

    echo -e "${YELLOW}Eliminando imágenes no usadas y caché Docker...${NC}"
    docker system prune -a -f
    docker builder prune -a -f

    ensure_docker_disk_space

    echo -e "${YELLOW}Reconstruyendo todo el stack QA desde cero...${NC}"
    compose_env_mfe build
    compose_env_mfe up -d

    echo -e "${YELLOW}Esperando a que la base de datos esté lista...${NC}"
    sleep 5

    echo -e "${YELLOW}Ejecutando migraciones de base de datos por microservicio...${NC}"
    for svc in "${BACKEND_ENV_SERVICES[@]}"; do
        cmd_db_migrate "$svc" || true
    done
    echo -e "${YELLOW}Ejecutando migraciones globales...${NC}"
    cmd_db_migrate "global" || true

    restart_frontend_nginx
    echo -e "${GREEN}App completa QA publicada: microservicios + microfrontends.${NC}"
}

cmd_rebuild_all_mfe() {
    if [ ! -f "$COMPOSE_FILE_MFE" ]; then
        echo -e "${RED}Error: Archivo ${COMPOSE_FILE_MFE} no encontrado${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Reconstruyendo backend + gateway + shell + todos los MFEs QA...${NC}"
    echo -e "${YELLOW}La aplicación seguirá disponible mientras termina el build.${NC}"
    echo -e "${YELLOW}Modo rápido QA: build frontend en host + empaquetado Nginx liviano.${NC}"
    echo -e "${YELLOW}Para forzar el flujo Docker anterior usa: MFE_DOCKER_BUILD_ONLY=true $0 rebuild-all-mfe${NC}"

    ensure_docker_disk_space
    cleanup_build_artifacts

    if [ "${MFE_DOCKER_BUILD_ONLY:-false}" = "true" ]; then
        echo -e "${YELLOW}Usando build Docker tradicional para todo el stack MFE...${NC}"
        compose_env_mfe build
        compose_env_mfe up -d
    elif build_frontend_assets_once; then
        echo -e "${YELLOW}Reconstruyendo backend...${NC}"
        compose_env_mfe build "${BACKEND_ENV_SERVICES[@]}"

        echo -e "${YELLOW}Empaquetando shell + MFEs desde artefactos ya compilados...${NC}"
        compose_env_mfe_prebuilt build --no-cache "${FRONTEND_MFE_APP_SERVICES[@]}"
        compose_env_mfe_prebuilt up -d --force-recreate "${FRONTEND_MFE_APP_SERVICES[@]}"
        echo -e "${YELLOW}Empaquetando gateway frontend con artefactos estáticos completos...${NC}"
        compose_env_mfe_gateway_prebuilt build --no-cache frontend
        compose_env_mfe_gateway_prebuilt up -d --no-deps --force-recreate frontend
    else
        echo -e "${YELLOW}Fallback: usando build Docker tradicional para todo el stack MFE...${NC}"
        compose_env_mfe build
        compose_env_mfe up -d
    fi

    echo -e "${YELLOW}Ejecutando migraciones de base de datos por microservicio...${NC}"
    for svc in "${BACKEND_ENV_SERVICES[@]}"; do
        cmd_db_migrate "$svc" || true
    done
    echo -e "${YELLOW}Ejecutando migraciones globales...${NC}"
    cmd_db_migrate "global" || true

    restart_frontend_nginx
    echo -e "${GREEN}App completa QA publicada: microservicios + microfrontends.${NC}"
}

# Comando: rebuild-frontend (rápido)
cmd_rebuild_frontend() {
    echo -e "${YELLOW}Reconstruyendo solo frontend QA...${NC}"
    ensure_docker_disk_space
    compose_env build frontend
    compose_env up -d --no-deps frontend
    restart_frontend_nginx
    echo -e "${GREEN}Frontend QA reconstruido y reiniciado${NC}"
}

# Comando: rebuild-service (rápido para un microservicio)
cmd_rebuild_service() {
    local service="$1"
    if [ -z "$service" ]; then
        echo -e "${RED}Error: Debes indicar el nombre del servicio${NC}"
        echo -e "${YELLOW}Ejemplo: $0 rebuild-service auth-service${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Reconstruyendo servicio QA: ${service}${NC}"
    ensure_docker_disk_space
    compose_env build "$service"
    compose_env up -d --no-deps "$service"
    echo -e "${YELLOW}Ejecutando migraciones asociadas al servicio ${service}...${NC}"
    cmd_db_migrate "$service" || echo -e "${YELLOW}Advertencia: Algunas migraciones del servicio pueden haber fallado${NC}"
    echo -e "${GREEN}Servicio QA ${service} reconstruido y reiniciado${NC}"
}

# Comando: rebuild-select (selección interactiva de servicio)
cmd_rebuild_select() {
    echo -e "${YELLOW}Cargando servicios QA disponibles...${NC}"
    mapfile -t services < <(compose_env config --services)

    if [ ${#services[@]} -eq 0 ]; then
        echo -e "${RED}No se encontraron servicios en ${COMPOSE_FILE_ENV}${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}Selecciona un servicio QA para rebuild:${NC}"
    PS3="Ingresa el número (o Ctrl+C para cancelar): "
    select selected in "${services[@]}"; do
        if [ -n "$selected" ]; then
            echo -e "${YELLOW}Servicio seleccionado: ${selected}${NC}"
            cmd_rebuild_service "$selected"
            break
        else
            echo -e "${RED}Opción inválida. Intenta de nuevo.${NC}"
        fi
    done
}

cmd_up_mfe() {
    if [ ! -f "$COMPOSE_FILE_MFE" ]; then
        echo -e "${RED}Error: Archivo ${COMPOSE_FILE_MFE} no encontrado${NC}"
        exit 1
    fi
    echo -e "${GREEN}Iniciando frontend desacoplado QA...${NC}"
    compose_env_mfe up -d frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal frontend-mfe-pta frontend-mfe-contratacion frontend-mfe-viaticos frontend-mfe-programacion-academica
    restart_frontend_nginx
    echo -e "${GREEN}Frontend MFE QA iniciado exitosamente${NC}"
}

cmd_down_mfe() {
    echo -e "${YELLOW}Deteniendo frontend desacoplado QA...${NC}"
    compose_env_mfe stop frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal frontend-mfe-pta frontend-mfe-contratacion frontend-mfe-viaticos frontend-mfe-programacion-academica
    echo -e "${GREEN}Frontend MFE QA detenido${NC}"
}

cmd_restart_mfe() {
    echo -e "${YELLOW}Reiniciando frontend desacoplado QA...${NC}"
    compose_env_mfe restart frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal frontend-mfe-pta frontend-mfe-contratacion frontend-mfe-viaticos frontend-mfe-programacion-academica
    restart_frontend_nginx
    echo -e "${GREEN}Frontend MFE QA reiniciado${NC}"
}

cmd_status_mfe() {
    echo -e "${GREEN}Estado del frontend desacoplado QA:${NC}"
    compose_env_mfe ps frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal frontend-mfe-pta frontend-mfe-contratacion frontend-mfe-viaticos frontend-mfe-programacion-academica
}

cmd_logs_mfe() {
    local input_service="$1"
    if [ -n "$input_service" ]; then
        local resolved_service
        if ! resolved_service=$(resolve_mfe_service "$input_service"); then
            echo -e "${RED}Servicio MFE no reconocido: ${input_service}${NC}"
            exit 1
        fi
        compose_env_mfe logs -f "$resolved_service"
        return
    fi
    compose_env_mfe logs -f frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal frontend-mfe-pta frontend-mfe-contratacion frontend-mfe-viaticos frontend-mfe-programacion-academica
}

cmd_rebuild_mfe() {
    local input_service="$1"
    local resolved_service
    if [ -z "$input_service" ]; then
        echo -e "${RED}Error: Debes indicar el microfrontend, shell o gateway${NC}"
        exit 1
    fi
    if ! resolved_service=$(resolve_mfe_service "$input_service"); then
        echo -e "${RED}Servicio MFE no reconocido: ${input_service}${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Reconstruyendo servicio frontend MFE QA: ${resolved_service}${NC}"
    ensure_docker_disk_space
    compose_env_mfe build "$resolved_service"
    if [ "$resolved_service" = "frontend" ]; then
        compose_env_mfe up -d "$resolved_service"
    else
        compose_env_mfe up -d --no-deps "$resolved_service"
    fi
    restart_frontend_nginx
    echo -e "${GREEN}Servicio ${resolved_service} reconstruido y reiniciado${NC}"
}

cmd_rebuild_mfe_select() {
    local services=(
        "frontend"
        "frontend-shell"
        "frontend-mfe-estructura-org"
        "frontend-mfe-gestion-profesoral"
        "frontend-mfe-programas-academicos"
        "frontend-mfe-gestion-personas"
        "frontend-mfe-auditoria"
        "frontend-mfe-reportes"
        "frontend-mfe-registro-academico"
        "frontend-mfe-certificados-laborales"
        "frontend-mfe-firma-electronica"
        "frontend-mfe-control-interno"
        "frontend-mfe-control-disciplinario"
        "frontend-mfe-gestion-legal"
        "frontend-mfe-pta"
        "frontend-mfe-contratacion"
        "frontend-mfe-viaticos"
        "frontend-mfe-programacion-academica"
    )
    echo -e "${GREEN}Selecciona un servicio frontend MFE QA para rebuild:${NC}"
    PS3="Ingresa el número (o Ctrl+C para cancelar): "
    select selected in "${services[@]}"; do
        if [ -n "$selected" ]; then
            cmd_rebuild_mfe "$selected"
            break
        else
            echo -e "${RED}Opción inválida. Intenta de nuevo.${NC}"
        fi
    done
}

# Comando: logs
cmd_logs() {
    compose_env logs -f
}

# Comando: status
cmd_status() {
    echo -e "${GREEN}Estado de los servicios QA:${NC}"
    compose_env ps
}

# Comando: clean
cmd_clean() {
    echo -e "${YELLOW}Limpiando recursos Docker no utilizados...${NC}"
    docker system prune -f
    echo -e "${GREEN}Limpieza completada${NC}"
}

# Comando: clean-safe (preserva datos de DB QA)
cmd_clean_safe() {
    echo -e "${YELLOW}Limpieza segura Docker QA (sin borrar volúmenes de BD)...${NC}"
    echo -e "${YELLOW}Estado antes de limpiar:${NC}"
    docker system df

    docker container prune -f
    # Elimina imágenes NO usadas (aunque estén "taggeadas").
    # No borra imágenes en uso por contenedores en ejecución.
    docker image prune -a -f
    docker builder prune -a -f
    docker network prune -f

    # Eliminar solo volúmenes huérfanos, excepto los protegidos de BD QA
    while IFS= read -r v; do
        [ -z "$v" ] && continue
        case "$v" in
            esap-pgdata-qa|codigosuperappesap_pgdata-qa)
                echo -e "${YELLOW}Volumen protegido (omitido): $v${NC}"
                ;;
            *)
                docker volume rm "$v" >/dev/null 2>&1 || true
                ;;
        esac
    done < <(docker volume ls -qf dangling=true)

    echo -e "${GREEN}Limpieza segura QA completada${NC}"
    echo -e "${YELLOW}Estado después de limpiar:${NC}"
    docker system df
}

# Comando: db-backup
cmd_db_backup() {
    BACKUP_FILE="backup_esap_qa_$(date +%Y%m%d_%H%M%S).sql"
    echo -e "${YELLOW}Creando backup de la base de datos QA...${NC}"
    docker exec superapp-db-qa pg_dump -U postgres esap_db > "./db/$BACKUP_FILE"
    echo -e "${GREEN}Backup creado: ./db/$BACKUP_FILE${NC}"
}

# Comando: db-migrate
cmd_db_migrate() {
    local target_service="${1:-}"

    echo -e "${YELLOW}Ejecutando migraciones de base de datos QA...${NC}"
    if [ -n "$target_service" ] && [ "$target_service" != "all" ]; then
        echo -e "${CYAN}Filtro aplicado: microservicio ${target_service}${NC}"
    fi

    # Verificar que el contenedor de la base de datos está corriendo
    if ! docker ps --format '{{.Names}}' | grep -q "superapp-db-qa"; then
        echo -e "${RED}Error: El contenedor superapp-db-qa no está corriendo${NC}"
        return 1
    fi

    # Preparar carpeta temporal limpia en el contenedor
    docker exec superapp-db-qa rm -rf /tmp/migrations
    docker exec superapp-db-qa mkdir -p /tmp/migrations

    local found_migrations=0

    if [ -n "$target_service" ] && [ "$target_service" != "all" ]; then
        if [ "$target_service" = "global" ] || [ "$target_service" = "root" ]; then
            echo -e "${YELLOW}Copiando migraciones globales (./db/migrations)...${NC}"
            if [ -d "./db/migrations" ]; then
                docker cp ./db/migrations/. superapp-db-qa:/tmp/migrations/global/
                docker exec superapp-db-qa sh -c "find /tmp/migrations/global -mindepth 2 -type f -delete 2>/dev/null || true"
                found_migrations=1
            fi
        else
            # Caso 1: Migración para un servicio específico
            echo -e "${YELLOW}Buscando migraciones para servicio: ${target_service}...${NC}"

            local possible_dirs=("$target_service")
            if [[ "$target_service" == *-service ]]; then
                possible_dirs+=("${target_service%-service}")
            else
                possible_dirs+=("${target_service}-service")
            fi

            for dir in "${possible_dirs[@]}"; do
                if [ -d "./backend/$dir/db/migrations" ] && [ -n "$(find "./backend/$dir/db/migrations" -maxdepth 2 -type f -name '*.sql' 2>/dev/null)" ]; then
                    echo -e "${GREEN}  Encontrado en backend/${dir}/db/migrations${NC}"
                    docker exec superapp-db-qa mkdir -p "/tmp/migrations/backend-$dir"
                    docker cp "./backend/$dir/db/migrations/." "superapp-db-qa:/tmp/migrations/backend-$dir/"
                    found_migrations=1
                fi
                if [ -d "./db/migrations/$dir" ] && [ -n "$(find "./db/migrations/$dir" -maxdepth 2 -type f -name '*.sql' 2>/dev/null)" ]; then
                    echo -e "${GREEN}  Encontrado en db/migrations/${dir}${NC}"
                    docker exec superapp-db-qa mkdir -p "/tmp/migrations/db-$dir"
                    docker cp "./db/migrations/$dir/." "superapp-db-qa:/tmp/migrations/db-$dir/"
                    found_migrations=1
                fi
            done

            if [ $found_migrations -eq 0 ]; then
                echo -e "${YELLOW}No se encontraron archivos de migración específicos para el servicio: ${target_service}${NC}"
                docker exec superapp-db-qa rm -rf /tmp/migrations
                return 0
            fi
        fi
    else
        # Caso 2: Migraciones globales + todos los microservicios
        if [ -d "./db/migrations" ]; then
            docker cp ./db/migrations/. superapp-db-qa:/tmp/migrations/global/
            found_migrations=1
        fi

        for svc_dir in ./backend/*/db/migrations; do
            if [ -d "$svc_dir" ] && [ -n "$(find "$svc_dir" -maxdepth 2 -type f -name '*.sql' 2>/dev/null)" ]; then
                svc_name=$(basename "$(dirname "$svc_dir")")
                echo -e "${GREEN}  Incluyendo migraciones de: backend/${svc_name}/db/migrations${NC}"
                docker exec superapp-db-qa mkdir -p "/tmp/migrations/services/$svc_name"
                docker cp "$svc_dir/." "superapp-db-qa:/tmp/migrations/services/$svc_name/"
                found_migrations=1
            fi
        done
    fi

    # Obtener lista de archivos SQL ordenados recursivamente (excluyendo la carpeta 'old' y 'archive')
    MIGRATION_FILES=$(docker exec superapp-db-qa sh -c "find /tmp/migrations -type f -name '*.sql' ! -path '*/old/*' ! -path '*/archive/*' ! -path '*/.*' 2>/dev/null | sort")

    if [ -z "$MIGRATION_FILES" ]; then
        echo -e "${YELLOW}No se encontraron archivos de migración${NC}"
        docker exec superapp-db-qa rm -rf /tmp/migrations
        return 0
    fi

    # Asegurar tabla de control de migraciones en esquema auth
    docker exec superapp-db-qa psql -U postgres -d esap_db -c "CREATE TABLE IF NOT EXISTS auth.migrations_db_log (filename TEXT PRIMARY KEY, executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now());" >/dev/null
    MIGRATIONS_APPLIED=$(docker exec superapp-db-qa psql -U postgres -d esap_db -At -c "SELECT filename FROM auth.migrations_db_log" 2>/dev/null)

    MIGRATION_COUNT=0
    MIGRATION_SUCCESS=0
    MIGRATION_FAILED=0

    # Ejecutar cada migración
    for file in $MIGRATION_FILES; do
        filename=$(basename "$file")
        relpath=$(echo "$file" | sed 's|^/tmp/migrations/||')

        # Saltar migraciones ya aplicadas (buscando por ruta relativa o por nombre de archivo)
        if echo "$MIGRATIONS_APPLIED" | grep -Fxq "$relpath" || echo "$MIGRATIONS_APPLIED" | grep -Fxq "$filename"; then
            echo -e "${YELLOW}Saltando (ya aplicada): $relpath ($filename)${NC}"
            continue
        fi

        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
        echo -e "${CYAN}Ejecutando migración: $relpath${NC}"

        if docker exec superapp-db-qa psql -U postgres -d esap_db -f "$file" 2>&1; then
            echo -e "${GREEN}✓ $relpath ejecutado exitosamente${NC}"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
            escaped_relpath=$(printf "%s" "$relpath" | sed "s/'/''/g")
            escaped_filename=$(printf "%s" "$filename" | sed "s/'/''/g")
            docker exec superapp-db-qa psql -U postgres -d esap_db -c "INSERT INTO auth.migrations_db_log (filename) VALUES ('$escaped_relpath') ON CONFLICT (filename) DO NOTHING;" >/dev/null
            docker exec superapp-db-qa psql -U postgres -d esap_db -c "INSERT INTO auth.migrations_db_log (filename) VALUES ('$escaped_filename') ON CONFLICT (filename) DO NOTHING;" >/dev/null
        else
            echo -e "${RED}✗ Error ejecutando $relpath${NC}"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        fi
    done

    # Limpiar archivos temporales
    docker exec superapp-db-qa rm -rf /tmp/migrations

    echo -e "${GREEN}Migraciones completadas${NC}"
    echo -e "Total: $MIGRATION_COUNT | ${GREEN}Exitosas: $MIGRATION_SUCCESS${NC} | ${RED}Fallidas: $MIGRATION_FAILED${NC}"
}

# Comando: db-reset (PELIGROSO)
cmd_db_reset() {
    echo -e "${RED}⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de la base de datos QA${NC}"
    echo -e "${RED}⚠️  Esta acción NO se puede deshacer${NC}"
    echo ""
    read -p "¿Estás seguro? Escribe 'ELIMINAR' para confirmar: " confirm
    if [ "$confirm" != "ELIMINAR" ]; then
        echo -e "${YELLOW}Operación cancelada${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Creando backup antes de eliminar...${NC}"
    cmd_db_backup

    echo -e "${YELLOW}Deteniendo servicios...${NC}"
    compose_env down

    echo -e "${YELLOW}Eliminando volumen de base de datos...${NC}"
    docker volume rm esap-pgdata-qa 2>/dev/null || docker volume rm codigosuperappesap_pgdata-qa 2>/dev/null || true

    echo -e "${YELLOW}Reiniciando servicios (la DB se recreará)...${NC}"
    compose_env up -d

    echo -e "${GREEN}Base de datos QA reiniciada con datos iniciales${NC}"
}

# Main
case "$1" in
    up)
        cmd_up
        ;;
    down)
        cmd_down
        ;;
    restart)
        cmd_restart
        ;;
    rebuild)
        cmd_rebuild
        ;;
    rebuild-fresh)
        cmd_rebuild_fresh
        ;;
    rebuild-all-mfe)
        cmd_rebuild_all_mfe
        ;;
    rebuild-changed)
        cmd_rebuild_changed "$@"
        ;;
    rebuild-frontend)
        cmd_rebuild_frontend
        ;;
    rebuild-service)
        cmd_rebuild_service "$2"
        ;;
    rebuild-select)
        cmd_rebuild_select
        ;;
    up-mfe)
        cmd_up_mfe
        ;;
    down-mfe)
        cmd_down_mfe
        ;;
    restart-mfe)
        cmd_restart_mfe
        ;;
    status-mfe)
        cmd_status_mfe
        ;;
    logs-mfe)
        cmd_logs_mfe "$2"
        ;;
    rebuild-mfe)
        cmd_rebuild_mfe "$2"
        ;;
    rebuild-mfe-select)
        cmd_rebuild_mfe_select
        ;;
    logs)
        cmd_logs
        ;;
    status)
        cmd_status
        ;;
    clean)
        cmd_clean
        ;;
    clean-safe)
        cmd_clean_safe
        ;;
    db-backup)
        cmd_db_backup
        ;;
    db-migrate)
        cmd_db_migrate "$2"
        ;;
    db-reset)
        cmd_db_reset
        ;;
    *)
        usage
        exit 1
        ;;
esac
