#!/bin/sh
set -eu

HTTP_CONFIG_SOURCE="/opt/esap-nginx/http.conf"
TLS_CONFIG_TEMPLATE="/opt/esap-nginx/tls.conf.template"
TARGET_CONFIG="/etc/nginx/conf.d/default.conf"

normalize_bool() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
    1|true|yes|on)
      printf 'true'
      ;;
    *)
      printf 'false'
      ;;
  esac
}

build_hsts_value() {
  value="max-age=${TLS_HSTS_MAX_AGE:-31536000}"

  if [ "$(normalize_bool "${TLS_HSTS_INCLUDE_SUBDOMAINS:-true}")" = "true" ]; then
    value="${value}; includeSubDomains"
  fi

  if [ "$(normalize_bool "${TLS_HSTS_PRELOAD:-false}")" = "true" ]; then
    value="${value}; preload"
  fi

  printf '%s' "$value"
}

if [ ! -f "$HTTP_CONFIG_SOURCE" ]; then
  echo "[esap-nginx] No se encontró configuración HTTP base: $HTTP_CONFIG_SOURCE" >&2
  exit 1
fi

if [ "$(normalize_bool "${ENABLE_TLS:-false}")" != "true" ]; then
  cp "$HTTP_CONFIG_SOURCE" "$TARGET_CONFIG"
  exit 0
fi

TLS_SERVER_NAME="${TLS_SERVER_NAME:-_}"
TLS_CERT_PATH="${TLS_CERT_PATH:-/etc/nginx/certs/fullchain.pem}"
TLS_KEY_PATH="${TLS_KEY_PATH:-/etc/nginx/certs/privkey.pem}"
TLS_HSTS_VALUE="$(build_hsts_value)"

if [ ! -f "$TLS_CONFIG_TEMPLATE" ]; then
  echo "[esap-nginx] No se encontró template TLS: $TLS_CONFIG_TEMPLATE" >&2
  exit 1
fi

if [ ! -f "$TLS_CERT_PATH" ]; then
  echo "[esap-nginx] ENABLE_TLS=true pero no existe el certificado: $TLS_CERT_PATH" >&2
  exit 1
fi

if [ ! -f "$TLS_KEY_PATH" ]; then
  echo "[esap-nginx] ENABLE_TLS=true pero no existe la llave privada: $TLS_KEY_PATH" >&2
  exit 1
fi

export TLS_SERVER_NAME TLS_CERT_PATH TLS_KEY_PATH TLS_HSTS_VALUE
envsubst '${TLS_SERVER_NAME} ${TLS_CERT_PATH} ${TLS_KEY_PATH} ${TLS_HSTS_VALUE}' \
  < "$TLS_CONFIG_TEMPLATE" \
  > "$TARGET_CONFIG"
