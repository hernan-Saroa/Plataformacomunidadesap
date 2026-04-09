#!/bin/bash

# =====================================================
# Script de Despliegue para ESAP SuperApp - ENTORNO DEV
# Servidor: http://4.156.71.181
# Uso: ./deploy.dev.sh [comando]
# =====================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ESAP SuperApp - Entorno DEV          ${NC}"
echo -e "${GREEN}========================================${NC}"

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
if [ -f .env.dev ]; then
    echo -e "${YELLOW}Cargando variables de entorno desde .env.dev...${NC}"
    export $(cat .env.dev | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: Archivo .env.dev no encontrado${NC}"
    echo -e "${YELLOW}Crea el archivo .env.dev con las variables de entorno necesarias${NC}"
    echo -e "${YELLOW}cp .env.example .env.dev${NC}"
    exit 1
fi

COMPOSE_FILE_DEV="docker-compose.dev.yml"
COMPOSE_FILE_MFE="docker-compose.frontend-mfe.yml"
SERVER_URL_DEV="http://4.156.71.181"

compose_dev() {
    docker compose -f "$COMPOSE_FILE_DEV" --env-file .env.dev "$@"
}

compose_dev_mfe() {
    FRONTEND_NETWORK_KEY="superapp-net" \
    FRONTEND_CONTAINER_SUFFIX="-dev" \
    FRONTEND_VITE_API_URL="${FRONTEND_VITE_API_URL:-$SERVER_URL_DEV/services}" \
    FRONTEND_VITE_ONLYOFFICE_URL="${FRONTEND_VITE_ONLYOFFICE_URL:-$SERVER_URL_DEV:9000}" \
    docker compose -f "$COMPOSE_FILE_DEV" -f "$COMPOSE_FILE_MFE" --env-file .env.dev "$@"
}

resolve_mfe_service() {
    case "$1" in
        gateway|frontend)
            echo "frontend"
            ;;
        shell|frontend-shell)
            echo "frontend-shell"
            ;;
        estructura-org|mfe-estructura-org|frontend-mfe-estructura-org)
            echo "frontend-mfe-estructura-org"
            ;;
        gestion-profesoral|mfe-gestion-profesoral|frontend-mfe-gestion-profesoral)
            echo "frontend-mfe-gestion-profesoral"
            ;;
        programas-academicos|mfe-programas-academicos|frontend-mfe-programas-academicos)
            echo "frontend-mfe-programas-academicos"
            ;;
        gestion-personas|mfe-gestion-personas|frontend-mfe-gestion-personas)
            echo "frontend-mfe-gestion-personas"
            ;;
        auditoria|mfe-auditoria|frontend-mfe-auditoria)
            echo "frontend-mfe-auditoria"
            ;;
        reportes|mfe-reportes|frontend-mfe-reportes)
            echo "frontend-mfe-reportes"
            ;;
        registro-academico|mfe-registro-academico|frontend-mfe-registro-academico)
            echo "frontend-mfe-registro-academico"
            ;;
        certificados-laborales|mfe-certificados-laborales|frontend-mfe-certificados-laborales)
            echo "frontend-mfe-certificados-laborales"
            ;;
        firma-electronica|mfe-firma-electronica|frontend-mfe-firma-electronica)
            echo "frontend-mfe-firma-electronica"
            ;;
        control-interno|mfe-control-interno|frontend-mfe-control-interno)
            echo "frontend-mfe-control-interno"
            ;;
        control-disciplinario|mfe-control-disciplinario|frontend-mfe-control-disciplinario)
            echo "frontend-mfe-control-disciplinario"
            ;;
        gestion-legal|mfe-gestion-legal|frontend-mfe-gestion-legal)
            echo "frontend-mfe-gestion-legal"
            ;;
        *)
            return 1
            ;;
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
    echo "  clean-safe - Limpieza segura Docker (preserva volúmenes de BD DEV)"
    echo "  db-backup - Crear backup de la base de datos"
    echo "  db-migrate - Ejecutar migraciones de base de datos"
    echo "  db-reset  - PELIGROSO: Eliminar volumen de DB y reiniciar (requiere confirmación)"
    echo ""
}

# Comando: up
cmd_up() {
    echo -e "${GREEN}Iniciando servicios...${NC}"
    compose_dev up -d
    echo -e "${GREEN}Servicios iniciados exitosamente${NC}"
    echo ""

    # Esperar a que la base de datos esté lista
    echo -e "${YELLOW}Esperando a que la base de datos esté lista...${NC}"
    sleep 5

    # Ejecutar migraciones automáticamente
    echo -e "${YELLOW}Ejecutando migraciones de base de datos...${NC}"
    cmd_db_migrate || echo -e "${YELLOW}Advertencia: Algunas migraciones pueden haber fallado${NC}"

    echo ""
    echo -e "${YELLOW}URLs de acceso:${NC}"
    echo "  Frontend:    http://4.156.71.181"
    echo "  API Gateway: http://4.156.71.181/services"
    echo ""
}

# Comando: down
cmd_down() {
    echo -e "${YELLOW}Deteniendo servicios...${NC}"
    compose_dev down
    echo -e "${GREEN}Servicios detenidos${NC}"
}

# Comando: restart
cmd_restart() {
    echo -e "${YELLOW}Reiniciando servicios...${NC}"
    compose_dev restart
    echo -e "${GREEN}Servicios reiniciados${NC}"
}

# Comando: rebuild
cmd_rebuild() {
    echo -e "${YELLOW}Reconstruyendo servicios (sin detener la versión actual)...${NC}"
    echo -e "${YELLOW}La aplicación seguirá disponible mientras termina el build.${NC}"

    echo -e "${YELLOW}Limpiando node_modules/dist/build locales (frontend y backend) para reducir el contexto de build...${NC}"
    rm -rf node_modules dist build
    find backend -maxdepth 2 -type d \( -name node_modules -o -name dist -o -name build \) -prune -exec rm -rf {} +

    # Construir imágenes con los contenedores actuales activos.
    compose_dev build

    # Publicar nueva versión una vez terminado el build.
    compose_dev up -d

    # Ejecutar migraciones automáticamente
    echo -e "${YELLOW}Ejecutando migraciones de base de datos...${NC}"
    cmd_db_migrate || echo -e "${YELLOW}Advertencia: Algunas migraciones pueden haber fallado${NC}"
    echo -e "${GREEN}Nueva versión publicada. Servicios reconstruidos y reiniciados.${NC}"
}

# Comando: rebuild-frontend (rápido)
cmd_rebuild_frontend() {
    echo -e "${YELLOW}Reconstruyendo solo frontend...${NC}"
    compose_dev build frontend
    compose_dev up -d --no-deps frontend
    echo -e "${GREEN}Frontend reconstruido y reiniciado${NC}"
}

# Comando: rebuild-service (rápido para un microservicio)
cmd_rebuild_service() {
    local service="$1"
    if [ -z "$service" ]; then
        echo -e "${RED}Error: Debes indicar el nombre del servicio${NC}"
        echo -e "${YELLOW}Ejemplo: $0 rebuild-service auth-service${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Reconstruyendo servicio: ${service}${NC}"
    compose_dev build "$service"
    compose_dev up -d --no-deps "$service"
    echo -e "${GREEN}Servicio ${service} reconstruido y reiniciado${NC}"
}

# Comando: rebuild-select (selección interactiva de servicio)
cmd_rebuild_select() {
    echo -e "${YELLOW}Cargando servicios disponibles...${NC}"
    mapfile -t services < <(compose_dev config --services)

    if [ ${#services[@]} -eq 0 ]; then
        echo -e "${RED}No se encontraron servicios en ${COMPOSE_FILE_DEV}${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}Selecciona un servicio para rebuild:${NC}"
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

# Comando: up-mfe
cmd_up_mfe() {
    if [ ! -f "$COMPOSE_FILE_MFE" ]; then
        echo -e "${RED}Error: Archivo ${COMPOSE_FILE_MFE} no encontrado${NC}"
        exit 1
    fi

    echo -e "${GREEN}Iniciando frontend desacoplado (gateway + shell + MFEs)...${NC}"
    compose_dev_mfe up -d frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal
    echo -e "${GREEN}Frontend MFE iniciado exitosamente${NC}"
    echo ""
    echo -e "${YELLOW}URLs de acceso:${NC}"
    echo "  Gateway:     ${SERVER_URL_DEV}"
    echo "  Shell:       ${SERVER_URL_DEV}/"
    echo "  Auditoría:   ${SERVER_URL_DEV}/remotes/mfe-auditoria/"
    echo "  Reportes:    ${SERVER_URL_DEV}/remotes/mfe-reportes/"
    echo ""
}

# Comando: down-mfe
cmd_down_mfe() {
    echo -e "${YELLOW}Deteniendo frontend desacoplado...${NC}"
    compose_dev_mfe stop frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal
    echo -e "${GREEN}Frontend MFE detenido${NC}"
}

# Comando: restart-mfe
cmd_restart_mfe() {
    echo -e "${YELLOW}Reiniciando frontend desacoplado...${NC}"
    compose_dev_mfe restart frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal
    echo -e "${GREEN}Frontend MFE reiniciado${NC}"
}

# Comando: status-mfe
cmd_status_mfe() {
    echo -e "${GREEN}Estado del frontend desacoplado:${NC}"
    compose_dev_mfe ps frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal
}

# Comando: logs-mfe
cmd_logs_mfe() {
    local input_service="$1"

    if [ -n "$input_service" ]; then
        local resolved_service
        if ! resolved_service=$(resolve_mfe_service "$input_service"); then
            echo -e "${RED}Servicio MFE no reconocido: ${input_service}${NC}"
            echo -e "${YELLOW}Usa nombres como: gateway, shell, auditoria, reportes, gestion-personas${NC}"
            exit 1
        fi
        compose_dev_mfe logs -f "$resolved_service"
        return
    fi

    compose_dev_mfe logs -f frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal
}

# Comando: rebuild-mfe
cmd_rebuild_mfe() {
    local input_service="$1"
    local resolved_service

    if [ -z "$input_service" ]; then
        echo -e "${RED}Error: Debes indicar el microfrontend, shell o gateway${NC}"
        echo -e "${YELLOW}Ejemplos:${NC}"
        echo -e "${YELLOW}  $0 rebuild-mfe shell${NC}"
        echo -e "${YELLOW}  $0 rebuild-mfe auditoria${NC}"
        echo -e "${YELLOW}  $0 rebuild-mfe reportes${NC}"
        exit 1
    fi

    if ! resolved_service=$(resolve_mfe_service "$input_service"); then
        echo -e "${RED}Servicio MFE no reconocido: ${input_service}${NC}"
        echo -e "${YELLOW}Usa nombres como: gateway, shell, auditoria, reportes, gestion-personas${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Reconstruyendo servicio frontend MFE: ${resolved_service}${NC}"
    compose_dev_mfe build "$resolved_service"
    compose_dev_mfe up -d --no-deps "$resolved_service"
    echo -e "${GREEN}Servicio ${resolved_service} reconstruido y reiniciado${NC}"
}

# Comando: rebuild-mfe-select
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
    )

    echo ""
    echo -e "${GREEN}Selecciona un servicio frontend MFE para rebuild:${NC}"
    PS3="Ingresa el número (o Ctrl+C para cancelar): "
    select selected in "${services[@]}"; do
        if [ -n "$selected" ]; then
            echo -e "${YELLOW}Servicio seleccionado: ${selected}${NC}"
            cmd_rebuild_mfe "$selected"
            break
        else
            echo -e "${RED}Opción inválida. Intenta de nuevo.${NC}"
        fi
    done
}

# Comando: logs
cmd_logs() {
    compose_dev logs -f
}

# Comando: status
cmd_status() {
    echo -e "${GREEN}Estado de los servicios:${NC}"
    compose_dev ps
}

# Comando: clean
cmd_clean() {
    echo -e "${YELLOW}Limpiando recursos Docker no utilizados...${NC}"
    docker system prune -a -f
    docker volume prune -f
    echo -e "${GREEN}Limpieza completada${NC}"
}

# Comando: clean-safe (preserva datos de DB DEV)
cmd_clean_safe() {
    echo -e "${YELLOW}Limpieza segura Docker (sin borrar volúmenes de BD DEV)...${NC}"
    echo -e "${YELLOW}Estado antes de limpiar:${NC}"
    docker system df

    docker container prune -f
    docker image prune -f
    docker builder prune -f --filter "until=168h"
    docker network prune -f

    # Eliminar solo volúmenes huérfanos, excepto los protegidos de BD DEV
    while IFS= read -r v; do
        [ -z "$v" ] && continue
        case "$v" in
            esap-pgdata-dev|codigosuperappesap_pgdata-dev)
                echo -e "${YELLOW}Volumen protegido (omitido): $v${NC}"
                ;;
            *)
                docker volume rm "$v" >/dev/null 2>&1 || true
                ;;
        esac
    done < <(docker volume ls -qf dangling=true)

    echo -e "${GREEN}Limpieza segura completada${NC}"
    echo -e "${YELLOW}Estado después de limpiar:${NC}"
    docker system df
}

# Comando: db-backup
cmd_db_backup() {
    BACKUP_FILE="backup_esap_dev_$(date +%Y%m%d_%H%M%S).sql"
    echo -e "${YELLOW}Creando backup de la base de datos DEV...${NC}"
    docker exec superapp-db pg_dump -U postgres esap_db > "./db/$BACKUP_FILE"
    echo -e "${GREEN}Backup creado: ./db/$BACKUP_FILE${NC}"
}

# Comando: db-migrate
cmd_db_migrate() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Ejecutando migraciones de BD         ${NC}"
    echo -e "${GREEN}========================================${NC}"

    # Verificar que el contenedor de DB está corriendo
    if ! docker ps --format '{{.Names}}' | grep -q "superapp-db"; then
        echo -e "${RED}Error: El contenedor superapp-db no está corriendo${NC}"
        echo -e "${YELLOW}Ejecuta primero: $0 up${NC}"
        exit 1
    fi

    # Copiar carpeta de migraciones al contenedor
    echo -e "${YELLOW}Copiando migraciones al contenedor...${NC}"
    docker cp ./db/migrations superapp-db:/tmp/migrations

    # Obtener lista de archivos SQL ordenados (usar shell en el contenedor para expandir el wildcard)
    MIGRATION_FILES=$(docker exec superapp-db sh -c "ls -1 /tmp/migrations/*.sql 2>/dev/null | sort")

    if [ -z "$MIGRATION_FILES" ]; then
        echo -e "${YELLOW}No hay archivos de migración para ejecutar${NC}"
        exit 0
    fi

    # Asegurar tabla de control de migraciones en esquema auth
    docker exec superapp-db psql -U postgres -d esap_db -c "CREATE TABLE IF NOT EXISTS auth.migrations_db_log (filename TEXT PRIMARY KEY, executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now());" >/dev/null
    MIGRATIONS_APPLIED=$(docker exec superapp-db psql -U postgres -d esap_db -At -c "SELECT filename FROM auth.migrations_db_log" 2>/dev/null)

    # Ejecutar cada migración
    MIGRATION_COUNT=0
    MIGRATION_SUCCESS=0
    MIGRATION_FAILED=0

    for file in $MIGRATION_FILES; do
        filename=$(basename "$file")

        # Saltar migraciones ya aplicadas
        if echo "$MIGRATIONS_APPLIED" | grep -Fxq "$filename"; then
            echo -e "${YELLOW}Saltando (ya aplicada): $filename${NC}"
            continue
        fi

        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))

        echo -e "${YELLOW}[$MIGRATION_COUNT] Ejecutando: $filename${NC}"

        # Ejecutar migración
        if docker exec superapp-db psql -U postgres -d esap_db -f "$file" 2>&1; then
            echo -e "${GREEN}    ✓ OK${NC}"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
            escaped_filename=$(printf "%s" "$filename" | sed "s/'/''/g")
            docker exec superapp-db psql -U postgres -d esap_db -c "INSERT INTO auth.migrations_db_log (filename) VALUES ('$escaped_filename') ON CONFLICT (filename) DO NOTHING;" >/dev/null
        else
            echo -e "${RED}    ✗ ERROR${NC}"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        fi
    done

    # Limpiar archivos temporales
    docker exec superapp-db rm -rf /tmp/migrations

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "Total: $MIGRATION_COUNT | ${GREEN}Exitosas: $MIGRATION_SUCCESS${NC} | ${RED}Fallidas: $MIGRATION_FAILED${NC}"
    echo -e "${GREEN}========================================${NC}"

    if [ $MIGRATION_FAILED -gt 0 ]; then
        exit 1
    fi
}

# Comando: db-reset (PELIGROSO)
cmd_db_reset() {
    echo -e "${RED}⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de la base de datos DEV${NC}"
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
    compose_dev down

    echo -e "${YELLOW}Eliminando volumen de base de datos...${NC}"
    docker volume rm esap-pgdata-dev 2>/dev/null || docker volume rm codigosuperappesap_pgdata-dev 2>/dev/null || true

    echo -e "${YELLOW}Reiniciando servicios (la DB se recreará)...${NC}"
    compose_dev up -d

    echo -e "${GREEN}Base de datos reiniciada con datos iniciales${NC}"
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
        cmd_db_migrate
        ;;
    db-reset)
        cmd_db_reset
        ;;
    *)
        usage
        exit 1
        ;;
esac
