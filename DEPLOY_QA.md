# Guía de despliegue – ESAP SuperApp (Entorno QA)

Esta guía documenta el despliegue en QA usando [deploy.qa.sh](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/deploy.qa.sh).

## Requisitos

- Docker instalado
- `docker compose` disponible
- Archivo `.env.qa`
- Acceso al servidor `http://135.237.81.133`

## Comandos base

```bash
./deploy.qa.sh up
./deploy.qa.sh down
./deploy.qa.sh restart
./deploy.qa.sh rebuild
./deploy.qa.sh rebuild-all-mfe
./deploy.qa.sh rebuild-changed
./deploy.qa.sh rebuild-frontend
./deploy.qa.sh rebuild-service auth-service
./deploy.qa.sh logs
./deploy.qa.sh status
./deploy.qa.sh db-backup
./deploy.qa.sh db-migrate
```

## Comandos MFE

```bash
./deploy.qa.sh up-mfe
./deploy.qa.sh down-mfe
./deploy.qa.sh restart-mfe
./deploy.qa.sh status-mfe
./deploy.qa.sh logs-mfe
./deploy.qa.sh logs-mfe reportes
./deploy.qa.sh rebuild-mfe shell
./deploy.qa.sh rebuild-mfe auditoria
./deploy.qa.sh rebuild-mfe reportes
./deploy.qa.sh rebuild-mfe-select
```

## Flujo recomendado

Deploy inteligente después de `git pull`:

```bash
git pull
./deploy.qa.sh rebuild-changed
```

Deploy completo solo si cambió gran parte del stack:

```bash
git pull
./deploy.qa.sh rebuild-all-mfe
```

Redeploy puntual:

```bash
./deploy.qa.sh rebuild-mfe reportes
```

Resumen práctico:

- `rebuild` publica el stack base de `docker-compose.qa.yml`
- `rebuild-changed` publica solo backend/MFEs afectados por el último pull o por un rango git
- `rebuild-all-mfe` publica backend + gateway + shell + todos los microfrontends
- `rebuild-mfe <app>` publica sólo el shell, gateway o el microfrontend indicado

## URLs útiles

- Frontend: `http://135.237.81.133`
- API Gateway: `http://135.237.81.133/services`

## Referencia adicional

Revisa [DEPLOY_MFE.md](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/DEPLOY_MFE.md) para la arquitectura del overlay MFE.
