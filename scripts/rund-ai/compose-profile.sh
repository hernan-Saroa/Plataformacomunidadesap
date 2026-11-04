#!/usr/bin/env bash
# Las variables se leen como datos validados; el archivo nunca se ejecuta.
rund_ai_command_needs_profile() {
    local command="${1:-}" arg
    for arg in "$@"; do if [ "$arg" = academic-work-plan-service ]; then return 0; fi; done
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
    return 0
}

rund_ai_prepare_compose() {
    local environment="$1" values key value
    RUND_AI_COMPOSE_ARGS=()
    if [ "${RUND_AI_DEPLOY_ENABLED:-auto}" = false ]; then return 0; fi
    values="$(node scripts/rund-ai/manage.cjs "$environment" profile)" || return $?
    while IFS='=' read -r key value; do
        [ -z "$key" ] || export "$key=$value"
    done <<< "$values"
    RUND_AI_COMPOSE_ARGS=(-f docker-compose.rund-ai-config.yml)
}
