#!/usr/bin/env bash
# Solo define funciones. No inicia servicios ni ejecuta el archivo de configuración.
chatbot_command_needs_profile() {
    local command="${1:-}" arg
    for arg in "$@"; do if [ "$arg" = chatbot-service ]; then return 0; fi; done
    # Un despliegue dirigido a otro módulo no depende de la IA ni de la CA del chat.
    case "$command" in up|create) ;; *) return 1;; esac
    shift
    while [ "$#" -gt 0 ]; do
        case "$1" in
            --pull|--timeout|--wait-timeout|--scale|--attach|--no-attach)
                shift; if [ "$#" -gt 0 ]; then shift; fi;;
            -*) shift;;
            *) return 1;;
        esac
    done
    return 0 # up/create sin servicios explícitos: incluye la plataforma completa.
}

chatbot_profile_value() {
    local file="$1" wanted="$2" key value
    while IFS='=' read -r key value || [ -n "$key" ]; do
        key="${key%$'\r'}"; value="${value%$'\r'}"
        key="${key#"${key%%[![:space:]]*}"}"; key="${key%"${key##*[![:space:]]}"}"
        if [ "$key" = "$wanted" ]; then
            value="${value#"${value%%[![:space:]]*}"}"; value="${value%"${value##*[![:space:]]}"}"
            # El booleano se valida completo después; no quitar sus comillas aquí.
            if [ "$wanted" != CHATBOT_AI_USE_SIDECAR ]; then
                value="${value#\'}"; value="${value%\'}"
                value="${value#\"}"; value="${value%\"}"
            fi
            printf '%s' "$value"
            return 0
        fi
    done < "$file"
}

chatbot_prepare_compose() {
    local environment="$1" file mode key value ca_file ocr_network
    local boolean_pattern="^(true|false|'true'|'false'|\"true\"|\"false\")([[:space:]]+#.*)?$"
    CHATBOT_COMPOSE_ARGS=()
    case "$environment" in dev|qa|pre|prod) ;; *) echo 'Chatbot: ambiente no válido.' >&2; return 1;; esac
    if [ "${CHATBOT_KNOWLEDGE_DEPLOY_ENABLED:-auto}" = false ]; then return 0; fi
    file="${CHATBOT_KNOWLEDGE_ENV_FILE:-./backend/chatbot-service/.env.knowledge.$environment}"
    if [ ! -f "$file" ]; then
        if [ -n "${CHATBOT_KNOWLEDGE_ENV_FILE:-}" ]; then
            echo 'Chatbot: falta el archivo privado configurado; no se realizó el despliegue.' >&2
            return 1
        fi
        return 0
    fi
    # Al añadir --env-file, impedir que una configuración del chatbot cambie DB_*,
    # JWT_SECRET, RUND_* u otras variables de la plataforma. Nunca mostrar valores.
    while IFS='=' read -r key value || [ -n "$key" ]; do
        key="${key%$'\r'}"
        key="${key#"${key%%[![:space:]]*}"}"; key="${key%"${key##*[![:space:]]}"}"
        case "$key" in ''|'#'*) continue;; esac
        if [[ ! "$key" =~ ^CHATBOT_[A-Z0-9_]+$ ]]; then
            echo 'Chatbot: su archivo privado solo admite variables CHATBOT_*.' >&2
            return 1
        fi
    done < "$file"
    mode="${CHATBOT_AI_USE_SIDECAR:-$(chatbot_profile_value "$file" CHATBOT_AI_USE_SIDECAR)}"
    mode="${mode:-true}"
    mode="${mode#"${mode%%[![:space:]]*}"}"; mode="${mode%"${mode##*[![:space:]]}"}"
    if [[ "$mode" =~ $boolean_pattern ]]; then
        mode="${BASH_REMATCH[1]}"
        mode="${mode#\'}"; mode="${mode%\'}"
        mode="${mode#\"}"; mode="${mode%\"}"
    else echo 'Chatbot: CHATBOT_AI_USE_SIDECAR debe ser true o false.' >&2; return 1; fi
    CHATBOT_SELECTED_SIDECAR="$mode"
    export CHATBOT_KNOWLEDGE_ENV_FILE="$file"
    CHATBOT_COMPOSE_ARGS=(-f docker-compose.chatbot-config.yml --env-file "$file")
    if [ "$mode" = true ]; then
        CHATBOT_COMPOSE_ARGS+=(-f docker-compose.chatbot-knowledge.yml)
    fi
    ca_file="${CHATBOT_CA_CERT_FILE:-$(chatbot_profile_value "$file" CHATBOT_CA_CERT_FILE)}"
    if [ -n "$ca_file" ]; then
        if [ ! -f "$ca_file" ]; then echo 'Chatbot: no se encontró el archivo CA configurado.' >&2; return 1; fi
        CHATBOT_COMPOSE_ARGS+=(-f docker-compose.chatbot-ca.yml)
    fi
    ocr_network="${CHATBOT_AI_OCR_NETWORK:-$(chatbot_profile_value "$file" CHATBOT_AI_OCR_NETWORK)}"
    if [ -n "$ocr_network" ]; then
        CHATBOT_COMPOSE_ARGS+=(-f docker-compose.chatbot-ocr-guard.yml)
    fi
}
