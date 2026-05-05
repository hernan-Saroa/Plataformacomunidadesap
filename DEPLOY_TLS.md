# Despliegue TLS frontend

Esta guía deja listo el frontend Nginx para servir HTTPS sin romper el despliegue actual.

## Qué cambia

- Si `ENABLE_TLS=false` o no se define, el contenedor sigue sirviendo por HTTP en `80` como hoy.
- Si `ENABLE_TLS=true`, el contenedor:
  - levanta `443` con TLS
  - redirige HTTP a HTTPS con `301`
  - agrega `Strict-Transport-Security`

## Requisitos

- Certificado y llave privada disponibles en el host
- Archivos compatibles con Nginx, por ejemplo:
  - `fullchain.pem`
  - `privkey.pem`

## Overlay Compose

El archivo [docker-compose.frontend-tls.yml](./docker-compose.frontend-tls.yml) agrega:

- variables de entorno TLS al servicio `frontend`
- volumen readonly con certificados
- publicación del puerto `443`

No afecta nada si no lo incluyes en el despliegue.

## Variables

- `FRONTEND_ENABLE_TLS=true`
- `FRONTEND_TLS_SERVER_NAME=comunidadesap.esap.edu.co`
- `FRONTEND_TLS_CERTS_DIR=./certs/frontend`
- `FRONTEND_TLS_CERT_PATH=/etc/nginx/certs/fullchain.pem`
- `FRONTEND_TLS_KEY_PATH=/etc/nginx/certs/privkey.pem`
- `FRONTEND_TLS_HSTS_MAX_AGE=31536000`
- `FRONTEND_TLS_HSTS_INCLUDE_SUBDOMAINS=true`
- `FRONTEND_TLS_HSTS_PRELOAD=false`
- `FRONTEND_HTTPS_BIND=0.0.0.0`
- `FRONTEND_HTTPS_PORT=443`

## Ejemplos

### QA

```bash
docker compose \
  -f docker-compose.qa.yml \
  -f docker-compose.frontend-tls.yml \
  up -d --build frontend
```

### PRE

```bash
docker compose \
  -f docker-compose.pre.yml \
  -f docker-compose.frontend-tls.yml \
  up -d --build frontend
```

### DEV MFE

```bash
docker compose \
  -f docker-compose.dev.yml \
  -f docker-compose.frontend-mfe.yml \
  -f docker-compose.frontend-tls.yml \
  --env-file .env.dev \
  up -d --build frontend
```

## Validación

Después del despliegue:

```bash
curl -I http://TU_HOST/
curl -I https://TU_HOST/
```

Resultado esperado:

- `http://` devuelve `301` hacia `https://`
- `https://` responde `200`
- `https://` incluye `Strict-Transport-Security`

## Importante

- Si `prod` ya termina TLS en un balanceador o Nginx externo, el cierre de `ESAP-004` puede hacerse allí en vez de dentro del contenedor.
- Si activas `ENABLE_TLS=true` sin montar certificados válidos, el contenedor fallará al iniciar a propósito.
- El endpoint `/health` queda disponible en HTTP para no romper health checks existentes.
