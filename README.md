# PlataformaComUNIdadESAP

Monorepo de la plataforma ESAP con backend por servicios y frontend migrado a microfrontends dentro de `apps/`.

## Desarrollo local

Instalar dependencias:

```bash
npm i
```

Levantar sólo shell:

```bash
npm run dev
```

Levantar shell + todos los remotos en local:

```bash
npm run dev:all
```

Build completo de frontends:

```bash
npm run build
```

Build de una sola app frontend:

```bash
npm run build:app -- shell
npm run build:app -- mfe-auditoria
```

## Deploy rápido por ambiente

DEV:

```bash
./deploy.dev.sh up
./deploy.dev.sh up-mfe
./deploy.dev.sh rebuild-mfe auditoria
```

PRE:

```bash
./deploy.pre.sh up
./deploy.pre.sh up-mfe
./deploy.pre.sh rebuild-mfe reportes
```

QA:

```bash
./deploy.qa.sh up
./deploy.qa.sh up-mfe
./deploy.qa.sh rebuild-mfe shell
```

PROD:

```bash
./deploy.prod.sh up
./deploy.prod.sh up-mfe
./deploy.prod.sh rebuild-mfe auditoria
```

## Comandos MFE

Los scripts `deploy.*.sh` soportan:

```bash
up-mfe
down-mfe
restart-mfe
status-mfe
logs-mfe
rebuild-mfe shell
rebuild-mfe gateway
rebuild-mfe auditoria
rebuild-mfe reportes
rebuild-mfe-select
```

## Guías

- [DEPLOY_DEV.md](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/DEPLOY_DEV.md)
- [DEPLOY_PRE.md](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/DEPLOY_PRE.md)
- [DEPLOY_QA.md](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/DEPLOY_QA.md)
- [DEPLOY_PROD.md](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/DEPLOY_PROD.md)
- [DEPLOY_MFE.md](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/DEPLOY_MFE.md)
