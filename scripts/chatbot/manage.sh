#!/usr/bin/env bash
# Ejecutar con Bash. Solo administra el chatbot y su instancia de IA.
set -euo pipefail
chatbot_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$chatbot_root"
source scripts/chatbot/compose-profile.sh
environment="${1:-}"
command="${2:-}"
case "$environment" in dev) bind_port=11436;; qa) bind_port=11446;; pre) bind_port=11456;; prod) bind_port=11466;; *) echo 'Uso: bash scripts/chatbot/manage.sh dev|qa|pre|prod init|install-ai|check|deploy|status [remote]'; exit 1;; esac
case "$command" in
    init)
        if [ "$#" -gt 3 ]; then echo 'Chatbot: demasiadas opciones para init.' >&2; exit 1; fi
        case "${3:-local}" in local|remote) ;; *) echo 'Chatbot: init admite únicamente local o remote.' >&2; exit 1;; esac
        ;;
    install-ai|check|deploy|status)
        if [ "$#" -ne 2 ]; then echo 'Chatbot: este comando no admite opciones adicionales.' >&2; exit 1; fi
        ;;
    *) echo 'Chatbot: comando no reconocido.' >&2; exit 1;;
esac
profile="${CHATBOT_KNOWLEDGE_ENV_FILE:-./backend/chatbot-service/.env.knowledge.$environment}"
project="esap-chatbot-ai-$environment"
if [ "$environment" = dev ]; then project=esap-chatbot-ai; fi

if [ "$command" = init ]; then
    if [ -e "$profile" ]; then echo 'Chatbot: el archivo ya existe; se conservó sin cambios.' >&2; exit 1; fi
    mode=true; model_url=http://chatbot-ollama:11434
    if [ "${3:-}" = remote ]; then mode=false; model_url=https://REEMPLAZAR-SERVIDOR-IA; fi
    # Exclusión de escritura y permisos privados; no sobrescribir ni pedir secretos.
    (umask 077; set -o noclobber
        awk -v port="$bind_port" -v network="${project}_default" -v mode="$mode" -v url="$model_url" '
          /^CHATBOT_AI_ENABLED=/ { print "CHATBOT_AI_ENABLED=true"; next }
          /^CHATBOT_OLLAMA_URL=/ { print "CHATBOT_OLLAMA_URL=" url; next }
          /^CHATBOT_AI_USE_SIDECAR=/ { print "CHATBOT_AI_USE_SIDECAR=" mode; next }
          /^CHATBOT_AI_NETWORK=/ { print "CHATBOT_AI_NETWORK=" network; next }
          /^CHATBOT_OLLAMA_BIND_PORT=/ { print "CHATBOT_OLLAMA_BIND_PORT=" port; next }
          { sub(/\r$/, ""); print }
        ' backend/chatbot-service/knowledge.env.example > "$profile")
    echo "Chatbot: creado $profile sin claves. Configure los dos secretos SQL/web y la CA institucional."
    exit 0
fi

if [ ! -f "$profile" ]; then echo 'Chatbot: ejecute primero init para este ambiente.' >&2; exit 1; fi
export CHATBOT_KNOWLEDGE_ENV_FILE="$profile"
chatbot_prepare_compose "$environment"
if [ "${#CHATBOT_COMPOSE_ARGS[@]}" -eq 0 ]; then echo 'Chatbot: el perfil de despliegue está desactivado.' >&2; exit 1; fi
chatbot_compose() {
    # No cargar .env del ambiente con source: Compose lo interpreta sin ejecutar código.
    docker compose -f "docker-compose.$environment.yml" --env-file ".env.$environment" "${CHATBOT_COMPOSE_ARGS[@]}" "$@"
}
case "$command" in
    install-ai)
        if [ "$CHATBOT_SELECTED_SIDECAR" = false ]; then
            echo 'Chatbot: perfil remoto; instale Qwen en el servidor configurado.'; exit 0
        fi
        docker compose -p "$project" -f docker-compose.chatbot-ia.yml --env-file "$profile" up -d --wait --wait-timeout 120 chatbot-ollama
        docker compose -p "$project" -f docker-compose.chatbot-ia.yml --env-file "$profile" exec -T chatbot-ollama ollama pull qwen3.5:9b
        ;;
    check)
        chatbot_compose config --quiet
        chatbot_compose run --rm --no-deps --entrypoint node chatbot-service dist/diagnose-knowledge.js --require-enabled --verify-document
        ;;
    deploy)
        chatbot_compose config --quiet
        chatbot_compose build chatbot-service
        # Diagnóstico real de solo lectura antes de reemplazar el servicio.
        chatbot_compose run --rm --no-deps --entrypoint node chatbot-service dist/diagnose-knowledge.js --require-enabled --verify-document
        chatbot_compose up -d --no-deps chatbot-service
        ;;
    status) chatbot_compose ps chatbot-service;;
    *) echo 'Chatbot: comando no reconocido.' >&2; exit 1;;
esac
