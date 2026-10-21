# Se carga desde los scripts de despliegue; no ejecuta operaciones al hacer source.
rund_documental_preflight() {
    local rund_environment="$1"
    shift
    case "$1" in
        down|rm)
            echo "RUND: use una actualización con up sin down/rm previo; se necesita conservar el contenedor actual para verificar los archivos. Para detenerlo, use stop."
            return 1
            ;;
        up|create) ;;
        *) return 0 ;;
    esac
    # Con --no-deps, una actualización de otro servicio no afecta RUND.
    if [[ " $* " == *" --no-deps "* && " $* " != *" academic-work-plan-service "* ]]; then
        local rund_argument
        for rund_argument in "$@"; do
            case "$rund_argument" in
                *-service|frontend|frontend-*|db|redis|onlyoffice) return 0 ;;
            esac
        done
    fi
    if ! command -v node >/dev/null 2>&1; then
        echo "RUND: se necesita Node.js para comprobar la persistencia antes de recrear el servicio."
        return 1
    fi
    node scripts/check-rund-documental-deploy.cjs --environment "$rund_environment" --persistent --verify-copy
}
