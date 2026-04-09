# Guía de despliegue – ESAP SuperApp (Entorno PROD)

Esta guía documenta el despliegue en producción usando [deploy.prod.sh](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/deploy.prod.sh).

## Requisitos

- Docker instalado
- `docker compose` disponible
- Archivo `.env.prod`
- Acceso al servidor `http://172.16.202.169`

## Comandos base

```bash
./deploy.prod.sh up
./deploy.prod.sh down
./deploy.prod.sh restart
./deploy.prod.sh rebuild
./deploy.prod.sh rebuild-frontend
./deploy.prod.sh rebuild-service auth-service
./deploy.prod.sh logs
./deploy.prod.sh status
./deploy.prod.sh db-backup
./deploy.prod.sh db-migrate
```

## Comandos MFE

```bash
./deploy.prod.sh up-mfe
./deploy.prod.sh down-mfe
./deploy.prod.sh restart-mfe
./deploy.prod.sh status-mfe
./deploy.prod.sh logs-mfe
./deploy.prod.sh logs-mfe shell
./deploy.prod.sh rebuild-mfe gateway
./deploy.prod.sh rebuild-mfe shell
./deploy.prod.sh rebuild-mfe auditoria
./deploy.prod.sh rebuild-mfe reportes
./deploy.prod.sh rebuild-mfe-select
```

## Flujo recomendado

Deploy completo:

```bash
git pull
./deploy.prod.sh up
./deploy.prod.sh up-mfe
```

Redeploy selectivo:

```bash
./deploy.prod.sh rebuild-mfe auditoria
```

Si cambia el gateway:

```bash
./deploy.prod.sh rebuild-mfe gateway
```

## URLs útiles

- Frontend: `http://172.16.202.169`
- API Gateway: `http://172.16.202.169/services`

## Referencia adicional

Revisa [DEPLOY_MFE.md](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/DEPLOY_MFE.md) para la arquitectura del overlay MFE.
