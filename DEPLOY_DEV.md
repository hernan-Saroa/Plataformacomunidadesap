# Guía de despliegue – ESAP SuperApp (Entorno DEV)

Esta guía documenta el despliegue en DEV usando [deploy.dev.sh](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/deploy.dev.sh).

## Prerrequisitos

- Docker instalado
- `docker compose` disponible
- Archivo `.env.dev` presente en la raíz
- Acceso al servidor `http://4.156.71.181`

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

```bash
./deploy.dev.sh up
./deploy.dev.sh down
./deploy.dev.sh restart
./deploy.dev.sh rebuild
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

Levantar backend completo:

```bash
./deploy.dev.sh up
```

Levantar frontend desacoplado:

```bash
./deploy.dev.sh up-mfe
```

Si cambias sólo un microfrontend:

```bash
./deploy.dev.sh rebuild-mfe auditoria
```

Si cambias el shell:

```bash
./deploy.dev.sh rebuild-mfe shell
```

## URLs útiles

- Frontend: `http://4.156.71.181`
- API Gateway: `http://4.156.71.181/services`
- Ejemplo remoto auditoría: `http://4.156.71.181/remotes/mfe-auditoria/`

## Referencia adicional

Para el detalle técnico del overlay MFE revisa [DEPLOY_MFE.md](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/DEPLOY_MFE.md).
