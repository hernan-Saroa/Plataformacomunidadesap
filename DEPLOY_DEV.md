# Guía de despliegue – ESAP SuperApp (Entorno DEV)

Esta guía documenta el despliegue en DEV usando [deploy.dev.sh](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/deploy.dev.sh).

## Prerrequisitos

- Docker instalado
- `docker compose` disponible
- Archivo `.env.dev` presente en la raíz
- Acceso al servidor `http://4.156.71.181`

## Variables Oracle

El despliegue Docker no lee `backend/certification-service/.env`; sólo usa `.env.dev` en la raíz. Para habilitar la integración de certificados laborales agrega este bloque a `.env.dev`:

```bash
ORACLE_FNC_ENABLED=true
ORACLE_FNC_USER=USRINTEGRACION
ORACLE_FNC_PASSWORD=""
ORACLE_FNC_CONNECT_STRING=""
ORACLE_FNC_SCHEMA=USRINTEGRACION
ORACLE_FNC_VIEW=VW_INTEGRACIONFNC
```

Si se usa Oracle Thick mode con Instant Client, agrega también:

```bash
ORACLE_CLIENT_LIB_DIR=/ruta/al/instantclient
```

## Opciones De Login

El login del shell usa `VITE_LOGIN_OPTIONS` en tiempo de build. Define esta variable en `.env.dev`:

```bash
# both: Microsoft + correo/contraseña
# microsoft: sólo Microsoft
VITE_LOGIN_OPTIONS="both"
```

## Modos de despliegue

El script soporta dos modos:

- Modo clásico:
  usa sólo `docker-compose.dev.yml`
- Modo MFE:
  usa `docker-compose.dev.yml` + `docker-compose.frontend-mfe.yml`

En modo MFE el frontend queda dividido en:

- `frontend`: gateway Nginx público
- `frontend-shell`: shell principal
- `frontend-mfe-*`: un contenedor por microfrontend

## Comandos base

Importante:

- `up` y `up-mfe` sólo inician contenedores existentes
- si hiciste `git pull` y quieres publicar cambios nuevos, debes usar `rebuild`, `rebuild-all-mfe`, `rebuild-service` o `rebuild-mfe`

```bash
./deploy.dev.sh up
./deploy.dev.sh down
./deploy.dev.sh restart
./deploy.dev.sh rebuild
./deploy.dev.sh rebuild-all-mfe
./deploy.dev.sh rebuild-frontend
./deploy.dev.sh rebuild-service auth-service
./deploy.dev.sh logs
./deploy.dev.sh status
./deploy.dev.sh db-backup
./deploy.dev.sh db-migrate
```

## Comandos MFE

Levantar frontend desacoplado:

```bash
./deploy.dev.sh up-mfe
```

Detener frontend desacoplado:

```bash
./deploy.dev.sh down-mfe
```

Ver estado:

```bash
./deploy.dev.sh status-mfe
```

Ver logs:

```bash
./deploy.dev.sh logs-mfe
./deploy.dev.sh logs-mfe shell
./deploy.dev.sh logs-mfe auditoria
./deploy.dev.sh logs-mfe reportes
```

Redeploy selectivo:

```bash
./deploy.dev.sh rebuild-mfe gateway
./deploy.dev.sh rebuild-mfe shell
./deploy.dev.sh rebuild-mfe auditoria
./deploy.dev.sh rebuild-mfe reportes
./deploy.dev.sh rebuild-mfe-select
```

## Flujo recomendado en DEV

Actualizar código:

```bash
git pull
```

Si hubo cambios de backend o cambios compartidos:

```bash
./deploy.dev.sh rebuild
```

Si quieres publicar toda la app MFE completa con un solo comando:

```bash
./deploy.dev.sh rebuild-all-mfe
```

Si cambias sólo un microfrontend:

```bash
./deploy.dev.sh rebuild-mfe auditoria
```

Si cambias el shell:

```bash
./deploy.dev.sh rebuild-mfe shell
```

Si sólo quieres iniciar contenedores ya construidos, sin publicar cambios nuevos:

```bash
./deploy.dev.sh up
./deploy.dev.sh up-mfe
```

## URLs útiles

- Frontend: `http://4.156.71.181`
- API Gateway: `http://4.156.71.181/services`
- Ejemplo remoto auditoría: `http://4.156.71.181/remotes/mfe-auditoria/`

## Referencia adicional

Para el detalle técnico del overlay MFE revisa [DEPLOY_MFE.md](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/DEPLOY_MFE.md).

Resumen práctico:

- `rebuild` publica el stack base de `docker-compose.dev.yml`
- `rebuild-all-mfe` publica backend + gateway + shell + todos los microfrontends
- `rebuild-mfe <app>` publica sólo el shell, gateway o el microfrontend indicado
