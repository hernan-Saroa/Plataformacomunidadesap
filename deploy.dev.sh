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

# Función para mostrar uso
usage() {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  up        - Iniciar todos los servicios"
    echo "  down      - Detener todos los servicios"
    echo "  restart   - Reiniciar todos los servicios"
    echo "  rebuild   - Reconstruir y reiniciar todos los servicios"
    echo "  logs      - Ver logs de todos los servicios"
    echo "  status    - Ver estado de los servicios"
    echo "  clean     - Limpiar contenedores e imágenes no usados (NO borra volúmenes)"
    echo "  db-backup - Crear backup de la base de datos"
    echo "  db-migrate - Ejecutar migraciones de base de datos"
    echo "  db-reset  - PELIGROSO: Eliminar volumen de DB y reiniciar (requiere confirmación)"
    echo ""
}

# Comando: up
cmd_up() {
    echo -e "${GREEN}Iniciando servicios...${NC}"
    docker compose -f docker-compose.dev.yml --env-file .env.dev up -d
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
    echo "  API Gateway: http://4.156.71.181:3000"
    echo ""
}

# Comando: down
cmd_down() {
    echo -e "${YELLOW}Deteniendo servicios...${NC}"
    docker compose -f docker-compose.dev.yml down
    echo -e "${GREEN}Servicios detenidos${NC}"
}

# Comando: restart
cmd_restart() {
    echo -e "${YELLOW}Reiniciando servicios...${NC}"
    docker compose -f docker-compose.dev.yml --env-file .env.dev restart
    echo -e "${GREEN}Servicios reiniciados${NC}"
}

# Comando: rebuild
cmd_rebuild() {
    echo -e "${YELLOW}Reconstruyendo servicios...${NC}"
    docker compose -f docker-compose.dev.yml down
    # Construir imagenes
    docker compose -f docker-compose.dev.yml --env-file .env.dev build
    docker compose -f docker-compose.dev.yml --env-file .env.dev up -d
    # Ejecutar migraciones automáticamente
    echo -e "${YELLOW}Ejecutando migraciones de base de datos...${NC}"
    cmd_db_migrate || echo -e "${YELLOW}Advertencia: Algunas migraciones pueden haber fallado${NC}"
    echo -e "${GREEN}Servicios reconstruidos y reiniciados${NC}"
}

# Comando: logs
cmd_logs() {
    docker compose -f docker-compose.dev.yml logs -f
}

# Comando: status
cmd_status() {
    echo -e "${GREEN}Estado de los servicios:${NC}"
    docker compose -f docker-compose.dev.yml ps
}

# Comando: clean
cmd_clean() {
    echo -e "${YELLOW}Limpiando recursos Docker no utilizados...${NC}"
    docker system prune -a -f
    docker volume prune -f
    echo -e "${GREEN}Limpieza completada${NC}"
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
    docker compose -f docker-compose.dev.yml down

    echo -e "${YELLOW}Eliminando volumen de base de datos...${NC}"
    docker volume rm esap-pgdata-dev 2>/dev/null || docker volume rm codigosuperappesap_pgdata-dev 2>/dev/null || true

    echo -e "${YELLOW}Reiniciando servicios (la DB se recreará)...${NC}"
    docker compose -f docker-compose.dev.yml --env-file .env.dev up -d

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
    logs)
        cmd_logs
        ;;
    status)
        cmd_status
        ;;
    clean)
        cmd_clean
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
