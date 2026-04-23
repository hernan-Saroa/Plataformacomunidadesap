# Runbook de Despliegue - ESAP SuperApp (DEV / QA / PRE / PROD)

Este documento describe, de forma operativa, como desplegar la plataforma en cualquier ambiente usando los scripts:

- `deploy.dev.sh`
- `deploy.qa.sh`
- `deploy.pre.sh`
- `deploy.prod.sh`

## 1. Prerrequisitos del servidor

1. Docker instalado y operativo.
2. Docker Compose plugin (`docker compose`) disponible.
3. Usuario con permisos para ejecutar Docker.
4. Código del proyecto clonado en el servidor.
5. Archivo `.env.<ambiente>` en la raiz del proyecto.

Comprobacion rapida:

```bash
docker --version
docker compose version
```

## 2. Archivos por ambiente

Cada ambiente usa su propio compose, env y script:

- DEV:
  - Script: `deploy.dev.sh`
  - Compose: `docker-compose.dev.yml`
  - Env: `.env.dev`
  - URL: `http://4.156.71.181`

- QA:
  - Script: `deploy.qa.sh`
  - Compose: `docker-compose.qa.yml`
  - Env: `.env.qa`
  - URL: `http://135.237.81.133`

- PRE:
  - Script: `deploy.pre.sh`
  - Compose: `docker-compose.pre.yml`
  - Env: `.env.pre`
  - URL: `http://172.16.202.222`

- PROD:
  - Script: `deploy.prod.sh`
  - Compose: `docker-compose.prod.yml`
  - Env: `.env.prod`
  - URL: `https://comunidadesap.esap.edu.co`

## 3. Variables clave (Microsoft login)

En cada `.env.<ambiente>` deben existir al menos:

```env
VITE_MICROSOFT_TENANT_ID=<tenant-id>
VITE_MICROSOFT_CLIENT_ID=<client-id>
```

Notas:

- `VITE_MICROSOFT_REDIRECT_URI` es opcional (el frontend puede usar `window.location.origin + window.location.pathname`).
- Los valores `VITE_*` se inyectan en build time. Si cambias estas variables debes reconstruir frontend.

## 4. Permisos de ejecucion

Si el script no tiene permisos:

```bash
chmod +x deploy.dev.sh deploy.qa.sh deploy.pre.sh deploy.prod.sh
```

## 5. Comandos disponibles por script

Todos los scripts soportan:

1. `up`
2. `down`
3. `restart`
4. `rebuild`
5. `rebuild-frontend`
6. `rebuild-service <servicio>`
7. `rebuild-select`
8. `logs`
9. `status`
10. `clean`
11. `clean-safe`
12. `db-backup`
13. `db-migrate`
14. `db-reset`

## 6. Flujo recomendado de despliegue

### 6.1 Frontend solamente (mas rapido)

Ejemplo DEV:

```bash
./deploy.dev.sh rebuild-frontend
```

Ejemplo QA/PRE/PROD:

```bash
./deploy.qa.sh rebuild-frontend
./deploy.pre.sh rebuild-frontend
./deploy.prod.sh rebuild-frontend
```

### 6.2 Un microservicio puntual

Ejemplo DEV:

```bash
./deploy.dev.sh rebuild-service auth-service
```

### 6.3 Seleccion interactiva de servicio

```bash
./deploy.dev.sh rebuild-select
./deploy.qa.sh rebuild-select
./deploy.pre.sh rebuild-select
./deploy.prod.sh rebuild-select
```

### 6.4 Rebuild completo (costoso)

```bash
./deploy.dev.sh rebuild
./deploy.qa.sh rebuild
./deploy.pre.sh rebuild
./deploy.prod.sh rebuild
```

Usar solo cuando hay cambios amplios en varios servicios.

## 7. Limpieza segura (sin borrar volumen de BD del ambiente)

Para limpiar basura Docker sin tocar el volumen principal de Postgres del ambiente:

```bash
./deploy.dev.sh clean-safe
./deploy.qa.sh clean-safe
./deploy.pre.sh clean-safe
./deploy.prod.sh clean-safe
```

`clean-safe` hace:

1. `container prune`
2. `image prune`
3. `builder prune` (cache vieja)
4. `network prune`
5. elimina solo volumenes dangling, preservando volumenes `pgdata` del ambiente.

## 8. Verificacion post-deploy

1. Estado del stack:

```bash
./deploy.dev.sh status
```

2. Logs del ambiente:

```bash
./deploy.dev.sh logs
```

3. Health manual:

- Abrir frontend del ambiente.
- Validar login normal.
- Validar login Microsoft.
- Validar un endpoint via API Gateway del ambiente (`/services/...`).

## 9. Troubleshooting comun

### 9.1 Error: `Define VITE_MICROSOFT_CLIENT_ID en tu entorno`

Causa: variable no inyectada en build frontend.

Acciones:

1. Verifica `.env.<ambiente>`.
2. Verifica compose resuelto:

```bash
docker compose -f docker-compose.<ambiente>.yml --env-file .env.<ambiente> config | rg VITE_MICROSOFT
```

3. Ejecuta `rebuild-frontend`.

### 9.2 Error en build: `test -n "${VITE_MICROSOFT_*}" exit code 1`

Causa: faltan variables en `.env.<ambiente>`.

Accion: completar variables y repetir build.

### 9.3 Deploy lento

Causas tipicas:

1. Rebuild de todos los servicios cuando solo cambiaste frontend.
2. Cache/imagenes/volumenes acumulados.
3. Pocos recursos del host.

Acciones:

1. Usa `rebuild-frontend` o `rebuild-service`.
2. Ejecuta `clean-safe`.
3. Revisa recursos:

```bash
docker system df -v
df -h
free -h
docker stats --no-stream
```

## 10. Buenas practicas operativas

1. Evita `rebuild` completo para cambios pequenos.
2. Usa `rebuild-select` para reducir errores operativos.
3. Ejecuta `clean-safe` periodicamente en DEV/QA.
4. Mantener backups con `db-backup` antes de cambios riesgosos.
5. En PROD, desplegar en ventana controlada y monitorear logs al menos 10-15 minutos.

## 11. Referencia rapida

DEV:

```bash
./deploy.dev.sh rebuild-frontend
./deploy.dev.sh rebuild-service api-gateway
./deploy.dev.sh clean-safe
```

QA:

```bash
./deploy.qa.sh rebuild-select
./deploy.qa.sh clean-safe
```

PRE:

```bash
./deploy.pre.sh rebuild-frontend
./deploy.pre.sh clean-safe
```

PROD:

```bash
./deploy.prod.sh rebuild-service frontend
./deploy.prod.sh clean-safe
```
