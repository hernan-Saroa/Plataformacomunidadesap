# Guía de despliegue – ESAP SuperApp (Entorno PRE)

Esta guía documenta el despliegue en PRE usando [deploy.pre.sh](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/deploy.pre.sh).

## Requisitos

- Docker instalado
- `docker compose` disponible
- Archivo `.env.pre`
- Acceso al servidor `http://172.16.202.222`

## Comandos base

```bash
./deploy.pre.sh up
./deploy.pre.sh down
./deploy.pre.sh restart
./deploy.pre.sh rebuild
./deploy.pre.sh rebuild-frontend
./deploy.pre.sh rebuild-service auth-service
./deploy.pre.sh logs
./deploy.pre.sh status
./deploy.pre.sh db-backup
./deploy.pre.sh db-migrate
```

## Comandos MFE

```bash
./deploy.pre.sh up-mfe
./deploy.pre.sh down-mfe
./deploy.pre.sh restart-mfe
./deploy.pre.sh status-mfe
./deploy.pre.sh logs-mfe
./deploy.pre.sh logs-mfe auditoria
./deploy.pre.sh rebuild-mfe shell
./deploy.pre.sh rebuild-mfe auditoria
./deploy.pre.sh rebuild-mfe reportes
./deploy.pre.sh rebuild-mfe-select
```

## Flujo recomendado

```bash
git pull
./deploy.pre.sh up
./deploy.pre.sh up-mfe
```

Redeploy puntual:

```bash
./deploy.pre.sh rebuild-mfe auditoria
```

## URLs útiles

- Frontend: `http://172.16.202.222`
- API Gateway: `http://172.16.202.222/services`

## Referencia adicional

Revisa [DEPLOY_MFE.md](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/DEPLOY_MFE.md) para la arquitectura del overlay MFE.
